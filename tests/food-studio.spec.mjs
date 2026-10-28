import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
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
async function screenshot(page, name) {
  if (!process.env.NOVA_FOOD_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_FOOD_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(process.env.NOVA_FOOD_CAPTURE_DIR, name + ".jpg"),
    type: "jpeg",
    quality: 88,
  });
}
async function expectLoadedMenu(page) {
  const response = await page.request.get("/api/v1/showtimes/programme");
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  await expect(page.locator(".food-product")).toHaveCount(data.combos.length);
  const ids = await page
    .locator(".food-product")
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.comboId).sort());
  expect(ids).toEqual(data.combos.map((item) => item.id).sort());
}

test("all 24 built-in menu items use local photographs while administrator items retain their API identities", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/bap-nuoc");
  await expectLoadedMenu(page);
  await expect
    .poll(() =>
      page
        .locator(".food-hero-photo")
        .evaluate((n) => n.complete && n.naturalWidth > 0),
    )
    .toBe(true);
  await screenshot(page, "hero-desktop");
  await page
    .getByRole("link", { name: "Khám phá thực đơn", exact: true })
    .click();
  await expect(page).toHaveURL(/\/bap-nuoc#food$/);
  const keys = await page
    .locator('.food-product .menu-image:not([data-photo-key="custom"])')
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.photoKey));
  expect(new Set(keys).size).toBe(24);
  const photos = page.locator(
    '.food-product .menu-image:not([data-photo-key="custom"]) img',
  );
  for (const img of await photos.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((n) => n.complete && n.naturalWidth > 0))
      .toBe(true);
    await expect(img).toHaveAttribute("src", /^\/images\/food-photography\//);
  }
  const ids = await page
    .locator(".food-product")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.comboId));
  for (const item of fixture().menuCombos) expect(ids).toContain(item.id);
  await expect(page.locator(".food-hero-photo")).toBeVisible();
  await page
    .getByRole("button", { name: "Xem chi tiết Bắp Phô Mai Cay", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Bắp Phô Mai Cay",
    exact: true,
  });
  await expect(modal).toContainText("Cay nhẹ");
  await expect(modal.locator(".food-detail-price")).toHaveText(/49[.,]000/);
  await expect
    .poll(() =>
      modal
        .locator(".menu-image img")
        .evaluate((n) => n.complete && n.naturalWidth > 0),
    )
    .toBe(true);
  await modal
    .getByRole("button", { name: "Thêm Bắp Phô Mai Cay", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".food-basket")).toContainText("Bắp Phô Mai Cay");
  await page.locator(".food-tools").scrollIntoViewIfNeeded();
  await screenshot(page, "menu-desktop");
  expect(errors).toEqual([]);
});

test("search, taste filters and numeric price sorting compose and reset correctly", async ({
  page,
}) => {
  await page.goto("/bap-nuoc");
  await expectLoadedMenu(page);
  const search = page.getByRole("searchbox", { name: "Tìm món hoặc khẩu vị" });
  await search.fill("TRA DAO");
  await expect(page.locator(".food-product")).toHaveCount(2);
  await expect(page.locator(".food-product h3")).toHaveText([
    "Green Movie Combo",
    "Trà Đào Cam Sả",
  ]);
  await search.fill("");
  await page
    .getByRole("group", { name: "Lọc khẩu vị" })
    .getByRole("button", { name: "Cay nhẹ", exact: true })
    .click();
  await expect(page.locator(".food-product h3")).toHaveText("Bắp Phô Mai Cay");
  await page.getByRole("tab", { name: /Nước mát/ }).click();
  await expect(page.locator(".food-product")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem lại toàn bộ món" }).click();
  await expectLoadedMenu(page);
  await page.getByRole("tab", { name: /Nước mát/ }).click();
  await page
    .getByRole("combobox", { name: "Sắp xếp thực đơn" })
    .selectOption("ascending");
  const ids = await page
    .locator(".food-product")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.comboId));
  const prices = ids.map((id) =>
    Number(fixture().menuCombos.find((i) => i.id === id).price),
  );
  expect(prices.length).toBe(5);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

test("cart caps quantities, persists drafts and tolerates corrupt or blocked storage", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/bap-nuoc");
  await page.evaluate(() => sessionStorage.setItem("nova-food-cart", "null"));
  await page.reload();
  await expect(page.locator(".food-basket-count")).toHaveText("0");
  const card = page.locator(".food-product").filter({
    has: page.getByRole("heading", {
      name: "Green Movie Combo",
      exact: true,
    }),
  });
  for (let i = 0; i < 20; i++)
    await card
      .getByRole("button", { name: "Thêm Green Movie Combo", exact: true })
      .click();
  await expect(
    card.getByRole("button", { name: "Thêm Green Movie Combo", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator(".food-basket-count")).toHaveText("20");
  await page.getByRole("button", { name: "Xóa giỏ bắp nước" }).click();
  await expect(page.locator(".food-basket-count")).toHaveText("0");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "nova-food-cart")
        throw new DOMException("Blocked", "SecurityError");
      return original.call(this, k, v);
    };
  });
  await card
    .getByRole("button", { name: "Thêm Green Movie Combo", exact: true })
    .click();
  await expect(page.locator(".food-studio [role=alert]")).toContainText(
    "chưa lưu được",
  );
  await expect(page.locator(".food-basket-count")).toHaveText("1");
  expect(errors).toEqual([]);
});

test("new combos keep their UUIDs and real totals through hold, Sandbox and QR issuance", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/bap-nuoc");
  const login = await page.evaluate(
    async ({ email, password }) =>
      (
        await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      ).status,
    { email: data.accounts.customer.email, password: data.password },
  );
  expect(login).toBe(200);
  await page.reload();
  for (const name of ["Green Movie Combo", "Berry Date Combo"])
    await page
      .locator(".food-product")
      .getByRole("button", { name: `Thêm ${name}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Chọn suất & thêm vào vé" }).click();
  const show = data.programmeShowtimes[0];
  await chooseOption(page, "Chọn cụm rạp", data.cinema.id);
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
  const dialog = page.getByRole("dialog", { name: "Chọn ghế & đặt vé" });
  await expect(dialog).toBeVisible();
  for (const name of ["Green Movie Combo", "Berry Date Combo"])
    await expect(
      dialog.getByRole("spinbutton", { name: `Số lượng ${name}`, exact: true }),
    ).toHaveValue("1");
  const available = dialog.getByRole("button", { name: /Ghế A1, còn trống/ });
  await available.click();
  const pending = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/bookings/hold" &&
      r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /Giữ ghế 5 phút/ }).click();
  const response = await pending;
  expect(response.status()).toBe(201);
  const payload = response.request().postDataJSON();
  const expectedIds = data.menuCombos
    .filter((i) => ["Green Movie Combo", "Berry Date Combo"].includes(i.name))
    .map((i) => i.id)
    .sort();
  expect(payload.comboItems.map((i) => i.comboId).sort()).toEqual(expectedIds);
  const order = (await response.json()).data;
  expect(Number(order.totalComboAmount)).toBe(208000);
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
  await expect(
    page.getByRole("heading", { name: /Kết quả: PAID/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Quay lại ứng dụng", exact: true })
    .click();
  await expect(page.locator(".ticket-qr-svg").first()).toBeVisible({
    timeout: 20000,
  });
});

test("food cards, basket and detail stay inside 320/390/768px viewports", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/bap-nuoc");
    await expectLoadedMenu(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator(".food-product")
      .getByRole("button", { name: "Thêm Party Combo 69K", exact: true })
      .click();
    await expect(page.locator(".food-mobile-bar")).toBeVisible();
    expect(
      await page
        .locator(".food-mobile-bar")
        .evaluate((n) => n.scrollWidth <= n.clientWidth),
    ).toBe(true);
    if (width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      await screenshot(page, "hero-mobile");
    }
    await page
      .getByRole("button", {
        name: "Xem chi tiết Party Combo 69K",
        exact: true,
      })
      .click();
    const modal = page.getByRole("dialog", {
      name: "Party Combo 69K",
      exact: true,
    });
    expect(await modal.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    );
    await modal.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Xem chi tiết Party Combo 69K",
        exact: true,
      }),
    ).toBeFocused();
  }
});

test("a broken administrator image falls back without breaking product selection", async ({
  page,
}) => {
  await page.route("**/api/v1/showtimes/programme", async (route) => {
    const r = await route.fetch();
    const body = await r.json();
    body.data.combos.find((i) => i.name === "Party Combo 69K").imageUrl =
      "/images/menu/missing-admin-image.webp";
    await route.fulfill({ response: r, json: body });
  });
  await page.goto("/bap-nuoc");
  const card = page.locator(".food-product").filter({
    has: page.getByRole("heading", { name: "Party Combo 69K", exact: true }),
  });
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".menu-photo-unavailable")).toContainText(
    "Ảnh đang cập nhật",
  );
  await expect(card.locator(".menu-image img")).toHaveCount(0);
  await card
    .getByRole("button", { name: "Thêm Party Combo 69K", exact: true })
    .click();
  await expect(page.locator(".food-basket-count")).toHaveText("1");
});

test("an unavailable backend never exposes purchasable mock food or a false checkout", async ({
  page,
}) => {
  const calls = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /^\/api\/v1\/(bookings|payments)(\/|$)/.test(
        new URL(request.url()).pathname,
      )
    )
      calls.push(new URL(request.url()).pathname);
  });
  await page.route("**/api/v1/showtimes/programme", (route) =>
    route.abort("failed"),
  );
  await page.goto("/bap-nuoc");
  await expect(page.locator(".catalog-connection-notice")).toBeVisible();
  await expect(page.locator(".food-product")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Chọn suất & thêm vào vé" }),
  ).toHaveCount(0);
  await expect(page.locator(".food-hero-photo")).toBeVisible();
  expect(calls).toEqual([]);
});
