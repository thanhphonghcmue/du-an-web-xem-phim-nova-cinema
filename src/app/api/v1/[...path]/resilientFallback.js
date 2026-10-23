/** Local development demo store only. Not an outage fallback for configured NestJS.
 * Data is in memory; unsupported features return an explicit error.
 */
import { NextResponse } from "next/server";
import {
  movies as artwork,
  cinemas as defaultCinemas,
} from "../../../../data.js";

// Khởi tạo danh mục phòng chiếu dự phòng
const fallbackRooms = defaultCinemas.flatMap((c) => [
  {
    id: `${c.id}-r1`,
    cinemaId: c.id,
    name: "Phòng Laser 01",
    roomType: "STANDARD_2D",
  },
  {
    id: `${c.id}-r2`,
    cinemaId: c.id,
    name: "Phòng IMAX Laser 02",
    roomType: "IMAX_70MM_LASER",
  },
]);

// Khởi tạo danh mục suất chiếu dự phòng
const fallbackShowtimes = defaultCinemas.flatMap((c) =>
  artwork.slice(0, 6).flatMap((m, mi) =>
    [0, 1, 2, 3].map((dayOffset) => {
      const date = new Date(Date.now() + dayOffset * 86400000);
      date.setHours(10 + mi * 2, 30, 0, 0);
      return {
        id: `st-${c.id}-${m.id}-${dayOffset}`,
        movieId: m.id,
        roomId: `${c.id}-r1`,
        startTime: date.toISOString(),
        endTime: new Date(date.getTime() + 120 * 60000).toISOString(),
        baseTicketPrice: "95000.00",
      };
    }),
  ),
);

// Danh mục bắp nước dự phòng
const defaultCombos = [
  {
    id: "combo-1",
    name: "Solo Combo 69K",
    description: "1 bắp ngọt lớn + 1 Coca-Cola tươi",
    price: "69000.00",
    isActive: true,
  },
  {
    id: "combo-2",
    name: "Duo Combo 99K",
    description: "1 bắp phô mai lớn + 2 Coca-Cola tươi",
    price: "99000.00",
    isActive: true,
  },
  {
    id: "combo-3",
    name: "Party Combo 199K",
    description: "2 bắp khổng lồ mix vị + 4 nước ngọt + 1 snack khoai tây",
    price: "199000.00",
    isActive: true,
  },
];

// Bộ nhớ trong lưu trữ dữ liệu người dùng (In-Memory Database)
const usersStore = new Map([
  [
    "admin@nova.local",
    {
      id: "usr_admin_01",
      email: "admin@nova.local",
      password: "nova@12345",
      fullName: "Quản Trị Viên NOVA",
      role: "ADMIN",
      cMemberTier: "PLATINUM",
      cMemberPoints: 9999,
      phone: "0901234567",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  [
    "staff@nova.local",
    {
      id: "usr_staff_01",
      email: "staff@nova.local",
      password: "nova@12345",
      fullName: "Nhân Viên Soát Vé - NV01",
      role: "STAFF",
      cMemberTier: "GOLD",
      cMemberPoints: 1200,
      phone: "0912345678",
      createdAt: "2026-01-15T00:00:00.000Z",
    },
  ],
  [
    "customer@nova.local",
    {
      id: "usr_cust_01",
      email: "customer@nova.local",
      password: "nova@12345",
      fullName: "Khách Hàng Thân Thiết NOVA",
      role: "CUSTOMER",
      cMemberTier: "SILVER",
      cMemberPoints: 450,
      phone: "0987654321",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
]);

// Ảnh mã QR SVG mẫu chuẩn hiển thị ngay lập tức
const sampleQrBase64 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140"><rect width="140" height="140" fill="#ffffff" rx="10"/><g fill="#111111"><rect x="15" y="15" width="35" height="35" rx="4"/><rect x="22" y="22" width="21" height="21" fill="#fff"/><rect x="27" y="27" width="11" height="11"/><rect x="90" y="15" width="35" height="35" rx="4"/><rect x="97" y="22" width="21" height="21" fill="#fff"/><rect x="102" y="27" width="11" height="11"/><rect x="15" y="90" width="35" height="35" rx="4"/><rect x="22" y="97" width="21" height="21" fill="#fff"/><rect x="27" y="102" width="11" height="11"/><rect x="60" y="20" width="20" height="10"/><rect x="60" y="40" width="10" height="20"/><rect x="60" y="70" width="20" height="20"/><rect x="90" y="60" width="35" height="15"/><rect x="90" y="90" width="15" height="35"/><rect x="115" y="105" width="10" height="20"/></g><text x="70" y="132" font-size="9" font-family="system-ui,sans-serif" font-weight="bold" text-anchor="middle" fill="#E50914">NOVA CINEMA</text></svg>',
  );

// Bộ nhớ trong lưu trữ đơn đặt vé
const bookingsStore = new Map([
  [
    "ord_sample_paid",
    {
      id: "ord_sample_paid",
      code: "NV-889214",
      orderCode: "NV-889214",
      showtimeId: fallbackShowtimes[0]?.id || "st-landmark81-dune-0",
      status: "PAID",
      totalAmount: 190000,
      discountAmount: 0,
      finalAmount: 190000,
      expiredAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      seats: [
        { seatId: "F7", row: "F", column: 7, price: 95000, status: "SOLD" },
        { seatId: "F8", row: "F", column: 8, price: 95000, status: "SOLD" },
      ],
      combos: [
        {
          comboId: "combo-1",
          name: "Solo Combo 69K",
          quantity: 1,
          price: 69000,
        },
      ],
      movieTitle: "Dune: Hành Tinh Cát 2",
      cinemaName: "NOVA Landmark 81",
      roomName: "Phòng Laser 01",
      customerEmail: "customer@nova.local",
      customerName: "Khách Hàng Thân Thiết NOVA",
    },
  ],
]);

// Bộ nhớ trong lưu trữ vé điện tử
const sampleHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ticketsStore = new Map([
  [
    "tk_sample_01",
    {
      id: "tk_sample_01",
      bookingId: "ord_sample_paid",
      code: "TK-90218",
      orderCode: "NV-889214",
      seatLabel: "F7, F8",
      seats: [
        { label: "F7", type: "VIP", price: "95000" },
        { label: "F8", type: "VIP", price: "95000" },
      ],
      combos: [{ name: "Solo Combo 69K", quantity: 1, unitPrice: "69000" }],
      movie: "Dune: Hành Tinh Cát 2",
      movieTitle: "Dune: Hành Tinh Cát 2",
      cinema: "NOVA Landmark 81",
      cinemaName: "NOVA Landmark 81",
      room: "Phòng Laser 01",
      roomName: "Phòng Laser 01",
      startTime: new Date(Date.now() + 7200000).toISOString(),
      endTime: new Date(Date.now() + 15000000).toISOString(),
      amount: "190000",
      currency: "VND",
      ticketHash: sampleHash,
      qrHash: sampleHash,
      qrCodeBase64: sampleQrBase64,
      isCheckedIn: false,
      checkedInAt: null,
      status: "VALID",
      customerEmail: "customer@nova.local",
    },
  ],
]);

/**
 * Mã hóa dữ liệu người dùng thành JWT token giả lập an toàn
 */
function createMockToken(user) {
  const payload = JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.fullName,
    tier: user.cMemberTier,
    points: user.cMemberPoints,
  });
  return "mock_" + Buffer.from(payload).toString("base64url");
}

/**
 * Giải mã thông tin người dùng từ token trong cookie
 */
function decodeUserFromToken(token) {
  if (!token || !token.startsWith("mock_")) return null;
  try {
    const raw = Buffer.from(token.slice(5), "base64url").toString("utf8");
    const data = JSON.parse(raw);
    const existing = usersStore.get(data.email?.toLowerCase());
    if (existing) return existing;
    return {
      id: data.sub || "usr_guest",
      email: data.email,
      fullName: data.name || data.email?.split("@")[0] || "Thành viên",
      role: data.role || "CUSTOMER",
      cMemberTier: data.tier || "SILVER",
      cMemberPoints: data.points || 0,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Thiết lập các Cookie xác thực an toàn HttpOnly
 */
function setAuthCookies(response, user, remember = true) {
  const token = createMockToken(user);
  const options = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  };
  const maxAge = remember ? 604800 : undefined; // 7 ngày
  response.cookies.set("nova_access", token, {
    ...options,
    ...(maxAge ? { maxAge: 86400 } : {}),
  });
  response.cookies.set("nova_refresh", token + "_rf", {
    ...options,
    ...(maxAge ? { maxAge } : {}),
  });
  response.cookies.set("nova_remember", remember ? "1" : "0", {
    ...options,
    ...(maxAge ? { maxAge } : {}),
  });
}

/**
 * Xóa sạch toàn bộ Cookie khi đăng xuất
 */
function clearAuthCookies(response) {
  for (const name of ["nova_access", "nova_refresh", "nova_remember"]) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });
  }
}

/**
 * Sinh sơ đồ ghế 96 chỗ tiêu chuẩn (Hàng A-H, Cột 1-12)
 */
function generateSeatMap(showtimeId) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const seats = [];

  // Lấy các ghế đã đặt từ đơn hàng của suất chiếu này
  const soldSet = new Set(["F7", "F8", "D5", "D6"]);
  for (const b of bookingsStore.values()) {
    if (b.showtimeId === showtimeId && ["PAID", "HOLDING"].includes(b.status)) {
      for (const s of b.seats || []) {
        soldSet.add(s.seatId);
      }
    }
  }

  for (const row of rows) {
    for (let col = 1; col <= 12; col++) {
      const seatId = `${row}${col}`;
      let type = "STANDARD";
      let price = 95000;

      if (["E", "F", "G"].includes(row)) {
        type = "VIP";
        price = 115000;
      } else if (row === "H") {
        type = "SWEETBOX";
        price = 150000;
      }

      const isSold = soldSet.has(seatId);
      seats.push({
        seatId,
        row,
        column: col,
        type,
        price,
        status: isSold ? "SOLD" : "AVAILABLE",
      });
    }
  }

  const availableCount = seats.filter((s) => s.status === "AVAILABLE").length;
  const soldCount = seats.filter((s) => s.status === "SOLD").length;

  return {
    asOf: new Date().toISOString(),
    capacity: {
      total: seats.length,
      available: availableCount,
      holding: 0,
      sold: soldCount,
    },
    seats,
  };
}

/**
 * BỘ ĐIỀU PHỐI XỬ LÝ NGOẠI TUYẾN DỰ PHÒNG TOÀN DIỆN (MAIN FALLBACK HANDLER)
 */
export async function handleResilientFallback(
  endpoint,
  request,
  rawBody,
  remember,
  tokenCookie,
) {
  const method = request.method;
  const token =
    tokenCookie ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const currentUser = decodeUserFromToken(token);

  // -------------------------------------------------------------
  // 1. XÁC THỰC: ĐĂNG NHẬP (/auth/login)
  // -------------------------------------------------------------
  if (endpoint === "/auth/login" && method === "POST") {
    let email = "";
    let password = "";
    try {
      const parsed = JSON.parse(rawBody || "{}");
      email = (parsed.email || "").trim().toLowerCase();
      password = (parsed.password || "").trim();
    } catch {
      // bỏ qua
    }

    const user = usersStore.get(email);

    // Demo credentials still belong to their individual account.
    const isPasswordCorrect = Boolean(user) && user.password === password;

    if (!user || !isPasswordCorrect) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CREDENTIALS",
          message:
            "Email hoặc mật khẩu không chính xác. Mật khẩu chuẩn là: nova@12345",
        },
        { status: 401 },
      );
    }

    const { password: _pw, ...safeUser } = user;
    const res = NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        expiresIn: 86400,
        refreshExpiresIn: 604800,
      },
    });
    setAuthCookies(res, safeUser, remember);
    return res;
  }

  // -------------------------------------------------------------
  // 2. XÁC THỰC: ĐĂNG KÝ (/auth/register)
  // -------------------------------------------------------------
  if (endpoint === "/auth/register" && method === "POST") {
    let parsed = {};
    try {
      parsed = JSON.parse(rawBody || "{}");
    } catch {
      // bỏ qua
    }

    const cleanEmail = (parsed.email || "").trim().toLowerCase();
    const cleanPassword = (parsed.password || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Email không hợp lệ." },
        { status: 400 },
      );
    }

    if (usersStore.has(cleanEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_EXISTS",
          message:
            "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
        },
        { status: 409 },
      );
    }

    if (cleanPassword.length < 12) {
      return NextResponse.json(
        {
          success: false,
          error: "WEAK_PASSWORD",
          message: "Mật khẩu cần tối thiểu 12 ký tự.",
        },
        { status: 400 },
      );
    }

    const newUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      password: cleanPassword,
      fullName: parsed.fullName || cleanEmail.split("@")[0],
      phone: parsed.phone || "",
      role: "CUSTOMER",
      cMemberTier: "SILVER",
      cMemberPoints: 100,
      createdAt: new Date().toISOString(),
    };
    usersStore.set(cleanEmail, newUser);

    const { password: _p, ...safeUser } = newUser;
    const res = NextResponse.json({
      success: true,
      data: { user: safeUser },
    });
    setAuthCookies(res, safeUser, remember);
    return res;
  }

  // -------------------------------------------------------------
  // 3. XÁC THỰC: ĐĂNG XUẤT (/auth/logout)
  // -------------------------------------------------------------
  if (endpoint === "/auth/logout") {
    const res = NextResponse.json({ success: true, data: null });
    clearAuthCookies(res);
    return res;
  }

  // -------------------------------------------------------------
  // 4. XÁC THỰC: LÀM MỚI PHIÊN (/auth/refresh)
  // -------------------------------------------------------------
  if (endpoint === "/auth/refresh") {
    if (!currentUser) {
      const res = NextResponse.json(
        { message: "Vui lòng đăng nhập lại." },
        { status: 401 },
      );
      clearAuthCookies(res);
      return res;
    }
    const res = NextResponse.json({
      success: true,
      data: {
        user: currentUser,
        expiresIn: 86400,
        refreshExpiresIn: 604800,
      },
    });
    setAuthCookies(res, currentUser, true);
    return res;
  }

  // -------------------------------------------------------------
  // 5. THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (/users/me)
  // -------------------------------------------------------------
  if (endpoint === "/users/me") {
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập lại." },
        { status: 401 },
      );
    }
    return NextResponse.json({
      success: true,
      data: currentUser,
    });
  }

  // -------------------------------------------------------------
  // 6. SƠ ĐỒ GHẾ SUẤT CHIẾU (/showtimes/:id/seats)
  // -------------------------------------------------------------
  if (endpoint.startsWith("/showtimes/") && endpoint.endsWith("/seats")) {
    const parts = endpoint.split("/");
    const showtimeId = parts[2];
    const seatMap = generateSeatMap(showtimeId);
    return NextResponse.json({
      success: true,
      data: seatMap,
    });
  }

  // -------------------------------------------------------------
  // 7. GỢI Ý CỤM GHẾ TRỐNG LIỀN KỀ (/showtimes/:id/group-seat-suggestion)
  // -------------------------------------------------------------
  if (endpoint.includes("/group-seat-suggestion")) {
    return NextResponse.json({
      success: true,
      data: {
        seats: ["E7", "E8"],
        row: "E",
        totalAmount: 230000,
      },
    });
  }

  // -------------------------------------------------------------
  // 8. ĐẶT GIỮ GHẾ 5 PHÚT (/bookings/hold)
  // -------------------------------------------------------------
  if (endpoint === "/bookings/hold" && method === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      // bỏ qua
    }

    const seatIds = Array.isArray(payload.seatIds)
      ? payload.seatIds
      : ["F7", "F8"];
    const showtimeId = payload.showtimeId || "st-landmark81-dune-0";
    const bookingId = "ord_" + Math.random().toString(36).substring(2, 9);
    const code = "NV-" + Math.floor(100000 + Math.random() * 900000);

    const seatItems = seatIds.map((id) => ({
      seatId: id,
      row: id.charAt(0) || "F",
      column: parseInt(id.slice(1)) || 7,
      price: ["E", "F", "G"].includes(id.charAt(0)) ? 115000 : 95000,
      status: "HOLDING",
    }));

    const ticketTotal = seatItems.reduce((acc, s) => acc + s.price, 0);
    const booking = {
      id: bookingId,
      code,
      orderCode: code,
      showtimeId,
      status: "HOLDING",
      totalAmount: ticketTotal,
      discountAmount: 0,
      finalAmount: ticketTotal,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      seats: seatItems,
      combos: payload.combos || [],
      customerEmail: currentUser?.email || "customer@nova.local",
      customerName: currentUser?.fullName || "Khách Hàng NOVA",
      movieTitle: "Dune: Hành Tinh Cát 2",
      cinemaName: "NOVA Landmark 81",
      roomName: "Phòng Laser 01",
    };

    bookingsStore.set(bookingId, booking);

    return NextResponse.json({
      success: true,
      data: booking,
    });
  }

  // -------------------------------------------------------------
  // 9. LẤY CHI TIẾT ĐƠN ĐẶT (/bookings/:id)
  // -------------------------------------------------------------
  if (
    endpoint.startsWith("/bookings/") &&
    !endpoint.includes("/cancel") &&
    !endpoint.endsWith("/me")
  ) {
    const id = endpoint.split("/")[2];
    const booking =
      bookingsStore.get(id) || bookingsStore.get("ord_sample_paid");
    return NextResponse.json({
      success: true,
      data: booking,
    });
  }

  // -------------------------------------------------------------
  // 10. HỦY GIỮ CHỖ TRẢ GHẾ (/bookings/:id/cancel)
  // -------------------------------------------------------------
  if (endpoint.includes("/cancel")) {
    const id = endpoint.split("/")[2];
    const b = bookingsStore.get(id);
    if (b) {
      b.status = "CANCELLED";
    }
    return NextResponse.json({
      success: true,
      data: { message: "Đã hủy giữ chỗ thành công." },
    });
  }

  // -------------------------------------------------------------
  // 11. DANH SÁCH ĐƠN CỦA TÔI (/bookings/me)
  // -------------------------------------------------------------
  if (endpoint === "/bookings/me") {
    const list = Array.from(bookingsStore.values());
    return NextResponse.json({
      success: true,
      data: {
        items: list,
        meta: { totalPages: 1, totalItems: list.length, page: 1, limit: 100 },
      },
    });
  }

  // -------------------------------------------------------------
  // 12. TẠO LIÊN KẾT THANH TOÁN SANDBOX (/payments/create-sandbox-url)
  // -------------------------------------------------------------
  if (endpoint === "/payments/create-sandbox-url" && method === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      // bỏ qua
    }
    const bookingId = payload.bookingId || "ord_sample_paid";
    const returnUrl = payload.returnUrl || "/";
    const sandboxUrl = new URL(returnUrl, request.url);
    sandboxUrl.searchParams.set("status", "PAID");
    sandboxUrl.searchParams.set("bookingId", bookingId);
    sandboxUrl.searchParams.set("orderId", bookingId);

    return NextResponse.json({
      success: true,
      data: { url: sandboxUrl.toString() },
    });
  }

  // -------------------------------------------------------------
  // 13. HOÀN TẤT THANH TOÁN 1 CHẠM SANDBOX (/payments/sandbox/complete)
  // -------------------------------------------------------------
  if (endpoint === "/payments/sandbox/complete") {
    // Chuyển trạng thái đơn sang PAID và tạo vé QR
    for (const b of bookingsStore.values()) {
      if (b.status === "HOLDING") {
        b.status = "PAID";
        const tkId = "tk_" + Math.random().toString(36).substring(2, 9);
        const code = "TK-" + Math.floor(10000 + Math.random() * 90000);
        const orderCode = b.orderCode || b.code || "NV-889214";
        ticketsStore.set(tkId, {
          id: tkId,
          bookingId: b.id,
          code,
          orderCode,
          seatLabel: b.seats
            .map(
              (s) =>
                `${s.row || s.seatId?.charAt(0)}${s.column || s.seatId?.slice(1)}`,
            )
            .join(", "),
          seats: b.seats.map((s) => ({
            label: `${s.row || s.seatId?.charAt(0)}${s.column || s.seatId?.slice(1)}`,
            type: "VIP",
            price: String(s.price || 95000),
          })),
          combos: b.combos || [],
          movie: b.movieTitle || "Dune: Hành Tinh Cát 2",
          movieTitle: b.movieTitle || "Dune: Hành Tinh Cát 2",
          cinema: b.cinemaName || "NOVA Landmark 81",
          cinemaName: b.cinemaName || "NOVA Landmark 81",
          room: b.roomName || "Phòng Laser 01",
          roomName: b.roomName || "Phòng Laser 01",
          startTime: new Date(Date.now() + 7200000).toISOString(),
          endTime: new Date(Date.now() + 15000000).toISOString(),
          amount: String(b.finalAmount || b.totalAmount || 190000),
          currency: "VND",
          ticketHash: sampleHash,
          qrHash: sampleHash,
          qrCodeBase64: sampleQrBase64,
          isCheckedIn: false,
          checkedInAt: null,
          status: "VALID",
          customerEmail: b.customerEmail || "customer@nova.local",
        });
      }
    }
    return NextResponse.json({
      success: true,
      data: {
        status: "PAID",
        message: "Thanh toán giả lập Sandbox thành công.",
      },
    });
  }

  // -------------------------------------------------------------
  // 14. TRẠNG THÁI THANH TOÁN (/payments/:id/status)
  // -------------------------------------------------------------
  if (endpoint.startsWith("/payments/") && endpoint.endsWith("/status")) {
    return NextResponse.json({
      success: true,
      data: { status: "PAID" },
    });
  }

  // -------------------------------------------------------------
  // 15. DANH SÁCH VÉ CỦA TÔI (/tickets/me)
  // -------------------------------------------------------------
  if (endpoint === "/tickets/me") {
    const list = Array.from(ticketsStore.values());
    return NextResponse.json({
      success: true,
      data: {
        items: list,
        meta: { totalPages: 1, totalItems: list.length, page: 1, limit: 100 },
      },
    });
  }

  // -------------------------------------------------------------
  // 16. TẢI FILE LỊCH CHIẾU XEM PHIM (.ICS) (/tickets/:id/calendar)
  // -------------------------------------------------------------
  if (endpoint.includes("/calendar")) {
    const icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NOVA CINEMA//VI\r\nBEGIN:VEVENT\r\nSUMMARY:Xem phim Dune 2 - NOVA Cinema\r\nDESCRIPTION:Vé xem phim tại NOVA Landmark 81\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nova-ticket.ics"',
      },
    });
  }

  // -------------------------------------------------------------
  // 17. NHÂN VIÊN SOÁT VÉ QR (/staff/check-in)
  // -------------------------------------------------------------
  if (endpoint === "/staff/check-in" && method === "POST") {
    return NextResponse.json({
      success: true,
      data: {
        success: true,
        movie: "Dune: Hành Tinh Cát 2",
        cinema: "NOVA Landmark 81 · Phòng Laser 01",
        seats: [{ label: "F7" }, { label: "F8" }],
        checkedInAt: new Date().toISOString(),
      },
    });
  }

  // -------------------------------------------------------------
  // 18. QUẢN TRỊ ADMIN: TỔNG QUAN HỆ THỐNG (/admin/reports/overview)
  // -------------------------------------------------------------
  if (endpoint === "/admin/reports/overview") {
    const paidBookings = Array.from(bookingsStore.values());
    return NextResponse.json({
      success: true,
      data: {
        todayRevenue: 15420000,
        totalBookings: 128,
        recentBookings: paidBookings.map((b) => ({
          id: b.id,
          orderCode: b.code,
          customer: b.customerName || "Khách Hàng NOVA",
          movie: b.movieTitle || "Dune: Hành Tinh Cát 2",
          cinema: b.cinemaName || "NOVA Landmark 81",
          room: b.roomName || "Phòng Laser 01",
          totalAmount: b.finalAmount || 190000,
          status: b.status,
          createdAt: b.createdAt,
        })),
      },
    });
  }

  // -------------------------------------------------------------
  // 19. QUẢN TRỊ ADMIN: BÁO CÁO DOANH THU (/admin/reports/revenue)
  // -------------------------------------------------------------
  if (endpoint === "/admin/reports/revenue") {
    return NextResponse.json({
      success: true,
      data: {
        netRevenue: 185600000,
        ticketRevenue: 154200000,
        comboRevenue: 31400000,
        discountAmount: 12500000,
        paidBookingCount: 248,
        bookings: Array.from(bookingsStore.values()),
      },
    });
  }

  // -------------------------------------------------------------
  // 20. QUẢN TRỊ ADMIN: DANH SÁCH TÀI KHOẢN (/admin/reports/users)
  // -------------------------------------------------------------
  if (endpoint === "/admin/reports/users") {
    return NextResponse.json({
      success: true,
      data: Array.from(usersStore.values()),
    });
  }

  // -------------------------------------------------------------
  // 21. QUẢN TRỊ ADMIN: DỌN DẸP OUTBOX (/admin/reports/purge-outbox)
  // -------------------------------------------------------------
  if (endpoint === "/admin/reports/purge-outbox") {
    return NextResponse.json({
      success: true,
      data: {
        message: "Đã dọn dẹp các thông báo Outbox cũ thành công.",
        purged: 0,
      },
    });
  }

  // -------------------------------------------------------------
  // 22. TRẠNG THÁI HẠ TẦNG (/health)
  // -------------------------------------------------------------
  if (endpoint === "/health") {
    return NextResponse.json({
      success: true,
      data: {
        status: "demo",
        mode: "standalone",
        checks: {
          postgres: { status: "not_configured" },
          redis: { status: "not_configured" },
          queue: { status: "not_configured" },
          realtime: { status: "not_configured" },
        },
      },
    });
  }

  // -------------------------------------------------------------
  // 23. DANH MỤC PHIM, RẠP, SUẤT CHIẾU, COMBO
  // -------------------------------------------------------------
  if (endpoint === "/movies") {
    const list = artwork.map((m) => ({
      ...m,
      artId: m.id,
      status: m.status || "now",
      durationMinutes: m.duration,
      ageRating: m.age,
    }));
    return NextResponse.json({
      success: true,
      data: { items: list, meta: { totalPages: 1, totalItems: list.length } },
    });
  }

  if (endpoint === "/cinemas") {
    return NextResponse.json({
      success: true,
      data: {
        items: defaultCinemas,
        meta: { totalPages: 1, totalItems: defaultCinemas.length },
      },
    });
  }

  if (endpoint === "/rooms") {
    return NextResponse.json({
      success: true,
      data: {
        items: fallbackRooms,
        meta: { totalPages: 1, totalItems: fallbackRooms.length },
      },
    });
  }

  if (endpoint === "/showtimes") {
    return NextResponse.json({
      success: true,
      data: {
        items: fallbackShowtimes,
        meta: { totalPages: 1, totalItems: fallbackShowtimes.length },
      },
    });
  }

  if (endpoint === "/combos") {
    return NextResponse.json({
      success: true,
      data: {
        items: defaultCombos,
        meta: { totalPages: 1, totalItems: defaultCombos.length },
      },
    });
  }

  // Unsupported demo features must never appear to have succeeded.
  return NextResponse.json(
    {
      success: false,
      error: "DEMO_ENDPOINT_UNAVAILABLE",
      message:
        "Chức năng này cần backend NestJS. Hãy chạy npm run dev:full để sử dụng.",
    },
    { status: 501 },
  );
}
