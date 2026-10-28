// Catalogue/report commands for the disposable RAM adapter. No fabricated totals.
const { randomUUID } = require("node:crypto");
exports.createAdmin = (c) => {
  const {
    maps,
    users,
    orders,
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
    status,
    stableId,
  } = c;
  const values = (kind) => [...maps[kind].values()];
  const words = (value) =>
    String(value || "")
      .toLocaleLowerCase("vi")
      .trim();
  const fields = {
    movies: [
      "title",
      "description",
      "durationMinutes",
      "ageRating",
      "releaseDate",
      "status",
      "posterUrl",
      "trailerUrl",
    ],
    cinemas: ["name", "city", "address"],
    rooms: ["cinemaId", "name", "roomType", "totalSeats"],
    showtimes: ["movieId", "roomId", "startTime", "baseTicketPrice"],
    combos: ["name", "description", "price", "isActive", "imageUrl"],
  };
  const inUse = (roomId) =>
    [...orders.values()].some(
      (o) => model("showtimes", o.showtimeId).roomId === roomId,
    );
  function validate(kind, row, id) {
    if (kind === "movies") {
      assert(
        typeof row.title === "string" &&
          row.title.trim().length > 0 &&
          typeof row.description === "string" &&
          Number.isInteger(row.durationMinutes) &&
          row.durationMinutes >= 1 &&
          row.durationMinutes <= 600 &&
          ["P", "K", "T13", "T16", "T18"].includes(row.ageRating) &&
          ["NOW_SHOWING", "COMING_SOON", "ENDED"].includes(row.status) &&
          Number.isFinite(Date.parse(row.releaseDate)),
      );
      assert(
        !values("movies").some(
          (m) => m.id !== id && words(m.title) === words(row.title),
        ),
        "MOVIE_TITLE_EXISTS",
        "Tên phim đã tồn tại.",
        409,
      );
      row.title = row.title.trim();
    }
    if (kind === "cinemas")
      assert(
        ["name", "city", "address"].every(
          (key) => typeof row[key] === "string" && row[key].trim(),
        ),
      );
    if (kind === "rooms") {
      model("cinemas", row.cinemaId);
      assert(
        typeof row.name === "string" &&
          row.name.trim() &&
          ["STANDARD_2D", "IMAX_70MM_LASER", "DOLBY_ATMOS"].includes(
            row.roomType,
          ) &&
          Number.isInteger(row.totalSeats) &&
          row.totalSeats >= 0 &&
          row.totalSeats <= 300,
      );
      if (id && inUse(id))
        assert(
          row.cinemaId === model("rooms", id).cinemaId &&
            row.totalSeats === model("rooms", id).totalSeats,
          "ROOM_IN_USE",
          "Phòng đang có dữ liệu đặt vé.",
          409,
        );
    }
    if (kind === "combos") {
      assert(
        typeof row.name === "string" &&
          row.name.trim() &&
          typeof row.description === "string" &&
          typeof row.isActive === "boolean",
      );
      row.price = fixed(money(row.price));
    }
    if (kind === "showtimes") {
      const film = model("movies", row.movieId);
      model("rooms", row.roomId);
      assert(
        Number.isFinite(Date.parse(row.startTime)) &&
          Date.parse(row.startTime) > now(),
        "SHOWTIME_INVALID",
        "Giờ chiếu phải ở tương lai.",
      );
      row.startTime = new Date(row.startTime).toISOString();
      row.endTime = new Date(
        Date.parse(row.startTime) + (film.durationMinutes + 15) * 60000,
      ).toISOString();
      row.baseTicketPrice = fixed(money(row.baseTicketPrice));
      assert(
        !values("showtimes").some(
          (s) =>
            s.id !== id &&
            s.roomId === row.roomId &&
            Date.parse(s.startTime) < Date.parse(row.endTime) &&
            Date.parse(s.endTime) > Date.parse(row.startTime),
        ),
        "SHOWTIME_OVERLAP",
        "Phòng đã có suất chiếu trong khoảng giờ này.",
        409,
      );
      if (id)
        assert(
          ![...orders.values()].some(
            (o) =>
              o.showtimeId === id &&
              ["HOLDING", "PENDING", "PAID"].includes(status(o)),
          ),
          "SHOWTIME_HAS_BOOKINGS",
          "Suất đang có vé hoặc ghế giữ.",
          409,
        );
    }
  }
  function report(query) {
    const from = query.get("from"),
      to = query.get("to");
    const valid = (d) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d || "") &&
      Number.isFinite(Date.parse(`${d}T00:00:00Z`)) &&
      new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
    assert(
      valid(from) && valid(to) && from <= to,
      "REPORT_DATE_INVALID",
      "Khoảng ngày báo cáo chưa hợp lệ.",
    );
    const start = Date.parse(`${from}T00:00:00+07:00`),
      end = Date.parse(`${to}T00:00:00+07:00`) + 86400000;
    const paid = [...orders.values()].filter((o) => {
      const show = model("showtimes", o.showtimeId),
        room = model("rooms", show.roomId);
      return (
        o.status === "PAID" &&
        Date.parse(o.createdAt) >= start &&
        Date.parse(o.createdAt) < end &&
        (!query.get("movieId") || show.movieId === query.get("movieId")) &&
        (!query.get("cinemaId") || room.cinemaId === query.get("cinemaId"))
      );
    });
    const sum = (field) =>
      fixed(paid.reduce((n, o) => n + money(o[field]), 0n));
    return {
      ticketRevenue: sum("totalTicketAmount"),
      comboRevenue: sum("totalComboAmount"),
      discountAmount: sum("discountAmount"),
      netRevenue: sum("finalAmount"),
      paidBookingCount: paid.length,
      ticketCount: paid.reduce(
        (n, o) => n + o.seats.filter((s) => s.status === "SOLD").length,
        0,
      ),
    };
  }
  return function route(request, path, query, body, json) {
    const method = request.method;
    let match;
    if (path.startsWith("/admin/")) {
      auth(request, ["ADMIN"]);
      if (path === "/admin/reports/revenue") return json(report(query));
      if (path === "/admin/reports/users")
        return json(
          [...users.values()].map((u) => ({
            ...publicUser(u),
            bookingCount: [...orders.values()].filter((o) => o.userId === u.id)
              .length,
          })),
        );
      if (path === "/admin/reports/purge-outbox")
        return json({ purgedCount: 0, cutoff: new Date(now()).toISOString() });
      if (path === "/admin/audit-logs")
        return json(
          pageOf(
            audit
              .filter(
                (a) =>
                  (!query.get("entityId") ||
                    a.entityId === query.get("entityId")) &&
                  (!query.get("action") || a.action === query.get("action")),
              )
              .slice()
              .reverse(),
            query,
          ),
        );
      if (path === "/admin/reports/overview") {
        return json({
          movieCount: maps.movies.size,
          cinemaCount: maps.cinemas.size,
          roomCount: maps.rooms.size,
          showtimeCount: maps.showtimes.size,
          userCount: users.size,
          bookingCount: orders.size,
          recentBookings: [...orders.values()]
            .reverse()
            .slice(0, 10)
            .map((o) => {
              const show = model("showtimes", o.showtimeId),
                room = model("rooms", show.roomId);
              return {
                id: o.id,
                orderCode: o.orderCode,
                status: status(o),
                customer: users.get(o.userId)?.fullName,
                movie: model("movies", show.movieId).title,
                cinema: model("cinemas", room.cinemaId).name,
                room: room.name,
                finalAmount: o.finalAmount,
                createdAt: o.createdAt,
              };
            }),
        });
      }
      return false;
    }
    if (path === "/users/me/membership") {
      const user = auth(request);
      return json({
        tier: user.cMemberTier,
        points: user.cMemberPoints,
        discountRate: { SILVER: "0.05", GOLD: "0.07", DIAMOND: "0.10" }[
          user.cMemberTier
        ],
      });
    }
    match = path.match(/^\/rooms\/([^/]+)\/seats(\/generate)?$/);
    if (match) {
      auth(request, ["ADMIN"]);
      const room = model("rooms", match[1]);
      if (method === "GET") return json(pageOf(physical(room.id), query));
      assert(method === "POST" && match[2]);
      const { rows, columns, vipRows = [], sweetboxRows = [] } = body;
      assert(
        Array.isArray(rows) &&
          rows.length >= 1 &&
          rows.length <= 15 &&
          new Set(rows).size === rows.length &&
          rows.every((r) => /^[A-O]$/.test(r)) &&
          Number.isInteger(columns) &&
          columns >= 1 &&
          columns <= 24 &&
          rows.length * columns <= 300,
      );
      assert(
        Array.isArray(vipRows) &&
          Array.isArray(sweetboxRows) &&
          [...vipRows, ...sweetboxRows].every((r) => rows.includes(r)) &&
          !vipRows.some((r) => sweetboxRows.includes(r)) &&
          (!sweetboxRows.length || columns % 2 === 0),
        "SWEETBOX_PAIR_REQUIRED",
        "Ghế đôi cần cặp đủ hai chỗ.",
      );
      assert(
        physical(room.id).length === 0 && !inUse(room.id),
        "ROOM_LAYOUT_EXISTS",
        "Chỉ tạo sơ đồ cho phòng trống.",
        409,
      );
      const seats = rows.flatMap((row) =>
        Array.from({ length: columns }, (_, i) => ({
          id: stableId(`memory:seat:${room.id}:${row}:${i + 1}`),
          roomId: room.id,
          seatRow: row,
          seatColumn: i + 1,
          seatType: sweetboxRows.includes(row)
            ? "SWEETBOX"
            : vipRows.includes(row)
              ? "VIP"
              : "STANDARD",
          priceModifier: sweetboxRows.includes(row)
            ? "1.50"
            : vipRows.includes(row)
              ? "1.20"
              : "1.00",
        })),
      );
      layouts.set(room.id, seats);
      room.totalSeats = seats.length;
      return json({ roomId: room.id, totalSeats: seats.length, seats }, 201);
    }
    match = path.match(
      /^\/(movies|cinemas|rooms|showtimes|combos)(?:\/([^/]+))?$/,
    );
    if (!match) return false;
    const [, kind, id] = match;
    if (method === "GET") {
      if (id) return json(model(kind, id));
      if (query.get("includeEnded") === "true") auth(request, ["ADMIN"]);
      let rows = values(kind);
      const q = words(query.get("search"));
      if (q) rows = rows.filter((r) => words(r.title || r.name).includes(q));
      for (const key of ["movieId", "roomId", "cinemaId", "status"])
        if (query.get(key))
          rows = rows.filter((r) =>
            key === "cinemaId" && kind === "showtimes"
              ? maps.rooms.get(r.roomId)?.cinemaId === query.get(key)
              : r[key] === query.get(key),
          );
      if (kind === "showtimes") {
        const date = query.get("date");
        rows = rows.filter((r) =>
          date
            ? new Date(Date.parse(r.startTime) + 7 * 3600000)
                .toISOString()
                .slice(0, 10) === date
            : Date.parse(r.startTime) > now(),
        );
        rows.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
      } else
        rows.sort((a, b) =>
          String(a.title || a.name).localeCompare(
            String(b.title || b.name),
            "vi",
          ),
        );
      return json(pageOf(rows, query));
    }
    const actor = auth(request, ["ADMIN"]);
    assert(["POST", "PATCH", "DELETE"].includes(method));
    if (method === "DELETE") {
      const row = model(kind, id);
      const referenced =
        kind === "movies"
          ? values("showtimes").some((s) => s.movieId === id)
          : kind === "rooms"
            ? values("showtimes").some((s) => s.roomId === id) ||
              physical(id).length > 0
            : kind === "cinemas"
              ? values("rooms").some((r) => r.cinemaId === id)
              : kind === "combos"
                ? [...orders.values()].some((o) =>
                    o.combos.some((c) => c.comboId === id),
                  )
                : [...orders.values()].some((o) => o.showtimeId === id);
      assert(
        !referenced,
        "RESOURCE_IN_USE",
        "Dữ liệu đang được sử dụng, không thể xóa.",
        409,
      );
      maps[kind].delete(id);
      if (kind === "movies")
        audit.push({
          id: randomUUID(),
          actorId: actor.id,
          entityType: "MOVIE",
          entityId: id,
          action: "DELETE",
          summary: row.title,
          changes: { before: row },
          createdAt: new Date(now()).toISOString(),
        });
      return json(row);
    }
    assert(Object.keys(body).every((k) => fields[kind].includes(k)));
    const prior = id ? model(kind, id) : {},
      row = {
        ...(kind === "rooms"
          ? { totalSeats: 0 }
          : kind === "combos"
            ? { isActive: true }
            : kind === "movies"
              ? { posterUrl: null, trailerUrl: null }
              : {}),
        ...prior,
        ...body,
        id: id || randomUUID(),
      };
    validate(kind, row, id);
    maps[kind].set(row.id, row);
    if (kind === "movies")
      audit.push({
        id: randomUUID(),
        actorId: actor.id,
        entityType: "MOVIE",
        entityId: row.id,
        action: id ? "UPDATE" : "CREATE",
        summary: row.title,
        changes: { before: id ? prior : null, after: row },
        createdAt: new Date(now()).toISOString(),
      });
    return json(row, id ? 200 : 201);
  };
};
