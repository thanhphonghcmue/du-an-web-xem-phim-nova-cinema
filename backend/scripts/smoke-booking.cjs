const { resolve } = require("node:path");
const { randomUUID, randomBytes, createHmac } = require("node:crypto");
const { createServer } = require("node:net");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { hash } = require("argon2");
const { Queue } = require("bullmq");
const Redis = require("ioredis");
const { io } = require("socket.io-client");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");
const { createSmtpFixture } = require("../test/support/smtp-fixture.cjs");
const { testDatabaseTarget } = require("./test-database-target.cjs");

const backend = resolve(__dirname, "..");
const databaseUrl = testDatabaseTarget();
for (const key of ["TEST_REDIS_HOST", "TEST_REDIS_PORT", "TEST_REDIS_DB"])
  if (!process.env[key]) throw new Error(`${key} is required for smoke tests.`);
const prefix = `p9-smoke-${randomUUID()}`;
const paymentSecret = randomBytes(48).toString("hex");
const queuePrefix = `nova:smoke:${randomUUID().replaceAll("-", "")}`;
const connection = {
  host: process.env.TEST_REDIS_HOST,
  port: Number(process.env.TEST_REDIS_PORT),
  db: Number(process.env.TEST_REDIS_DB),
  ...(process.env.TEST_REDIS_PASSWORD
    ? { password: process.env.TEST_REDIS_PASSWORD }
    : {}),
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
};
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const redis = new Redis(connection);
redis.on("error", () => {});
const queue = new Queue("seat-expiration", { connection, prefix: queuePrefix });
queue.on("error", () => {});
let child;
let watcher;
let smtpFixture;
let stage = "prepare isolated fixtures";
async function eventually(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Expected smoke state did not arrive.");
}
async function main() {
  smtpFixture = await createSmtpFixture();
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  const password = randomBytes(24).toString("hex");
  const passwordHash = await hash(password);
  const users = [];
  for (const label of ["a", "b", "staff", "staff2"])
    users.push(
      await prisma.user.create({
        data: {
          email: `${prefix}-${label}@example.test`,
          passwordHash,
          fullName: "Booking smoke",
          role: label.startsWith("staff") ? "STAFF" : "CUSTOMER",
        },
      }),
    );
  const movie = await prisma.movie.create({
    data: {
      title: prefix,
      description: "Production booking smoke",
      durationMinutes: 120,
      releaseDate: new Date(Date.now() - 86400000),
      ageRating: "T13",
    },
  });
  const cinema = await prisma.cinema.create({
    data: { name: prefix, address: "Fixture", city: "Fixture" },
  });
  const room = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: prefix,
      roomType: "IMAX_70MM_LASER",
      totalSeats: 2,
    },
  });
  const seats = [];
  for (const [column, type, modifier] of [
    [1, "STANDARD", "1.00"],
    [2, "VIP", "1.20"],
  ])
    seats.push(
      await prisma.seat.create({
        data: {
          roomId: room.id,
          seatRow: "A",
          seatColumn: column,
          seatType: type,
          priceModifier: modifier,
        },
      }),
    );
  const starts = new Date(Date.now() + 30 * 60000);
  const showtime = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      roomId: room.id,
      startTime: starts,
      endTime: new Date(starts.getTime() + 135 * 60000),
      baseTicketPrice: "90000.00",
    },
  });
  const combo = await prisma.combo.create({
    data: { name: prefix, description: "Party Combo", price: "69000.00" },
  });
  child = spawn(process.execPath, ["dist/main.js"], {
    cwd: backend,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      REDIS_HOST: process.env.TEST_REDIS_HOST,
      REDIS_PORT: process.env.TEST_REDIS_PORT,
      REDIS_PASSWORD: process.env.TEST_REDIS_PASSWORD || "",
      REDIS_DB: process.env.TEST_REDIS_DB,
      REDIS_TLS: "false",
      BULLMQ_PREFIX: queuePrefix,
      JWT_ACCESS_SECRET: randomBytes(48).toString("hex"),
      JWT_REFRESH_SECRET: randomBytes(48).toString("hex"),
      PAYMENT_SANDBOX_SECRET: paymentSecret,
      PAYMENT_SANDBOX_BASE_URL: `http://127.0.0.1:${port}`,
      PAYMENT_RETURN_ORIGINS: "http://localhost:3000",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(smtpFixture.port),
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "tickets@nova.local",
      SMTP_SECURE: "false",
      SMTP_TIMEOUT_MS: "1000",
      CHECK_IN_BEFORE_MINUTES: "60",
      CHECK_IN_AFTER_MINUTES: "30",
    },
  });
  const base = `http://127.0.0.1:${port}`;
  async function api(method, path, status, payload, token, key) {
    stage = `${method} ${path} expected ${status}`;
    const response = await fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(5000),
      headers: {
        ...(payload ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(key ? { "idempotency-key": key } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    assert.equal(response.status, status);
    return response.json();
  }
  stage = "production readiness";
  await eventually(async () => {
    if (child.exitCode !== null) throw new Error("Backend exited early.");
    try {
      return (
        (
          await fetch(`${base}/api/v1/health`, {
            signal: AbortSignal.timeout(1000),
          })
        ).status === 200
      );
    } catch {
      return false;
    }
  });
  assert.equal((await api("GET", "/api/v1", 200)).data.phase, 9);
  const tokens = [];
  for (const user of users)
    tokens.push(
      (
        await api("POST", "/api/v1/auth/login", 200, {
          email: user.email,
          password,
        })
      ).data.accessToken,
    );
  const payload = {
    showtimeId: showtime.id,
    seatIds: seats.map((row) => row.id),
    comboItems: [{ comboId: combo.id, quantity: 2 }],
  };
  stage = "production Socket.IO public room subscription";
  watcher = io(`${base}/seats`, {
    transports: ["websocket"],
    reconnection: false,
    timeout: 2000,
  });
  const notifications = [];
  watcher.on("seat_locked", (value) =>
    notifications.push({ type: "seat_locked", ...value }),
  );
  watcher.on("seat_released", (value) =>
    notifications.push({ type: "seat_released", ...value }),
  );
  watcher.on("seat_sold", (value) =>
    notifications.push({ type: "seat_sold", ...value }),
  );
  await new Promise((resolve, reject) => {
    watcher.once("connect", resolve);
    watcher.once("connect_error", reject);
  });
  const joined = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Production join timed out.")),
      3000,
    );
    watcher.emit("join_showtime", { showtimeId: showtime.id }, (reply) => {
      clearTimeout(timer);
      resolve(reply);
    });
  });
  assert.equal(joined.success, true);
  const snapshot = (
    await api("GET", `/api/v1/showtimes/${showtime.id}/seats`, 200)
  ).data;
  assert.deepEqual(snapshot.capacity, {
    total: 2,
    available: 2,
    holding: 0,
    sold: 0,
  });
  const suggestion = (
    await api(
      "GET",
      `/api/v1/showtimes/${showtime.id}/group-seat-suggestion?quantity=2`,
      200,
    )
  ).data;
  assert.deepEqual(
    suggestion.seatIds,
    seats.map((seat) => seat.id),
  );
  const key = randomUUID();
  const held = (
    await api("POST", "/api/v1/bookings/hold", 201, payload, tokens[0], key)
  ).data;
  assert.equal(
    new Date(held.expiredAt).getTime() - new Date(held.createdAt).getTime(),
    300000,
  );
  await eventually(async () => {
    await redis.ping();
    return notifications.some(
      (event) => event.type === "seat_locked" && event.bookingId === held.id,
    );
  });
  assert.equal(
    (await api("GET", `/api/v1/showtimes/${showtime.id}/seats`, 200)).data
      .capacity.holding,
    2,
  );
  assert(!JSON.stringify(notifications).match(/email|userId|token|password/));
  assert.equal(held.finalAmount, "319200.00");
  assert.equal(held.discountRate, "0.050");
  assert.deepEqual(
    (await api("POST", "/api/v1/bookings/hold", 201, payload, tokens[0], key))
      .data,
    held,
  );
  assert.equal(
    (await api("POST", "/api/v1/bookings/hold", 409, payload, tokens[1])).error,
    "SEAT_UNAVAILABLE",
  );
  await api("GET", `/api/v1/bookings/${held.id}`, 404, undefined, tokens[1]);
  assert.equal(
    (
      await api(
        "POST",
        `/api/v1/bookings/${held.id}/cancel`,
        200,
        undefined,
        tokens[0],
      )
    ).data.status,
    "CANCELLED",
  );
  await eventually(async () => {
    await redis.ping();
    return notifications.some((event) => event.type === "seat_released");
  });
  const releasesBefore = notifications.filter(
    (event) => event.type === "seat_released",
  ).length;
  const second = (
    await api("POST", "/api/v1/bookings/hold", 201, payload, tokens[1])
  ).data;
  stage = "automatic outbox relay and delayed expiration job";
  await eventually(async () => {
    const event = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: second.id,
        eventType: "booking.expiration.requested",
      },
    });
    const job = await queue.getJob(`booking-expire-${second.id}`);
    return (
      Boolean(event?.processedAt) &&
      Boolean(job) &&
      (await job.getState()) === "delayed"
    );
  });
  // Exercise expiry without sleeping five minutes: fixture timestamps are moved together, preserving the 300s interval.
  const now = Date.now();
  await prisma.booking.update({
    where: { id: second.id },
    data: {
      createdAt: new Date(now - 301000),
      expiredAt: new Date(now - 1000),
    },
  });
  const job = await queue.add(
    "expire-booking-hold",
    { bookingId: second.id },
    { jobId: `smoke-${randomUUID()}` },
  );
  stage = "real BullMQ expiry processor";
  await eventually(async () => (await job.getState()) === "completed");
  assert.equal(
    (
      await api(
        "GET",
        `/api/v1/bookings/${second.id}`,
        200,
        undefined,
        tokens[1],
      )
    ).data.status,
    "EXPIRED",
  );
  stage = "automatic WebSocket expiry release";
  await eventually(async () => {
    await redis.ping();
    return (
      notifications.filter((event) => event.type === "seat_released").length >
      releasesBefore
    );
  });
  const failedBooking = (
    await api("POST", "/api/v1/bookings/hold", 201, payload, tokens[0])
  ).data;
  const returnUrl = "http://localhost:3000/booking/result";
  const failedPayment = (
    await api(
      "POST",
      "/api/v1/payments/create-sandbox-url",
      201,
      { bookingId: failedBooking.id, returnUrl },
      tokens[0],
    )
  ).data;
  function callback(booking, payment, status) {
    const body = {
      bookingId: booking.id,
      orderCode: booking.orderCode,
      transactionCode: payment.transactionCode,
      amount: booking.finalAmount,
      timestamp: new Date().toISOString(),
      status,
    };
    return {
      ...body,
      signature: createHmac("sha512", paymentSecret)
        .update(
          `webhook.v1:${JSON.stringify([body.bookingId, body.orderCode, body.transactionCode, body.amount, body.timestamp, body.status])}`,
        )
        .digest("hex"),
    };
  }
  const failure = callback(failedBooking, failedPayment, "FAILED");
  assert.equal(
    (await api("POST", "/api/v1/payments/webhook", 200, failure)).data
      .bookingStatus,
    "CANCELLED",
  );
  const paidBooking = (
    await api("POST", "/api/v1/bookings/hold", 201, payload, tokens[1])
  ).data;
  const payment = (
    await api(
      "POST",
      "/api/v1/payments/create-sandbox-url",
      201,
      { bookingId: paidBooking.id, returnUrl },
      tokens[1],
    )
  ).data;
  stage = "production signed Sandbox HTML checkout";
  const page = await fetch(payment.url, { signal: AbortSignal.timeout(5000) });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /html/);
  assert.match(await page.text(), /Thanh toán mô phỏng/);
  const success = callback(paidBooking, payment, "SUCCESS");
  await api("POST", "/api/v1/payments/webhook", 401, {
    ...success,
    signature: "0".repeat(128),
  });
  const paid = (await api("POST", "/api/v1/payments/webhook", 200, success))
    .data;
  assert.equal(paid.bookingStatus, "PAID");
  assert.equal(paid.paymentStatus, "SUCCESS");
  assert.equal(paid.duplicate, false);
  assert.equal(
    (await api("POST", "/api/v1/payments/webhook", 200, success)).data
      .duplicate,
    true,
  );
  const member = (
    await api("GET", "/api/v1/users/me/membership", 200, undefined, tokens[1])
  ).data;
  assert.equal(member.points, 31);
  await api(
    "GET",
    `/api/v1/payments/${paidBooking.id}/status`,
    404,
    undefined,
    tokens[0],
  );
  assert.equal(
    (
      await api(
        "GET",
        `/api/v1/payments/${paidBooking.id}/status`,
        200,
        undefined,
        tokens[1],
      )
    ).data.bookingStatus,
    "PAID",
  );
  await api(
    "POST",
    "/api/v1/payments/webhook",
    409,
    callback(paidBooking, payment, "FAILED"),
  );
  stage = "production automatic seat_sold and expiry cancellation";
  await eventually(async () => {
    await redis.ping();
    return notifications.some(
      (event) => event.type === "seat_sold" && event.showtimeId === showtime.id,
    );
  });
  await eventually(async () => {
    const event = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: paidBooking.id,
        eventType: "booking.expiration.cancel.requested",
      },
    });
    return (
      Boolean(event?.processedAt) &&
      !(await queue.getJob(`booking-expire-${paidBooking.id}`))
    );
  });
  stage = "automatic QR ticket issuance and actual SMTP delivery";
  await eventually(async () => {
    const ticket = await prisma.eTicket.findUnique({
      where: { bookingId: paidBooking.id },
    });
    const email = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: paidBooking.id,
        eventType: "ticket.email.requested",
      },
    });
    const request = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: paidBooking.id,
        eventType: "booking.ticket.requested",
      },
    });
    return Boolean(ticket && email?.processedAt && request?.processedAt);
  });
  const ticketRequests = await prisma.outboxEvent.findMany({
    where: {
      aggregateId: paidBooking.id,
      eventType: "booking.ticket.requested",
    },
  });
  assert.equal(ticketRequests.length, 1);
  assert(ticketRequests[0].processedAt);
  assert.equal(
    await prisma.eTicket.count({ where: { bookingId: paidBooking.id } }),
    1,
  );
  const ticket = await prisma.eTicket.findUniqueOrThrow({
    where: { bookingId: paidBooking.id },
  });
  const png = PNG.sync.read(
    Buffer.from(
      ticket.qrCodeBase64.replace(/^data:image\/png;base64,/, ""),
      "base64",
    ),
  );
  assert.equal(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    ticket.ticketHash,
  );
  const email = await prisma.outboxEvent.findFirstOrThrow({
    where: { aggregateId: paidBooking.id, eventType: "ticket.email.requested" },
  });
  const sent = smtpFixture.state.messages.filter((message) =>
    message.raw.includes(email.id),
  );
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, [users[1].email]);
  assert.match(sent[0].raw, /Content-Type: image\/png/i);
  assert.match(sent[0].raw, /Content-Type: text\/calendar/i);
  await api("GET", `/api/v1/tickets/${ticket.id}`, 404, undefined, tokens[0]);
  const ownTicket = (
    await api("GET", `/api/v1/tickets/${ticket.id}`, 200, undefined, tokens[1])
  ).data;
  assert.equal(ownTicket.ticketHash, ticket.ticketHash);
  assert.equal(ownTicket.seats.length, 2);
  assert(
    (
      await api("GET", "/api/v1/tickets/me", 200, undefined, tokens[1])
    ).data.items.some((item) => item.id === ticket.id),
  );
  stage = "production owner calendar download";
  const calendar = await fetch(`${base}/api/v1/tickets/${ticket.id}/calendar`, {
    headers: { authorization: `Bearer ${tokens[1]}` },
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(calendar.status, 200);
  assert.match(calendar.headers.get("content-type"), /text\/calendar/);
  assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
  stage = "production Sandbox form duplicate completion";
  const form = new URL(payment.url).searchParams;
  form.set("result", "SUCCESS");
  const completed = await fetch(`${base}/api/v1/payments/sandbox/complete`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(completed.status, 200);
  assert.match(await completed.text(), /PAID/);
  assert.equal(
    (await api("GET", "/api/v1/users/me/membership", 200, undefined, tokens[1]))
      .data.points,
    31,
  );
  assert.equal(
    await prisma.eTicket.count({ where: { bookingId: paidBooking.id } }),
    1,
  );
  await api("POST", "/api/v1/staff/check-in", 401, {
    ticketHash: ticket.ticketHash,
  });
  await api(
    "POST",
    "/api/v1/staff/check-in",
    403,
    { ticketHash: ticket.ticketHash },
    tokens[1],
  );
  stage = "production atomic concurrent two-staff QR admission";
  const scans = await Promise.all(
    [tokens[2], tokens[3]].map(async (auth) => {
      const response = await fetch(`${base}/api/v1/staff/check-in`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({ ticketHash: ticket.ticketHash }),
        signal: AbortSignal.timeout(5000),
      });
      return response.status;
    }),
  );
  assert.deepEqual(scans.sort(), [200, 409]);
  const admitted = await prisma.eTicket.findUniqueOrThrow({
    where: { id: ticket.id },
  });
  assert.equal(admitted.isCheckedIn, true);
  assert([users[2].id, users[3].id].includes(admitted.checkedInByStaffId));
  const paidJob = await queue.add(
    "expire-booking-hold",
    { bookingId: paidBooking.id },
    { jobId: `smoke-paid-${randomUUID()}` },
  );
  await eventually(async () => (await paidJob.getState()) === "completed");
  const finalMap = (
    await api("GET", `/api/v1/showtimes/${showtime.id}/seats`, 200)
  ).data;
  assert.deepEqual(finalMap.capacity, {
    total: 2,
    available: 0,
    holding: 0,
    sold: 2,
  });
  const spec = await api("GET", "/api/docs-json", 200);
  assert(spec.paths["/api/v1/bookings/hold"].post.security);
  assert(spec.paths["/api/v1/payments/webhook"]);
  console.log(
    "PASS compiled Phase9 production smoke: booking/payment/realtime/expiry, automatic one QR +decoded PNG, actual SMTP MIME/PNG/ICS delivery, owner tickets/calendar/privacy, duplicate payment effects once, STAFF role checks and concurrent single-winner QR admission.",
  );
}
async function cleanup() {
  watcher?.disconnect();
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
  }
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((row) => row.id);
  const bookings = await prisma.booking.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const ids = bookings.map((row) => row.id);
  await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: ids } } });
  await prisma.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  await prisma.showtime.deleteMany({ where: { movie: { title: prefix } } });
  await prisma.seat.deleteMany({ where: { room: { name: prefix } } });
  await prisma.room.deleteMany({ where: { name: prefix } });
  await prisma.cinema.deleteMany({ where: { name: prefix } });
  await prisma.movie.deleteMany({ where: { title: prefix } });
  await prisma.combo.deleteMany({ where: { name: prefix } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await smtpFixture?.close();
  await queue.close();
  const keys = await redis.keys(`${queuePrefix}:*`);
  if (keys.length) await redis.del(...keys);
  console.log(
    "PASS smoke cleanup: owned process/fixtures/Redis namespace only.",
  );
}
main()
  .catch(() => {
    console.error(
      `FAIL booking smoke at ${stage}; private diagnostics suppressed.`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch {
      console.error("FAIL smoke cleanup; private diagnostics suppressed.");
      process.exitCode = 1;
    } finally {
      await queue.close().catch(() => undefined);
      await prisma.$disconnect();
      await redis.quit().catch(() => redis.disconnect());
    }
  });
