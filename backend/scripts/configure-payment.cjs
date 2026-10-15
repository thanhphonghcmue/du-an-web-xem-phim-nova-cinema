const { randomBytes, randomUUID } = require("node:crypto");
const {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  chmodSync,
} = require("node:fs");
const { resolve } = require("node:path");
const { parse } = require("dotenv");
const path = resolve(__dirname, "../.env");
if (!existsSync(path)) throw new Error("Create .env using db:configure first.");
const text = readFileSync(path, "utf8");
const existing = parse(text);
const key = "PAYMENT_SANDBOX_SECRET";
const injected = process.env[key];
const secret = injected || existing[key] || randomBytes(48).toString("hex");
if (
  secret.length < 32 ||
  [
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_REFRESH_SECRET,
    existing.JWT_ACCESS_SECRET,
    existing.JWT_REFRESH_SECRET,
  ].includes(secret)
)
  throw new Error(
    "Payment secret must be at least32 characters and independent of JWT; nothing overwritten.",
  );
if (!injected && !existing[key]) {
  const retained = text
    .split("\n")
    .filter((line) => !/^\s*PAYMENT_SANDBOX_SECRET\s*=/.test(line))
    .join("\n");
  const temporary = `${path}.payment-${randomUUID()}`;
  writeFileSync(temporary, retained + `\n${key}=${secret}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temporary, path);
}
chmodSync(path, 0o600);
console.log(
  "Sandbox HMAC secret configured privately; existing/injected nonempty value preserved. No bank credentials required.",
);
