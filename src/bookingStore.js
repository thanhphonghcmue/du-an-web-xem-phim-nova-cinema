/**
 * ==============================================================================
 * TỆP TIN: src/bookingStore.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý trạng thái ghế ngồi phía Client (Local Fallback & Offline Cache).
 *   - Định nghĩa cấu trúc phòng chiếu mẫu (8 hàng ghế A-H, 20 cột, phân loại: Standard, VIP, Sweetbox đôi).
 *   - Cung cấp thuật toán tìm nhóm ghế liền kề tối ưu (`findGroup` / `findOptimalGroupSeats`) ưu tiên vị trí trung tâm.
 *   - Đồng bộ đa tab trình duyệt thông qua cơ chế khóa `navigator.locks` tránh tranh chấp giữ ghế trên cùng một máy.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khởi tạo danh sách ghế chuẩn (160 ghế: hàng A-C Standard, D-F VIP trung tâm, G Standard, H Sweetbox).
 *   2. Khi người dùng mở suất chiếu mà mạng offline hoặc demo: `readSeats` nạp từ localStorage.
 *   3. Khi người dùng chọn/giữ ghế: `updateSeats` sử dụng lock trình duyệt ghi an toàn và phát sự kiện `nova-seats`.
 *   4. Khi người dùng bấm "Chọn nhanh nhóm X ghế": `findGroup` quét các hàng đẹp nhất (E, D, F...) từ giữa sang 2 bên.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng đặt vé xem phim trên website.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm hỗ trợ sơ đồ ghế tùy biến động theo phòng chiếu thực tế (không chỉ cố định 8x20).
 *   - Thêm ký hiệu ghế cho người khuyết tật (Wheelchair accessible) tại hàng đầu hoặc gần lối đi.
 *   - Thêm tính năng lưu ghế yêu thích của thành viên để tự động đề xuất vị trí quen thuộc khi đặt vé mới.
 * ==============================================================================
 */

// Thời gian giữ ghế tiêu chuẩn: đúng 5 phút (300.000 ms) theo quy định rạp chiếu
export const HOLD_MS = 5 * 60 * 1000;
export const SEAT_HOLD_DURATION_MS = HOLD_MS;

// Tiền tố khóa lưu trữ trong LocalStorage của trình duyệt
const STORAGE_PREFIX = "nova-seats-v1:";

// Danh sách các hàng ghế từ A đến H
export const rows = "ABCDEFGH".split("");
export const CINEMA_SEAT_ROWS = rows;

/**
 * Danh sách 160 ghế mặc định của phòng chiếu tiêu chuẩn:
 * - Hàng A, B, C: Ghế Thường (Standard) - 90.000 VNĐ
 * - Hàng D, E, F: Ghế VIP (Vị trí đẹp, góc nhìn trung tâm) - 120.000 VNĐ
 * - Hàng G: Ghế Thường (Standard) - 90.000 VNĐ
 * - Hàng H: Ghế Đôi Sweetbox (Dành cho cặp đôi) - 110.000 VNĐ/ghế
 */
export const seats = rows.flatMap((row, rowIndex) =>
  Array.from({ length: 20 }, (_, columnIndex) => ({
    id: `${row}${columnIndex + 1}`,
    row,
    number: columnIndex + 1,
    type: rowIndex === 7 ? "sweet" : rowIndex >= 3 && rowIndex <= 5 ? "vip" : "standard",
    price: rowIndex === 7 ? 110000 : rowIndex >= 3 && rowIndex <= 5 ? 120000 : 90000,
  })),
);
export const DEFAULT_ROOM_SEATS = seats;

/**
 * Đọc trạng thái ghế cho một suất chiếu từ LocalStorage (chế độ demo / offline dự phòng)
 * @param {string} showId - Mã định danh suất chiếu
 * @returns {Record<string, { status: "sold" | "held", owner?: string, expires?: number }>}
 */
export function readSeats(showId) {
  const raw = localStorage.getItem(STORAGE_PREFIX + showId);
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!data) {
    data = {};
    // Dữ liệu ghế mẫu đã bán để màn hình sinh động như rạp thực tế
    [
      "B5", "B6", "C8", "C9", "C10",
      "D3", "D4", "E13", "E14", "F9",
      "F10", "G16", "G17", "H3", "H4",
    ].forEach((id) => {
      data[id] = { status: "sold" };
    });

    // Dữ liệu demo cố định theo suất chiếu; màu sắc chỉ báo dựa trên trạng thái đã lưu
    const showTime = showId.split("|").at(-1);
    if (showTime === "22:30") {
      seats
        .filter((s) => s.row !== "A")
        .forEach((s) => {
          data[s.id] = { status: "sold" };
        });
    }
    if (showTime === "16:45") {
      seats
        .filter(
          (s) =>
            "BCDEF".includes(s.row) ||
            (s.row === "G" && s.number >= 5 && s.number <= 10),
        )
        .forEach((s) => {
          data[s.id] = { status: "sold" };
        });
    }

    // Một vài ghế đang có người khác giữ chỗ tạm thời (hết hạn sau 90 giây)
    ["D10", "D11", "E7", "E8"].forEach((id) => {
      data[id] = {
        status: "held",
        owner: "demo-other",
        expires: Date.now() + 90000,
      };
    });
    localStorage.setItem(STORAGE_PREFIX + showId, JSON.stringify(data));
  }

  // Chỉ trả về các ghế đã bán hoặc còn trong thời gian giữ chỗ hợp lệ
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, seatState]) => seatState.status === "sold" || seatState.expires > Date.now(),
    ),
  );
}
export const readSeatsOfflineCache = readSeats;

/**
 * Cập nhật trạng thái ghế an toàn với khóa Web Locks API tránh đụng độ giữa các tab
 * @param {string} showId - Mã suất chiếu
 * @param {(current: Record<string, any>) => Record<string, any>} updater - Hàm chuyển đổi trạng thái
 */
export async function updateSeats(showId, updater) {
  const operation = () => {
    const current = readSeats(showId);
    const next = updater(current);
    localStorage.setItem(STORAGE_PREFIX + showId, JSON.stringify(next));
    // Phát sự kiện toàn cục để các component cùng trang cập nhật lại giao diện ngay lập tức
    window.dispatchEvent(new Event("nova-seats"));
    return next;
  };
  return navigator.locks
    ? navigator.locks.request(STORAGE_PREFIX + showId, operation)
    : operation();
}
export const updateSeatsAtomicLock = updateSeats;

/**
 * Lọc danh sách các ghế mà người dùng hiện tại đang nắm giữ
 * @param {Record<string, any>} data - Bản đồ trạng thái ghế
 * @param {string} owner - Mã định danh người dùng / phiên khách
 * @returns {string[]} Danh sách mã ghế đang giữ (ví dụ: ["E10", "E11"])
 */
export function ownSeats(data, owner) {
  return Object.keys(data).filter(
    (id) => data[id].status === "held" && data[id].owner === owner,
  );
}
export const filterOwnedSeats = ownSeats;

/**
 * Thuật toán tìm nhóm ghế liền kề thông minh (Greedy Group Seat Finder):
 * - Ưu tiên các hàng ghế VIP trung tâm đẹp nhất theo thứ tự: E -> D -> F -> C -> B -> G -> A.
 * - Trong mỗi hàng, sắp xếp vị trí bắt đầu ưu tiên gần tâm cột số 10 nhất (|start + count/2 - 10| nhỏ nhất).
 * - Đảm bảo tất cả các ghế trong nhóm đều còn trống (chưa bị bán hoặc giữ chỗ).
 *
 * @param {Record<string, any>} data - Bản đồ ghế đã bị chiếm
 * @param {number} count - Số lượng ghế khách muốn đặt liền nhau (1 - 20)
 * @returns {string[] | null} Mảng mã ghế liền kề tối ưu nhất, hoặc null nếu không còn đủ chỗ liền nhau
 */
export function findGroup(data, count) {
  // Thứ tự ưu tiên hàng ghế: VIP trung tâm trước, rồi đến Standard
  const preferredRows = ["E", "D", "F", "C", "B", "G", "A"];

  for (const row of preferredRows) {
    const availableRowSeats = seats.filter((s) => s.row === row);
    // Tính toán độ lệch so với vị trí trung tâm cột 10 để chọn ghế cân đối giữa màn hình
    const potentialStartIndices = Array.from({ length: 21 - count }, (_, i) => i).sort(
      (a, b) => Math.abs(a + count / 2 - 10) - Math.abs(b + count / 2 - 10),
    );

    for (const startIndex of potentialStartIndices) {
      const candidateGroup = availableRowSeats.slice(startIndex, startIndex + count);
      // Kiểm tra xem tất cả các ghế trong cụm này có hoàn toàn trống hay không
      if (
        candidateGroup.length === count &&
        candidateGroup.every((seat) => !data[seat.id])
      ) {
        return candidateGroup.map((seat) => seat.id);
      }
    }
  }
  return null;
}
export const findOptimalGroupSeats = findGroup;
