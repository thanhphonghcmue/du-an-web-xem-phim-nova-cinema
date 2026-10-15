const { existsSync, readFileSync, rmSync } = require("node:fs");
const { resolve } = require("node:path");
const { createRequire } = require("node:module");
const root = resolve(__dirname, "..");
module.exports = async function teardown() {
  const path = resolve(root, ".runtime/fullstack-test.json");
  if (!existsSync(path)) return;
  const { prefix } = JSON.parse(readFileSync(path, "utf8"));
  if (!/^web-e2e-[a-f0-9-]+$/.test(prefix))
    throw new Error("Invalid owned fixture prefix.");
  const req = createRequire(resolve(root, "backend/package.json"));
  req("dotenv").config({ path: resolve(root, "backend/.env"), quiet: true });
  const {
    testDatabaseTarget,
  } = require("../backend/scripts/test-database-target.cjs");
  const { PrismaClient } = req("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: testDatabaseTarget() });
  const Redis = req("ioredis");
  const redis = new Redis({
    host: process.env.TEST_REDIS_HOST,
    port: Number(process.env.TEST_REDIS_PORT),
    password: process.env.TEST_REDIS_PASSWORD,
    db: Number(process.env.TEST_REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  try {
    await require("./fullstack-fixture-cleanup.cjs").cleanupRows(
      prisma,
      prefix,
    );
    const keys = await redis.keys(prefix + ":*");
    if (keys.length) await redis.del(...keys);
    rmSync(path);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
};
