const test = require("node:test"),
  assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID, randomBytes } = require("node:crypto");
const {
  createMemoryServer,
  stableId,
} = require("../backend/standalone/runtime.cjs");
const { performance } = require("node:perf_hooks");
process.env.NOVA_LOG_REQUESTS = "false";
async function fixture(t) {
  let clock = Date.now();
  const password = randomBytes(16).toString("hex");
  const cinemaId = randomUUID(),
    roomId = randomUUID(),
    movieId = randomUUID(),
    showtimeId = randomUUID(),
    secondShow = randomUUID(),
    comboId = randomUUID();
  const data = {
    cinemas: [
      {
        id: cinemaId,
        name: "Fixture cinema",
        city: "TP.HCM",
        address: "Local test",
      },
    ],
    rooms: [
      {
        id: roomId,
        cinemaId,
        name: "Fixture hall",
        roomType: "STANDARD_2D",
        totalSeats: 160,
      },
    ],
    movies: [
      {
        id: movieId,
        title: "Fixture movie",
        description: "Own isolated fixture",
        durationMinutes: 120,
        status: "NOW_SHOWING",
        ageRating: "P",
        releaseDate: "2024-01-01T00:00:00.000Z",
      },
    ],
    showtimes: [showtimeId, secondShow].map((id, i) => ({
      id,
      roomId,
      movieId,
      startTime: new Date(clock + (3 + i * 4) * 3600000).toISOString(),
      endTime: new Date(
        clock + (3 + i * 4) * 3600000 + 135 * 60000,
      ).toISOString(),
      baseTicketPrice: "90000.00",
    })),
    combos: [
      {
        id: comboId,
        name: "Party Combo 69K",
        description: "Fixture food",
        price: "69000.00",
        isActive: true,
      },
    ],
    accounts: ["ADMIN", "STAFF", "CUSTOMER"].map((role) => ({
      email: `${role.toLowerCase()}@fixture.test`,
      password,
      fullName: role,
      role,
      cMemberTier: "SILVER",
      cMemberPoints: 0,
    })),
  };
  const server = createMemoryServer({ ...data, now: () => clock });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  });
  async function call(
    path,
    body,
    token,
    method = body === undefined ? "GET" : "POST",
    headers = {},
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await r.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    return { status: r.status, body: payload, data: payload?.data };
  }
  const login = async (role) => {
    const r = await call("/auth/login", {
      email: `${role}@fixture.test`,
      password,
    });
    assert.equal(r.status, 200);
    assert.ok(r.data.accessToken && r.data.refreshToken);
    return r.data;
  };
  const customer = await login("customer");
  const otherEmail = `${randomBytes(8).toString("hex")}@fixture.test`;
  assert.equal(
    (
      await call("/auth/register", {
        email: otherEmail,
        password,
        fullName: "Other customer",
      })
    ).status,
    201,
  );
  const other = (await call("/auth/login", { email: otherEmail, password }))
    .data;
  const map = (await call(`/showtimes/${showtimeId}/seats`)).data;
  return {
    call,
    data,
    customer,
    other,
    login,
    map,
    comboId,
    showtimeId,
    roomId,
    movieId,
    secondShow,
    advance: (ms) => (clock += ms),
    now: () => clock,
    seat: (label) =>
      map.seats.find((s) => `${s.row}${s.column}` === label).seatId,
  };
}
test("RAM authentication has real sessions, rejects forged roles and isolates owners", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.call("/auth/login", {
        email: "forged-admin@fixture.test",
        password: "incorrect",
      })
    ).status,
    401,
  );
  assert.equal((await f.call("/auth/refresh", {})).status, 401);
  assert.equal(
    (await f.call("/admin/reports/overview", undefined, f.customer.accessToken))
      .status,
    403,
  );
  assert.equal((await f.call("/users/me", undefined)).status, 401);
  const refresh = await f.call("/auth/refresh", {
    refreshToken: f.customer.refreshToken,
  });
  assert.equal(refresh.status, 200);
  assert.equal(
    (await f.call("/auth/refresh", { refreshToken: f.customer.refreshToken }))
      .status,
    401,
  );
  assert.equal(
    (await f.call("/users/me", undefined, refresh.data.accessToken)).data.role,
    "CUSTOMER",
  );
});
test("RAM validates payloads instead of inventing seats or selecting a fallback screening", async (t) => {
  const f = await fixture(t);
  for (const body of [
    {},
    { showtimeId: randomUUID(), seatIds: [f.seat("A1")] },
    { showtimeId: f.showtimeId, seatIds: [] },
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1"), f.seat("A1")] },
    { showtimeId: f.showtimeId, seatIds: [randomUUID()] },
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1")], couponCode: 42 },
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1")], comboItems: [null] },
  ]) {
    const result = await f.call("/bookings/hold", body, f.customer.accessToken);
    assert.ok(result.status >= 400 && result.status < 500);
  }
  assert.equal(
    (
      await f.call(
        "/bookings/" + randomUUID(),
        undefined,
        f.customer.accessToken,
      )
    ).status,
    404,
  );
});
test("concurrent RAM holds have one winner, accurate HOLDING state and bounded idempotent replay", async (t) => {
  const f = await fixture(t),
    body = { showtimeId: f.showtimeId, seatIds: [f.seat("A1")] };
  const results = await Promise.all(
    [f.customer, f.other].map((u) =>
      f.call("/bookings/hold", body, u.accessToken, "POST", {
        "Idempotency-Key": randomUUID(),
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const current = (await f.call(`/showtimes/${f.showtimeId}/seats`)).data;
  assert.equal(current.capacity.holding, 1);
  assert.equal(current.capacity.sold, 0);
  const token =
    results[0].status === 201 ? f.customer.accessToken : f.other.accessToken;
  const second = { showtimeId: f.showtimeId, seatIds: [f.seat("A20")] },
    key = randomUUID();
  const a = await f.call("/bookings/hold", second, token, "POST", {
      "Idempotency-Key": key,
    }),
    b = await f.call("/bookings/hold", second, token, "POST", {
      "Idempotency-Key": key,
    });
  assert.equal(a.status, 201);
  assert.equal(a.data.id, b.data.id);
  assert.equal(
    Date.parse(a.data.expiredAt) - Date.parse(a.data.createdAt),
    300000,
  );
  assert.equal(
    (
      await f.call(
        "/bookings/hold",
        { ...second, seatIds: [f.seat("A19")] },
        token,
        "POST",
        { "Idempotency-Key": key },
      )
    ).status,
    409,
  );
});
test("lazy RAM expiration frees read availability and old cancellation cannot release a new claim", async (t) => {
  const f = await fixture(t),
    body = { showtimeId: f.showtimeId, seatIds: [f.seat("A1")] };
  const old = (await f.call("/bookings/hold", body, f.customer.accessToken))
    .data;
  f.advance(300001);
  assert.equal(
    (await f.call(`/showtimes/${f.showtimeId}/seats`)).data.capacity.holding,
    0,
  );
  assert.equal(
    (await f.call(`/bookings/${old.id}`, undefined, f.customer.accessToken))
      .data.status,
    "EXPIRED",
  );
  assert.equal(
    (
      await f.call(
        "/payments/create-sandbox-url",
        { bookingId: old.id, returnUrl: "http://localhost:3000/" },
        f.customer.accessToken,
      )
    ).status,
    409,
  );
  const next = await f.call("/bookings/hold", body, f.other.accessToken);
  assert.equal(next.status, 201);
  await f.call(`/bookings/${old.id}/cancel`, {}, f.customer.accessToken);
  assert.equal(
    (await f.call(`/showtimes/${f.showtimeId}/seats`)).data.capacity.holding,
    1,
  );
});
test("RAM Sweetbox pricing, member discount and coupons follow fixed2 contracts", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.call(
        "/bookings/hold",
        { showtimeId: f.showtimeId, seatIds: [f.seat("A2")] },
        f.customer.accessToken,
      )
    ).status,
    409,
  );
  const r = await f.call(
    "/bookings/hold",
    {
      showtimeId: f.showtimeId,
      seatIds: [f.seat("H1")],
      comboItems: [{ comboId: f.comboId, quantity: 1 }],
    },
    f.customer.accessToken,
  );
  assert.equal(r.status, 201);
  assert.equal(r.data.seats.length, 2);
  assert.equal(r.data.totalTicketAmount, "270000.00");
  assert.equal(r.data.totalComboAmount, "69000.00");
  assert.equal(r.data.finalAmount, "322050.00");
  assert.ok(
    r.data.seats.every((s) => s.roomId === f.roomId && s.status === "HOLDING"),
  );
  const group = await f.call(
    `/showtimes/${f.showtimeId}/group-seat-suggestion?quantity=2&seatType=STANDARD`,
  );
  assert.equal(group.status, 200);
  assert.equal(group.data.seatIds.length, 2);
});
async function paidFixture(t) {
  const f = await fixture(t);
  const r = await f.call(
    "/bookings/hold",
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1")] },
    f.customer.accessToken,
  );
  assert.equal(r.status, 201);
  const order = r.data;
  const create = await f.call(
    "/payments/create-sandbox-url",
    {
      bookingId: order.id,
      returnUrl: `http://localhost:3000/?booking=${order.id}`,
    },
    f.customer.accessToken,
  );
  assert.equal(create.status, 201);
  const fields = Object.fromEntries(new URL(create.data.url).searchParams);
  return { ...f, order, fields };
}
test("RAM checkout is signed, does not fake PAID and issues one real QR after success", async (t) => {
  const f = await paidFixture(t);
  assert.equal(
    (await f.call(`/bookings/${f.order.id}`, undefined, f.other.accessToken))
      .status,
    404,
  );
  assert.equal(
    (
      await f.call("/payments/sandbox/complete", {
        ...f.fields,
        amount: "1.00",
        result: "SUCCESS",
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.call(`/bookings/${f.order.id}`, undefined, f.customer.accessToken))
      .data.status,
    "HOLDING",
  );
  assert.equal(
    (
      await f.call("/payments/sandbox/complete", {
        ...f.fields,
        result: "SUCCESS",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.call("/payments/sandbox/complete", {
        ...f.fields,
        result: "SUCCESS",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.call("/payments/sandbox/complete", {
        ...f.fields,
        result: "FAILED",
      })
    ).status,
    409,
  );
  const order = (
    await f.call(`/bookings/${f.order.id}`, undefined, f.customer.accessToken)
  ).data;
  assert.equal(order.status, "PAID");
  assert.equal(order.seats[0].status, "SOLD");
  const list = (
    await f.call("/tickets/me?limit=100", undefined, f.customer.accessToken)
  ).data.items;
  assert.equal(list.length, 1);
  const expires = Date.now() + 2000;
  let image = list[0].qrCodeBase64;
  for (let i = 0; !image && Date.now() < expires; i++) {
    await new Promise((done) => setTimeout(done, 20));
    image = (await f.call("/tickets/me", undefined, f.customer.accessToken))
      .data.items[0].qrCodeBase64;
  }
  const { PNG } = require("node:module").createRequire(
    require("node:path").resolve(__dirname, "../backend/package.json"),
  )("pngjs");
  const jsQR = require("node:module").createRequire(
    require("node:path").resolve(__dirname, "../backend/package.json"),
  )("jsqr");
  assert.ok(image.startsWith("data:image/png;base64,"));
  const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(
    decoded?.data === list[0].ticketHash,
    "actual PNG encodes its own opaque ticket hash",
  );

  assert.ok(
    /^[a-f\d-]{36}$/.test(list[0].id) &&
      /^[a-f\d]{64}$/.test(list[0].ticketHash) &&
      /^NOVA-[a-f\d]{32}$/.test(list[0].orderCode),
  );
  assert.equal(
    (await f.call("/tickets/me", undefined, f.other.accessToken)).data.items
      .length,
    0,
  );
  const points = (await f.call("/users/me", undefined, f.customer.accessToken))
    .data.cMemberPoints;
  assert.equal(points, 8);
});
test("RAM staff verify is nonconsuming and six simultaneous admissions accept exactly one", async (t) => {
  const f = await paidFixture(t);
  await f.call("/payments/sandbox/complete", {
    ...f.fields,
    result: "SUCCESS",
  });
  const ticket = (
    await f.call("/tickets/me", undefined, f.customer.accessToken)
  ).data.items[0];
  let staff = await f.login("staff");
  const body = { ticketHash: ticket.ticketHash, showtimeId: f.showtimeId };
  assert.equal(
    (await f.call("/staff/verify", body, staff.accessToken)).status,
    409,
  );
  f.advance(3 * 3600000 - 1000);
  staff = await f.login("staff");
  assert.equal(
    (await f.call("/staff/verify", body, staff.accessToken)).status,
    200,
  );
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      f.call("/staff/check-in", body, staff.accessToken),
    ),
  );
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 5);
  assert.ok(!("ticketHash" in results.find((r) => r.status === 200).data));
});
test("RAM admin CRUD validates overlap and capacity, and revenue contains only paid fixture values", async (t) => {
  const f = await fixture(t),
    admin = await f.login("admin");
  const input = {
    title: "New fixture movie",
    description: "Temporary fixture",
    durationMinutes: 90,
    ageRating: "P",
    releaseDate: "2024-01-01T00:00:00.000Z",
    status: "NOW_SHOWING",
  };
  const created = await f.call("/movies", input, admin.accessToken);
  assert.equal(created.status, 201);
  assert.equal((await f.call("/movies", input, admin.accessToken)).status, 409);
  assert.equal(
    (
      await f.call(
        "/movies/" + created.data.id,
        undefined,
        admin.accessToken,
        "DELETE",
      )
    ).status,
    200,
  );
  const conflict = await f.call(
    "/showtimes",
    {
      movieId: f.movieId,
      roomId: f.roomId,
      startTime: f.data.showtimes[0].startTime,
      baseTicketPrice: "90000.00",
    },
    admin.accessToken,
  );
  assert.equal(conflict.status, 409);
  const room = await f.call(
    "/rooms",
    {
      cinemaId: f.data.cinemas[0].id,
      name: "Fresh fixture hall",
      roomType: "STANDARD_2D",
    },
    admin.accessToken,
  );
  assert.equal(room.status, 201);
  assert.equal(
    (
      await f.call(
        `/rooms/${room.data.id}/seats/generate`,
        { rows: ["A"], columns: 3, sweetboxRows: ["A"] },
        admin.accessToken,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.call(
        `/rooms/${room.data.id}/seats/generate`,
        { rows: ["A"], columns: 4, sweetboxRows: ["A"] },
        admin.accessToken,
      )
    ).status,
    201,
  );
  const day = new Date(f.now() + 7 * 3600000).toISOString().slice(0, 10);
  const report = await f.call(
    `/admin/reports/revenue?from=${day}&to=${day}`,
    undefined,
    admin.accessToken,
  );
  assert.equal(report.data.netRevenue, "0.00");
  assert.equal(report.data.paidBookingCount, 0);
  for (const invalid of ["2026-99-01", "2026-02-30", "not-a-date"]) {
    assert.equal(
      (
        await f.call(
          `/admin/reports/revenue?from=${invalid}&to=${day}`,
          undefined,
          admin.accessToken,
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (await f.call("/admin/reports/overview", undefined, admin.accessToken)).data
      .movieCount,
    1,
  );
});
test("RAM seat-map and suggestion reads remain bounded over repeated calls", async (t) => {
  const f = await fixture(t),
    durations = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    assert.equal(
      (
        await f.call(
          `/showtimes/${f.showtimeId}/group-seat-suggestion?quantity=20`,
        )
      ).status,
      200,
    );
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  console.log(
    `RAM local HTTP suggestion p50=${durations[15].toFixed(2)}ms p95=${durations[28].toFixed(2)}ms (160 seats, no database/network SLA)`,
  );
  assert.ok(durations[28] < 500, "bounded local fixture latency");
});

test("RAM batched capacities validate IDs and match live holds, lazy expiry and cancellation", async (t) => {
  const f = await fixture(t),
    path = `/showtimes/capacities?ids=${f.showtimeId.toUpperCase()},${f.secondShow}`;
  const capacity = async () => {
    const r = await f.call(path);
    assert.equal(r.status, 200);
    assert.equal(r.data.length, 2);
    return r.data.find((item) => item.showtimeId === f.showtimeId);
  };
  const initial = (await f.call(`/showtimes/${f.showtimeId}/seats`)).data
    .capacity;
  assert.equal((await capacity()).available, initial.available);
  const hold = await f.call(
    "/bookings/hold",
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1")] },
    f.customer.accessToken,
  );
  assert.equal(hold.status, 201);
  assert.equal((await capacity()).available, initial.available - 1);
  f.advance(300001);
  assert.equal((await capacity()).available, initial.available);
  await f.call(`/bookings/${hold.data.id}/cancel`, {}, f.customer.accessToken);
  assert.equal((await capacity()).holding, 0);
  for (const ids of [
    "",
    "bad",
    `${f.showtimeId},${f.showtimeId}`,
    Array.from({ length: 51 }, () => randomUUID()).join(","),
  ])
    assert.equal(
      (await f.call(`/showtimes/capacities?ids=${ids}`)).status,
      400,
    );
  assert.deepEqual(
    (await f.call(`/showtimes/capacities?ids=${randomUUID()}`)).data,
    [],
  );
});

for (const seconds of [299, 300, 301]) {
  test(`RAM exact hold boundary at ${seconds}s cannot resurrect expired inventory`, async (t) => {
    const f = await paidFixture(t);
    f.advance(seconds * 1000);
    const r = await f.call("/payments/sandbox/complete", {
      ...f.fields,
      result: "SUCCESS",
    });
    assert.equal(r.status, seconds < 300 ? 200 : 409);
    const order = await f.call(
      `/bookings/${f.order.id}`,
      undefined,
      f.customer.accessToken,
    );
    assert.equal(order.data.status, seconds < 300 ? "PAID" : "EXPIRED");
    const map = (await f.call(`/showtimes/${f.showtimeId}/seats`)).data;
    assert.equal(
      map.seats.find((s) => s.seatId === f.seat("A1")).status,
      seconds < 300 ? "SOLD" : "AVAILABLE",
    );
  });
}

test("RAM UC02 blocks locked/inactive accounts and revokes refresh sessions across reactivation", async (t) => {
  const f = await fixture(t),
    admin = await f.login("admin"),
    staff = await f.login("staff");
  const userId = f.customer.user.id;
  assert.equal(
    (
      await f.call(
        `/users/${userId}/status`,
        { status: "LOCKED" },
        staff.accessToken,
        "PATCH",
      )
    ).status,
    403,
  );
  for (const status of ["LOCKED", "INACTIVE"]) {
    const active = await f.login("customer");
    assert.equal(
      (
        await f.call(
          `/users/${userId}/status`,
          { status },
          admin.accessToken,
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.call("/users/me", undefined, active.accessToken)).status,
      403,
    );
    assert.equal(
      (
        await f.call("/auth/login", {
          email: f.data.accounts[2].email,
          password: f.data.accounts[2].password,
        })
      ).body.error,
      "ACCOUNT_DISABLED",
    );
    assert.equal(
      (
        await f.call(
          `/users/${userId}/status`,
          { status: "ACTIVE" },
          admin.accessToken,
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.call("/auth/refresh", { refreshToken: active.refreshToken }))
        .status,
      401,
    );
  }
  assert.equal(
    (
      await f.call(
        `/users/${admin.user.id}/status`,
        { status: "LOCKED" },
        admin.accessToken,
        "PATCH",
      )
    ).status,
    409,
  );
});

test("RAM returns exactly the conflicting IDs and never partially holds a mixed request", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.call(
        "/bookings/hold",
        { showtimeId: f.showtimeId, seatIds: [f.seat("A1")] },
        f.customer.accessToken,
      )
    ).status,
    201,
  );
  const conflict = await f.call(
    "/bookings/hold",
    { showtimeId: f.showtimeId, seatIds: [f.seat("A1"), f.seat("A2")] },
    f.other.accessToken,
  );
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body.details.seatIds, [f.seat("A1")]);
  const map = (await f.call(`/showtimes/${f.showtimeId}/seats`)).data;
  assert.equal(
    map.seats.find((s) => s.seatId === f.seat("A2")).status,
    "AVAILABLE",
  );
});

test("RAM ADMIN reconciliation is exact, private and cannot turn an unpaid order into a ticket", async (t) => {
  const f = await paidFixture(t),
    admin = await f.login("admin");
  const path = `/admin/payments/reconciliation?reference=${f.order.orderCode}`;
  assert.equal(
    (await f.call(path, undefined, f.customer.accessToken)).status,
    403,
  );
  const before = await f.call(path, undefined, admin.accessToken);
  assert.equal(before.data.bookingStatus, "HOLDING");
  assert.equal(before.data.canRecoverTicket, false);
  assert.equal(
    (
      await f.call(
        `/admin/payments/${f.order.id}/recover-ticket`,
        {},
        admin.accessToken,
      )
    ).status,
    409,
  );
  await f.call("/payments/sandbox/complete", {
    ...f.fields,
    result: "SUCCESS",
  });
  const after = await f.call(path, undefined, admin.accessToken);
  assert.equal(after.data.bookingStatus, "PAID");
  assert.ok(after.data.ticket.id);
  assert.doesNotMatch(
    JSON.stringify(after.data),
    /signature|ticketHash|qrCodeBase64|requestPayload/,
  );
  const retry = await f.call(
    `/admin/payments/${f.order.id}/recover-ticket`,
    {},
    admin.accessToken,
  );
  assert.equal(retry.status, 202);
  assert.equal(retry.data.queued, false);
  assert.equal(retry.data.ticketId, after.data.ticket.id);
});

test("RAM immutable programme pages preserve records and invalidate only future manifests after Admin edits", async (t) => {
  const f = await fixture(t);
  const { decodeProgramme } =
    await import("../frontend/src/api/programme-transport.js");
  const before = (await f.call("/showtimes/programme")).data;
  const manifest = (await f.call("/showtimes/programme/manifest")).data;
  assert.equal(
    (await f.call("/showtimes/programme/manifest")).data.snapshotId,
    manifest.snapshotId,
  );
  const pages = [];
  for (let i = 0; i < manifest.chunks; i++) {
    const response = await f.call(
      `/showtimes/programme/chunks/${manifest.snapshotId}/${i}`,
    );
    assert.equal(response.status, 200);
    assert.ok(Buffer.byteLength(JSON.stringify(response.body)) < 15 * 1024);
    pages.push(response.data);
  }
  const decoded = decodeProgramme(manifest, pages);
  for (const key of ["movies", "cinemas", "rooms", "combos", "showtimes"])
    assert.deepEqual(decoded[key], before[key]);
  const admin = await f.login("admin");
  const movie = f.data.movies[0];
  const updated = await f.call(
    `/movies/${movie.id}`,
    { description: "Đã cập nhật thật" },
    admin.accessToken,
    "PATCH",
  );
  assert.equal(updated.status, 200);
  const after = (await f.call("/showtimes/programme/manifest")).data;
  assert.notEqual(after.snapshotId, manifest.snapshotId);
  assert.equal(
    (await f.call(`/showtimes/programme/chunks/${manifest.snapshotId}/0`))
      .status,
    200,
  );
  assert.equal(
    (await f.call(`/showtimes/programme/chunks/${randomUUID()}/0`)).status,
    410,
  );
  assert.equal(
    (
      await f.call(
        `/showtimes/programme/chunks/${after.snapshotId}/${after.chunks}`,
      )
    ).status,
    404,
  );
});
