// Smoke-test the approved automatic RAM fallback in an isolated workspace.
// Only seed startup is fault-injected; the real standalone server, Next.js BFF,
// catalogue and food UI run over HTTP. Never reads .env or touches PostgreSQL.
const {
  mkdtempSync,
  mkdirSync,
  cpSync,
  symlinkSync,
  writeFileSync,
  rmSync,
  existsSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve, join } = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { chromium, expect } = require("@playwright/test");
const root = resolve(__dirname, "..");
let child, browser, directory;
async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
async function main() {
  directory = mkdtempSync(join(tmpdir(), "nova-fallback-startup-"));
  for (const name of ["src", "content"])
    cpSync(join(root, name), join(directory, name), { recursive: true });
  for (const name of [
    "package.json",
    "next.config.mjs",
    "postcss.config.js",
    "tailwind.config.js",
  ])
    cpSync(join(root, name), join(directory, name));
  for (const name of ["node_modules", "public"])
    symlinkSync(join(root, name), join(directory, name), "junction");
  mkdirSync(join(directory, "scripts"));
  mkdirSync(join(directory, "backend", "scripts"), { recursive: true });
  cpSync(
    join(root, "scripts/dev-fullstack.cjs"),
    join(directory, "scripts/dev-fullstack.cjs"),
  );
  cpSync(
    join(root, "backend/standalone-server.cjs"),
    join(directory, "backend/standalone-server.cjs"),
  );
  // If the launcher's port probe finds PostgreSQL, emulate a failed seed without
  // connecting to any database. Otherwise it takes the no-database fallback path.
  writeFileSync(
    join(directory, "backend/scripts/seed-discovery.cjs"),
    "process.exit(1);\n",
  );
  const apiPort = await freePort(),
    webPort = await freePort();
  const origin = `http://127.0.0.1:${webPort}`;
  let switched = false;
  child = spawn(process.execPath, ["scripts/dev-fullstack.cjs"], {
    cwd: directory,
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: "",
      NOVA_REFRESH_PROGRAMME: "true",
      NOVA_API_PORT: String(apiPort),
      NOVA_WEB_PORT: String(webPort),
    },
  });
  child.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("backend độc lập")) switched = true;
  });
  let ready = false;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error("Fallback launcher exited early.");
    try {
      const response = await fetch(`${origin}/api/v1/showtimes/programme`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        const { data } = await response.json();
        if (
          data.combos?.length !== 24 ||
          new Set(data.combos.map((item) => item.id)).size !== 24
        )
          throw new Error("Wrong fallback menu.");
        ready = true;
        break;
      }
    } catch {
      /* Startup or first compilation can still be in progress. */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready || !switched)
    throw new Error("Automatic standalone fallback was not ready.");
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await page.goto(`${origin}/bap-nuoc`);
  await expect(page.locator(".food-product")).toHaveCount(24);
  await page
    .locator(".food-product")
    .getByRole("button", { name: "Thêm Green Movie Combo", exact: true })
    .click();
  await expect(page.locator(".food-basket-count")).toHaveText("1");
  if (errors.length) throw new Error("Browser error in fallback food UI.");
  console.log(
    "PASS automatic RAM fallback: seed failure/unavailable database selects the original standalone backend; real Next.js BFF displays 24 menu items and the food cart works. No database or payment was used.",
  );
}
async function cleanup() {
  if (browser) await browser.close();
  if (child && child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    const watchdog = setTimeout(() => child.kill("SIGKILL"), 15000);
    try {
      await stopped;
    } finally {
      clearTimeout(watchdog);
    }
  }
  if (directory) rmSync(directory, { recursive: true, force: true });
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
