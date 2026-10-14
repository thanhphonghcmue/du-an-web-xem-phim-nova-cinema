const { randomBytes } = require("node:crypto");
const {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { resolve } = require("node:path");
const { parse } = require("dotenv");
const root = resolve(__dirname, "..");
const runtime = resolve(root, ".runtime");
const configPath = resolve(runtime, "database.env");
const appPath = resolve(root, ".env");
mkdirSync(runtime, { recursive: true, mode: 0o700 });
const values = existsSync(configPath)
  ? parse(readFileSync(configPath))
  : {
      DEV_POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
      TEST_POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
      SEED_DEMO_PASSWORD: randomBytes(24).toString("hex"),
      DATABASE_PORT: process.env.DATABASE_PORT || "55432",
      TEST_DATABASE_PORT: process.env.TEST_DATABASE_PORT || "55433",
    };
for (const name of [
  "DEV_POSTGRES_PASSWORD",
  "TEST_POSTGRES_PASSWORD",
  "SEED_DEMO_PASSWORD",
]) {
  if (!values[name] || !/^[a-f0-9]{48,64}$/.test(values[name])) {
    throw new Error(
      "Invalid local database configuration; inspect .runtime/database.env without sharing secrets.",
    );
  }
}
for (const name of ["DATABASE_PORT", "TEST_DATABASE_PORT"]) {
  if (
    !/^\d+$/.test(values[name] || "") ||
    Number(values[name]) < 1 ||
    Number(values[name]) > 65535
  ) {
    throw new Error("Database ports must be integers between 1 and 65535.");
  }
}
if (values.DATABASE_PORT === values.TEST_DATABASE_PORT)
  throw new Error("Development and test ports must differ.");
const desired = {
  DATABASE_URL: `postgresql://nova_owner:${values.DEV_POSTGRES_PASSWORD}@127.0.0.1:${values.DATABASE_PORT}/nova_development?schema=public`,
  TEST_DATABASE_URL: `postgresql://nova_owner:${values.TEST_POSTGRES_PASSWORD}@127.0.0.1:${values.TEST_DATABASE_PORT}/nova_test?schema=public`,
  SEED_DEMO_PASSWORD: values.SEED_DEMO_PASSWORD,
};
const existingText = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
const existing = parse(existingText);
for (const [name, value] of Object.entries(desired)) {
  if (existing[name] && existing[name] !== value) {
    throw new Error(
      "Existing .env configuration differs. Use your existing database or configure local ports deliberately; no values overwritten.",
    );
  }
}
if (!existsSync(configPath))
  writeFileSync(
    configPath,
    Object.entries(values)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
const additions = Object.entries(desired).filter(([name]) => !existing[name]);
if (additions.length) {
  const blanks = new Set(additions.map(([name]) => name));
  const retained = existingText
    .split("\n")
    .filter((line) => {
      const match = line.match(/^\s*([A-Z_]+)\s*=/);
      return !match || !blanks.has(match[1]);
    })
    .join("\n");
  writeFileSync(
    appPath,
    retained +
      "\n" +
      additions.map(([name, value]) => `${name}=${value}`).join("\n") +
      "\n",
    { mode: 0o600 },
  );
}
chmodSync(configPath, 0o600);
chmodSync(appPath, 0o600);
console.log(
  "Local database configuration ready. Credentials are stored only in ignored .env and .runtime/database.env.",
);
