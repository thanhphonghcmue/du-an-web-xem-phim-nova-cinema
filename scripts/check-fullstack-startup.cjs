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
const { randomBytes, randomUUID } = require("node:crypto");
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
  mkdirSync(join(directory, "frontend"));
  cpSync(join(root, "shared"), join(directory, "shared"), { recursive: true });
  cpSync(join(root, "content"), join(directory, "content"), {
    recursive: true,
  });
  for (const name of [
    "src",
    "content",
    "package.json",
    "jsconfig.json",
    "next.config.mjs",
    "legacy-env.mjs",
    "postcss.config.js",
    "tailwind.config.js",
  ])
    cpSync(join(root, "frontend", name), join(directory, "frontend", name), {
      recursive: true,
    });
  symlinkSync(
    join(root, "node_modules"),
    join(directory, "node_modules"),
    "junction",
  );
  symlinkSync(
    join(root, "frontend/public"),
    join(directory, "frontend/public"),
    "junction",
  );
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
  cpSync(
    join(root, "backend/programme-codec.cjs"),
    join(directory, "backend/programme-codec.cjs"),
  );
  cpSync(
    join(root, "backend/standalone"),
    join(directory, "backend/standalone"),
    { recursive: true },
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
  let ready = false,
    programme;
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
          data.combos?.length !== 29 ||
          new Set(data.combos.map((item) => item.id)).size !== 29
        )
          throw new Error("Wrong fallback menu.");
        programme = data;
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
  const seed = require("../backend/standalone-server.cjs").createDemoData();
  const adminAccount = seed.accounts.find(
    (account) => account.role === "ADMIN",
  );
  const adminLogin = await page.request.post(`${origin}/api/v1/auth/login`, {
    data: { email: adminAccount.email, password: adminAccount.password },
  });
  expect(adminLogin.status()).toBe(200);
  await page.goto(`${origin}/admin`);
  await page
    .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
    .click();
  const film = seed.movies[0];
  await page
    .locator(`[data-entity-id="${film.id}"]`)
    .getByRole("button", { name: "Sửa", exact: true })
    .click();
  await page
    .getByLabel("Trạng thái", { exact: true })
    .selectOption("COMING_SOON");
  const savedFilm = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/movies/${film.id}`) &&
      r.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Lưu phim", exact: true }).click();
  expect((await savedFilm).status()).toBe(200);
  await page
    .getByRole("navigation", { name: "Danh mục vận hành" })
    .getByRole("button", { name: "🍿 Quản lý Party Combo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm mới Combo", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Quản trị combo",
    exact: true,
  });
  await modal
    .getByLabel("Tên combo", { exact: true })
    .fill("00 RAM smoke combo");
  await modal.getByLabel("Mô tả", { exact: true }).fill("Owned smoke combo");
  await modal
    .getByLabel("Thành phần combo", { exact: true })
    .fill("1 bắp + 1 nước");
  await modal.getByLabel("Giá (VND)", { exact: true }).fill("49000");
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/admin/combos") && r.request().method() === "POST",
  );
  await modal
    .getByRole("button", { name: "Lưu bắp nước", exact: true })
    .click();
  const response = await created;
  expect(response.status()).toBe(201);
  const combo = (await response.json()).data;
  const comboRow = page.locator(`[data-entity-id="${combo.id}"]`);
  await comboRow.getByRole("button", { name: "Ẩn combo", exact: true }).click();
  await expect(
    comboRow.getByRole("button", { name: "Hiện combo", exact: true }),
  ).toBeVisible();
  await comboRow
    .getByRole("button", { name: "Xóa combo", exact: true })
    .click();
  await expect(comboRow).toHaveCount(0);
  await page.request.post(`${origin}/api/v1/auth/logout`);
  await page.goto(`${origin}/bap-nuoc`);
  try {
    // Cold Next dev compilation/hydration also occurs in this isolated copy.
    await expect(page.locator(".food-product")).toHaveCount(29, {
      timeout: 15000,
    });
  } catch (cause) {
    const alerts = await page.getByRole("alert").allTextContents();
    throw new Error(
      `Fallback catalogue UI: ${errors[0] || alerts.join(" · ") || cause.message}`,
    );
  }
  await page
    .locator(".food-product")
    .getByRole("button", { name: "Thêm Green Movie Combo", exact: true })
    .click();
  await expect(page.locator(".food-basket-count")).toHaveText("1");
  const password = randomBytes(18).toString("hex"),
    email = `ram-${randomBytes(6).toString("hex")}@example.test`;
  expect(
    (
      await page.request.post(`${origin}/api/v1/auth/register`, {
        data: { email, password, fullName: "RAM smoke customer" },
      })
    ).status(),
  ).toBe(201);
  const login = await page.request.post(`${origin}/api/v1/auth/login`, {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  const payload = await login.json();
  expect(typeof payload.message).toBe("string");
  const session = payload.data;
  expect(session.accessToken).toBeUndefined();
  expect(session.refreshToken).toBeUndefined();
  await page.goto(`${origin}/dat-ve`);
  await expect(page.locator(".login-trigger")).toContainText("customer");
  const { chooseOption, chooseDate } = await import("../tests/ui-choices.mjs");
  const show = programme.showtimes.find(
    (s) => Date.parse(s.startTime) > Date.now() + 3600000,
  );
  const room = programme.rooms.find((r) => r.id === show.roomId);
  await chooseOption(page, "Chọn cụm rạp", room.cinemaId);
  await chooseOption(page, "Chọn phim", show.movieId);
  await chooseDate(
    page,
    "Chọn ngày chiếu",
    new Date(show.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  try {
    await chooseOption(page, "Chọn suất chiếu", show.id);
  } catch (cause) {
    const query = new URLSearchParams({
      cinemaId: room.cinemaId,
      movieId: show.movieId,
      date: new Date(show.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    });
    const response = await page.request.get(
      `${origin}/api/v1/showtimes?${query}`,
    );
    const payload = await response.json();

    throw new Error(
      `RAM schedule selection: HTTP ${response.status()}, target=${payload.data?.items?.some((item) => item.id === show.id)}, options=${JSON.stringify(await page.getByRole("option").allTextContents())}; ${cause.message}`,
    );
  }
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Chọn ghế & đặt vé" });
  await expect(dialog)
    .toBeVisible()
    .catch(async (error) => {
      console.error(
        "Fallback booking alerts:",
        await page.getByRole("alert").allTextContents(),
      );
      console.error(
        "Fallback dialog headings:",
        await page.getByRole("dialog").getByRole("heading").allTextContents(),
      );
      throw error;
    });
  await expect(
    dialog.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  )
    .toBeVisible({ timeout: 15000 })
    .catch(async (error) => {
      console.error(
        "Fallback booking alerts:",
        await page.getByRole("alert").allTextContents(),
      );
      console.error("Fallback browser errors:", errors);
      throw error;
    });
  // Ghế được chọn trên UI chưa phải là ghế đã giữ: khách khác vẫn có thể giữ trước.
  const candidate = dialog.getByRole("button", {
    name: "Ghế A1, còn trống",
    exact: true,
  });
  await candidate.click();
  const other = await browser.newContext();
  let competitorOrder;
  try {
    const rivalEmail = `ram-rival-${randomBytes(6).toString("hex")}@example.test`;
    expect(
      (
        await other.request.post(`${origin}/api/v1/auth/register`, {
          data: {
            email: rivalEmail,
            password,
            fullName: "RAM seat competitor",
          },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await other.request.post(`${origin}/api/v1/auth/login`, {
          data: { email: rivalEmail, password },
        })
      ).status(),
    ).toBe(200);
    const map = (
      await (
        await page.request.get(`${origin}/api/v1/showtimes/${show.id}/seats`)
      ).json()
    ).data;
    const seatId = map.seats.find(
      (s) => s.row === "A" && s.column === 1,
    ).seatId;
    const held = await other.request.post(`${origin}/api/v1/bookings/hold`, {
      headers: { "Idempotency-Key": randomUUID() },
      data: { showtimeId: show.id, seatIds: [seatId], comboItems: [] },
    });
    expect(held.status()).toBe(201);
    competitorOrder = (await held.json()).data.id;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const blocked = dialog.getByRole("button", {
      name: "Ghế A1, đang giữ",
      exact: true,
    });
    await expect(blocked).toBeDisabled();
    await expect(blocked).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator(".seat.selected")).toHaveCount(0);
    const conflict = dialog
      .getByRole("alert")
      .filter({ hasText: /A1.*giữ hoặc bán/ });
    await expect(conflict).toBeVisible();
    await expect(conflict).toBeInViewport();
    await page
      .getByRole("button", { name: "Đã hiểu · Chọn ghế khác", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  } finally {
    if (competitorOrder) {
      expect(
        (
          await other.request.post(
            `${origin}/api/v1/bookings/${competitorOrder}/cancel`,
          )
        ).status(),
      ).toBe(200);
    }
    await other.close();
  }
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  // RAM dùng polling5s; một poll đang chạy có thể bỏ qua sự kiện focus này.
  await expect(candidate).toBeEnabled({ timeout: 15000 });
  await dialog
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Ghế A1, đang chọn", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const age = dialog.getByRole("checkbox", {
    name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
  });
  if (await age.count()) await age.check();
  await dialog
    .getByRole("button", { name: "Xem lại đơn & thanh toán", exact: true })
    .click();
  await page
    .getByRole("dialog", {
      name: "Xác nhận đơn hàng & thanh toán",
      exact: true,
    })
    .getByRole("button", { name: /^Thanh toán ngay:/ })
    .click();
  await page
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanh toán đã được xác nhận" }),
  ).toBeVisible();
  await expect(page.locator(".ticket-qr-svg").first()).toBeVisible({
    timeout: 20000,
  });
  if (errors.length) throw new Error("Browser error in fallback booking UI.");
  console.log(
    "PASS automatic RAM fallback: 29 menu items; register/login through HttpOnly BFF; select real RAM seat IDs; hold, signed Sandbox success and SVG QR. Disposable RAM only, no PostgreSQL/SMTP.",
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
