// Native PostgreSQL/Redis, owned fixtures, never the application's database.
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import {
  rankedCombos,
  comboTasteLabel,
} from "../frontend/src/comboRecommendations.js";
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

const {
  createSmtpFixture,
} = require("../backend/test/support/smtp-fixture.cjs");
const { cleanupRows } = require("../scripts/fullstack-fixture-cleanup.cjs");
const {
  seedAdmissionFixtures,
} = require("../backend/scripts/admission-fixtures.cjs");
const { createApplication } = require("../backend/dist/bootstrap.js");
const { PrismaClient } = require("@prisma/client");
const { hash } = require("argon2");
const prefix = "batch2-" + randomUUID();
const backupPath = fileURLToPath(
  new URL(`../.runtime/${prefix}-combos.json`, import.meta.url),
);
process.env.NOVA_COMBO_STORE_PATH = backupPath;
const password = randomBytes(24).toString("hex");
let app, db, redis, smtp;
const pass = (label) => console.log(`[TEST ${label}] PASS`);
async function eventually(check, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${label}`);
}
try {
  smtp = await createSmtpFixture();
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtp.port),
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "tickets@nova.local",
    SMTP_SECURE: "false",
  });
  db = new PrismaClient();
  app = await createApplication({ logger: false });
  await app.listen(0, "127.0.0.1");
  const Redis = require("ioredis");
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB),
  });
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
  async function request(path, body, token, method = "POST", expected = 200) {
    const response = await fetch(base + path, {
      method,
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${json.message || "unexpected status"}`,
    );
    return { response, body: json, data: json.data };
  }
  async function api(...args) {
    const result = await request(...args);
    return result.data ?? result.body;
  }
  const health = await api("/health", undefined, undefined, "GET");
  for (const dependency of ["postgres", "redis", "queue"])
    assert.equal(health.checks[dependency].status, "up");
  pass("Native readiness PostgreSQL / Redis / BullMQ");
  const tokens = {},
    accounts = {};
  const passwordHash = await hash(password);
  for (const [key, role, tier] of [
    ["customer", "CUSTOMER", "GOLD"],
    ["other", "CUSTOMER", "SILVER"],
    ["staff", "STAFF", "GOLD"],
    ["admin", "ADMIN", "DIAMOND"],
  ]) {
    accounts[key] = await db.user.create({
      data: {
        email: `${prefix}-${key}@example.test`,
        fullName: key === "customer" ? "Lâm Thanh Phong" : prefix + " " + key,
        role,
        cMemberTier: tier,
        passwordHash,
      },
    });
    tokens[key] = (
      await api("/auth/login", { email: accounts[key].email, password })
    ).accessToken;
  }
  const menu = await request("/combos?limit=100", undefined, undefined, "GET");
  assert.match(menu.response.headers.get("cache-control"), /no-store/);
  const definitions = [
    ["Single / Solo Combo", "49000.00", "Ngọt Caramel", "1 bắp nhỏ + 1 nước"],
    ["Couple Combo", "89000.00", "Phô Mai Hoàng Kim", "1 bắp lớn + 2 nước"],
    [
      "Party Combo 69K",
      "69000.00",
      "Mix 2 Vị (Ngọt & Phô Mai)",
      "2 bắp lớn + 4 nước + snack đi kèm",
    ],
    [
      "Party Combo Mặn Đặc Biệt",
      "119000.00",
      "Mặn Truyền Thống",
      "2 bắp lớn vị mặn + 4 nước + 2 snack đi kèm",
    ],
  ];
  for (const [name, price, taste, items] of definitions) {
    const combo = menu.data.items.find((row) => row.name === name);
    assert.ok(combo, `Missing canonical combo: ${name}`);
    assert.equal(combo.price, price);
    assert.equal(comboTasteLabel(combo), taste);
    assert.equal(combo.itemsSummary, items);
  }
  for (const [quantity, name] of [
    [1, "Single / Solo Combo"],
    [2, "Couple Combo"],
    [4, "Party Combo 69K"],
  ])
    assert.equal(rankedCombos(menu.data.items, quantity, "all")[0].name, name);
  const combo = await api(
    "/admin/combos",
    {
      name: prefix + " Party",
      description: prefix,
      price: "69000",
      tasteTag: "MIX",
      itemsSummary: "2 bắp + 4 nước",
      badgeLabel: "PARTY",
      suggestedMinSeats: 3,
      suggestedMaxSeats: 20,
    },
    tokens.admin,
    "POST",
    201,
  );
  await api(
    `/admin/combos/${combo.id}`,
    { price: "79000", tasteTag: "MẶN" },
    tokens.admin,
    "PUT",
  );
  let publicMenu = await api("/combos?limit=100", undefined, undefined, "GET");
  assert.equal(
    publicMenu.items.find((c) => c.id === combo.id).price,
    "79000.00",
  );
  assert.equal(publicMenu.items.find((c) => c.id === combo.id).tasteTag, "MẶN");
  for (const active of [false, true]) {
    await api(
      `/admin/combos/${combo.id}/status`,
      { isActive: active },
      tokens.admin,
      "PATCH",
    );
    publicMenu = await api("/combos?limit=100", undefined, undefined, "GET");
    assert.equal(
      publicMenu.items.some((c) => c.id === combo.id),
      active,
    );
    assert.equal(
      (await db.combo.findUniqueOrThrow({ where: { id: combo.id } })).isActive,
      active,
    );
  }
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  assert.equal(backup.find((c) => c.id === combo.id).price, "79000.00");
  await api("/admin/combos", { name: "denied" }, tokens.customer, "POST", 403);
  pass("TC_FR12_01 & TC_FR12_02");

  const cinema = await api(
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
  const room = await api(
    "/rooms",
    {
      cinemaId: cinema.id,
      name: "Hall 1 (IMAX 70mm Laser)",
      roomType: "IMAX_70MM_LASER",
    },
    tokens.admin,
    "POST",
    201,
  );
  await api(
    `/rooms/${room.id}/seats/generate`,
    { rows: Array.from("ABCDEF"), columns: 14, vipRows: ["F"] },
    tokens.admin,
    "POST",
    201,
  );
  const movie = await api(
    "/movies",
    {
      title: "Dune: Hành Tinh Cát 2 · " + prefix,
      description: prefix,
      durationMinutes: 166,
      ageRating: "T16",
      status: "NOW_SHOWING",
      releaseDate: "2024-03-01T00:00:00Z",
    },
    tokens.admin,
    "POST",
    201,
  );
  const start = new Date(Date.now() + 30 * 60000);
  const show = await api(
    "/admin/showtimes",
    {
      movieId: movie.id,
      roomId: room.id,
      startTime: start.toISOString(),
      baseTicketPrice: "112500",
    },
    tokens.admin,
    "POST",
    201,
  );
  const map = await api(
    `/showtimes/${show.id}/seats`,
    undefined,
    undefined,
    "GET",
  );
  const seatId = (row, col) =>
    map.seats.find((s) => s.row === row && s.column === col).seatId;
  const hold = (seats, comboItems) =>
    api(
      "/bookings/hold",
      {
        showtimeId: show.id,
        seatIds: seats,
        ...(comboItems ? { comboItems } : {}),
      },
      tokens.customer,
      "POST",
      201,
    );
  const held = await hold([seatId("A", 1)]);
  await api(
    `/admin/showtimes/${show.id}/status`,
    { status: "LOCKED" },
    tokens.admin,
    "PATCH",
  );
  const locked = await api(
    "/bookings/hold",
    { showtimeId: show.id, seatIds: [seatId("A", 1)] },
    tokens.customer,
    "POST",
    409,
  );
  assert.equal(locked.errorCode, "SHOWTIME_LOCKED_OR_CANCELED");
  assert.equal(
    locked.message,
    "Rất tiếc, suất chiếu này đã bị hủy hoặc thay đổi. Vui lòng chọn suất khác",
  );
  assert.equal(
    (await db.booking.findUniqueOrThrow({ where: { id: held.id } })).status,
    "CANCELLED",
  );
  assert.equal(
    (await api(`/showtimes/${show.id}/seats`, undefined, undefined, "GET"))
      .capacity.holding,
    0,
  );
  await api(
    `/admin/showtimes/${show.id}/status`,
    { status: "ACTIVE" },
    tokens.admin,
    "PATCH",
  );
  pass("TC_FR07_05");
  async function checkout(order) {
    const payment = await api(
      "/payments/create-sandbox-url",
      {
        bookingId: order.id,
        returnUrl: "http://localhost:3000/booking/result",
      },
      tokens.customer,
      "POST",
      201,
    );
    return Object.fromEntries(new URL(payment.url).searchParams);
  }
  for (const status of ["FAILED", "CANCELLED", "EXPIRED"]) {
    const order = await hold([seatId("A", 1)]);
    const signed = await checkout(order);
    if (status === "EXPIRED")
      await api("/payments/sandbox/test-expire", signed);
    const result = await api(
      "/payments/sandbox/confirm",
      { ...signed, result: status === "EXPIRED" ? "SUCCESS" : status },
      undefined,
      "POST",
      status === "EXPIRED" ? 409 : 200,
    );
    if (status === "EXPIRED")
      assert.equal(result.message, "Đơn đã hết hạn, không còn thanh toán được");
    assert.equal(
      (await db.booking.findUniqueOrThrow({ where: { id: order.id } })).status,
      status,
    );
    assert.equal(await db.eTicket.count({ where: { bookingId: order.id } }), 0);
    assert.equal(
      await db.emailLog.count({ where: { bookingId: order.id } }),
      0,
    );
    assert.equal(
      (
        await api(`/showtimes/${show.id}/seats`, undefined, undefined, "GET")
      ).seats.find((s) => s.seatId === seatId("A", 1)).status,
      "AVAILABLE",
    );
    pass(
      status === "FAILED"
        ? "TC_FR08_02"
        : status === "CANCELLED"
          ? "TC_FR08_03"
          : "TC_FR08_04",
    );
  }
  const party = menu.data.items.find((c) => c.name === "Party Combo 69K");
  const paid = await hold(
    [seatId("F", 8), seatId("F", 9)],
    [{ comboId: party.id, quantity: 1 }],
  );
  assert.equal(paid.finalAmount, "315270.00");
  const signed = await checkout(paid);
  await api("/payments/sandbox/confirm", { ...signed, result: "SUCCESS" });
  const tickets = await eventually(async () => {
    const rows = await db.eTicket.findMany({ where: { bookingId: paid.id } });
    return rows.length === 2 ? rows : null;
  }, "two independent seat tickets");
  assert.equal(new Set(tickets.map((t) => t.ticketHash)).size, 2);
  await eventually(
    async () =>
      (await db.emailLog.count({
        where: { bookingId: paid.id, deliveryStatus: "SMTP_ACCEPTED" },
      })) === 2,
    "real SMTP acceptance logs",
  );
  assert.equal(
    smtp.state.messages.filter((m) => m.to.includes(accounts.customer.email))
      .length,
    2,
  );
  const ticket = await api(
    `/tickets/${tickets[0].id}`,
    undefined,
    tokens.customer,
    "GET",
  );
  const fresh = await api(
    `/tickets/lookup?code=${ticket.ticketCode}`,
    undefined,
    tokens.customer,
    "GET",
  );
  assert.equal(fresh.ticket.bookingId, paid.id);
  const confirmation = await api(
    `/tickets/${ticket.id}/confirmation`,
    undefined,
    tokens.customer,
    "GET",
  );
  assert.equal(confirmation.deliveryStatus, "SMTP_ACCEPTED");
  assert.ok(
    confirmation.html.includes("Dune:") &&
      confirmation.html.includes("315.270"),
  );
  const calendar = await fetch(`${base}/tickets/${ticket.id}/calendar`, {
    headers: { Authorization: `Bearer ${tokens.customer}` },
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(calendar.status, 200);
  assert.match(calendar.headers.get("content-type"), /text\/calendar/);
  const ics = await calendar.text();
  assert.ok(
    ics.includes("BEGIN:VCALENDAR") &&
      ics.includes("BEGIN:VALARM") &&
      ics.includes("Dune:"),
  );
  assert.ok(
    ics.includes(
      "DTSTART:" +
        start
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, ""),
    ),
  );
  await api(
    `/tickets/${ticket.id}/confirmation`,
    undefined,
    tokens.other,
    "GET",
    404,
  );
  await api(
    `/tickets/${ticket.id}/calendar`,
    undefined,
    tokens.other,
    "GET",
    404,
  );
  const orders = await api(
    `/admin/bookings?keyword=${encodeURIComponent(paid.orderCode)}`,
    undefined,
    tokens.admin,
    "GET",
  );
  assert.equal(orders.items.length, 1);
  assert.equal(orders.items[0].id, paid.id);
  assert.equal(orders.items[0].tickets.length, 2);
  assert.equal(JSON.stringify(orders).includes(tickets[0].ticketHash), false);
  const log = await db.emailLog.findFirstOrThrow({
    where: { ticketId: ticket.id },
  });
  assert.equal(
    (await api(`/admin/email-logs/${log.id}`, undefined, tokens.admin, "GET"))
      .deliveryStatus,
    "SMTP_ACCEPTED",
  );
  await api("/admin/bookings", undefined, tokens.customer, "GET", 403);
  await api(
    `/admin/email-logs/${log.id}`,
    undefined,
    tokens.customer,
    "GET",
    403,
  );
  await api(
    "/staff/verify-ticket",
    { code: ticket.qrPayload, showtimeId: show.id },
    tokens.staff,
  );
  assert.equal(
    (await db.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
      .isCheckedIn,
    true,
  );
  await api(
    "/staff/verify-ticket",
    { code: ticket.ticketCode, showtimeId: show.id },
    tokens.staff,
    "POST",
    409,
  );
  assert.equal(
    (
      await db.eTicket.findUniqueOrThrow({
        where: { id: tickets.find((row) => row.id !== ticket.id).id },
      })
    ).isCheckedIn,
    false,
  );
  pass(
    "FR08 PAID / FR09 per-seat QR + real admission / FR10 Email Log / FR13 ICS / Admin orders",
  );

  assert.equal(
    await db.eTicket.count({ where: { shortCode: "V1" } }),
    0,
    "V1 already exists in test DB: preserve it and use an isolated test database.",
  );
  await seedAdmissionFixtures(db, {
    userId: accounts.customer.id,
    staffId: accounts.staff.id,
    prefix,
  });
  for (const code of ["V1", "8F9A", "NOVA-20261102-8F9A"]) {
    const lookup = await api(
      `/tickets/lookup?code=${code}`,
      undefined,
      tokens.customer,
      "GET",
    );
    assert.equal(lookup.found, true);
    assert.equal(lookup.ticket.shortCode, "V1");
    assert.ok(lookup.ticket.movie.includes("Dune:"));
    assert.equal(lookup.ticket.room, "Hall 1 (IMAX 70mm Laser)");
    assert.equal(lookup.ticket.bookingSeats.length, 2);
    assert.equal(lookup.ticket.amount, "315270.00");
  }
  for (const [code, token] of [
    ["FAKE_999", tokens.customer],
    ["QR_INVALID_999", tokens.customer],
    ["V1", tokens.other],
  ]) {
    const missing = await api(
      `/tickets/lookup?code=${code}`,
      undefined,
      token,
      "GET",
      404,
    );
    assert.equal(missing.found, false);
    assert.equal(missing.data, null);
    assert.equal(
      missing.message,
      "Không tìm thấy mã vé hoặc mã vé không hợp lệ!",
    );
    assert.equal(missing.ticket, undefined);
  }
  pass("TC-12 & TC-13");
  const first = await api("/staff/verify-ticket", { code: "V1" }, tokens.staff);
  assert.equal(first.title, "Soát vé thành công - Hợp lệ");
  const stored = await db.eTicket.findUniqueOrThrow({
    where: { shortCode: "V1" },
  });
  assert.equal(stored.isCheckedIn, true);
  assert.ok(stored.checkedInAt);
  assert.equal(stored.checkedInByStaffId, accounts.staff.id);
  pass("TC_FR09_02");
  const again = await api(
    "/staff/verify-ticket",
    { code: "NOVA-20261102-8F9A" },
    tokens.staff,
    "POST",
    409,
  );
  assert.equal(again.title, "Vé đã được sử dụng!");
  assert.ok(again.subTitle.includes("quét lúc"));
  assert.equal(
    (
      await db.eTicket.findUniqueOrThrow({ where: { id: stored.id } })
    ).checkedInAt.toISOString(),
    stored.checkedInAt.toISOString(),
  );
  pass("TC_FR09_03");
  const fake = await api(
    "/staff/verify-ticket",
    { code: "QR_INVALID_999" },
    tokens.staff,
    "POST",
    404,
  );
  assert.equal(fake.message, "Mã vé không tồn tại hoặc không hợp lệ!");
  await api(
    "/staff/verify-ticket",
    { code: "V3", currentShowtime: "19:30" },
    tokens.staff,
    "POST",
    409,
  );
  assert.equal(
    (await db.eTicket.findUniqueOrThrow({ where: { shortCode: "V3" } }))
      .isCheckedIn,
    false,
  );
  await api("/staff/demo-fixtures/reset", { code: "V1" }, tokens.staff);
  assert.equal(
    (await db.eTicket.findUniqueOrThrow({ where: { shortCode: "V1" } }))
      .isCheckedIn,
    false,
  );
  pass("TC_FR09_04 / wrong showtime / demo-only reset");
  console.log(
    "BATCH 2 PASS — PostgreSQL/Redis thật, QR từng ghế, SMTP loopback thực, không gửi email ra ngoài.",
  );
} finally {
  try {
    if (app) await app.close();
  } finally {
    try {
      if (smtp) await smtp.close();
      if (db) await cleanupRows(db, prefix);
    } finally {
      if (db) await db.$disconnect();
      if (redis) {
        const keys = await redis.keys(process.env.BULLMQ_PREFIX + ":*");
        if (keys.length) await redis.del(...keys);
        await redis.quit();
      }
      await rm(backupPath, { force: true });
    }
  }
}
