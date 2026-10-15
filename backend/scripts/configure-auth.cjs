const { randomBytes } = require("node:crypto");
const {
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} = require("node:fs");
const { resolve } = require("node:path");
const { parse } = require("dotenv");
const path = resolve(__dirname, "../.env");
if (!existsSync(path)) throw new Error("Create .env using db:configure first.");
const text = readFileSync(path, "utf8");
const existing = parse(text);
const keys = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const values = Object.fromEntries(
  keys.map((name) => [name, existing[name] || randomBytes(48).toString("hex")]),
);
if (
  keys.some((name) => values[name].length < 32) ||
  values.JWT_ACCESS_SECRET === values.JWT_REFRESH_SECRET
)
  throw new Error(
    "Existing JWT secrets are invalid or identical; nothing overwritten.",
  );
const missing = keys.filter((name) => !existing[name]);
if (missing.length) {
  const retained = text
    .split("\n")
    .filter(
      (line) =>
        !missing.some((name) => new RegExp(`^\\s*${name}\\s*=`).test(line)),
    )
    .join("\n");
  writeFileSync(
    path,
    retained +
      "\n" +
      missing.map((name) => `${name}=${values[name]}`).join("\n") +
      "\n",
    { mode: 0o600 },
  );
}
chmodSync(path, 0o600);
console.log(
  "JWT secrets configured privately; existing nonempty values preserved.",
);
