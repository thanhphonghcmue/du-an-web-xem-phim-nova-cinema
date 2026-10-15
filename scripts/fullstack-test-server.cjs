// Owned fixtures on the dedicated test database; never sends external email.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const root = resolve(__dirname, "..");
const req = createRequire(resolve(root, "backend/package.json"));
req("dotenv").config({ path: resolve(root, "backend/.env"), quiet: true });
const {
  testDatabaseTarget,
} = require("../backend/scripts/test-database-target.cjs");
const {
  createSmtpFixture,
} = require("../backend/test/support/smtp-fixture.cjs");
const frontendPort = Number(process.env.PLAYWRIGHT_PORT || 38173);
const apiPort = Number(process.env.FULLSTACK_API_PORT || 38174);
const origin = `http://127.0.0.1:${frontendPort}`;
const prefix = `web-e2e-${randomBytes(6).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const dataPath = resolve(root, ".runtime/fullstack-test.json");
let app,
  smtp,
  child,
  prisma,
  redis,
  stopping = false;
async function cleanup() {
  if (stopping) return;
  stopping = true;
  if (child) {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else child.once("exit", resolve);
    });
  }
  if (app) await app.close();
  if (smtp) await smtp.close();
  if (prisma) {
    await require("./fullstack-fixture-cleanup.cjs").cleanupRows(
      prisma,
      prefix,
    );
    await prisma.$disconnect();
  }
  if (redis) {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  }
  rmSync(dataPath, { force: true });
}
async function main() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseTarget(),
    REDIS_HOST: process.env.TEST_REDIS_HOST,
    REDIS_PORT: process.env.TEST_REDIS_PORT,
    REDIS_PASSWORD: process.env.TEST_REDIS_PASSWORD,
    REDIS_DB: process.env.TEST_REDIS_DB,
    REDIS_TLS: "false",
    BULLMQ_PREFIX: prefix,
    JWT_ACCESS_SECRET: randomBytes(48).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(48).toString("hex"),
    PAYMENT_SANDBOX_SECRET: randomBytes(48).toString("hex"),
    CORS_ORIGINS: origin,
    PAYMENT_RETURN_ORIGINS: origin,
    PAYMENT_SANDBOX_BASE_URL: `http://127.0.0.1:${apiPort}`,
  });
  smtp = await createSmtpFixture();
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtp.port),
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "tickets@nova.local",
    SMTP_SECURE: "false",
  });
  const { PrismaClient } = req("@prisma/client");
  prisma = new PrismaClient();
  const Redis = req("ioredis");
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  const passwordHash = await req("argon2").hash(password);
  const accounts = {};
  for (const role of ["ADMIN", "STAFF", "CUSTOMER"]) {
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${role.toLowerCase()}@example.test`,
        fullName: `Web ${role}`,
        passwordHash,
        role,
      },
    });
    accounts[role.toLowerCase()] = { id: user.id, email: user.email };
  }
  const cinema = await prisma.cinema.create({
    data: {
      name: `${prefix} Cinema`,
      address: "Owned browser fixture",
      city: "TP. Hồ Chí Minh",
    },
  });
  const room = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: "Infinity Test",
      roomType: "IMAX_70MM_LASER",
      totalSeats: 60,
    },
  });
  await prisma.seat.createMany({
    data: ["A", "B", "H"].flatMap((row) =>
      Array.from({ length: 20 }, (_, i) => ({
        roomId: room.id,
        seatRow: row,
        seatColumn: i + 1,
        seatType: row === "H" ? "SWEETBOX" : row === "B" ? "VIP" : "STANDARD",
        priceModifier: row === "H" ? "1.50" : row === "B" ? "1.20" : "1.00",
      })),
    ),
  });
  const movie = await prisma.movie.create({
    data: {
      title: "Dune: Hành Tinh Cát 2",
      description: prefix + " movie",
      durationMinutes: 120,
      releaseDate: new Date("2024-01-01Z"),
      ageRating: "T16",
      status: "NOW_SHOWING",
    },
  });
  const showtime = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      roomId: room.id,
      startTime: new Date(Date.now() + 30 * 60000),
      endTime: new Date(Date.now() + 165 * 60000),
      baseTicketPrice: "90000.00",
    },
  });
  const combo = await prisma.combo.create({
    data: {
      name: prefix + " Party Combo",
      description: "Bắp và hai nước",
      price: "69000.00",
    },
  });
  app = await require("../backend/dist/bootstrap.js").createApplication({
    logger: false,
  });
  await app.listen(apiPort, "127.0.0.1");
  mkdirSync(resolve(root, ".runtime"), { recursive: true });
  writeFileSync(
    dataPath,
    JSON.stringify({
      prefix,
      password,
      accounts,
      cinema,
      room,
      movie,
      showtime,
      combo,
    }),
    { mode: 0o600 },
  );
  child = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(frontendPort),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "development",
        BACKEND_API_URL: `http://127.0.0.1:${apiPort}/api/v1`,
      },
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  child.once("exit", (code) => {
    if (!stopping) {
      console.error("Frontend exited:", code);
      void cleanup().then(() => process.exit(1));
    }
  });
  console.log("Isolated fullstack fixture services started.");
}
process.once("SIGTERM", () => void cleanup().then(() => process.exit(0)));
process.once("SIGINT", () => void cleanup().then(() => process.exit(0)));
main().catch(async () => {
  console.error(
    "Fullstack fixture startup failed; verify dedicated test PG/Redis, migrations and backend build.",
  );
  await cleanup();
  process.exit(1);
});
