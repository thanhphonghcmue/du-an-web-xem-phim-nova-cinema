/**
 * Standalone Backend Server for NOVA Cinema
 * Listens on port 4000 and serves all /api/v1/* endpoints required by the Next.js BFF proxy.
 * Eliminates external database/Docker dependency when running fullstack locally.
 */
const http = require("node:http");
const { createHash } = require("node:crypto");
const { resolve } = require("node:path");
const { readFileSync } = require("node:fs");

const root = resolve(__dirname, "..");
const discovery = JSON.parse(
  readFileSync(resolve(root, "content/cinema.json"), "utf8"),
);
const {
  programmeWindow,
  filmDay,
  dayKey,
  midnight,
  DAY,
} = require(resolve(root, "content/programme-calendar.cjs"));

const id = (key) => {
  const bytes = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// 1. Movies (24 titles)
const originalMovies = [
  {
    id: "dune",
    title: "Dune: Hành Tinh Cát 2",
    durationMinutes: 166,
    ageRating: "T16",
    status: "NOW_SHOWING",
    posterUrl: "/images/dune-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    releaseDate: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "kong",
    title: "Godzilla x Kong: Đế Chế Mới",
    durationMinutes: 115,
    ageRating: "T13",
    status: "NOW_SHOWING",
    posterUrl: "/images/kong-art.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=lV1OOlGwExM",
    releaseDate: "2024-03-29T00:00:00.000Z",
  },
  {
    id: "mai",
    title: "Mai",
    durationMinutes: 131,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/mai-title.svg",
    trailerUrl: "https://www.youtube.com/watch?v=EX6clvId19s",
    releaseDate: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "panda",
    title: "Kung Fu Panda 4",
    durationMinutes: 94,
    ageRating: "P",
    status: "NOW_SHOWING",
    posterUrl: "/images/panda-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=_inKs4eeHiI",
    releaseDate: "2024-03-08T00:00:00.000Z",
  },
  {
    id: "exhuma",
    title: "Quật Mộ Trùng Ma",
    durationMinutes: 134,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/exhuma-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=H2O193v3jkM",
    releaseDate: "2024-02-22T00:00:00.000Z",
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    durationMinutes: 180,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/oppenheimer-art.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    releaseDate: "2023-07-21T00:00:00.000Z",
  },
];

const catalogMovies = [
  ...originalMovies.map((m) => ({
    ...m,
    id: id(`movie:${m.id}`),
    key: m.id,
  })),
  ...discovery.movies.map((m) => ({
    id: id(`movie:${m.id}`),
    key: m.id,
    title: m.title,
    durationMinutes: m.duration,
    ageRating: m.age,
    status: m.status === "soon" ? "COMING_SOON" : "NOW_SHOWING",
    posterUrl: m.poster || m.localPoster,
    trailerUrl: m.trailer
      ? `https://www.youtube.com/watch?v=${m.trailer}`
      : undefined,
    releaseDate: `${m.year || 2024}-01-01T00:00:00.000Z`,
  })),
];

// 2. Cinemas
const cinemas = [
  {
    id: id("cinema:landmark"),
    key: "landmark",
    name: "NOVA Landmark 81",
    city: "TP. Hồ Chí Minh",
    address: "720A Điện Biên Phủ, Bình Thạnh",
  },
  {
    id: id("cinema:westlake"),
    key: "westlake",
    name: "NOVA West Lake",
    city: "Hà Nội",
    address: "272 Võ Chí Công, Tây Hồ",
  },
  {
    id: id("cinema:sala"),
    key: "sala",
    name: "NOVA Sala",
    city: "TP. Hồ Chí Minh",
    address: "10 Mai Chí Thọ, Thủ Đức",
  },
  {
    id: id("cinema:danang"),
    key: "danang",
    name: "NOVA Riverside",
    city: "Đà Nẵng",
    address: "910 Ngô Quyền, Sơn Trà",
  },
];

// 3. Rooms & Showtimes Generation
const window = programmeWindow();
const rooms = [];
const showtimes = [];

const nowPlayingFilms = catalogMovies.filter((m) => m.status === "NOW_SHOWING");
const comingSoonFilms = catalogMovies.filter((m) => m.status === "COMING_SOON");

for (const cinema of cinemas) {
  const cRooms = [];
  // 16 halls per cinema for now-showing
  for (let hall = 0; hall < 16; hall++) {
    const roomId = id(`room:advance:${cinema.key}:${hall}`);
    const rType =
      hall % 4 === 0
        ? "IMAX_70MM_LASER"
        : hall % 4 === 1
          ? "DOLBY_ATMOS"
          : "STANDARD_2D";
    const rName = `NOVA ${hall % 4 === 0 ? "IMAX" : hall % 4 === 1 ? "Dolby" : "Laser"} Studio ${String(hall + 1).padStart(2, "0")}`;
    const room = {
      id: roomId,
      cinemaId: cinema.id,
      name: rName,
      roomType: rType,
      totalSeats: 160,
    };
    rooms.push(room);
    cRooms.push(room);

    // 4 periods per day across all days in window
    for (let day = 0; day <= window.daysAhead; day++) {
      const baseDay = window.today + day * DAY;
      const plans = [9, 13, 17, 21].map((hour, slot) => {
        const movie =
          nowPlayingFilms[
            (hall + (slot % 2) * Math.ceil(nowPlayingFilms.length / 2)) %
              nowPlayingFilms.length
          ];
        const startTime = new Date(baseDay + (hour * 60 + (hall % 3) * 15) * 60000);
        const endTime = new Date(
          startTime.getTime() + (movie.durationMinutes + 15) * 60000,
        );
        return { movie, startTime, endTime };
      });

      for (const [slot, plan] of plans.entries()) {
        const showId = id(
          `showtime:advance:${roomId}:${dayKey(plan.startTime)}:${slot}`,
        );
        showtimes.push({
          id: showId,
          movieId: plan.movie.id,
          roomId,
          startTime: plan.startTime.toISOString(),
          endTime: plan.endTime.toISOString(),
          baseTicketPrice: rType === "STANDARD_2D" ? "90000.00" : "105000.00",
        });
      }
    }
  }

  // Dedicated rooms for early presale coming-soon films
  for (const [index, movie] of comingSoonFilms.entries()) {
    for (let side = 0; side < 2; side++) {
      const roomId = id(`room:presale:${cinema.key}:${index}:${side}`);
      const rType = side === 0 ? "STANDARD_2D" : "DOLBY_ATMOS";
      const room = {
        id: roomId,
        cinemaId: cinema.id,
        name: `NOVA Presale Hall ${String(index * 2 + side + 1).padStart(2, "0")}`,
        roomType: rType,
        totalSeats: 160,
      };
      rooms.push(room);

      for (let day = 0; day <= window.daysAhead; day++) {
        const baseDay = window.today + day * DAY;
        for (const plan of filmDay(movie, side, baseDay)) {
          const showId = id(
            `showtime:presale:${movie.key}:${roomId}:${dayKey(plan.startTime)}:${side}`,
          );
          showtimes.push({
            id: showId,
            movieId: movie.id,
            roomId,
            startTime: plan.startTime.toISOString(),
            endTime: plan.endTime.toISOString(),
            baseTicketPrice: side === 0 ? "90000.00" : "105000.00",
          });
        }
      }
    }
  }
}

// 4. Combos
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

// In-Memory Data Stores
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

const sampleQrBase64 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140"><rect width="140" height="140" fill="#ffffff" rx="10"/><g fill="#111111"><rect x="15" y="15" width="35" height="35" rx="4"/><rect x="22" y="22" width="21" height="21" fill="#fff"/><rect x="27" y="27" width="11" height="11"/><rect x="90" y="15" width="35" height="35" rx="4"/><rect x="97" y="22" width="21" height="21" fill="#fff"/><rect x="102" y="27" width="11" height="11"/><rect x="15" y="90" width="35" height="35" rx="4"/><rect x="22" y="97" width="21" height="21" fill="#fff"/><rect x="27" y="102" width="11" height="11"/><rect x="60" y="20" width="20" height="10"/><rect x="60" y="40" width="10" height="20"/><rect x="60" y="70" width="20" height="20"/><rect x="90" y="60" width="35" height="15"/><rect x="90" y="90" width="15" height="35"/><rect x="115" y="105" width="10" height="20"/></g><text x="70" y="132" font-size="9" font-family="system-ui,sans-serif" font-weight="bold" text-anchor="middle" fill="#E50914">NOVA CINEMA</text></svg>',
  );

const bookingsStore = new Map();
const ticketsStore = new Map();

function generateSeatMap(showtimeId) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const seats = [];
  const soldSet = new Set(["F7", "F8", "D5", "D6"]);

  for (const b of bookingsStore.values()) {
    if (b.showtimeId === showtimeId && ["PAID", "HOLDING"].includes(b.status)) {
      for (const s of b.seats || []) soldSet.add(s.seatId);
    }
  }

  for (const row of rows) {
    for (let col = 1; col <= 20; col++) {
      const seatId = `${row}${col}`;
      let type = "STANDARD";
      let price = 95000;
      if (row === "H") {
        type = "SWEETBOX";
        price = 150000;
      } else if (["C", "D", "E", "F", "G"].includes(row)) {
        type = "VIP";
        price = 115000;
      }
      seats.push({
        seatId,
        id: seatId,
        seatRow: row,
        seatColumn: col,
        row,
        column: col,
        type,
        seatType: type,
        price,
        status: soldSet.has(seatId) ? "SOLD" : "AVAILABLE",
      });
    }
  }

  const foundShow = showtimes.find((s) => s.id === showtimeId) || showtimes[0];
  const availableCount = seats.filter((s) => s.status === "AVAILABLE").length;
  const soldCount = seats.filter((s) => s.status === "SOLD").length;

  return {
    showtimeId: foundShow?.id || showtimeId,
    roomId: foundShow?.roomId || rooms[0]?.id,
    startTime: foundShow?.startTime || new Date(Date.now() + 3600000).toISOString(),
    canBook: true,
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

// HTTP Server
const port = Number(process.env.NOVA_API_PORT || process.env.PORT || 4000);

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://127.0.0.1:${port}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Read request body
  let rawBody = "";
  for await (const chunk of req) rawBody += chunk;
  let body = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      /* ignore */
    }
  }

  const json = (data, status = 200, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
      ...headers,
    });
    res.end(JSON.stringify(data));
  };

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
    });
    res.end();
    return;
  }

  // 1. Health & Runtime
  if (pathname === "/api/v1/health" || pathname === "/health") {
    return json({
      success: true,
      data: {
        status: "ok",
        mode: "backend",
        checks: {
          postgres: { status: "ready" },
          redis: { status: "ready" },
          queue: { status: "ready" },
          realtime: { status: "ready" },
        },
      },
    });
  }

  if (pathname === "/api/v1/runtime" || pathname === "/runtime") {
    return json({ success: true, data: { mode: "backend" } });
  }

  // 2. Programme Snapshot (Unified)
  if (pathname === "/api/v1/showtimes/programme" || pathname === "/showtimes/programme") {
    return json({
      success: true,
      data: {
        movies: catalogMovies,
        cinemas,
        rooms,
        combos: defaultCombos,
        showtimes,
        asOf: new Date(window.today).toISOString(),
        until: new Date(window.end).toISOString(),
      },
    });
  }

  // 3. Movies
  if (pathname === "/api/v1/movies" || pathname === "/movies") {
    return json({
      success: true,
      data: {
        items: catalogMovies,
        meta: { totalPages: 1, totalItems: catalogMovies.length },
      },
    });
  }

  // 4. Cinemas
  if (pathname === "/api/v1/cinemas" || pathname === "/cinemas") {
    return json({
      success: true,
      data: {
        items: cinemas,
        meta: { totalPages: 1, totalItems: cinemas.length },
      },
    });
  }

  // 5. Rooms
  if (pathname === "/api/v1/rooms" || pathname === "/rooms") {
    return json({
      success: true,
      data: {
        items: rooms,
        meta: { totalPages: 1, totalItems: rooms.length },
      },
    });
  }

  // 6. Showtimes (Filter & Pagination)
  if (pathname === "/api/v1/showtimes" || pathname === "/showtimes") {
    const page = Math.max(1, Number(parsedUrl.searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(200, Number(parsedUrl.searchParams.get("limit")) || 100));
    const movieId = parsedUrl.searchParams.get("movieId");
    const cinemaId = parsedUrl.searchParams.get("cinemaId");
    const roomId = parsedUrl.searchParams.get("roomId");
    const date = parsedUrl.searchParams.get("date");

    let filtered = showtimes;
    if (movieId) filtered = filtered.filter((s) => s.movieId === movieId);
    if (cinemaId) {
      const cRoomIds = new Set(rooms.filter((r) => r.cinemaId === cinemaId).map((r) => r.id));
      filtered = filtered.filter((s) => cRoomIds.has(s.roomId));
    }
    if (roomId) filtered = filtered.filter((s) => s.roomId === roomId);
    if (date) filtered = filtered.filter((s) => dayKey(s.startTime) === date);

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const items = filtered.slice((page - 1) * limit, page * limit);

    return json({
      success: true,
      data: {
        items,
        meta: { page, limit, totalPages, totalItems },
      },
    });
  }

  // 7. Single Showtime
  if (pathname.startsWith("/api/v1/showtimes/") && !pathname.includes("/seats") && !pathname.includes("/group-seat-suggestion")) {
    const showId = pathname.split("/")[4];
    const found = showtimes.find((s) => s.id === showId);
    if (found) return json({ success: true, data: found });
    return json({ success: false, message: "Showtime not found" }, 404);
  }

  // 8. Showtime Seats Map
  if (pathname.includes("/showtimes/") && pathname.endsWith("/seats")) {
    const parts = pathname.split("/");
    const showtimeId = parts[parts.indexOf("showtimes") + 1];
    return json({ success: true, data: generateSeatMap(showtimeId) });
  }

  // 9. Group suggestions
  if (pathname.includes("/group-seat-suggestion")) {
    return json({
      success: true,
      data: { seats: ["E7", "E8"], row: "E", totalAmount: 230000 },
    });
  }

  // 10. Bookings: Hold
  if (pathname.endsWith("/bookings/hold") && method === "POST") {
    const seatIds = Array.isArray(body.seatIds) ? body.seatIds : ["F7", "F8"];
    const showtimeId = body.showtimeId || showtimes[0]?.id;
    const foundShow = showtimes.find((s) => s.id === showtimeId) || showtimes[0];
    const foundMovie = catalogMovies.find((m) => m.id === foundShow?.movieId) || catalogMovies[0];
    const foundRoom = rooms.find((r) => r.id === foundShow?.roomId) || rooms[0];
    const foundCinema = cinemas.find((c) => c.id === foundRoom?.cinemaId) || cinemas[0];

    const bookingId = "ord_" + Math.random().toString(36).substring(2, 9);
    const code = "NV-" + Math.floor(100000 + Math.random() * 900000);

    const seatItems = seatIds.map((sid) => {
      const row = sid.charAt(0) || "F";
      const col = parseInt(sid.slice(1)) || 1;
      let price = 95000;
      let type = "STANDARD";
      if (row === "H") {
        price = 150000;
        type = "SWEETBOX";
      } else if (["C", "D", "E", "F", "G"].includes(row)) {
        price = 115000;
        type = "VIP";
      }
      return { seatId: sid, row, column: col, type, price, status: "HOLDING" };
    });

    const ticketTotal = seatItems.reduce((acc, s) => acc + s.price, 0);

    const comboPayload = Array.isArray(body.comboItems) ? body.comboItems : Array.isArray(body.combos) ? body.combos : [];
    const combos = comboPayload
      .map((item) => {
        const found = defaultCombos.find((c) => c.id === item.comboId);
        const qty = Number(item.quantity) || 0;
        if (!found || qty <= 0) return null;
        return { comboId: found.id, name: found.name, quantity: qty, price: Number(found.price) };
      })
      .filter(Boolean);

    const comboTotal = combos.reduce((acc, c) => acc + c.price * c.quantity, 0);

    const subtotal = ticketTotal + comboTotal;
    let couponDiscount = 0;
    const rawCoupon = (body.couponCode || "").trim().toUpperCase();
    if (rawCoupon) {
      const validCoupons = {
        NOVA20: { type: "FIXED", val: 20000 },
        CINEMA10: { type: "PERCENT", val: 10 },
        U22: { type: "FIXED", val: 25000, min: 50000 },
        CHAOBANMOI: { type: "FIXED", val: 30000, min: 100000 },
        VIP50: { type: "FIXED", val: 50000, min: 150000 },
      };
      const def = validCoupons[rawCoupon];
      if (!def) {
        return json({
          success: false,
          statusCode: 400,
          errorCode: "COUPON_INVALID",
          message: "Mã giảm giá không hợp lệ.",
        }, 400);
      }
      if (def.min && subtotal < def.min) {
        return json({
          success: false,
          statusCode: 400,
          errorCode: "COUPON_MINIMUM_NOT_MET",
          message: `Mã ${rawCoupon} yêu cầu tổng đơn sau ưu đãi hội viên tối thiểu ${def.min.toLocaleString("vi-VN")}đ. Hãy thêm vé/bắp nước hoặc gỡ mã để tiếp tục.`,
        }, 400);
      }
      if (def.type === "FIXED") {
        couponDiscount = Math.min(def.val, subtotal);
      } else {
        couponDiscount = Math.round(subtotal * (def.val / 100));
      }
    }

    const finalAmount = Math.max(0, subtotal - couponDiscount);

    const booking = {
      id: bookingId,
      code,
      orderCode: code,
      showtimeId,
      status: "HOLDING",
      totalTicketAmount: ticketTotal,
      totalComboAmount: comboTotal,
      totalAmount: subtotal,
      discountAmount: couponDiscount,
      finalAmount,
      membershipTier: "SILVER",
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      seats: seatItems,
      combos,
      customerEmail: "customer@nova.local",
      customerName: "Khách Hàng Thân Thiết NOVA",
      movieTitle: foundMovie.title,
      cinemaName: foundCinema.name,
      roomName: foundRoom.name,
    };

    bookingsStore.set(bookingId, booking);
    return json({ success: true, data: booking }, 201);
  }

  // 11. Bookings Details / Cancel / Me
  if (pathname.includes("/bookings/") && pathname.endsWith("/cancel")) {
    const id = pathname.split("/")[pathname.split("/").indexOf("bookings") + 1];
    const b = bookingsStore.get(id);
    if (b) b.status = "CANCELLED";
    return json({ success: true, data: { message: "Đã hủy giữ chỗ thành công." } });
  }

  if (pathname.endsWith("/bookings/me")) {
    const list = Array.from(bookingsStore.values());
    return json({
      success: true,
      data: { items: list, meta: { totalPages: 1, totalItems: list.length, page: 1, limit: 100 } },
    });
  }

  if (pathname.includes("/bookings/")) {
    const parts = pathname.split("/");
    const id = parts[parts.indexOf("bookings") + 1];
    const b = bookingsStore.get(id);
    if (b) return json({ success: true, data: b });
    return json({ success: true, data: Array.from(bookingsStore.values())[0] || null });
  }

  // 12. Payments
  if (pathname.endsWith("/payments/create-sandbox-url") && method === "POST") {
    const bookingId = body.bookingId || Array.from(bookingsStore.keys())[0] || "ord_sample";
    const returnUrl = body.returnUrl || "/";
    const sandboxUrl = new URL(returnUrl, `http://127.0.0.1:${port}`);
    sandboxUrl.searchParams.set("status", "PAID");
    sandboxUrl.searchParams.set("bookingId", bookingId);
    sandboxUrl.searchParams.set("orderId", bookingId);
    return json({ success: true, data: { url: sandboxUrl.toString() } });
  }

  if (pathname.endsWith("/payments/sandbox/complete")) {
    let targetBooking = null;
    const targetId = body.bookingId || body.orderId;
    if (targetId) targetBooking = bookingsStore.get(targetId);
    if (!targetBooking) {
      const allHold = Array.from(bookingsStore.values()).filter((b) => b.status === "HOLDING");
      targetBooking = allHold[allHold.length - 1];
    }
    if (targetBooking) {
      targetBooking.status = "PAID";
      for (const s of targetBooking.seats || []) s.status = "SOLD";
      const tkId = "tk_" + Math.random().toString(36).substring(2, 9);
      const code = "TK-" + Math.floor(10000 + Math.random() * 90000);
      ticketsStore.set(tkId, {
        id: tkId,
        bookingId: targetBooking.id,
        code,
        orderCode: targetBooking.orderCode || targetBooking.code,
        seatLabel: (targetBooking.seats || []).map((s) => s.seatId).join(", "),
        seats: targetBooking.seats || [],
        combos: targetBooking.combos || [],
        movieTitle: targetBooking.movieTitle,
        cinemaName: targetBooking.cinemaName,
        roomName: targetBooking.roomName,
        amount: String(targetBooking.finalAmount || targetBooking.totalAmount),
        currency: "VND",
        qrCodeBase64: sampleQrBase64,
        isCheckedIn: false,
        status: "VALID",
        customerEmail: targetBooking.customerEmail,
      });
    }
    return json({
      success: true,
      data: { status: "PAID", message: "Thanh toán thành công. Vé QR đã được phát hành." },
    });
  }

  if (pathname.includes("/payments/") && pathname.endsWith("/status")) {
    const parts = pathname.split("/");
    const id = parts[parts.indexOf("payments") + 1];
    const b = bookingsStore.get(id);
    return json({
      success: true,
      data: {
        bookingId: id,
        bookingStatus: b?.status || "HOLDING",
        canPay: b ? ["PENDING", "HOLDING"].includes(b.status) : true,
        amount: String(b?.finalAmount || 190000),
        status: b?.status === "PAID" ? "SUCCESS" : "PENDING",
      },
    });
  }

  // 13. Tickets
  if (pathname.endsWith("/tickets/me")) {
    return json({
      success: true,
      data: { items: Array.from(ticketsStore.values()), meta: { totalPages: 1, totalItems: ticketsStore.size } },
    });
  }

  // 14. Auth
  if (pathname.endsWith("/auth/login") && method === "POST") {
    const email = (body.email || "").toLowerCase().trim();
    const user = usersStore.get(email) || {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: email || "customer@nova.local",
      fullName: email.split("@")[0] || "Khách Hàng NOVA",
      role: email.includes("admin") ? "ADMIN" : email.includes("staff") ? "STAFF" : "CUSTOMER",
      cMemberTier: "SILVER",
      cMemberPoints: 200,
      createdAt: new Date().toISOString(),
    };
    return json({
      success: true,
      data: { user, expiresIn: 86400, refreshExpiresIn: 604800 },
    });
  }

  if (pathname.endsWith("/auth/register") && method === "POST") {
    const email = (body.email || "").toLowerCase().trim();
    const newUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email,
      fullName: body.fullName || email.split("@")[0],
      phone: body.phone || "",
      role: "CUSTOMER",
      cMemberTier: "SILVER",
      cMemberPoints: 100,
      createdAt: new Date().toISOString(),
    };
    usersStore.set(email, newUser);
    return json({ success: true, data: { user: newUser } });
  }

  if (pathname.endsWith("/auth/refresh")) {
    const user = Array.from(usersStore.values())[0];
    return json({ success: true, data: { user, expiresIn: 86400, refreshExpiresIn: 604800 } });
  }

  if (pathname.endsWith("/auth/logout")) {
    return json({ success: true, data: null });
  }

  if (pathname.endsWith("/users/me")) {
    const user = Array.from(usersStore.values())[0];
    return json({ success: true, data: user });
  }

  // 15. Staff Check-in
  if (pathname.endsWith("/staff/check-in") && method === "POST") {
    return json({
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

  // 16. Admin Reports
  if (pathname.endsWith("/admin/reports/overview")) {
    const paid = Array.from(bookingsStore.values()).filter((b) => b.status === "PAID");
    const totalRev = 15420000 + paid.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);
    return json({
      success: true,
      data: {
        todayRevenue: totalRev,
        totalBookings: 128 + paid.length,
        recentBookings: Array.from(bookingsStore.values()),
      },
    });
  }

  if (pathname.endsWith("/admin/reports/revenue")) {
    const paid = Array.from(bookingsStore.values()).filter((b) => b.status === "PAID");
    const dynamicNet = paid.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);
    return json({
      success: true,
      data: {
        netRevenue: 185600000 + dynamicNet,
        ticketRevenue: 154200000 + dynamicNet,
        comboRevenue: 31400000,
        discountAmount: 12500000,
        paidBookingCount: 248 + paid.length,
        bookings: Array.from(bookingsStore.values()),
      },
    });
  }

  if (pathname.endsWith("/admin/reports/users")) {
    return json({ success: true, data: Array.from(usersStore.values()) });
  }

  if (pathname.endsWith("/admin/reports/purge-outbox")) {
    return json({ success: true, data: { message: "Purged", purged: 0 } });
  }

  if (pathname.endsWith("/combos")) {
    return json({
      success: true,
      data: { items: defaultCombos, meta: { totalPages: 1, totalItems: defaultCombos.length } },
    });
  }

  return json({ success: false, message: "Endpoint not found" }, 404);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[NOVA Backend] Standalone persistent server listening at http://127.0.0.1:${port}`);
  console.log(`[NOVA Backend] Loaded ${catalogMovies.length} movies, ${cinemas.length} cinemas, ${rooms.length} rooms, ${showtimes.length} showtimes.`);
});
