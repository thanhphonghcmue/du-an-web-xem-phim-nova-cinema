// Đo SELECT trên PostgreSQL test; không in dữ liệu khách hoặc cấu hình kết nối.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const req = createRequire(resolve(__dirname, "../backend/package.json"));
req("dotenv").config({
  path: resolve(__dirname, "../backend/.env"),
  quiet: true,
});
const { PrismaClient, Prisma } = req("@prisma/client");
const {
  testDatabaseTarget,
} = require("../backend/scripts/test-database-target.cjs");
async function main() {
  const db = new PrismaClient({
    datasources: { db: { url: testDatabaseTarget() } },
  });
  try {
    const rowCount = await db.combo.count();
    for (const [name, query] of [
      [
        "public_active",
        Prisma.sql`EXPLAIN (ANALYZE,FORMAT JSON) SELECT id,name,price,taste_tag,suggested_min_seats,suggested_max_seats FROM combos WHERE is_active=true ORDER BY name,id LIMIT 25`,
      ],
      [
        "admin_all",
        Prisma.sql`EXPLAIN (ANALYZE,FORMAT JSON) SELECT id,name,price,is_active,taste_tag FROM combos ORDER BY name,id LIMIT 25`,
      ],
    ]) {
      const samples = [];
      for (let i = 0; i < 15; i++) {
        const plan = await db.$queryRaw(query);
        samples.push(plan[0]["QUERY PLAN"][0]["Execution Time"]);
      }
      samples.sort((a, b) => a - b);
      console.log(
        JSON.stringify({
          query: name,
          rowCount,
          samples: samples.length,
          sqlExecutionP50Ms: samples[7],
          sqlExecutionP95Ms: samples[14],
          scope:
            "PostgreSQL EXPLAIN execution only; excludes HTTP, network and planning",
        }),
      );
    }
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Không đo được truy vấn. Kiểm tra cấu hình PostgreSQL test.");
  process.exitCode = 1;
});
