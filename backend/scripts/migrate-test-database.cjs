const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { testDatabaseTarget } = require("./test-database-target.cjs");
const executable = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [executable, "migrate", "deploy"], {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDatabaseTarget() },
});
if (result.error) throw new Error("Unable to launch Prisma migration process.");
process.exitCode = result.status ?? 1;
