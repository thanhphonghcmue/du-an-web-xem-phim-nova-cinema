// Single-process, disposable RAM adapter. It mirrors the public NestJS contracts;
// PostgreSQL/Redis remain the production concurrency and persistence boundary.
const http = require("node:http");
const {
  randomUUID,
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
  scrypt,
} = require("node:crypto");
const { promisify } = require("node:util");
const { toDataURL } = require("qrcode");
const {
  encodeProgramme,
  REUSE_SECONDS,
  ProgrammeTransportTooLarge,
} = require("../programme-codec.cjs");
const derive = promisify(scrypt);
const HOLD_MS = 300000;
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
const fail = (status, code, message, details) => {
  throw new ApiError(status, code, message, details);
};
const assert = (
  ok,
  code = "VALIDATION_ERROR",
  message = "Dữ liệu chưa hợp lệ.",
  status = 400,
) => {
  if (!ok) fail(status, code, message);
};
const money = (value) => {
  const s = String(value);
  assert(/^\d{1,12}(\.\d{1,2})?$/.test(s));
  const [a, b = ""] = s.split(".");
  return BigInt(a) * 100n + BigInt(b.padEnd(2, "0"));
};
const fixed = (n) => `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
const iso = (n) => new Date(n).toISOString();
const publicUser = ({ password, passwordHash, status, ...user }) => user;
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const stableId = (key) => {
  const b = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
function pageOf(items, query) {
  const page = Number(query.get("page") || 1),
    limit = Number(query.get("limit") || 20);
  assert(
    Number.isInteger(page) &&
      page > 0 &&
      Number.isInteger(limit) &&
      limit > 0 &&
      limit <= 100,
  );
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: {
      page,
      limit,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}
function createMemoryServer(input) {
  const maps = {};
  for (const key of ["movies", "cinemas", "rooms", "showtimes", "combos"])
    maps[key] = new Map(input[key].map((row) => [row.id, { ...row }]));
  const users = new Map(),
    sessions = new Map(),
    orders = new Map(),
    tickets = new Map(),
    claims = new Map(),
    idempotency = new Map(),
    payments = new Map(),
    layouts = new Map(),
    audit = [];
  const programmeSnapshots = new Map(),
    programmePointers = new Map();
  function programme(days) {
    const stamp = now();
    return {
      movies: [...maps.movies.values()].filter((m) => m.status !== "ENDED"),
      cinemas: [...maps.cinemas.values()],
      rooms: [...maps.rooms.values()],
      combos: [...maps.combos.values()].filter((c) => c.isActive),
      showtimes: [...maps.showtimes.values()].filter(
        (s) =>
          Date.parse(s.startTime) > stamp &&
          Date.parse(s.startTime) < stamp + days * 86400000 &&
          maps.movies.get(s.movieId)?.status !== "ENDED",
      ),
      asOf: iso(stamp),
      until: iso(stamp + days * 86400000),
    };
  }
  const secret = randomBytes(48),
    now = input.now || Date.now;
  const passwordsReady = Promise.all(
    input.accounts.map(async (entry, index) => {
      const salt = randomBytes(16).toString("hex");
      const hash = await derive(entry.password, salt, 32);
      const user = {
        ...entry,
        status: entry.status || "ACTIVE",
        id: stableId(`memory:user:${entry.email}`),
        passwordHash: `${salt}:${hash.toString("hex")}`,
        cMemberTier:
          entry.cMemberTier === "PLATINUM" ? "DIAMOND" : entry.cMemberTier,
        createdAt: iso(now()),
      };
      delete user.password;
      users.set(user.id, user);
    }),
  );
  const model = (kind, id) =>
    maps[kind].get(id) ||
    fail(
      404,
      `${kind.toUpperCase()}_NOT_FOUND`,
      "Không tìm thấy dữ liệu đã chọn.",
    );
  function auth(request, roles) {
    const token = (request.headers.authorization || "").replace(/^Bearer /, "");
    const session = sessions.get(token);
    const user =
      session && session.kind === "access" && session.expires > now()
        ? users.get(session.userId)
        : null;
    if (!user) fail(401, "UNAUTHORIZED", "Vui lòng đăng nhập lại.");
    activeAccount(user);
    if (roles && !roles.includes(user.role))
      fail(
        403,
        "FORBIDDEN",
        "Tài khoản không có quyền thực hiện thao tác này.",
      );
    return user;
  }
  function activeAccount(user) {
    if (!user || user.status !== "ACTIVE")
      fail(
        403,
        "ACCOUNT_DISABLED",
        "Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ hỗ trợ.",
      );
  }
  function session(user) {
    activeAccount(user);
    const accessToken = randomBytes(32).toString("hex"),
      refreshToken = randomBytes(48).toString("hex");
    sessions.set(accessToken, {
      userId: user.id,
      kind: "access",
      expires: now() + 900000,
    });
    sessions.set(refreshToken, {
      userId: user.id,
      kind: "refresh",
      expires: now() + 604800000,
    });
    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: 900,
      refreshExpiresIn: 604800,
    };
  }
  function physical(roomId) {
    if (layouts.has(roomId)) return layouts.get(roomId);
    const room = model("rooms", roomId),
      count = room.totalSeats || 0;
    return Array.from({ length: count }, (_, i) => {
      const row = String.fromCharCode(65 + Math.floor(i / 20)),
        column = (i % 20) + 1;
      return {
        id: stableId(`memory:seat:${roomId}:${row}:${column}`),
        roomId,
        seatRow: row,
        seatColumn: column,
        seatType:
          row === "H"
            ? "SWEETBOX"
            : ["C", "D", "E", "F"].includes(row)
              ? "VIP"
              : "STANDARD",
        priceModifier:
          row === "H"
            ? "1.50"
            : ["C", "D", "E", "F"].includes(row)
              ? "1.20"
              : "1.00",
      };
    });
  }
  function status(order) {
    return ["HOLDING", "PENDING"].includes(order.status) &&
      Date.parse(order.expiredAt) <= now()
      ? "EXPIRED"
      : order.status;
  }
  function release(order, next) {
    order.status = next;
    order.updatedAt = iso(now());
    for (const seat of order.seats) {
      const map = claims.get(order.showtimeId);
      if (map?.get(seat.seatId)?.bookingId === order.id)
        map.delete(seat.seatId);
      if (seat.status === "HOLDING") seat.status = "AVAILABLE";
    }
  }
  function owned(id, user) {
    const order = orders.get(id);
    if (!order || order.userId !== user.id)
      fail(404, "BOOKING_NOT_FOUND", "Không tìm thấy đơn của bạn.");
    return order;
  }
  function bookingData(order) {
    const { userId, couponCode, ...row } = order;
    const projected = status(order);
    return {
      ...row,
      status: projected,
      seats: row.seats.map((seat) => ({
        ...seat,
        status:
          projected === "EXPIRED" && seat.status === "HOLDING"
            ? "AVAILABLE"
            : seat.status,
      })),
    };
  }
  function seatMap(id) {
    const show = model("showtimes", id),
      room = model("rooms", show.roomId),
      movie = model("movies", show.movieId),
      active = claims.get(id);
    const base = money(show.baseTicketPrice);
    const seats = physical(room.id).map((seat) => {
      const owner = active?.get(seat.id);
      const state =
        owner && (owner.status === "SOLD" || owner.expires > now())
          ? owner.status
          : "AVAILABLE";
      const multiplier =
        seat.seatType === "VIP"
          ? 120n
          : seat.seatType === "SWEETBOX"
            ? 150n
            : 100n;
      return {
        seatId: seat.id,
        row: seat.seatRow,
        column: seat.seatColumn,
        type: seat.seatType,
        price: fixed((base * multiplier + 50n) / 100n),
        status: state,
        expiresAt: state === "HOLDING" ? iso(owner.expires) : null,
      };
    });
    return {
      showtimeId: id,
      roomId: room.id,
      startTime: show.startTime,
      asOf: iso(now()),
      canBook: movie.status !== "ENDED" && Date.parse(show.startTime) > now(),
      capacity: {
        total: seats.length,
        available: seats.filter((s) => s.status === "AVAILABLE").length,
        holding: seats.filter((s) => s.status === "HOLDING").length,
        sold: seats.filter((s) => s.status === "SOLD").length,
      },
      seats,
    };
  }
  function orphan(map, ids) {
    const chosen = new Set(ids),
      rows = new Map();
    for (const s of map.seats) {
      if (!rows.has(s.row)) rows.set(s.row, []);
      rows.get(s.row).push(s);
    }
    for (const row of rows.values()) {
      let run = [];
      const check = () => {
        if (run.length > 1) {
          let free = [];
          for (const s of [...run, null]) {
            if (s && !chosen.has(s.seatId)) free.push(s);
            else {
              if (free.length === 1) return free[0];
              free = [];
            }
          }
        }
        return null;
      };
      for (const s of [...row, null]) {
        if (
          s &&
          s.status === "AVAILABLE" &&
          (!run.length || run.at(-1).column + 1 === s.column)
        )
          run.push(s);
        else {
          const bad = check();
          if (bad) return bad;
          run = s && s.status === "AVAILABLE" ? [s] : [];
        }
      }
    }
    return null;
  }
  function group(map, quantity, type) {
    assert(Number.isInteger(quantity) && quantity >= 1 && quantity <= 20);
    assert(map.canBook, "SHOWTIME_STARTED", "Suất đã bắt đầu.", 409);
    assert(!type || ["STANDARD", "VIP", "SWEETBOX"].includes(type));
    const seats = map.seats,
      left = [],
      right = [];
    for (let i = 0; i < seats.length; i++)
      left[i] =
        seats[i].status === "AVAILABLE"
          ? 1 +
            (i &&
            seats[i - 1].row === seats[i].row &&
            seats[i - 1].column + 1 === seats[i].column
              ? left[i - 1]
              : 0)
          : 0;
    for (let i = seats.length - 1; i >= 0; i--)
      right[i] =
        seats[i].status === "AVAILABLE"
          ? 1 +
            (seats[i + 1]?.row === seats[i].row &&
            seats[i + 1]?.column === seats[i].column + 1
              ? right[i + 1]
              : 0)
          : 0;
    let run = 0,
      best = null;
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i],
        previous = seats[i - 1];
      if (seat.status !== "AVAILABLE" || (type && seat.type !== type)) {
        run = 0;
        continue;
      }
      run =
        previous &&
        previous.row === seat.row &&
        previous.column + 1 === seat.column
          ? run + 1
          : 1;
      if (run < quantity) continue;
      const start = i - quantity + 1,
        first = seats[start];
      if (
        seats[start - 1]?.row === first.row &&
        seats[start - 1]?.column === first.column - 1 &&
        left[start - 1] === 1
      )
        continue;
      if (
        seats[i + 1]?.row === seat.row &&
        seats[i + 1]?.column === seat.column + 1 &&
        right[i + 1] === 1
      )
        continue;
      if (
        (first.type === "SWEETBOX" && first.column % 2 === 0) ||
        (seat.type === "SWEETBOX" && seat.column % 2 === 1)
      )
        continue;
      const score = Math.abs((first.column + seat.column) / 2 - 10.5);
      if (!best || score < best.score) best = { start, score };
    }
    return best
      ? seats.slice(best.start, best.start + quantity).map((s) => s.seatId)
      : [];
  }
  function hold(user, body, key) {
    assert(
      body.couponCode === undefined ||
        (typeof body.couponCode === "string" &&
          body.couponCode.trim().length >= 1 &&
          body.couponCode.trim().length <= 32),
    );
    assert(body.comboItems === undefined || Array.isArray(body.comboItems));
    assert(
      uuid.test(body.showtimeId) &&
        Array.isArray(body.seatIds) &&
        body.seatIds.length >= 1 &&
        body.seatIds.length <= 20 &&
        new Set(body.seatIds).size === body.seatIds.length &&
        body.seatIds.every((s) => typeof s === "string" && uuid.test(s)),
    );
    assert(
      Object.keys(body).every((k) =>
        ["showtimeId", "seatIds", "comboItems", "couponCode"].includes(k),
      ),
    );
    const canonical = JSON.stringify(body),
      keyId = key ? `${user.id}:${key}` : null,
      prior = keyId && idempotency.get(keyId);
    if (prior) {
      if (prior.body !== canonical)
        fail(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Lệnh giữ ghế đã có nội dung khác.",
        );
      return bookingData(orders.get(prior.id));
    }
    const map = seatMap(body.showtimeId);
    assert(
      map.canBook,
      "SHOWTIME_STARTED",
      "Suất đã bắt đầu. Hãy chọn suất khác.",
      409,
    );
    const byId = new Map(map.seats.map((s) => [s.seatId, s]));
    const ids = new Set(body.seatIds);
    for (const id of [...ids]) {
      const seat = byId.get(id);
      assert(seat, "SEAT_WRONG_ROOM", "Ghế không thuộc phòng của suất này.");
      if (seat.type === "SWEETBOX") {
        const pair = map.seats.find(
          (s) =>
            s.row === seat.row &&
            s.column === (seat.column % 2 ? seat.column + 1 : seat.column - 1),
        );
        assert(pair, "SWEETBOX_PAIR_MISSING", "Ghế đôi thiếu vị trí liền kề.");
        ids.add(pair.seatId);
      }
    }
    assert(ids.size <= 20, "SEAT_LIMIT_EXCEEDED", "Mỗi đơn tối đa 20 ghế.");
    const conflictingIds = [...ids].filter(
      (id) => byId.get(id)?.status !== "AVAILABLE",
    );
    if (conflictingIds.length)
      fail(
        409,
        "SEAT_UNAVAILABLE",
        "Ghế vừa được người khác giữ. Hãy chọn lại.",
        { seatIds: conflictingIds },
      );
    const bad = orphan(map, [...ids]);
    if (bad)
      fail(409, "ORPHAN_SEAT", "Không để lại một ghế trống lẻ.", {
        seatId: bad.seatId,
      });
    const combos = body.comboItems || [];
    assert(
      Array.isArray(combos) &&
        combos.length <= 20 &&
        combos.every(
          (c) => c && typeof c === "object" && uuid.test(c.comboId),
        ) &&
        new Set(combos.map((c) => c.comboId)).size === combos.length,
    );
    const lines = combos.map((line) => {
      const item = model("combos", line.comboId);
      assert(
        item.isActive &&
          Number.isInteger(line.quantity) &&
          line.quantity >= 1 &&
          line.quantity <= 20,
      );
      return {
        comboId: item.id,
        quantity: line.quantity,
        unitPrice: fixed(money(item.price)),
      };
    });
    const seats = [...ids].sort().map((id) => ({
      seatId: id,
      roomId: map.roomId,
      price: byId.get(id).price,
      status: "HOLDING",
    }));
    const ticketTotal = seats.reduce((sum, s) => sum + money(s.price), 0n),
      comboTotal = lines.reduce(
        (sum, c) => sum + money(c.unitPrice) * BigInt(c.quantity),
        0n,
      ),
      subtotal = ticketTotal + comboTotal,
      rate = { SILVER: 50n, GOLD: 70n, DIAMOND: 100n }[user.cMemberTier] || 50n;
    let discount = (subtotal * rate + 500n) / 1000n;
    const code = body.couponCode?.trim().toUpperCase();
    if (code) {
      const coupon = {
        NOVA20: [20000, 0],
        U22: [25000, 50000],
        CHAOBANMOI: [30000, 100000],
        VIP50: [50000, 150000],
        CINEMA10: [0, 0],
      }[code];
      assert(coupon, "COUPON_INVALID", "Mã giảm giá không hợp lệ.");
      const eligible = subtotal - discount;
      assert(
        eligible >= BigInt(coupon[1]) * 100n,
        "COUPON_MINIMUM_NOT_MET",
        "Đơn chưa đủ giá trị áp dụng mã.",
      );
      const cut =
        code === "CINEMA10"
          ? (eligible * 10n + 50n) / 100n
          : BigInt(coupon[0]) * 100n;
      discount += cut > eligible ? eligible : cut;
    }
    assert(
      subtotal <= 99999999999999n,
      "BOOKING_AMOUNT_OUT_OF_RANGE",
      "Tổng tiền vượt giới hạn.",
    );
    assert(
      orders.size < 10000,
      "DEMO_CAPACITY",
      "Kho demo đã đầy, hãy dùng PostgreSQL.",
      503,
    );
    const timestamp = now(),
      id = randomUUID();
    const order = {
      id,
      userId: user.id,
      orderCode: `NOVA-${randomBytes(16).toString("hex")}`,
      showtimeId: map.showtimeId,
      status: "HOLDING",
      expiredAt: iso(timestamp + HOLD_MS),
      createdAt: iso(timestamp),
      updatedAt: iso(timestamp),
      totalTicketAmount: fixed(ticketTotal),
      totalComboAmount: fixed(comboTotal),
      discountAmount: fixed(discount),
      finalAmount: fixed(subtotal - discount),
      baseTicketPrice: model("showtimes", map.showtimeId).baseTicketPrice,
      membershipTier: user.cMemberTier,
      discountRate: (Number(rate) / 1000).toFixed(3),
      seats,
      combos: lines,
      couponCode: code,
    };
    // No await occurs between these checks and writes: one synchronous Map commit.
    if (!claims.has(map.showtimeId)) claims.set(map.showtimeId, new Map());
    const active = claims.get(map.showtimeId);
    for (const seat of seats) {
      const old = active.get(seat.seatId);
      if (old && old.expires <= timestamp) {
        const expired = orders.get(old.bookingId);
        if (expired && status(expired) === "EXPIRED")
          release(expired, "EXPIRED");
      }
      active.set(seat.seatId, {
        bookingId: id,
        status: "HOLDING",
        expires: timestamp + HOLD_MS,
      });
    }
    orders.set(id, order);
    if (keyId) idempotency.set(keyId, { body: canonical, id });
    return bookingData(order);
  }
  function state(order) {
    const s = status(order),
      payment = payments.get(order.id);
    return {
      bookingId: order.id,
      bookingStatus: s,
      transactionCode: payment?.transactionCode || null,
      paymentStatus: payment?.status || null,
      amount: order.finalAmount,
      currency: "VND",
      expiredAt: order.expiredAt,
      canPay:
        ["HOLDING", "PENDING"].includes(s) &&
        Date.parse(model("showtimes", order.showtimeId).startTime) > now(),
    };
  }
  function ticketData(ticket, privateFields = true) {
    const order = orders.get(ticket.bookingId),
      show = model("showtimes", order.showtimeId),
      room = model("rooms", show.roomId),
      movie = model("movies", show.movieId),
      cinema = model("cinemas", room.cinemaId),
      byId = new Map(physical(room.id).map((s) => [s.id, s]));
    return {
      id: ticket.id,
      bookingId: order.id,
      showtimeId: show.id,
      orderCode: order.orderCode,
      movie: movie.title,
      cinema: cinema.name,
      room: room.name,
      startTime: show.startTime,
      endTime: show.endTime,
      amount: order.finalAmount,
      currency: "VND",
      seats: order.seats.map((s) => ({
        label: `${byId.get(s.seatId).seatRow}${byId.get(s.seatId).seatColumn}`,
        type: byId.get(s.seatId).seatType,
        price: s.price,
      })),
      combos: order.combos.map((c) => ({
        name: model("combos", c.comboId).name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      isCheckedIn: ticket.isCheckedIn,
      checkedInAt: ticket.checkedInAt,
      ...(privateFields
        ? { ticketHash: ticket.ticketHash, qrCodeBase64: ticket.qrCodeBase64 }
        : {}),
    };
  }
  function issue(order) {
    if ([...tickets.values()].some((t) => t.bookingId === order.id)) return;
    const ticket = {
      id: randomUUID(),
      bookingId: order.id,
      ticketHash: randomBytes(32).toString("hex"),
      qrCodeBase64: "",
      isCheckedIn: false,
      createdAt: iso(now()),
      checkedInAt: null,
    };
    tickets.set(ticket.id, ticket);
    setImmediate(() => {
      toDataURL(ticket.ticketHash, {
        type: "image/png",
        width: 320,
        margin: 4,
        errorCorrectionLevel: "M",
      })
        .then((png) => {
          ticket.qrCodeBase64 = png;
        })
        .catch(() => {
          console.warn(
            "[NOVA RAM] PNG encoding failed; the issued opaque QR remains valid.",
          );
        });
    });
  }
  function digest(domain, fields) {
    return createHmac("sha512", secret)
      .update(`${domain}:${JSON.stringify(fields)}`)
      .digest("hex");
  }
  function verifyCheckout(fields) {
    const expected = digest("checkout.v1", [
      fields.bookingId,
      fields.orderCode,
      fields.transactionCode,
      fields.amount,
      fields.timestamp,
      fields.returnUrl,
    ]);
    assert(
      typeof fields.signature === "string" &&
        /^[a-f\d]{128}$/.test(fields.signature) &&
        timingSafeEqual(
          Buffer.from(expected, "hex"),
          Buffer.from(fields.signature, "hex"),
        ),
      "PAYMENT_SIGNATURE_INVALID",
      "Chữ ký Sandbox không hợp lệ.",
      401,
    );
    const order = orders.get(fields.bookingId);
    assert(
      order &&
        order.orderCode === fields.orderCode &&
        order.finalAmount === fields.amount &&
        payments.get(order.id)?.transactionCode === fields.transactionCode,
      "PAYMENT_MISMATCH",
      "Thông tin thanh toán không khớp.",
      409,
    );
    return order;
  }
  function complete(fields) {
    const order = verifyCheckout(fields),
      payment = payments.get(order.id);
    assert(["SUCCESS", "FAILED", "CANCELLED"].includes(fields.result));
    if (payment.status !== "PENDING") {
      assert(
        payment.outcome === fields.result,
        "PAYMENT_CONFLICT",
        "Thanh toán đã kết thúc với kết quả khác.",
        409,
      );
      return { ...state(order), duplicate: true };
    }
    if (!state(order).canPay) {
      if (status(order) === "EXPIRED") release(order, "EXPIRED");
      payment.status = "CANCELLED";
      fail(
        409,
        "BOOKING_NOT_PAYABLE",
        "Đơn đã hết hạn hoặc không còn thanh toán được.",
      );
    }
    payment.outcome = fields.result;
    if (fields.result === "SUCCESS") {
      order.status = "PAID";
      order.updatedAt = iso(now());
      payment.status = "SUCCESS";
      for (const s of order.seats) {
        s.status = "SOLD";
        claims.get(order.showtimeId).set(s.seatId, {
          bookingId: order.id,
          status: "SOLD",
          expires: Infinity,
        });
      }
      const user = users.get(order.userId);
      user.cMemberPoints += Number(money(order.finalAmount) / 1000000n);
      issue(order);
    } else {
      payment.status = fields.result;
      release(order, "CANCELLED");
    }
    return { ...state(order), duplicate: false };
  }
  function paymentUrl(order, returnUrl, request) {
    assert(
      state(order).canPay,
      "BOOKING_NOT_PAYABLE",
      "Đơn đã hết hạn hoặc kết thúc.",
      409,
    );
    let target;
    try {
      target = new URL(returnUrl);
    } catch {
      fail(400, "RETURN_URL_INVALID", "Địa chỉ quay lại không hợp lệ.");
    }
    const webPort = Number(process.env.NOVA_WEB_PORT || 3000),
      allowed = new Set(
        (
          process.env.PAYMENT_RETURN_ORIGINS ||
          `http://localhost:${webPort},http://127.0.0.1:${webPort}`
        ).split(","),
      );
    assert(
      allowed.has(target.origin) &&
        !target.username &&
        !target.password &&
        !target.hash,
      "RETURN_URL_INVALID",
      "Địa chỉ quay lại không được phép.",
    );
    let payment = payments.get(order.id);
    if (!payment) {
      payment = {
        transactionCode: `NOVA-SB-${randomUUID()}`,
        status: "PENDING",
        timestamp: iso(now()),
        returnUrl: target.href,
      };
      payments.set(order.id, payment);
    }
    const fields = {
      bookingId: order.id,
      orderCode: order.orderCode,
      transactionCode: payment.transactionCode,
      amount: order.finalAmount,
      timestamp: payment.timestamp,
      returnUrl: payment.returnUrl,
    };
    fields.signature = digest("checkout.v1", Object.values(fields));
    const url = new URL(
      "/api/v1/payments/sandbox",
      `http://127.0.0.1:${request.socket.localPort}`,
    );
    url.search = new URLSearchParams(fields).toString();
    return {
      bookingId: order.id,
      transactionCode: payment.transactionCode,
      amount: order.finalAmount,
      currency: "VND",
      expiredAt: order.expiredAt,
      url: url.href,
    };
  }
  const html = (title, content) =>
    `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#080d18;color:#eef3ff;font:16px/1.6 system-ui}main{max-width:900px;margin:auto;background:#142039;border:1px solid #687aa4;border-radius:20px;padding:32px}button,a{display:block;max-width:100%;white-space:normal;overflow-wrap:anywhere;padding:15px;border-radius:9px;background:#d5ef95;color:#18220e;border:0;font:inherit;margin:12px 0;text-decoration:none}button{width:100%;cursor:pointer}input{max-width:100%}.secondary-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sandbox-choice{min-width:0}h1{font-size:clamp(24px,5vw,38px)}small{color:#afc1df}</style><main>${content}</main></html>`;
  function admission(body, user, consume) {
    assert(
      typeof body.ticketHash === "string" &&
        /^[a-f\d]{64}$/.test(body.ticketHash) &&
        uuid.test(body.showtimeId),
    );
    const ticket = [...tickets.values()].find(
      (t) => t.ticketHash === body.ticketHash,
    );
    assert(ticket, "TICKET_NOT_FOUND", "Không tìm thấy vé.", 404);
    const order = orders.get(ticket.bookingId);
    assert(
      order.status === "PAID",
      "TICKET_BOOKING_NOT_PAID",
      "Vé chưa được thanh toán.",
      409,
    );
    assert(
      order.showtimeId === body.showtimeId,
      "TICKET_SHOWTIME_MISMATCH",
      "Vé thuộc suất chiếu khác.",
      409,
    );
    const start = Date.parse(model("showtimes", order.showtimeId).startTime);
    assert(
      now() >= start - 3600000 && now() <= start + 1800000,
      "CHECK_IN_OUTSIDE_WINDOW",
      "Chưa đến hoặc đã hết giờ soát vé.",
      409,
    );
    if (ticket.isCheckedIn)
      fail(409, "TICKET_ALREADY_USED", "Vé đã được sử dụng.", {
        checkedInAt: ticket.checkedInAt,
      });
    if (consume) {
      ticket.isCheckedIn = true;
      ticket.checkedInAt = iso(now());
      ticket.checkedInBy = user.id;
    }
    return ticketData(ticket, false);
  }
  const context = {
    maps,
    users,
    orders,
    tickets,
    layouts,
    audit,
    now,
    auth,
    model,
    physical,
    assert,
    fail,
    money,
    fixed,
    publicUser,
    pageOf,
    stableId,
    status,
    ticketData,
  };
  const admin = require("./admin.cjs").createAdmin(context);
  async function route(request, response, url, body) {
    const path = url.pathname.replace(/^\/api\/v1/, "") || "/",
      method = request.method,
      query = url.searchParams;
    const json = (
      data,
      code = 200,
      message = "Yêu cầu được xử lý thành công.",
    ) => {
      if (
        method !== "GET" &&
        /^\/(movies|cinemas|rooms|seats|showtimes|combos)(\/|$)/.test(path)
      )
        programmePointers.clear();
      return send(response, code, {
        success: true,
        data,
        message,
      });
    };
    if (path === "/health" || path === "/health/live")
      return json({
        status: "ok",
        mode: "memory",
        checks: {
          memory: { status: "ready" },
          postgres: { status: "not_used" },
          redis: { status: "not_used" },
          queue: { status: "not_used" },
          realtime: { status: "polling" },
        },
      });
    if (path === "/runtime") return json({ mode: "backend" });
    if (path === "/auth/register" && method === "POST") {
      assert(
        Object.keys(body).every((key) =>
          ["email", "password", "fullName", "phone"].includes(key),
        ) &&
          typeof body.email === "string" &&
          /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) &&
          typeof body.password === "string" &&
          body.password.length >= 12 &&
          body.password.length <= 128 &&
          typeof body.fullName === "string" &&
          body.fullName.trim().length > 0,
      );
      await passwordsReady;
      const email = body.email.trim().toLowerCase();
      assert(
        ![...users.values()].some((u) => u.email === email),
        "EMAIL_ALREADY_EXISTS",
        "Email đã được sử dụng.",
        409,
      );
      const salt = randomBytes(16).toString("hex"),
        hash = await derive(body.password, salt, 32);
      assert(
        ![...users.values()].some((u) => u.email === email),
        "EMAIL_ALREADY_EXISTS",
        "Email đã được sử dụng.",
        409,
      );
      const user = {
        id: randomUUID(),
        email,
        passwordHash: `${salt}:${hash.toString("hex")}`,
        fullName: body.fullName.trim(),
        phone: body.phone || null,
        role: "CUSTOMER",
        status: "ACTIVE",
        cMemberTier: "SILVER",
        cMemberPoints: 0,
        createdAt: iso(now()),
        updatedAt: iso(now()),
      };
      users.set(user.id, user);
      return json(publicUser(user), 201);
    }
    if (path === "/auth/login" && method === "POST") {
      assert(
        typeof body.email === "string" && typeof body.password === "string",
      );
      await passwordsReady;
      const user = [...users.values()].find(
        (u) => u.email === body.email?.trim().toLowerCase(),
      );
      assert(
        user && typeof body.password === "string",
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu chưa đúng.",
        401,
      );
      const [salt, stored] = user.passwordHash.split(":");
      const candidate = await derive(body.password, salt, 32);
      assert(
        timingSafeEqual(candidate, Buffer.from(stored, "hex")),
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu chưa đúng.",
        401,
      );
      return json(session(user));
    }
    if (path === "/auth/refresh" && method === "POST") {
      const old = sessions.get(body.refreshToken);
      assert(
        old?.kind === "refresh" && old.expires > now(),
        "UNAUTHORIZED",
        "Phiên đăng nhập đã hết hạn.",
        401,
      );
      sessions.delete(body.refreshToken);
      return json(session(users.get(old.userId)));
    }
    if (path === "/auth/logout" && method === "POST") {
      const access = (request.headers.authorization || "").replace(
        /^Bearer /,
        "",
      );
      sessions.delete(access);
      if (body.refreshToken) sessions.delete(body.refreshToken);
      return json(null);
    }
    const accountMatch = path.match(/^\/users\/([a-f0-9-]{36})\/status$/);
    if (accountMatch && method === "PATCH") {
      const actor = auth(request, ["ADMIN"]),
        target = users.get(accountMatch[1]);
      assert(
        Object.keys(body).length === 1 &&
          ["ACTIVE", "LOCKED", "INACTIVE"].includes(body.status),
      );
      if (!target) fail(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
      if (target.id === actor.id || target.role === "ADMIN")
        fail(
          409,
          "ADMIN_ACCOUNT_PROTECTED",
          "Không thể khóa tài khoản quản trị tại đây.",
        );
      target.status = body.status;
      if (target.status !== "ACTIVE")
        for (const [key, entry] of sessions) {
          if (entry.userId === target.id && entry.kind === "refresh")
            sessions.delete(key);
        }
      return json({ id: target.id, status: target.status });
    }
    if (path === "/admin/payments/reconciliation" && method === "GET") {
      auth(request, ["ADMIN"]);
      const reference = query.get("reference") || "";
      assert(
        /^(NOVA-[a-f0-9]{32}|NOVA-SB-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(
          reference,
        ),
      );
      const order = [...orders.values()].find(
        (o) =>
          o.orderCode === reference ||
          payments.get(o.id)?.transactionCode === reference,
      );
      if (!order)
        fail(
          404,
          "PAYMENT_REFERENCE_NOT_FOUND",
          "Không tìm thấy mã đơn hoặc mã giao dịch.",
        );
      const payment = payments.get(order.id),
        ticket = [...tickets.values()].find((t) => t.bookingId === order.id);
      return json({
        bookingId: order.id,
        orderCode: order.orderCode,
        bookingStatus: status(order),
        amount: order.finalAmount,
        expiredAt: order.expiredAt,
        payments: payment
          ? [
              {
                transactionCode: payment.transactionCode,
                status: payment.status,
                amount: order.finalAmount,
                updatedAt: order.updatedAt || order.createdAt,
              },
            ]
          : [],
        ticket: ticket
          ? {
              id: ticket.id,
              isCheckedIn: ticket.isCheckedIn,
              createdAt: ticket.createdAt,
            }
          : null,
        delivery: [],
        canRecoverTicket:
          order.status === "PAID" && payment?.status === "SUCCESS" && !ticket,
      });
    }
    const recoveryMatch = path.match(
      /^\/admin\/payments\/([a-f0-9-]{36})\/recover-ticket$/,
    );
    if (recoveryMatch && method === "POST") {
      auth(request, ["ADMIN"]);
      const order = orders.get(recoveryMatch[1]);
      if (!order) fail(404, "BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt vé.");
      assert(
        order.status === "PAID" &&
          payments.get(order.id)?.status === "SUCCESS" &&
          order.seats.length &&
          order.seats.every((s) => s.status === "SOLD"),
        "PAYMENT_NOT_CONFIRMED",
        "Chỉ khôi phục vé khi thanh toán đã xác nhận thành công và ghế đã bán.",
        409,
      );
      const existing = [...tickets.values()].find(
        (t) => t.bookingId === order.id,
      );
      if (!existing) issue(order);
      return json(
        {
          bookingId: order.id,
          queued: !existing,
          ticketId: existing?.id || null,
        },
        202,
      );
    }
    if (path === "/users/me") {
      const user = auth(request);
      if (method === "PATCH") {
        assert(
          Object.keys(body).every((k) => ["fullName", "phone"].includes(k)),
        );
        if (body.fullName !== undefined) {
          assert(typeof body.fullName === "string" && body.fullName.trim());
          user.fullName = body.fullName.trim();
        }
        if (body.phone !== undefined) user.phone = body.phone;
      }
      return json(publicUser(user));
    }
    if (path === "/showtimes/capacities" && method === "GET") {
      const ids = (query.get("ids") || "").toLowerCase().split(",");
      assert(
        ids.length >= 1 &&
          ids.length <= 50 &&
          new Set(ids).size === ids.length &&
          ids.every((id) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              id,
            ),
          ),
      );
      return json(
        ids
          .filter((id) => maps.showtimes.has(id))
          .map((id) => {
            const map = seatMap(id);
            return { showtimeId: id, ...map.capacity, asOf: map.asOf };
          }),
      );
    }
    if (path === "/showtimes/programme/manifest" && method === "GET") {
      const days = Number(query.get("days") || 60),
        stamp = Date.now();
      assert(Number.isInteger(days) && days >= 1 && days <= 60);
      for (const [id, snapshot] of programmeSnapshots)
        if (Date.parse(snapshot.manifest.expiresAt) <= stamp)
          programmeSnapshots.delete(id);
      const pointer = programmePointers.get(days);
      if (pointer?.until > stamp && programmeSnapshots.has(pointer.id))
        return json(programmeSnapshots.get(pointer.id).manifest);
      let manifest, pages;
      try {
        ({ manifest, pages } = encodeProgramme(programme(days), stamp));
      } catch (error) {
        if (error instanceof ProgrammeTransportTooLarge)
          fail(
            422,
            "PROGRAMME_TRANSPORT_TOO_LARGE",
            "Danh mục vượt giới hạn chia trang; vẫn có thể tải bằng API đầy đủ.",
          );
        throw error;
      }
      const snapshot = { manifest, pages };
      while (programmeSnapshots.size >= 16)
        programmeSnapshots.delete(programmeSnapshots.keys().next().value);
      programmeSnapshots.set(snapshot.manifest.snapshotId, snapshot);
      programmePointers.set(days, {
        id: snapshot.manifest.snapshotId,
        until: stamp + REUSE_SECONDS * 1000,
      });
      return json(snapshot.manifest);
    }
    const chunkPath = path.match(
      /^\/showtimes\/programme\/chunks\/([^/]+)\/(\d+)$/,
    );
    if (chunkPath && method === "GET") {
      assert(uuid.test(chunkPath[1]));
      const index = Number(chunkPath[2]);
      assert(Number.isSafeInteger(index) && index >= 0 && index < 4096);
      const snapshot = programmeSnapshots.get(chunkPath[1].toLowerCase());
      if (!snapshot || Date.parse(snapshot.manifest.expiresAt) <= Date.now())
        fail(
          410,
          "PROGRAMME_SNAPSHOT_EXPIRED",
          "Lịch đã được cập nhật. Vui lòng tải lại.",
        );
      if (index >= snapshot.pages.length)
        fail(404, "PROGRAMME_CHUNK_NOT_FOUND", "Không có phần lịch này.");
      response.setHeader(
        "x-nova-snapshot-expires-at",
        snapshot.manifest.expiresAt,
      );
      response.setHeader(
        "cache-control",
        `private,max-age=${Math.max(0, Math.floor((Date.parse(snapshot.manifest.expiresAt) - Date.now()) / 1000))},immutable`,
      );
      return json(
        snapshot.pages[index],
        200,
        "Request completed successfully.",
      );
    }
    if (path === "/showtimes/programme") {
      const days = Number(query.get("days") || 60);
      assert(Number.isInteger(days) && days >= 1 && days <= 60);
      return json(programme(days));
    }
    let match = path.match(
      /^\/showtimes\/([^/]+)\/(seats|group-seat-suggestion)$/,
    );
    if (match && method === "GET") {
      const map = seatMap(match[1]);
      return json(
        match[2] === "seats"
          ? map
          : {
              showtimeId: map.showtimeId,
              quantity: Number(query.get("quantity") || 2),
              seatType: query.get("seatType") || null,
              seatIds: group(
                map,
                Number(query.get("quantity") || 2),
                query.get("seatType") || "",
              ),
              asOf: map.asOf,
            },
      );
    }
    if (path === "/bookings/hold" && method === "POST")
      return json(
        hold(auth(request), body, request.headers["idempotency-key"]),
        201,
      );
    if (path === "/bookings/me") {
      const user = auth(request);
      return json(
        pageOf(
          [...orders.values()]
            .filter((o) => o.userId === user.id)
            .map(bookingData)
            .filter(
              (o) => !query.get("status") || o.status === query.get("status"),
            )
            .reverse(),
          query,
        ),
      );
    }
    match = path.match(/^\/bookings\/([^/]+)(\/cancel)?$/);
    if (match) {
      const order = owned(match[1], auth(request));
      if (match[2]) {
        assert(method === "POST");
        assert(
          order.status !== "PAID",
          "BOOKING_NOT_CANCELLABLE",
          "Không thể hủy đơn đã thanh toán.",
          409,
        );
        if (["HOLDING", "PENDING"].includes(order.status))
          release(order, status(order) === "EXPIRED" ? "EXPIRED" : "CANCELLED");
      }
      return json(bookingData(order));
    }
    if (path === "/payments/create-sandbox-url" && method === "POST")
      return json(
        paymentUrl(
          owned(body.bookingId, auth(request)),
          body.returnUrl,
          request,
        ),
        201,
      );
    match = path.match(/^\/payments\/([^/]+)\/status$/);
    if (match) return json(state(owned(match[1], auth(request))));
    if (path === "/payments/sandbox" && method === "GET") {
      const fields = Object.fromEntries(query),
        order = verifyCheckout(fields),
        hidden = Object.entries(fields)
          .map(
            ([k, v]) =>
              `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`,
          )
          .join("");
      return send(
        response,
        200,
        html(
          "NOVA Sandbox",
          `<h1>Thanh toán mô phỏng</h1><p>Đơn ${esc(order.orderCode)} · ${esc(order.finalAmount)} VND</p><div class="sandbox-choice"><form method="post" action="/api/v1/payments/sandbox/complete">${hidden}<button name="result" value="SUCCESS">Thanh toán thành công</button><div class="secondary-actions"><button name="result" value="FAILED">Mô phỏng thất bại</button><button name="result" value="CANCELLED">Hủy thanh toán</button></div></form></div><small>Backend RAM dùng thử · không thu tiền thật.</small>`,
        ),
        "text/html; charset=utf-8",
      );
    }
    if (path === "/payments/sandbox/complete" && method === "POST") {
      const result = complete(body);
      return send(
        response,
        200,
        html(
          "Kết quả Sandbox",
          `<h1>Kết quả: ${esc(result.bookingStatus)}</h1><p>Trạng thái được xác nhận bởi máy chủ RAM của phiên chạy này.</p><a href="${esc(body.returnUrl)}">Quay lại ứng dụng</a>`,
        ),
        "text/html; charset=utf-8",
      );
    }
    if (path === "/tickets/me") {
      const user = auth(request);
      return json(
        pageOf(
          [...tickets.values()]
            .filter((t) => orders.get(t.bookingId)?.userId === user.id)
            .filter(
              (t) =>
                !query.has("isCheckedIn") ||
                String(t.isCheckedIn) === query.get("isCheckedIn"),
            )
            .map((t) => ticketData(t))
            .reverse(),
          query,
        ),
      );
    }
    match = path.match(/^\/tickets\/([^/]+)(\/(calendar|confirmation))?$/);
    if (match) {
      const user = auth(request),
        ticket = tickets.get(match[1]);
      assert(
        ticket && orders.get(ticket.bookingId)?.userId === user.id,
        "TICKET_NOT_FOUND",
        "Không tìm thấy vé của bạn.",
        404,
      );
      const data = ticketData(ticket);
      if (match[3] === "calendar") {
        const stamp = (d) =>
          new Date(d)
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d+Z/, "Z");
        const text = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//NOVA RAM//VI",
          "BEGIN:VEVENT",
          `UID:${ticket.id}@nova.local`,
          `DTSTAMP:${stamp(now())}`,
          `DTSTART:${stamp(data.startTime)}`,
          `DTEND:${stamp(data.endTime)}`,
          `SUMMARY:NOVA Cinema`,
          `LOCATION:${data.cinema.replace(/[\r\n,;]/g, " ")}`,
          "END:VEVENT",
          "END:VCALENDAR",
          "",
        ].join("\r\n");
        return send(response, 200, text, "text/calendar; charset=utf-8");
      }
      if (match[3] === "confirmation")
        return json({
          subject: "NOVA · Vé điện tử",
          to: user.email,
          html: `<p>${esc(data.movie)} · ${esc(data.orderCode)}</p><p>Bản xem trước RAM, chưa gửi SMTP.</p>`,
          deliveryStatus: "UNKNOWN",
          acceptedAt: null,
          attempts: 0,
        });
      return json(data);
    }
    if (
      (path === "/staff/verify" || path === "/staff/check-in") &&
      method === "POST"
    )
      return json(
        admission(
          body,
          auth(request, ["ADMIN", "STAFF"]),
          path.endsWith("check-in"),
        ),
      );
    const handled = admin(request, path, query, body, json);
    if (handled !== false) return handled;
    fail(404, "NOT_FOUND", "Chức năng hoặc dữ liệu không tồn tại.");
  }
  function send(
    response,
    status,
    payload,
    type = "application/json; charset=utf-8",
  ) {
    if (response.writableEnded || response.destroyed) return;
    response.statusCode = status;
    response.setHeader("content-type", type);
    response.end(
      type.startsWith("application/json") ? JSON.stringify(payload) : payload,
    );
  }
  const server = http.createServer(async (request, response) => {
    const requestId = randomUUID(),
      started = performance.now();
    let url;
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      return send(response, 400, { success: false, message: "Invalid URL" });
    }
    response.setHeader("cache-control", "no-store");
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-nova-backend", "memory");
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("referrer-policy", "no-referrer");
    if (process.env.NOVA_LOG_REQUESTS !== "false")
      console.log(
        `[NOVA RAM] START ${request.method} ${url.pathname} id=${requestId}`,
      );
    response.once("finish", () => {
      if (process.env.NOVA_LOG_REQUESTS !== "false")
        console.log(
          `[NOVA RAM] ${request.method} ${url.pathname} ${response.statusCode} ${(performance.now() - started).toFixed(1)}ms id=${requestId}`,
        );
    });
    try {
      let body = {};
      if (!["GET", "HEAD"].includes(request.method)) {
        let text = "";
        for await (const chunk of request) {
          text += chunk;
          assert(
            Buffer.byteLength(text) <= 102400,
            "PAYLOAD_TOO_LARGE",
            "Yêu cầu quá lớn.",
            413,
          );
        }
        if (text) {
          if (
            (request.headers["content-type"] || "").includes(
              "application/x-www-form-urlencoded",
            )
          )
            body = Object.fromEntries(new URLSearchParams(text));
          else {
            try {
              body = JSON.parse(text);
            } catch {
              fail(400, "INVALID_JSON", "Dữ liệu JSON chưa hợp lệ.");
            }
          }
        }
        assert(body && typeof body === "object" && !Array.isArray(body));
      }
      await route(request, response, url, body);
    } catch (error) {
      send(response, error.status || 500, {
        success: false,
        statusCode: error.status || 500,
        error: error.code || "INTERNAL_ERROR",
        message: error.status
          ? error.message
          : "Máy chủ chưa xử lý được yêu cầu.",
        ...(error.details ? { details: error.details } : {}),
        requestId,
      });
    }
  });
  server.requestTimeout = 8000;
  server.headersTimeout = 5000;
  return server;
}
module.exports = {
  createMemoryServer,
  ApiError,
  money,
  fixed,
  stableId,
  pageOf,
};
