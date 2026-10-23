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
  await page
    .getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true })
    .selectOption(data.cinema.id);
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

test("welcome campaign opens on first visit, respects dismiss preference and links to real food page", async ({
  page,
}) => {
  await page.goto("/");
  const campaign = page.getByRole("dialog", { name: /Mở màn rực rỡ/ });
  await expect(campaign).toBeVisible();
  await expect(campaign.getByRole("img")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Không hiển thị lại hôm nay" })
    .check();
  await page.keyboard.press("Escape");
  await expect(campaign).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".premiere-copy")).toBeVisible();
  await expect(campaign).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ưu đãi mở màn", exact: true })
    .click();
  await expect(campaign).toBeVisible();
  await campaign.getByRole("link", { name: "Khám phá bắp nước" }).click();
  await expect(page).toHaveURL(/\/bap-nuoc$/);
  await expect(page.locator(".food-discovery")).toBeVisible();
});

test("footer headings, support answers and payment brands all open useful destinations", async ({
  page,
}) => {
  await page.goto("/phim");
  const footer = page.locator(".nova-footer");
  await footer
    .getByRole("link", { name: "KHÁM PHÁ NOVA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gioi-thieu$/);
  await expect(page.locator(".info-destinations>a")).toHaveCount(3);
  await footer
    .getByRole("link", { name: "ĐỒNG HÀNH CÙNG BẠN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ho-tro$/);
  await page
    .locator("summary")
    .filter({ hasText: "Ghế được giữ trong bao lâu?" })
    .click();
  await expect(page.locator("details[open]")).toContainText("5 phút");
  await footer.getByRole("link", { name: "MoMo", exact: true }).click();
  await expect(page).toHaveURL(/\/thanh-toan\?phuong-thuc=momo$/);
  await expect(page.locator(".payment-explainer h2")).toHaveText("MoMo");
  await expect(page.locator(".payment-explainer")).toContainText(
    "chưa liên kết ví",
  );
  for (const [label, title] of [
    ["VISA", "Visa"],
    ["Mastercard", "Mastercard"],
    ["ZaloPay", "ZaloPay"],
  ]) {
    await footer.getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator(".payment-explainer h2")).toHaveText(title);
  }
  await page.getByRole("tab", { name: "NOVA Sandbox", exact: true }).click();
  await expect(page.locator(".payment-explainer h2")).toHaveText(
    "NOVA Sandbox",
  );
  await page
    .getByRole("link", { name: "Chọn suất & thanh toán Sandbox", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dat-ve$/);
});

test("room and day-part controls filter four real screenings without changing showtime IDs", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/dat-ve");
  await page
    .getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true })
    .selectOption(data.cinema.id);
  await page
    .locator(".timeline-film-list [role=tab]")
    .filter({ hasText: "Dune" })
    .first()
    .click();
  await page.locator(".timeline-dates button").last().click();
  await page
    .getByRole("combobox", { name: "Phòng chiếu trong lịch", exact: true })
    .selectOption(data.programmeRoom.id);
  await expect(page.locator(".timeline-show")).toHaveCount(4);
  await page.getByRole("button", { name: "Buổi tối", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(1);
  await expect(page.locator(".timeline-show")).toContainText("18:00");
  await page.getByRole("button", { name: "Suất muộn", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(1);
  await expect(page.locator(".timeline-show")).toContainText("22:00");
  await page.getByRole("button", { name: "Tất cả giờ", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(4);
});
