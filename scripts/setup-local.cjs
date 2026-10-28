// Node/npm plus existing native PostgreSQL/Redis only; never starts containers.
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { createRequire } = require("node:module");
const root = resolve(__dirname, "..");
const req = createRequire(resolve(root, "backend/package.json"));
req("dotenv").config({ path: resolve(root, "backend/.env"), quiet: true });
process.env.XDG_CACHE_HOME ||= resolve(root, ".runtime/cache");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run npm run setup:local after npm install.");
const steps =
  process.env.DATABASE_URL && process.env.NOVA_BACKEND_MODE !== "memory"
    ? [
        ["run", "auth:configure", "--workspace", "backend"],
        ["run", "payment:configure", "--workspace", "backend"],
        ["run", "seed"],
        ["run", "build:backend"],
      ]
    : [["run", "seed"]];
for (const args of steps) {
  const r = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log(
  "Native setup ready. Run npm run dev. PostgreSQL mode needs your configured native PostgreSQL/Redis and private backend/.env; otherwise RAM fallback resets on restart.",
);
