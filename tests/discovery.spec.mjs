import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );

test.beforeEach(async () => {
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

test("dedicated discovery pages have real navigation, banners and accessible filters", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/phim");
  await expect(page.locator(".page-banner h1")).toContainText("Chọn một phim");
  await expect(
    page.locator(`.discovery-film[data-movie-id="${fixture().movie.id}"]`),
  ).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Tìm phim trong danh mục" })
    .fill("khongcophimnay");
  await expect(
    page.getByText("Chưa có phim phù hợp", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".discovery-film")).not.toHaveCount(0);
  await page
    .locator(".nova-subnav")
    .getByRole("link", { name: "Sắp chiếu tháng sau" })
    .click();
  await expect(page).toHaveURL(/\/sap-chieu$/);
  await expect(page.locator(".page-banner h1")).toContainText("Tháng mới");
  await expect(page.locator(".page-banner-image")).toBeVisible();
  await page
    .locator(".nova-subnav")
    .getByRole("link", { name: "Ưu đãi & sự kiện" })
    .click();
  await expect(page.locator(".campaign-grid .campaign-card")).toHaveCount(6);
  await page
    .locator(".campaign-grid")
    .getByRole("button", { name: "Khám phá ngay" })
    .first()
    .click();
  await expect(page.locator(".offer-detail")).toContainText("Party Combo 69K");
  expect(errors).toEqual([]);
});

test("food draft survives navigation and transfers real combo IDs into seat selection", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/bap-nuoc");
  await expect(
    page.getByRole("button", { name: `Thêm ${data.combo.name}`, exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: `Thêm ${data.combo.name}`, exact: true })
    .click();
  await expect(page.locator(".food-cart")).toContainText(data.combo.name);
  await page.getByRole("button", { name: "Chọn suất & thêm vào vé" }).click();
  await expect(page).toHaveURL(/\/dat-ve$/);
  const status = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    { email: data.accounts.customer.email, password: data.password },
  );
  expect(status).toBe(200);
  await page.reload();
  await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
  await page.locator("#showtimes select").selectOption(data.cinema.id);
  await page.locator(".timeline-show").first().click();
  await expect(
    page.getByRole("dialog", { name: "Chọn ghế & đặt vé" }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: `Số lượng ${data.combo.name}` }),
  ).toHaveValue("1");
  await expect(page.locator(".booking-film-poster")).toBeVisible();
  await expect(page.locator(".booking-stepper li")).toHaveCount(4);
});

test("mobile page navigation and food categories remain within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/phim",
    "/bap-nuoc",
    "/uu-dai",
    "/dang-nhap",
    "/hoi-vien",
  ]) {
    await page.goto(route);
    await expect(page.locator(".page-banner h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/bap-nuoc");
  await page.getByRole("tab", { name: "Đồ ăn nóng", exact: true }).click();
  await expect(page.locator(".food-product")).toHaveCount(0);
  await expect(
    page.getByText("Thực đơn đang được cập nhật", { exact: true }),
  ).toBeVisible();
});
