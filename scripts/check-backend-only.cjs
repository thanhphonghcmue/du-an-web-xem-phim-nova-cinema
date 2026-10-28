// Exercise a real Next.js BFF against a deliberately unavailable loopback upstream.
// Does not read .env, write to PostgreSQL, or replace API responses in the browser.
const {
  mkdtempSync,
  cpSync,
  symlinkSync,
  existsSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve, join } = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { chromium, expect } = require("@playwright/test");
const root = resolve(__dirname, "..");
let child, browser, upstream, directory;
async function main() {
  let stall = false;
  upstream = createServer((socket) => {
    if (!stall) socket.destroy();
    else socket.setTimeout(10000, () => socket.destroy());
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const portOwner = createServer();
  portOwner.listen(0, "127.0.0.1");
  await once(portOwner, "listening");
  const port = portOwner.address().port;
  await new Promise((resolve) => portOwner.close(resolve));
  directory = mkdtempSync(join(tmpdir(), "nova-backend-only-"));
  for (const name of ["src", "content"])
    cpSync(join(root, "frontend", name), join(directory, name), {
      recursive: true,
    });
  for (const name of [
    "package.json",
    "jsconfig.json",
    "next.config.mjs",
    "legacy-env.mjs",
    "postcss.config.js",
    "tailwind.config.js",
  ])
    cpSync(join(root, "frontend", name), join(directory, name));
  for (const name of ["node_modules", "public"])
    symlinkSync(
      join(root, name === "public" ? "frontend/public" : name),
      join(directory, name),
      "junction",
    );
  const origin = `http://127.0.0.1:${port}`;
  child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next", {
        paths: [join(root, "frontend")],
      }),
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: directory,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        NOVA_STANDALONE: "true",
        BACKEND_API_URL: `http://127.0.0.1:${upstream.address().port}/api/v1`,
      },
    },
  );
  const deadline = Date.now() + 60000;
  while (true) {
    if (child.exitCode !== null)
      throw new Error("Isolated Next server exited early.");
    try {
      if (
        (
          await fetch(origin + "/api/v1/runtime", {
            signal: AbortSignal.timeout(1500),
          })
        ).ok
      )
        break;
    } catch {
      /* Cold compilation. */
    }
    if (Date.now() > deadline)
      throw new Error("Isolated Next readiness timed out.");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  const page = await browser.newPage({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect(
    (await (await page.request.get("/api/v1/runtime")).json()).data.mode,
  ).toBe("backend");
  for (const path of ["/auth/register", "/auth/login", "/bookings/hold"]) {
    const result = await page.request.post("/api/v1" + path, {
      data: {
        email: "offline@example.test",
        password: "offline-only-test-2026",
        fullName: "Offline test",
      },
    });
    expect(result.status()).toBe(503);
    const body = await result.json();
    expect(body.code).toBe("BACKEND_UNAVAILABLE");
    expect(body.data).toBeUndefined();
  }
  await page.goto("/");
  await expect(
    page.locator(".catalog-connection-notice [role=alert]"),
  ).toContainText("Không thể kết nối đến máy chủ Backend", { timeout: 20000 });
  await expect(
    page.locator(".discovery-film,.timeline-show,.standalone-mode-notice"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
  // A reachable server that never sends headers must also release the BFF.
  stall = true;
  const started = performance.now();
  const stalled = await page.request.post("/api/v1/bookings/hold", {
    data: {},
  });
  const elapsed = performance.now() - started;
  expect(stalled.status()).toBe(503);
  expect((await stalled.json()).code).toBe("BACKEND_UNAVAILABLE");
  expect(elapsed).toBeGreaterThan(7000);
  expect(elapsed).toBeLessThan(8300);
  console.log(
    `PASS backend-only network check: legacy flag ignored; real upstream failure returns 503; stalled upstream released in ${elapsed.toFixed(0)}ms; no invented data, false success or browser errors.`,
  );
}
main()
  .catch((error) => {
    console.error("FAIL backend-only network check:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    if (child && child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
      await stopped;
      clearTimeout(timeout);
    }
    if (upstream) await new Promise((resolve) => upstream.close(resolve));
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
