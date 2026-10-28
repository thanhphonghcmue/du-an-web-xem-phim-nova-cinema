import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
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
  const Redis = req("ioredis"),
    redis = new Redis({
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

test("quick Book now resumes the exact real screening after guest sign-in", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/dat-ve");
  await chooseOption(page, "Chọn cụm rạp", data.cinema.id);
  await chooseOption(page, "Chọn phim", data.movie.id);
  await chooseDate(
    page,
    "Chọn ngày chiếu",
    new Date(data.showtime.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  await chooseOption(page, "Chọn suất chiếu", data.showtime.id);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  await expect(page.locator(".auth-form")).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill(data.accounts.customer.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(data.password);
  await page
    .getByRole("button", { name: "Đăng nhập ngay", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Chọn ghế & đặt vé",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(data.movie.title);
  const seat = dialog.getByRole("button", {
    name: "Ghế A1, còn trống",
    exact: true,
  });
  await expect(seat).toBeEnabled();
  const map = await page.request.get(
    `/api/v1/showtimes/${data.showtime.id}/seats`,
  );
  expect(map.status()).toBe(200);
  expect((await map.json()).data.roomId).toBe(data.room.id);
  expect(
    (await (await page.request.get("/api/v1/runtime")).json()).data.mode,
  ).toBe("backend");
  await expect(page.locator(".standalone-mode-notice")).toHaveCount(0);
});

test("registration and profile edits appear in the live ADMIN customer list, with roles enforced", async ({
  page,
  browser,
}) => {
  const data = fixture();
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const admin = await adminContext.newPage();
    await admin.goto("/dang-nhap");
    const login = await admin.request.post("/api/v1/auth/login", {
      data: { email: data.accounts.admin.email, password: data.password },
    });
    expect(login.status()).toBe(200);
    await admin.goto("/quan-tri");
    await admin
      .getByRole("button", { name: /Khách Hàng & Thành Viên/ })
      .click();
    const email = `${data.prefix}-sync-${randomUUID().slice(0, 8)}@example.test`;
    await page.goto("/dang-nhap");
    await page
      .getByRole("tab", { name: "Đăng ký thành viên", exact: true })
      .click();
    await page
      .getByLabel("Họ và tên", { exact: true })
      .fill("Khách đồng bộ máy chủ");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(data.password);
    await page
      .getByLabel("Xác nhận mật khẩu", { exact: true })
      .fill(data.password);
    await page
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await expect(page.locator(".account-summary")).toContainText(email);
    const profile = (await (await page.request.get("/api/v1/users/me")).json())
      .data;
    expect(profile.role).toBe("CUSTOMER");
    expect(
      (await page.request.get("/api/v1/admin/reports/users")).status(),
    ).toBe(403);
    const sync = admin.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/v1/admin/reports/users",
    );
    await admin.bringToFront();
    await admin.evaluate(() => window.dispatchEvent(new Event("focus")));
    expect((await sync).status()).toBe(200);
    await admin.getByRole("textbox", { name: "Tìm khách hàng" }).fill(email);
    const row = admin
      .locator(".admin-table tbody tr")
      .filter({ hasText: email });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(profile.fullName);
    const updatedName = "Tên đã cập nhật từ máy chủ";
    expect(
      (
        await page.request.patch("/api/v1/users/me", {
          data: { fullName: updatedName },
        })
      ).status(),
    ).toBe(200);
    await admin.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(row).toContainText(updatedName, { timeout: 15000 });
    const users = (
      await (await admin.request.get("/api/v1/admin/reports/users")).json()
    ).data;
    const saved = users.find((user) => user.id === profile.id);
    expect(saved.email).toBe(email);
    expect(saved.fullName).toBe(updatedName);
    expect(saved.passwordHash).toBeUndefined();
    expect(saved.refreshToken).toBeUndefined();
  } finally {
    await adminContext.close();
  }
});

test("VI EN translates the header, booking controls, calendar and sign-in, and persists navigation", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/");
  await expect(page.locator(".discovery-film").first()).toBeVisible();
  await page.getByRole("button", { name: "VI / EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".premiere-invitation")).toContainText(
    "Step into cinema.",
  );
  await expect(page.locator(".booking-express h2")).toHaveText("Quick booking");
  await expect(
    page
      .locator(".site-header")
      .getByRole("link", { name: "Find a NOVA cinema", exact: true }),
  ).toBeVisible();
  await chooseOption(page, "Choose cinema", data.cinema.id);
  await chooseOption(page, "Choose film", data.movie.id);
  await page.getByRole("button", { name: "Choose date", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Your showtimes" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Next month", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".rdp-caption_label")).not.toContainText("Tháng");
  await page.keyboard.press("Escape");
  await page
    .locator(".site-header")
    .getByRole("link", { name: "My tickets", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tai-khoan#ve-cua-toi$/);
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page
      .locator(".site-header")
      .getByRole("link", { name: "My tickets", exact: true }),
  ).toBeVisible();
});

test("one compact header keeps cinema and My tickets navigation functional on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toHaveCount(1);
  await expect(page.locator(".nova-utility,.nova-subnav")).toHaveCount(0);
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "VI / EN", exact: true }),
  ).toHaveCount(1);
  for (const width of [1440, 390, 820]) {
    await page.setViewportSize({ width, height: 1000 });
    const header = page.locator(".site-header");
    expect((await header.boundingBox()).height).toBeLessThanOrEqual(100);
    if (width < 1270)
      await header
        .getByRole("button", { name: "Mở menu", exact: true })
        .click();
    await header
      .getByRole("link", { name: "Tìm rạp NOVA", exact: true })
      .click();
    await expect(page).toHaveURL(/\/rap$/);
    await expect(page.locator(".venue-card").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await header.getByRole("link", { name: "Vé của tôi", exact: true }).click();
    await expect(page).toHaveURL(/\/tai-khoan#ve-cua-toi$/);
    await expect(page.locator(".auth-form")).toBeVisible();
    await expect(
      page.getByText("Mật khẩu: nova@12345", { exact: false }),
    ).toHaveCount(0);
  }
});
