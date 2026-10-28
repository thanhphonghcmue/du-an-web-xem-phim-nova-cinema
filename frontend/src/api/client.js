/**
 * ==============================================================================
 * TỆP TIN: src/api/client.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Thư viện cổng giao tiếp API tập trung của Frontend (API Client).
 *   - Hoạt động theo kiến trúc BFF (Backend-For-Frontend):
 *     Mọi yêu cầu gửi đến `/api/v1/*` của Next.js, chuyển tiếp an toàn sang NestJS backend.
 *   - Bảo mật tuyệt đối: Token xác thực được lưu trong HttpOnly Cookie do trình duyệt quản lý,
 *     hoàn toàn không lưu JWT vào LocalStorage để ngăn chặn tấn công XSS.
 *   - Tự động xoay vòng làm mới phiên đăng nhập (Silent Token Refresh) qua cơ chế Web Locks API,
 *     tránh xung đột khi nhiều tab cùng hết hạn token cùng lúc.
 *   - Tự động xử lý lỗi tải lại (Retry backoff 350ms) khi hạ tầng tạm thời báo 503 Rate Limiter.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. `apiRequest`: Hàm gốc gửi HTTP request với timeout 8s, cache: no-store, credentials: same-origin.
 *   2. Nếu nhận HTTP 401 Unauthorized -> kích hoạt khóa `nova-session-refresh` -> gọi `/auth/refresh` -> thử lại yêu cầu.
 *   3. `apiList`: Hỗ trợ tự động phân trang (Pagination Auto-Fetch) gom toàn bộ danh sách items.
 *   4. Các hàm nghiệp vụ: Đăng ký, Đăng nhập, Đặt ghế, Thanh toán Sandbox, Quản trị doanh thu.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ các component và màn hình giao diện cần gửi/nhận dữ liệu từ Backend.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm bộ giám sát hiệu năng mạng (Network Interceptor) ghi log thời gian phản hồi API.
 *   - Thêm tính năng Offline Queue: khi mất mạng thì xếp hàng các thao tác và tự đồng bộ lại khi online.
 * ==============================================================================
 */

// Địa chỉ cổng API Gateway nội bộ trên Next.js
export const API_BASE = "/api/v1";
import { apiErrorMessage } from "./errorMessage.js";
import { notifyApiError } from "./notice.js";
import { uniqueRecords } from "../uniqueRecords.js";
import { requestBudget, abortable } from "./budget.js";
let refreshing;
let programmeCache,
  catalogueEpoch = 0,
  backendKind = "unknown";
const reads = new Map();
export const getBackendKind = () => backendKind;

/**
 * Hàm gọi API tổng quát với cơ chế tự làm mới Token (Refresh Token) và tự thử lại (Retry)
 * @param {string} endpoint - Đường dẫn API (ví dụ "/movies")
 * @param {RequestInit} [options] - Cấu hình fetch
 * @param {boolean} [retry=true] - Cho phép thử lại khi hết hạn token hoặc 503
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}, retry = true) {
  const budget = requestBudget(options.signal);
  try {
    const result = await abortable(
      requestWithinBudget(endpoint, options, retry, budget.signal),
      budget.signal,
    );
    if (options.method && options.method !== "GET") {
      reads.clear();
      programmeCache = null;
      catalogueEpoch++;
      if (
        typeof window !== "undefined" &&
        /^\/(bookings|payments)(\/|$)/.test(endpoint)
      ) {
        window.dispatchEvent(new Event("nova-seat-capacity-change"));
      }
    }
    return result;
  } catch (cause) {
    if (cause.status) {
      if (
        cause.status === 401 &&
        !endpoint.startsWith("/auth/") &&
        endpoint !== "/users/me" &&
        typeof window !== "undefined"
      )
        window.dispatchEvent(new Event("nova-session-expired"));
      throw cause;
    }
    const timedOut = budget.signal.reason?.name === "TimeoutError";
    const message = timedOut
      ? "Máy chủ chưa phản hồi trong 8 giây. Vui lòng thử lại; đơn đang giữ có thể kiểm tra trong tài khoản."
      : options.signal?.aborted
        ? "Đã hủy yêu cầu."
        : "Kết nối bị gián đoạn. Vui lòng thử lại.";
    if (!options.signal?.aborted) notifyApiError(message);
    const error = new Error(message, { cause });
    error.code = timedOut ? "REQUEST_TIMEOUT" : "CONNECTION_FAILED";
    throw error;
  } finally {
    budget.dispose();
  }
}

async function requestWithinBudget(endpoint, options, retry, signal) {
  signal.throwIfAborted();
  const response = await fetch(API_BASE + endpoint, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal,
  });
  const kind = response.headers.get("x-nova-backend");
  if (kind === "memory" || kind === "postgres") backendKind = kind;
  if (response.status === 401 && retry && !endpoint.startsWith("/auth/")) {
    const rotate = async () => {
      try {
        await requestWithinBudget("/users/me", {}, false, signal);
        return;
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      await requestWithinBudget(
        "/auth/refresh",
        { method: "POST" },
        false,
        signal,
      );
    };
    refreshing ||= (
      typeof navigator !== "undefined" && navigator.locks?.request
        ? navigator.locks.request("nova-session-refresh", { signal }, rotate)
        : rotate()
    ).finally(() => {
      refreshing = null;
    });
    await abortable(refreshing, signal);
    return requestWithinBudget(endpoint, options, false, signal);
  }
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  }
  signal.throwIfAborted();
  if (!response.ok || payload?.success === false) {
    const safeToReplay =
      !options.method ||
      options.method === "GET" ||
      Boolean(options.headers?.["Idempotency-Key"]);
    if (
      retry &&
      safeToReplay &&
      (response.status === 503 ||
        payload.error === "RATE_LIMIT_UNAVAILABLE" ||
        payload.code === "RATE_LIMIT_UNAVAILABLE")
    ) {
      await abortable(
        new Promise((resolve) => setTimeout(resolve, 350)),
        signal,
      );
      return requestWithinBudget(endpoint, options, false, signal);
    }
    const msg = apiErrorMessage(
      payload,
      response.status,
      typeof document !== "undefined" ? document.documentElement.lang : "vi",
    );
    const error = new Error(msg);
    error.status = response.status;
    error.details = payload.details;
    error.code = payload.error || payload.errorCode || payload.code;
    if (response.status >= 500) notifyApiError(msg);
    throw error;
  }
  return payload;
}

/**
 * Đọc dữ liệu trả về từ trường `data` của API
 */
export function read(path) {
  if (path === "/showtimes/programme" && programmeCache?.until > Date.now())
    return Promise.resolve(programmeCache.data);
  if (reads.has(path)) return reads.get(path);
  const epoch = catalogueEpoch;
  const task = apiRequest(path)
    .then((result) => {
      if (path === "/showtimes/programme" && epoch === catalogueEpoch)
        programmeCache = { data: result.data, until: Date.now() + 30000 };
      return result.data;
    })
    .finally(() => {
      if (reads.get(path) === task) reads.delete(path);
    });
  reads.set(path, task);
  return task;
}

/**
 * Tự động phân trang và thu thập toàn bộ danh sách đối tượng
 */
export async function apiList(path, params = {}) {
  const query = (page) =>
    `${path}?${new URLSearchParams({ ...params, limit: 100, page })}`;
  const first = await read(query(1));
  if (
    !Array.isArray(first?.items) ||
    !Number.isInteger(first?.meta?.totalPages) ||
    first.meta.totalPages < 0 ||
    first.meta.totalPages > 1000 ||
    (first.meta.totalPages === 0 && first.items.length > 0)
  )
    throw new Error(
      "Danh sách máy chủ chưa hợp lệ hoặc quá lớn. Hãy thu hẹp bộ lọc.",
    );
  const items = [...first.items];
  // Four pages at a time keeps the month-long schedule responsive and bounded.
  for (let page = 2; page <= first.meta.totalPages; page += 4) {
    const pages = Array.from(
      { length: Math.min(4, first.meta.totalPages - page + 1) },
      (_, offset) => page + offset,
    );
    const results = await Promise.all(
      pages.map((number) => read(query(number))),
    );
    for (const result of results) items.push(...result.items);
  }
  return uniqueRecords(items);
}

// ==========================================
// NHÓM 1: XÁC THỰC TÀI KHOẢN (AUTHENTICATION)
// ==========================================

/**
 * Đăng nhập tài khoản với Email và Mật khẩu
 */
export const apiLogin = async (email, password, remember = true) =>
  (
    await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    })
  ).data;
export const apiDangNhap = apiLogin;

/**
 * Đăng ký tài khoản khách hàng mới
 */
export async function apiRegister(
  email,
  password,
  fullName,
  phone,
  remember = true,
) {
  await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      fullName,
      ...(phone ? { phone } : {}),
    }),
  });
  return apiLogin(email, password, remember);
}
export const apiDangKy = apiRegister;

/**
 * Đăng xuất khỏi hệ thống và xóa sạch HttpOnly cookie
 */
export const apiLogout = () => apiRequest("/auth/logout", { method: "POST" });
export const apiDangXuat = apiLogout;

/**
 * Chuẩn hóa đối tượng hồ sơ thành viên C'MEMBER
 */
export const memberProfile = (user) => ({
  ...user,
  name: user.fullName,
  points: user.cMemberPoints,
  tier: user.cMemberTier,
});

/**
 * Lấy thông tin tài khoản hiện tại
 */
export const apiGetProfile = () => read("/users/me");
export const apiLayThongTinCaNhan = apiGetProfile;

// ==========================================
// NHÓM 2: DANH MỤC PHIM & RẠP (CATALOG)
// ==========================================

export const apiGetMovies = () => apiList("/movies");
export const apiLayDanhSachPhim = apiGetMovies;

export const apiGetCinemas = () => apiList("/cinemas");
export const apiLayDanhSachRap = apiGetCinemas;

export const apiGetShowtimes = (params) => apiList("/showtimes", params);
export const apiLayLichChieuPhim = apiGetShowtimes;

export const apiGetShowtimeSeats = (id) => read(`/showtimes/${id}/seats`);
export const apiLaySoDoGheSuatChieu = apiGetShowtimeSeats;

export const apiGetGroupSuggestions = (id, quantity = 2, seatType = "") =>
  read(
    `/showtimes/${id}/group-seat-suggestion?${new URLSearchParams({ quantity, ...(seatType ? { seatType } : {}) })}`,
  );
export const apiGoiYNhomGheLienKe = apiGetGroupSuggestions;

// ==========================================
// NHÓM 3: ĐẶT VÉ & GIỮ GHẾ 5 PHÚT (BOOKINGS)
// ==========================================

/**
 * Giữ ghế trong 5 phút với khóa chống trùng lặp Idempotency-Key
 */
export const apiHoldSeats = (payload, key) =>
  readCommand("/bookings/hold", payload, key ? { "Idempotency-Key": key } : {});
export const apiGiuGhe5Phut = apiHoldSeats;

export const apiGetMyBookings = () => apiList("/bookings/me");
export const apiLayDanhSachDonDatVe = apiGetMyBookings;

export const apiGetMyTickets = () => apiList("/tickets/me");
export const apiLayDanhSachVeDienTu = apiGetMyTickets;

export const apiGetBooking = (id) => read(`/bookings/${id}`);
export const apiLayChiTietDon = apiGetBooking;

/**
 * Hủy đơn đang giữ chỗ và giải phóng ghế ngay lập tức cho khán giả khác
 */
export const apiCancelBooking = (id) => readCommand(`/bookings/${id}/cancel`);
export const apiHuyGiuGheTraCho = apiCancelBooking;

// ==========================================
// NHÓM 4: THANH TOÁN SANDBOX (PAYMENTS)
// ==========================================

export const apiPaymentStatus = (id) => read(`/payments/${id}/status`);

/**
 * Tạo liên kết chuyển hướng thanh toán Sandbox
 */
export const apiCheckout = (id) =>
  readCommand("/payments/create-sandbox-url", {
    bookingId: id,
    returnUrl: window.location.origin + "/?booking=" + id,
  });
export const apiTaoDuongDanThanhToanSandbox = apiCheckout;

/**
 * Gửi lệnh POST/PUT/PATCH tới Backend
 */
export async function readCommand(
  path,
  payload,
  headers = {},
  method = "POST",
) {
  return (
    await apiRequest(path, {
      method,
      headers,
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    })
  ).data;
}

// ==========================================
// NHÓM 5: QUẢN TRỊ & BÁO CÁO (ADMIN & HEALTH)
// ==========================================

export const apiGetAdminOverview = () => read("/admin/reports/overview");
export const apiLayThongKeTongQuanAdmin = apiGetAdminOverview;

export const apiGetAdminRevenue = (from, to, cinemaId, movieId) =>
  read(
    `/admin/reports/revenue?${new URLSearchParams({ from, to, ...(cinemaId ? { cinemaId } : {}), ...(movieId ? { movieId } : {}) })}`,
  );
export const apiLayBaoCaoDoanhThuAdmin = apiGetAdminRevenue;

export const apiGetAdminUsers = () => read("/admin/reports/users");
export const apiLayDanhSachNguoiDung = apiGetAdminUsers;

export const apiPurgeOutbox = (daysOld = 7) =>
  readCommand("/admin/reports/purge-outbox", { daysOld });
export const apiDonDepThongBaoOutboxCu = apiPurgeOutbox;

export const apiGetHealth = () => read("/health");
export const apiKiemTraTrangThaiHeThong = apiGetHealth;
