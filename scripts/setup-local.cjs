const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const backend = resolve(__dirname, "../backend");
// Keep generated engine caches writable without changing the user's home.
process.env.XDG_CACHE_HOME ||= resolve(__dirname, "../.runtime/cache");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this helper using npm run setup:local.");
const steps = [
  ["ci"],
  ["run", "db:configure"],
  ["run", "infra:configure"],
  ["run", "auth:configure"],
  ["run", "payment:configure"],
  ["run", "infra:up:test"],
  ["run", "mail:up"],
  ["run", "prisma:generate"],
  ["run", "db:migrate"],
  ["run", "db:seed"],
  ["run", "db:migrate:test"],
  ["run", "build"],
];
for (const args of steps) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: backend,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  "Local backend, PostgreSQL, Redis, SMTP and test database prepared. Run npm run dev:full from the repository root.",
);
