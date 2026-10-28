// Native-only, additive seed. Configured PostgreSQL errors are never disguised as a successful DB seed.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const root = resolve(__dirname, "..");
const req = createRequire(resolve(root, "backend/package.json"));
req("dotenv").config({ path: resolve(root, "backend/.env"), quiet: true });
if (process.env.NODE_ENV === "production")
  throw new Error("Development seed is disabled in production.");
if (!process.env.DATABASE_URL || process.env.NOVA_BACKEND_MODE === "memory") {
  const { createDemoData } = require("../backend/standalone-server.cjs");
  const data = createDemoData();
  const manifest = {
    mode: "memory",
    persistent: false,
    generatedAt: new Date().toISOString(),
    movies: data.movies.length,
    cinemas: data.cinemas.length,
    rooms: data.rooms.length,
    showtimes: data.showtimes.length,
    combos: data.combos.length,
    accounts: data.accounts.map(({ email, role, cMemberPoints }) => ({
      email,
      role,
      points: cMemberPoints,
    })),
  };
  mkdirSync(resolve(root, ".runtime"), { recursive: true });
  writeFileSync(
    resolve(root, ".runtime/native-seed.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    `Native RAM catalogue validated: ${manifest.movies} films, ${manifest.cinemas} cinemas, ${manifest.rooms} rooms, ${manifest.showtimes} shows. Accounts/data are instantiated on npm run dev and reset on restart; no SQL database was seeded.`,
  );
} else {
  if (!process.env.npm_execpath)
    throw new Error("Run npm run seed from the repository root.");
  async function seedPostgres() {
    // A fresh workspace install has not necessarily generated Prisma Client yet.
    const generated = spawnSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "run",
        "prisma:generate",
        "--workspace",
        "backend",
      ],
      { cwd: root, env: process.env, stdio: "inherit" },
    );
    if (generated.status !== 0) process.exit(generated.status || 1);
    const { PrismaClient } = req("@prisma/client");
    const db = new PrismaClient();
    try {
      const rows =
        await db.$queryRaw`SELECT current_setting('server_encoding') AS encoding, lower('ĐÊM TRẮNG') AS folded`;
      if (rows[0]?.encoding !== "UTF8" || rows[0]?.folded !== "đêm trắng") {
        throw new Error(
          "Native PostgreSQL needs UTF8 and a Unicode LC_CTYPE supporting Vietnamese case folding. Create a correctly configured development database before seeding.",
        );
      }
    } finally {
      await db.$disconnect();
    }
    for (const script of [
      "db:migrate",
      "db:seed",
      "db:seed:discovery",
      "db:seed:programme",
    ]) {
      const result = spawnSync(
        process.execPath,
        [process.env.npm_execpath, "run", script, "--workspace", "backend"],
        { cwd: root, env: process.env, stdio: "inherit" },
      );
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
  seedPostgres().catch(() => {
    console.error(
      "Native seed preflight failed. Check PostgreSQL connectivity, UTF8 encoding and a Unicode locale supporting Vietnamese letters; no configuration or credentials were logged.",
    );
    process.exitCode = 1;
  });
}
