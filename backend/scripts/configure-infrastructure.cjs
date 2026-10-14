const { randomBytes } = require("node:crypto");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} = require("node:fs");
const { resolve } = require("node:path");
const { parse } = require("dotenv");
const root = resolve(__dirname, "..");
const directory = resolve(root, ".runtime");
const statePath = resolve(directory, "infrastructure.env");
const appPath = resolve(root, ".env");
mkdirSync(directory, { recursive: true, mode: 0o700 });
const text = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
const existing = parse(text);
const state = existsSync(statePath)
  ? parse(readFileSync(statePath))
  : {
      REDIS_LOCAL_PASSWORD: randomBytes(32).toString("hex"),
      TEST_REDIS_LOCAL_PASSWORD: randomBytes(32).toString("hex"),
      REDIS_LOCAL_PORT:
        process.env.REDIS_LOCAL_PORT || existing.REDIS_PORT || "6380",
      TEST_REDIS_LOCAL_PORT:
        process.env.TEST_REDIS_LOCAL_PORT || existing.TEST_REDIS_PORT || "6381",
    };
for (const key of ["REDIS_LOCAL_PASSWORD", "TEST_REDIS_LOCAL_PASSWORD"])
  if (!/^[a-f0-9]{64}$/.test(state[key] || ""))
    throw new Error("Invalid private Redis state configuration.");
for (const key of ["REDIS_LOCAL_PORT", "TEST_REDIS_LOCAL_PORT"])
  if (
    !/^\d+$/.test(state[key] || "") ||
    Number(state[key]) < 1 ||
    Number(state[key]) > 65535
  )
    throw new Error("Redis ports must be between 1 and 65535.");
if (state.REDIS_LOCAL_PORT === state.TEST_REDIS_LOCAL_PORT)
  throw new Error("Redis ports must be distinct.");
if (existing.REDIS_TLS === "true")
  throw new Error(
    "Local Redis setup cannot overwrite an external TLS configuration.",
  );
const desired = {
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: state.REDIS_LOCAL_PORT,
  REDIS_PASSWORD: state.REDIS_LOCAL_PASSWORD,
  REDIS_DB: "0",
  TEST_REDIS_HOST: "127.0.0.1",
  TEST_REDIS_PORT: state.TEST_REDIS_LOCAL_PORT,
  TEST_REDIS_PASSWORD: state.TEST_REDIS_LOCAL_PASSWORD,
  TEST_REDIS_DB: "0",
  BULLMQ_PREFIX: "nova:development",
};
for (const [key, value] of Object.entries(desired))
  if (existing[key] && existing[key] !== value)
    throw new Error(
      "Existing Redis configuration differs; no values overwritten. Use your external Redis or adjust local configuration deliberately.",
    );
if (!existsSync(statePath))
  writeFileSync(
    statePath,
    Object.entries(state)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
const additions = Object.entries(desired).filter(([key]) => !existing[key]);
const keys = new Set(additions.map(([key]) => key));
const retained = text
  .split("\n")
  .filter((line) => {
    const match = line.match(/^\s*([A-Z_]+)\s*=/);
    return !match || !keys.has(match[1]);
  })
  .join("\n");
if (additions.length)
  writeFileSync(
    appPath,
    retained +
      "\n" +
      additions.map(([key, value]) => `${key}=${value}`).join("\n") +
      "\n",
    { mode: 0o600 },
  );
chmodSync(statePath, 0o600);
chmodSync(appPath, 0o600);
console.log(
  "Private Redis configuration ready; existing PostgreSQL credentials and volumes are preserved.",
);
