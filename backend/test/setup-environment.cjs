const { config } = require("dotenv");
const { randomUUID } = require("node:crypto");
const { resolve } = require("node:path");
const { testDatabaseTarget } = require("../scripts/test-database-target.cjs");

config({ path: resolve(__dirname, "../.env"), quiet: true });
process.env.DATABASE_URL = testDatabaseTarget();
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST;
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT;
process.env.REDIS_PASSWORD = process.env.TEST_REDIS_PASSWORD;
process.env.REDIS_DB = process.env.TEST_REDIS_DB;
process.env.REDIS_TLS = "false";
process.env.BULLMQ_PREFIX = `nova:e2e:${randomUUID().replaceAll("-", "")}`;
process.env.HEALTH_TIMEOUT_MS = "1200";
