// Native PostgreSQL/Redis, owned fixtures, never the application's database.
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
require("dotenv").config({
  path: fileURLToPath(new URL("../backend/.env", import.meta.url)),
  quiet: true,
});
require("../backend/scripts/test-database-target.cjs").testDatabaseTarget();
const npm = process.env.npm_execpath;
for (const args of [
  ["run", "prisma:generate", "--workspace", "backend"],
  ["run", "db:migrate:test", "--workspace", "backend"],
  ["run", "build:backend"],
]) {
  const r = npm
    ? spawnSync(process.execPath, [npm, ...args], {
        stdio: "inherit",
        env: process.env,
      })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
        stdio: "inherit",
        env: process.env,
        shell: process.platform === "win32",
      });
  if (r.status !== 0) process.exit(r.status || 1);
}
process.env.NODE_ENV = "test";
require("../backend/test/setup-environment.cjs");
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "9";
const { createApplication } = require("../backend/dist/bootstrap.js");
const { PrismaService } = require("../backend/dist/database/prisma.service.js");
const {
  FulfillmentRelay,
} = require("../backend/dist/modules/notifications/fulfillment-relay.service.js");
const { hash } = require("argon2");
const prefix = "batch1-" + randomUUID();
const password =
  process.env.BATCH1_PASSWORD ||
  process.env.SEED_DEMO_PASSWORD ||
  randomBytes(18).toString("hex");
const userIds = [],
  movieIds = [],
  roomIds = [],
  showIds = [];
let app, db, cinema, redis;
const pass = (name) => console.log(`[TEST ${name}] PASS`);
try {
  app = await createApplication({ logger: false });
  await app.listen(0, "127.0.0.1");
  db = app.get(PrismaService);
  await app.get(FulfillmentRelay).onModuleDestroy();
  const Redis = require("ioredis");
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB),
  });
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
  async function api(path, body, token, method = "POST", expected = 200) {
    if (path.startsWith("/auth/")) {
      const keys = await redis.keys(process.env.BULLMQ_PREFIX + ":throttle:*");
      if (keys.length) await redis.del(...keys);
    }
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await r.json();
    assert.equal(r.status, expected, `${method} ${path}: ${payload.message}`);
    return payload.data;
  }
  const tokens = {};
  const hashed = await hash(password);
  for (const [key, role, tier] of [
    ["customer", "CUSTOMER", "SILVER"],
    ["cmember", "CUSTOMER", "GOLD"],
    ["staff", "STAFF", "GOLD"],
    ["admin", "ADMIN", "DIAMOND"],
  ]) {
    const email = key + "@nova.local";
    let u = await db.user.findUnique({ where: { email } });
    if (!u) {
      u = await db.user.create({
        data: {
          email,
          fullName:
            key === "cmember"
              ? "Lâm Thanh Phong"
              : key === "staff"
                ? "NV01"
                : key,
          passwordHash: hashed,
          role,
          cMemberTier: tier,
        },
      });
      userIds.push(u.id);
    }
    assert.equal(u.role, role);
    assert.equal(u.cMemberTier, tier);
    const login = await api("/auth/login", { email, password });
    tokens[key] = login.accessToken;
  }
  const registered = await api(
    "/auth/register",
    { fullName: prefix, email: prefix + "@example.test", password },
    undefined,
    "POST",
    201,
  );
  userIds.push(
    registered.user?.id ||
      registered.id ||
      (
        await db.user.findUniqueOrThrow({
          where: { email: prefix + "@example.test" },
        })
      ).id,
  );
  await api(
    "/auth/register",
    { fullName: prefix, email: prefix + "@example.test", password },
    undefined,
    "POST",
    409,
  );
  await api("/admin/movies", undefined, tokens.customer, "GET", 403);
  await api(
    "/auth/register",
    {
      fullName: prefix,
      email: prefix + "-short@example.test",
      password: "abc12",
    },
    undefined,
    "POST",
    400,
  );
  const minimum = await api(
    "/auth/register",
    {
      fullName: prefix,
      email: prefix + "-six@example.test",
      password: "abc123",
    },
    undefined,
    "POST",
    201,
  );
  userIds.push(minimum.id);
  await api("/auth/login", {
    email: prefix + "-six@example.test",
    password: "abc123",
  });
  pass("FR01");
  for (let i = 0; i < 5; i++) {
    const movie = await api(
      "/admin/movies",
      {
        title:
          (i === 0 ? "Dune: Hành Tinh Cát 2" : "Movie " + i) + " · " + prefix,
        description: prefix,
        genre: "Khoa học viễn tưởng",
        subtitle: "Phụ đề Việt",
        durationMinutes: 166,
        ageRating: "T16",
        releaseDate: "2024-01-01T00:00:00Z",
        status: "NOW_SHOWING",
      },
      tokens.admin,
      "POST",
      201,
    );
    movieIds.push(movie.id);
  }
  await api(
    "/admin/movies/" + movieIds[0],
    { genre: "Phiêu lưu" },
    tokens.admin,
    "PUT",
  );
  await api(
    "/admin/movies",
    {
      title: prefix + " invalid",
      description: prefix,
      durationMinutes: 0,
      ageRating: "P",
      releaseDate: "2024-01-01T00:00:00Z",
    },
    tokens.admin,
    "POST",
    400,
  );
  assert.equal(await db.movie.count({ where: { id: { in: movieIds } } }), 5);
  assert.equal(
    (await db.movie.findUniqueOrThrow({ where: { id: movieIds[0] } })).genre,
    "Phiêu lưu",
  );
  await api(
    "/admin/movies/" + movieIds[0],
    { status: "STOPPED" },
    tokens.admin,
    "PUT",
  );
  assert.equal(
    (await db.movie.findUniqueOrThrow({ where: { id: movieIds[0] } })).status,
    "ENDED",
  );
  await api(
    "/admin/movies/" + movieIds[0],
    { status: "NOW_SHOWING" },
    tokens.admin,
    "PUT",
  );
  await api(
    "/admin/movies",
    {
      title: (await db.movie.findUniqueOrThrow({ where: { id: movieIds[0] } }))
        .title,
      description: prefix,
      durationMinutes: 166,
      ageRating: "T16",
      releaseDate: "2024-01-01T00:00:00Z",
    },
    tokens.admin,
    "POST",
    409,
  );
  pass("FR02");
  cinema = await api(
    "/cinemas",
    {
      name: prefix + " · NOVA Landmark 81",
      city: "TP. Hồ Chí Minh",
      address: prefix,
    },
    tokens.admin,
    "POST",
    201,
  );
  for (let i = 0; i < 2; i++) {
    const room = await api(
      "/rooms",
      {
        cinemaId: cinema.id,
        name: i ? "Hall 2 (Dolby Atmos)" : "Hall 1 (IMAX 70mm Laser)",
        roomType: i ? "DOLBY_ATMOS" : "IMAX_70MM_LASER",
      },
      tokens.admin,
      "POST",
      201,
    );
    roomIds.push(room.id);
    await api(
      `/rooms/${room.id}/seats/generate`,
      {
        rows: [..."ABCDEFGHIJ"],
        columns: 14,
        vipRows: ["E", "F", "G"],
        sweetboxRows: ["J"],
      },
      tokens.admin,
      "POST",
      201,
    );
    assert.equal(await db.seat.count({ where: { roomId: room.id } }), 140);
    const before = await db.seat.findFirstOrThrow({
      where: { roomId: room.id, seatRow: "A", seatColumn: 1 },
    });
    await api(
      `/rooms/${room.id}/seats/layout`,
      {
        rows: Array.from("ABCDEFGHIJ"),
        columns: 12,
        vipRows: ["E", "F", "G"],
        sweetboxRows: ["J"],
      },
      tokens.admin,
      "PUT",
    );
    assert.equal(await db.seat.count({ where: { roomId: room.id } }), 120);
    assert.equal(
      (await db.seat.findUniqueOrThrow({ where: { id: before.id } }))
        .seatColumn,
      1,
    );
    await api(
      `/rooms/${room.id}/seats/layout`,
      {
        rows: Array.from("ABCDEFGHIJ"),
        columns: 14,
        vipRows: ["E", "F", "G"],
        sweetboxRows: ["J"],
      },
      tokens.admin,
      "PUT",
    );
    assert.equal(
      (await db.room.findUniqueOrThrow({ where: { id: room.id } })).totalSeats,
      140,
    );
    const editable = await db.seat.findFirstOrThrow({
      where: { roomId: room.id, seatRow: "A", seatColumn: 1 },
    });
    await api(
      `/seats/${editable.id}`,
      { seatType: "VIP" },
      tokens.admin,
      "PATCH",
    );
    assert.equal(
      (await db.seat.findUniqueOrThrow({ where: { id: editable.id } }))
        .seatType,
      "VIP",
    );
  }
  pass("FR03");
  const start = new Date(Date.now() + 86400000);
  for (let i = 0; i < 5; i++) {
    const s = await api(
      "/admin/showtimes",
      {
        movieId: movieIds[i],
        roomId: roomIds[i % 2],
        startTime: new Date(start.getTime() + i * 4 * 3600000).toISOString(),
        baseTicketPrice: "100000",
      },
      tokens.admin,
      "POST",
      201,
    );
    showIds.push(s.id);
    assert.equal(
      Date.parse(s.endTime) - Date.parse(s.startTime),
      (166 + 15) * 60000,
    );
  }
  await api(
    "/admin/showtimes",
    {
      movieId: movieIds[1],
      roomId: roomIds[0],
      startTime: new Date(start.getTime() + 60000).toISOString(),
      baseTicketPrice: "100000",
    },
    tokens.admin,
    "POST",
    409,
  );
  const lockSeats = await api(
    `/showtimes/${showIds[1]}/seats`,
    undefined,
    undefined,
    "GET",
  );
  const owner = await api("/auth/login", {
    email: prefix + "@example.test",
    password,
  });
  const holding = await api(
    "/bookings/hold",
    {
      showtimeId: showIds[1],
      seatIds: [lockSeats.seats.find((s) => s.row === "B").seatId],
    },
    owner.accessToken,
    "POST",
    201,
  );
  await api(
    `/admin/showtimes/${showIds[1]}/status`,
    { status: "LOCKED" },
    tokens.admin,
    "PATCH",
  );
  assert.equal(
    (await db.showtime.findUniqueOrThrow({ where: { id: showIds[1] } })).status,
    "LOCKED",
  );
  assert.equal(
    (await db.booking.findUniqueOrThrow({ where: { id: holding.id } })).status,
    "CANCELLED",
  );
  assert.equal(
    (await api(`/showtimes/${showIds[1]}/seats`, undefined, undefined, "GET"))
      .capacity.holding,
    0,
  );
  await api(
    "/bookings/hold",
    { showtimeId: showIds[1], seatIds: [lockSeats.seats[0].seatId] },
    owner.accessToken,
    "POST",
    409,
  );
  await api(
    `/rooms/${roomIds[0]}/seats/layout`,
    { rows: ["A"], columns: 14 },
    tokens.admin,
    "PUT",
    409,
  );
  assert.equal(await db.seat.count({ where: { roomId: roomIds[0] } }), 140);
  pass("FR04");
  const listed = await api(
    "/movies?status=NOW_SHOWING&keyword=" + encodeURIComponent(prefix),
    undefined,
    undefined,
    "GET",
  );
  assert.equal(listed.items.length, 5);
  const programme = await api(
    "/showtimes/programme",
    undefined,
    undefined,
    "GET",
  );
  assert.ok(programme.showtimes.every((s) => s.status === "ACTIVE"));
  assert.ok(!programme.showtimes.some((s) => s.id === showIds[1]));
  await api(
    `/admin/showtimes/${showIds[1]}/status`,
    { status: "ACTIVE" },
    tokens.admin,
    "PATCH",
  );
  pass("FR05");
  const show = showIds[0],
    map = await api(`/showtimes/${show}/seats`, undefined, undefined, "GET");
  for (const quantity of [1, 2, 5, 20]) {
    const group = await api(
      `/showtimes/${show}/group-seat-suggestion?quantity=${quantity}`,
      undefined,
      undefined,
      "GET",
    );
    assert.equal(group.seatIds.length, quantity);
    const seats = group.seatIds.map((id) =>
      map.seats.find((s) => s.seatId === id),
    );
    assert.ok(seats.every((s) => s.status === "AVAILABLE"));
    if (quantity === 20) assert.equal(new Set(seats.map((s) => s.row)).size, 2);
  }
  const seat = map.seats.find((s) => s.row === "F" && s.column === 8);
  const buyers = [];
  for (let i = 0; i < 2; i++) {
    const email = prefix + "-buyer" + i + "@example.test";
    await api(
      "/auth/register",
      { fullName: prefix, email, password },
      undefined,
      "POST",
      201,
    );
    const u = await db.user.findUniqueOrThrow({ where: { email } });
    userIds.push(u.id);
    await db.user.update({
      where: { id: u.id },
      data: { cMemberTier: "GOLD" },
    });
    buyers.push((await api("/auth/login", { email, password })).accessToken);
  }
  const race = await Promise.all(
    buyers.map(async (token) => {
      const r = await fetch(base + "/bookings/hold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ showtimeId: show, seatIds: [seat.seatId] }),
      });
      return { status: r.status, body: await r.json(), token };
    }),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
  const winner = race.find((r) => r.status === 201),
    order = winner.body.data;
  assert.equal(order.discountRate, "0.070");
  assert.equal(
    Date.parse(order.expiredAt) - Date.parse(order.createdAt),
    300000,
  );
  const sandbox = await api(
    "/payments/create-sandbox-url",
    { bookingId: order.id, returnUrl: "http://localhost:3000/" },
    winner.token,
    "POST",
    201,
  );
  const signed = Object.fromEntries(new URL(sandbox.url).searchParams);
  await api("/payments/sandbox/confirm", { ...signed, result: "SUCCESS" });
  await api(
    "/bookings/hold",
    { showtimeId: show, seatIds: [seat.seatId] },
    tokens.customer,
    "POST",
    409,
  );
  assert.equal(
    (
      await api(`/showtimes/${show}/seats`, undefined, undefined, "GET")
    ).seats.find((s) => s.seatId === seat.seatId).status,
    "SOLD",
  );
  pass("FR06 & FR11");
  console.log(
    "BATCH 1 PASS — PostgreSQL/Redis thật; không dùng RAM, không gửi SMTP bên ngoài.",
  );
} finally {
  if (db) {
    const orders = await db.booking.findMany({
        where: { showtimeId: { in: showIds } },
        select: { id: true },
      }),
      ids = orders.map((o) => o.id);
    await db.outboxEvent.deleteMany({ where: { aggregateId: { in: ids } } });
    await db.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
    await db.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await db.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await db.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await db.booking.deleteMany({ where: { id: { in: ids } } });
    await db.showtime.deleteMany({ where: { id: { in: showIds } } });
    await db.seat.deleteMany({ where: { roomId: { in: roomIds } } });
    await db.room.deleteMany({ where: { id: { in: roomIds } } });
    if (cinema) await db.cinema.delete({ where: { id: cinema.id } });
    await db.auditLog.deleteMany({
      where: {
        OR: [{ actorId: { in: userIds } }, { entityId: { in: movieIds } }],
      },
    });
    await db.movie.deleteMany({ where: { id: { in: movieIds } } });
    await db.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (app) await app.close();
  if (redis) await redis.quit();
}
