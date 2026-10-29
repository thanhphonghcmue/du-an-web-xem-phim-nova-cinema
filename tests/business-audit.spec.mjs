import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { chooseOption, chooseDate } from "./ui-choices.mjs";
const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  req("dotenv").config({
    path: new URL("../backend/.env", import.meta.url).pathname,
    quiet: true,
  });
  const Redis = req("ioredis");
  const redis = new Redis({
    host: process.env.TEST_REDIS_HOST,
    port: Number(process.env.TEST_REDIS_PORT),
    password: process.env.TEST_REDIS_PASSWORD,
    db: Number(process.env.TEST_REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  try {
    const keys = await redis.keys(fixture().prefix + ":throttle:*");
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
});
async function login(page, role = "customer") {
  const data = fixture();
  const response = await page.request.post("/api/v1/auth/login", {
    data: { email: data.accounts[role].email, password: data.password },
  });
  expect(response.status()).toBe(200);
  await page.goto("/dat-ve");
  await expect(page.locator(".login-trigger")).toContainText(
    role.toUpperCase(),
  );
}
async function openScreening(page, show, cinemaId = fixture().cinema.id) {
  await chooseOption(page, "Chọn cụm rạp", cinemaId);
  await chooseOption(page, "Chọn phim", show.movieId);
  await chooseDate(
    page,
    "Chọn ngày chiếu",
    new Date(show.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  await chooseOption(page, "Chọn suất chiếu", show.id);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Đang tải trạng thái ghế…", { exact: true }),
  ).toHaveCount(0);
}
const holdButton = (page) =>
  page.getByRole("button", { name: "Giữ ghế 5 phút", exact: true });
async function cancel(page) {
  await page
    .getByRole("button", { name: "Hủy đơn & trả ghế", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
}

test("HTTP LAN compatibility: a missing randomUUID still holds and cancels real seats with a UUID request key", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(Crypto.prototype, "randomUUID", {
      configurable: true,
      value: undefined,
    }),
  );
  await login(page);
  const show = fixture().programmeShowtimes[2];
  await openScreening(page, show);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold",
  );
  await holdButton(page).click();
  const result = await response;
  expect(result.status()).toBe(201);
  expect(result.request().headers()["idempotency-key"]).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  const order = (await result.json()).data;
  expect(order.showtimeId).toBe(show.id);
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  await cancel(page);
  expect(
    (await (await page.request.get(`/api/v1/bookings/${order.id}`)).json()).data
      .status,
  ).toBe("CANCELLED");
  expect(errors).toEqual([]);
});

test("unsupported browser crypto reports a recoverable error without freezing or sending a booking", async ({
  page,
}) => {
  const errors = [],
    holds = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold"
    )
      holds.push(r.url());
  });
  await page.addInitScript(() => {
    for (const key of ["randomUUID", "getRandomValues"])
      Object.defineProperty(Crypto.prototype, key, {
        configurable: true,
        value: undefined,
      });
  });
  await login(page);
  await openScreening(page, fixture().programmeShowtimes[2]);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await holdButton(page).click();
  await expect(page.locator(".modal-panel .auth-notice")).toContainText(
    "Trình duyệt chưa hỗ trợ",
  );
  await expect(holdButton(page)).toBeEnabled();
  expect(holds).toEqual([]);
  expect(errors).toEqual([]);
});

test("an ineligible voucher leaves no held seats and can be removed to complete a real hold", async ({
  page,
}) => {
  await login(page);
  const show = fixture().programmeShowtimes[2];
  await openScreening(page, show);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await page.getByRole("button", { name: "VIP50", exact: true }).click();
  const rejected = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold",
  );
  await holdButton(page).click();
  expect((await rejected).status()).toBe(400);
  await expect(page.locator(".auth-notice")).toContainText("150.000");
  const map = (
    await (await page.request.get(`/api/v1/showtimes/${show.id}/seats`)).json()
  ).data;
  expect(map.capacity.holding).toBe(0);
  await expect(holdButton(page)).toBeEnabled();
  await page.getByTitle("Gỡ mã", { exact: true }).click();
  const accepted = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold",
  );
  await holdButton(page).click();
  expect((await accepted).status()).toBe(201);
  await cancel(page);
});

test("payment gateways and signed Sandbox actions fit their cards on narrow and wide screens", async ({
  page,
}) => {
  await login(page);
  await openScreening(page, fixture().programmeShowtimes[3]);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold",
  );
  await holdButton(page).click();
  expect((await response).status()).toBe(201);
  const card = page.locator(".payment-sandbox-card");
  const tabs = card.getByRole("group", {
    name: "Chọn cổng thanh toán mô phỏng",
  });
  await expect(tabs.getByRole("button")).toHaveCount(4);
  for (const label of ["VietQR", "MoMo", "VNPAY", "Sandbox"]) {
    const button = tabs.getByRole("button", { name: new RegExp("^" + label) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator(".payment-provider-notice")).toContainText(label);
  }
  for (const width of [320, 375, 390, 768, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await card.scrollIntoViewIfNeeded();
    expect(
      await card.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return [...node.querySelectorAll("button")].every((button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.left >= bounds.left &&
            rect.right <= bounds.right + 1 &&
            button.scrollWidth <= button.clientWidth
          );
        });
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOVA_CAPTURE_DIR && width === 320) {
      mkdirSync(process.env.NOVA_CAPTURE_DIR, { recursive: true });
      await card.screenshot({
        path: resolve(process.env.NOVA_CAPTURE_DIR, "payment-card-320.jpg"),
        type: "jpeg",
      });
    }
  }
  const age = page.getByRole("checkbox", {
    name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
  });
  if (await age.count()) await age.check();
  await page
    .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanh toán mô phỏng", exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 650, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.locator("main").evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return [...node.querySelectorAll("button")].every(
          (button) =>
            button.getBoundingClientRect().right <= bounds.right + 1 &&
            button.scrollWidth <= button.clientWidth,
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOVA_CAPTURE_DIR && width === 320)
      await page.locator(".sandbox-choice").screenshot({
        path: resolve(process.env.NOVA_CAPTURE_DIR, "sandbox-320.jpg"),
        type: "jpeg",
      });
  }
  await page
    .getByRole("button", { name: "Hủy thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Kết quả: CANCELLED/ }),
  ).toBeVisible();
});

for (const width of [1440, 390])
  test(`all public destinations and protected guest pages load without an application error at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 1000 });
    const errors = [],
      failures = [],
      generatedAssets = [];
    page.on("request", (r) => {
      if (
        /nova-(menu-studio|sharing-hero|dream-city|movie-night)\.(webp|png)/.test(
          r.url(),
        )
      )
        generatedAssets.push(new URL(r.url()).pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (r) => {
      if (
        r.status() >= 500 &&
        new URL(r.url()).origin === new URL(page.url()).origin
      )
        failures.push(new URL(r.url()).pathname);
    });
    for (const path of [
      "/phim",
      "/sap-chieu",
      "/dat-ve",
      "/rap",
      "/uu-dai",
      "/bap-nuoc",
      "/hoi-vien",
      "/gioi-thieu",
      "/ho-tro",
      "/huong-dan",
      "/chinh-sach",
      "/lien-he",
      "/thanh-toan",
    ]) {
      const response = await page.goto(path);
      expect(response.status(), path).toBe(200);
      await expect(page.locator("main h1"), path).toBeVisible();
      await expect(page.locator(".catalog-connection-notice")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    for (const path of ["/tai-khoan", "/quan-tri", "/soat-ve"]) {
      await page.goto(path);
      await expect(page.locator(".auth-form")).toBeVisible();
      await expect(
        page.locator(
          ".cinema-ticket,.admin-portal-modal,.admission-result.valid",
        ),
      ).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(generatedAssets).toEqual([]);
  });

test("staff dropdown deduplicates repeated real screening IDs and keeps Vietnam time without React key warnings", async ({
  page,
}) => {
  const warnings = [],
    errors = [];
  page.on("console", (message) => {
    if (/same key|unique.*key/i.test(message.text()))
      warnings.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "staff");
  await page.route("**/api/v1/showtimes?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (response.ok() && body.data?.items?.length)
      body.data.items.push(body.data.items[0], body.data.items[0]);
    await route.fulfill({ response, json: body });
  });
  await page.goto("/soat-ve");
  // Tomorrow has four screenings by fixture contract; the admission day can
  // have only one close to Vietnam midnight. Keep the multi-option assertion.
  const show = fixture().programmeShowtimes[0];
  await page.getByLabel("Ngày đang soát", { exact: true }).fill(
    new Date(show.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  const select = page.getByRole("combobox", {
    name: "Suất chiếu đang soát",
    exact: true,
  });
  await expect(select.locator(`option[value="${show.id}"]`)).toHaveCount(1);
  await expect(select.locator(`option[value="${show.id}"]`)).toContainText(
    new Date(show.startTime).toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  const ids = await select
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean),
    );
  expect(ids.length).toBeGreaterThan(1);
  expect(new Set(ids).size).toBe(ids.length);
  await select.selectOption(show.id);
  await expect(select).toHaveValue(show.id);
  expect(warnings).toEqual([]);
  expect(errors).toEqual([]);
});

test("ADMIN operates a real cinema/room/screening, buys a ticket, opens own QR and exports exact revenue", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const data = fixture();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "admin");
  await page.goto("/quan-tri");
  await page
    .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
    .click();
  const nav = page.locator(".live-admin nav");
  const form = page.locator(".live-admin-form");
  async function save(path) {
    const pending = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === "/api/v1" + path,
    );
    await form.getByRole("button", { name: /^Lưu / }).click();
    const response = await pending;
    expect(response.status()).toBe(201);
    await expect(page.locator(".workspace-message")).toContainText(
      "Đã lưu thành công",
    );
    return (await response.json()).data;
  }
  await nav.getByRole("button", { name: "Cụm rạp", exact: true }).click();
  await form
    .getByLabel("Tên rạp", { exact: true })
    .fill(data.prefix + " QA Cinema");
  await form.getByLabel("Thành phố", { exact: true }).fill("TP. Hồ Chí Minh");
  await form
    .getByLabel("Địa chỉ", { exact: true })
    .fill("Owned browser audit fixture");
  const cinema = await save("/cinemas");
  await nav.getByRole("button", { name: "Phòng chiếu", exact: true }).click();
  await form
    .getByLabel("Thuộc cụm rạp", { exact: true })
    .selectOption(cinema.id);
  await form.getByLabel("Tên phòng", { exact: true }).fill("QA Room");
  await form
    .getByLabel("Định dạng", { exact: true })
    .selectOption("STANDARD_2D");
  const room = await save("/rooms");
  const builder = page.locator(".room-builder");
  await builder.getByRole("combobox").first().selectOption(room.id);
  await builder.getByLabel("Số hàng ghế", { exact: true }).fill("2");
  await builder.getByLabel("Số cột ghế", { exact: true }).fill("8");
  await builder.getByRole("button", { name: /Lưu sơ đồ/ }).click();
  await expect(builder).toContainText("Đã lưu sơ đồ 16 ghế");
  await nav.getByRole("button", { name: "Suất chiếu", exact: true }).click();
  const start = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
  async function scheduleDraft() {
    await form.getByLabel("Phim", { exact: true }).selectOption(data.movie.id);
    await form.getByLabel("Phòng", { exact: true }).selectOption(room.id);
    await form.getByLabel("Bắt đầu", { exact: true }).fill(start);
    await form.getByLabel("Giá vé cơ bản (VND)", { exact: true }).fill("90000");
  }
  await scheduleDraft();
  const show = await save("/showtimes");
  await scheduleDraft();
  const conflict = page.waitForResponse(
    (r) =>
      r.status() === 409 && new URL(r.url()).pathname === "/api/v1/showtimes",
  );
  await form.getByRole("button", { name: /^Lưu / }).click();
  expect((await (await conflict).json()).error).toBe("SHOWTIME_CONFLICT");
  await expect(page.locator(".workspace-message")).toContainText("trùng giờ");
  await nav.getByRole("button", { name: "Cụm rạp", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Tìm trong danh mục quản trị" })
    .fill(cinema.name);
  await page
    .locator(`tr[data-entity-id="${cinema.id}"]`)
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await expect(page.locator(".workspace-message")).toContainText(
    "không thể xóa",
  );

  await page.goto("/dat-ve");
  await openScreening(page, show, cinema.id);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await page.getByRole("button", { name: "NOVA20", exact: true }).click();
  const held = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/bookings/hold",
  );
  await holdButton(page).click();
  const order = (await (await held).json()).data;
  expect(order.finalAmount).toBe("65500.00");
  const age = page.getByRole("checkbox", {
    name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
  });
  if (await age.count()) await age.check();
  await page
    .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Quay lại ứng dụng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem vé trong tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/tai-khoan\\?ve=" + order.id + "#ve-cua-toi$"),
  );
  const qr = page.getByRole("img", {
    name: `QR vé ${order.orderCode}`,
    exact: true,
  });
  await expect(qr).toBeVisible({ timeout: 15000 });
  await expect(qr).toBeInViewport({ ratio: 1 });
  const ticket = (
    await (await page.request.get("/api/v1/tickets/me?limit=100")).json()
  ).data.items.find((t) => t.bookingId === order.id);
  expect(ticket).toBeTruthy();
  const png = req("pngjs").PNG.sync.read(await qr.screenshot());
  const decoded = req("jsqr")(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
  );
  expect(decoded?.data === ticket.ticketHash).toBe(true);
  await page.reload();
  await expect(qr).toBeVisible();

  await page.getByRole("button", { name: "Quản trị", exact: true }).click();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const reportResponse = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/admin/reports/revenue" &&
      new URL(r.url()).searchParams.get("from") === today &&
      new URL(r.url()).searchParams.get("to") === today,
  );
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  const report = (await (await reportResponse).json()).data;
  expect(Number(report.netRevenue)).toBeGreaterThanOrEqual(65500);
  const csvButton = page.getByRole("button", {
    name: "Xuất CSV (Excel)",
    exact: true,
  });
  await expect(csvButton).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await csvButton.click();
  const download = await downloaded;
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain(
    `"Tổng doanh thu ròng (Net Revenue)","${report.netRevenue}","VND"`,
  );
  expect(csv).toContain(`"${today}"`);
  expect(csv).not.toContain(order.orderCode);
  expect(csv).not.toContain("CHI TIẾT CÁC ĐƠN");
  await page.getByLabel("Từ ngày báo cáo", { exact: true }).fill("2040-01-01");
  await expect(csvButton).toBeDisabled();
  await page.getByRole("button", { name: "Áp dụng lọc", exact: true }).click();
  await expect(page.locator(".admin-error-banner")).toContainText(
    "Ngày bắt đầu",
  );
  await page.getByLabel("Từ ngày báo cáo", { exact: true }).fill(today);
  await page.getByRole("button", { name: "Áp dụng lọc", exact: true }).click();
  await expect(page.locator(".admin-error-banner")).toHaveCount(0);
  await expect(csvButton).toBeEnabled();
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Vé của tôi", exact: true })
    .click();
  await expect(qr).toBeVisible();

  const other = await browser.newContext();
  try {
    const customer = await other.newPage();
    await customer.addInitScript(() =>
      sessionStorage.setItem("nova-welcome-seen", "1"),
    );
    await login(customer);
    expect(
      (await customer.request.get(`/api/v1/tickets/${ticket.id}`)).status(),
    ).toBe(404);
    expect(
      (await customer.request.get(`/api/v1/bookings/${order.id}`)).status(),
    ).toBe(404);
    expect(
      (await customer.request.get("/api/v1/admin/reports/overview")).status(),
    ).toBe(403);
    await customer.goto("/tai-khoan#ve-cua-toi");
    await expect(customer.locator(".history-list")).toBeVisible();
    await expect(
      customer.getByRole("img", {
        name: `QR vé ${order.orderCode}`,
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
  expect(errors).toEqual([]);
});

test("ADMIN locks/reactivates a real customer through the renamed frontend workspace", async ({
  page,
  browser,
}) => {
  const data = fixture();
  const email = `${data.prefix}-status-${Date.now()}@example.test`;
  await page.request
    .post("/api/v1/auth/register", {
      data: {
        email,
        password: data.password,
        fullName: "Account status browser audit",
      },
    })
    .then((r) => expect(r.status()).toBe(201));
  const customer = await browser.newContext();
  try {
    expect(
      (
        await customer.request.post("/api/v1/auth/login", {
          data: { email, password: data.password },
        })
      ).status(),
    ).toBe(200);
    await login(page, "admin");
    await page.goto("/quan-tri");
    await page.getByRole("button", { name: /Khách Hàng & Thành Viên/ }).click();
    await page
      .getByRole("textbox", { name: "Tìm khách hàng", exact: true })
      .fill(email);
    const select = page.getByRole("combobox", {
      name: `Trạng thái ${email}`,
      exact: true,
    });
    await expect(select).toHaveValue("ACTIVE");
    const locked = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        new URL(r.url()).pathname.endsWith("/status"),
    );
    await select.selectOption("LOCKED");
    expect((await locked).status()).toBe(200);
    await expect(select).toHaveValue("LOCKED");
    expect((await customer.request.get("/api/v1/users/me")).status()).toBe(403);
    const activated = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        new URL(r.url()).pathname.endsWith("/status"),
    );
    await select.selectOption("ACTIVE");
    expect((await activated).status()).toBe(200);
    await expect(select).toHaveValue("ACTIVE");
    expect(
      (
        await customer.request.post("/api/v1/auth/login", {
          data: { email, password: data.password },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await customer.close();
  }
});

test("ADMIN reconciliation renders real pending payment, safe failures and responsive results", async ({
  page,
}) => {
  const data = fixture();
  await login(page);
  const show = data.programmeShowtimes[3];
  const seats = await page.request
    .get(`/api/v1/showtimes/${show.id}/seats`)
    .then((r) => r.json());
  const seat = seats.data.seats.find((s) => s.row === "A" && s.column === 1);
  const held = await page.request.post("/api/v1/bookings/hold", {
    data: { showtimeId: show.id, seatIds: [seat.seatId] },
  });
  expect(held.status()).toBe(201);
  const order = (await held.json()).data;
  const ownerCookies = await page.context().cookies();
  try {
    await page.request
      .post("/api/v1/payments/create-sandbox-url", {
        data: { bookingId: order.id, returnUrl: new URL("/", page.url()).href },
      })
      .then((r) => expect(r.status()).toBe(201));
    const errors = [];
    page.on("pageerror", () => errors.push("runtime"));
    await login(page, "admin");
    await page.goto("/quan-tri");
    await page
      .getByRole("button", { name: "Đối soát thanh toán", exact: true })
      .click();
    const input = page.getByRole("textbox", {
      name: "Mã đơn hoặc mã giao dịch",
      exact: true,
    });
    await input.fill(order.orderCode);
    await page
      .getByRole("button", { name: "Tra cứu giao dịch", exact: true })
      .click();
    const panel = page.getByRole("region", {
      name: "Đối soát thanh toán",
      exact: true,
    });
    await expect(
      panel.getByText(order.orderCode, { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText("Đang giữ ghế", { exact: true }),
    ).toBeVisible();
    if (process.env.NOVA_CAPTURE_DIR) {
      mkdirSync(process.env.NOVA_CAPTURE_DIR, { recursive: true });
      await page.screenshot({
        path: resolve(
          process.env.NOVA_CAPTURE_DIR,
          "admin-reconciliation-desktop.jpg",
        ),
        type: "jpeg",
        quality: 80,
      });
    }
    await expect(
      panel.getByRole("button", { name: "Khôi phục phát hành vé" }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 900 });
    const panelWidth = await panel.evaluate(
      (el) => el.getBoundingClientRect().width,
    );
    expect(
      await input.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThan(panelWidth - 65);
    expect(
      await page
        .locator(".admin-tabs")
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThan(110);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await panel.evaluate(
        (el) => el.getBoundingClientRect().right <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOVA_CAPTURE_DIR)
      await panel.screenshot({
        path: resolve(
          process.env.NOVA_CAPTURE_DIR,
          "admin-reconciliation-mobile.jpg",
        ),
        type: "jpeg",
        quality: 80,
      });
    await input.fill(`NOVA-${"0".repeat(32)}`);
    await page
      .getByRole("button", { name: "Tra cứu giao dịch", exact: true })
      .click();
    await expect(panel.getByRole("alert")).toContainText(
      "Không tìm thấy mã đơn",
    );
    expect(errors).toEqual([]);
  } finally {
    // Hủy bằng chủ đơn, không để test sau phụ thuộc việc hold đã đủ5 phút.
    await page.context().addCookies(ownerCookies);
    expect(
      (await page.request.post(`/api/v1/bookings/${order.id}/cancel`)).status(),
    ).toBe(200);
  }
});

test("SIT-04 expired access and refresh prompt reauthentication without losing the chosen screening or seats", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", () => errors.push("runtime"));
  await login(page);
  const show = fixture().advanceShows[32];
  await openScreening(page, show);
  const selected = page.getByRole("button", {
    name: /^Ghế A1,/,
  });
  await selected.click();
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await context.clearCookies();
  await holdButton(page).click();
  const loginDialog = page.getByRole("dialog").last();
  await expect(
    loginDialog.getByRole("button", { name: "Đăng nhập ngay", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".login-trigger")).toContainText("Đăng nhập");
  await loginDialog
    .getByLabel("Email", { exact: true })
    .fill(fixture().accounts.customer.email);
  await loginDialog
    .getByLabel("Mật khẩu", { exact: true })
    .fill(fixture().password);
  await loginDialog
    .getByRole("button", { name: "Đăng nhập ngay", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  const held = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname.endsWith("/bookings/hold"),
  );
  await holdButton(page).click();
  expect((await held).status()).toBe(201);
  await cancel(page);
  expect(errors).toEqual([]);
});

test("UI-03 countdown changes without mutating the seat grid DOM and cleanup stops its observer", async ({
  page,
}) => {
  await login(page);
  await openScreening(page, fixture().advanceShows[33]);
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await holdButton(page).click();
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  const initial = await page.getByTestId("hold-timer").innerText();
  await page.evaluate(() => {
    const grid =
      document.querySelector(".seat-map") ||
      document.querySelector('[aria-label="Sơ đồ ghế"]');
    if (!grid) throw new Error("Seat grid missing");
    window.__seatMutations = 0;
    window.__seatObserver = new MutationObserver(
      (entries) => (window.__seatMutations += entries.length),
    );
    window.__seatObserver.observe(grid, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
    });
  });
  try {
    await expect(page.getByTestId("hold-timer")).not.toHaveText(initial, {
      timeout: 3000,
    });
    expect(await page.evaluate(() => window.__seatMutations)).toBe(0);
  } finally {
    await page.evaluate(() => {
      window.__seatObserver.disconnect();
      delete window.__seatObserver;
      delete window.__seatMutations;
    });
  }
  await cancel(page);
});

test("SEC-03 stored profile markup renders as text and does not execute script", async ({
  page,
}) => {
  const data = fixture();
  const email = `${data.prefix}-xss@example.test`;
  const fullName = '<img src=x onerror="window.__novaXss=1">';
  const registered = await page.request.post("/api/v1/auth/register", {
    data: { email, password: data.password, fullName },
  });
  expect(registered.status()).toBe(201);
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email, password: data.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/tai-khoan");
  await expect(page.locator("#main-content")).toContainText(fullName);
  expect(await page.evaluate(() => window.__novaXss)).toBeUndefined();
  expect(await page.locator("#main-content img[onerror]").count()).toBe(0);
});

test("E2E-01 GOLD member uses a suggested VIP pair and Party69K, receives QR/ICS, then staff checks in once", async ({
  page,
  browser,
}) => {
  const f = fixture();
  await login(page, "cmember");
  const profile = await page.request
    .get("/api/v1/users/me")
    .then((r) => r.json());
  expect(profile.data.cMemberPoints).toBe(50000);
  expect(profile.data.cMemberTier).toBe("GOLD");
  await openScreening(page, f.showtime);
  await page
    .getByLabel("Số người trong nhóm", { exact: true })
    .selectOption("2");
  await page
    .getByRole("combobox", { name: "Loại ghế gợi ý", exact: true })
    .selectOption("VIP");
  await page.getByRole("button", { name: "Xếp ghế", exact: true }).click();
  await expect(page.locator('.seat[aria-pressed="true"]')).toHaveCount(2);
  await page
    .getByRole("spinbutton", { name: `Số lượng ${f.combo.name}`, exact: true })
    .fill("1");
  const holding = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname.endsWith("/bookings/hold"),
  );
  await holdButton(page).click();
  const response = await holding;
  expect(response.status()).toBe(201);
  const order = (await response.json()).data;
  expect(order.finalAmount).toBe("265050.00");
  expect(order.totalComboAmount).toBe("69000.00");
  await page
    .getByRole("checkbox", {
      name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
    })
    .check();
  const paymentJourneyStarted = performance.now();
  await page
    .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  const returnJourneyStarted = performance.now();
  await page
    .getByRole("link", { name: "Quay lại ứng dụng", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: `QR vé ${order.orderCode}`, exact: true }),
  ).toBeVisible();
  const paymentClickToVisibleInlineQrMs =
    performance.now() - paymentJourneyStarted;
  const returnClickToVisibleInlineQrMs =
    performance.now() - returnJourneyStarted;
  await page
    .getByRole("button", { name: "Xem vé trong tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: `QR vé ${order.orderCode}`, exact: true }),
  ).toBeVisible();
  if (process.env.NOVA_QA_JOURNEY_METRICS_FILE) {
    mkdirSync(dirname(process.env.NOVA_QA_JOURNEY_METRICS_FILE), {
      recursive: true,
    });
    writeFileSync(
      process.env.NOVA_QA_JOURNEY_METRICS_FILE,
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          samples: 1,
          paymentClickToVisibleOwnerQrMs:
            performance.now() - paymentJourneyStarted,
          paymentClickToVisibleInlineQrMs,
          returnClickToVisibleInlineQrMs,
          layer:
            "production browser; includes Sandbox navigation and owner QR rendering; healthy loopback SMTP",
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
  }
  const items = (
    await page.request.get("/api/v1/tickets/me?limit=100").then((r) => r.json())
  ).data.items.filter((ticket) => ticket.bookingId === order.id);
  expect(items).toHaveLength(1);
  const ticket = items[0];
  const calendar = await page.request.get(
    `/api/v1/tickets/${ticket.id}/calendar`,
  );
  expect(calendar.status()).toBe(200);
  expect(await calendar.text()).toContain("BEGIN:VCALENDAR");
  expect(
    (await page.request.get("/api/v1/users/me").then((r) => r.json())).data
      .cMemberPoints,
  ).toBe(50026);
  const staff = await browser.newContext();
  try {
    expect(
      (
        await staff.request.post(
          new URL("/api/v1/auth/login", page.url()).href,
          { data: { email: f.accounts.staff.email, password: f.password } },
        )
      ).status(),
    ).toBe(200);
    const desk = await staff.newPage();
    await desk.goto(new URL("/soat-ve", page.url()).href);
    await desk.getByLabel("Ngày đang soát", { exact: true }).fill(
      new Date(f.showtime.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    );
    await desk
      .getByRole("combobox", { name: "Suất chiếu đang soát", exact: true })
      .selectOption(f.showtime.id);
    await desk
      .getByLabel("Mã đọc từ QR", { exact: true })
      .fill(ticket.ticketHash);
    await desk
      .getByRole("button", { name: "Kiểm tra vé", exact: true })
      .click();
    await expect(desk.locator(".admission-result.valid")).toContainText(
      f.movie.title,
    );
    await desk.getByRole("button", { name: /Xác nhận/ }).click();
    await expect(desk.locator(".admission-result")).toContainText(
      /Đã|thành công/i,
    );
    expect(
      (
        await staff.request.post(
          new URL("/api/v1/staff/check-in", page.url()).href,
          {
            data: { ticketHash: ticket.ticketHash, showtimeId: f.showtime.id },
          },
        )
      ).status(),
    ).toBe(409);
  } finally {
    await staff.close();
  }
});
