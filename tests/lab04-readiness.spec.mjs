import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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

test("LAB04 native registration maps server validation and duplicate email to the correct input without exposing submitted values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const f = fixture(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/tai-khoan");
  await page
    .getByRole("tab", { name: "Đăng ký thành viên", exact: true })
    .click();
  const form = page.locator(".auth-form");
  await form.getByLabel("Họ và tên", { exact: true }).fill("x".repeat(121));
  await form
    .getByLabel("Email", { exact: true })
    .fill(f.accounts.customer.email);
  await form.getByLabel("Mật khẩu", { exact: true }).fill(f.password);
  await form.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(f.password);
  const invalid = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/v1/auth/register",
  );
  await form
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const response = await invalid;
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.details.fieldErrors.map((row) => row.field)).toContain(
    "fullName",
  );
  expect(JSON.stringify(body)).not.toContain(f.password);
  await expect(form.getByLabel("Họ và tên", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.getByLabel("Họ và tên", { exact: true })).toHaveAttribute(
    "aria-describedby",
    /-error-name$/,
  );
  await expect(
    form.getByRole("alert").filter({ hasText: "120" }),
  ).toBeVisible();
  await expect(page.locator(".auth-notice-banner")).toContainText(
    "kiểm tra các ô",
  );
  if (process.env.NOVA_QA_CAPTURE_DIR) {
    mkdirSync(process.env.NOVA_QA_CAPTURE_DIR, { recursive: true });
    await page.locator(".auth-main").screenshot({
      path: `${process.env.NOVA_QA_CAPTURE_DIR}/lab04-auth-fields-mobile.jpg`,
      type: "jpeg",
      quality: 80,
      animations: "disabled",
    });
  }
  await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "false",
  );
  await form.getByLabel("Họ và tên", { exact: true }).fill("Valid member");
  const conflict = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/v1/auth/register",
  );
  await form
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  expect((await conflict).status()).toBe(409);
  await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    form.getByRole("alert").filter({ hasText: "Email" }),
  ).toBeVisible();
  await form.getByLabel("Email", { exact: true }).fill("other@example.test");
  await expect(form.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("LAB04 admin receives field-level duration and duplicate-title errors from the real API", async ({
  page,
}) => {
  const f = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts.admin.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/quan-tri");
  await page
    .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
    .click();
  const form = page.locator(".live-admin-form").first();
  await form
    .getByLabel("Tên phim", { exact: true })
    .fill(`${f.prefix}-invalid-duration`);
  await form
    .getByLabel("Nội dung", { exact: true })
    .fill(f.prefix + " validation fixture");
  await form.getByLabel("Thời lượng (phút)").fill("601");
  await form.getByLabel("Ngày phát hành").fill("2026-10-01T10:00");
  await form.getByLabel("Nhãn tuổi").selectOption("P");
  await form.getByLabel("Trạng thái").selectOption("NOW_SHOWING");
  const invalid = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/movies",
  );
  await form.getByRole("button", { name: "Lưu phim", exact: true }).click();
  expect((await invalid).status()).toBe(400);
  await expect(form.getByLabel("Thời lượng (phút)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.locator("#catalog-error-durationMinutes")).toContainText(
    "600",
  );
  await expect(page.locator(".workspace-message")).toContainText(
    "kiểm tra các trường",
  );
  await form.getByLabel("Thời lượng (phút)").fill("120");
  await form.getByLabel("Tên phim", { exact: true }).fill(f.movie.title);
  const duplicate = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/movies",
  );
  await form.getByRole("button", { name: "Lưu phim", exact: true }).click();
  expect((await duplicate).status()).toBe(409);
  await expect(form.getByLabel("Tên phim", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.locator("#catalog-error-title")).not.toHaveText("");
});

test("LAB04 capture layouts keep booking in normal flow and authentication controls in a grid at desktop, tablet and mobile", async ({
  page,
}) => {
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".nova-premiere")).toBeVisible();
    const hero = await page.locator(".nova-premiere").boundingBox();
    const booking = await page.locator(".booking-express").boundingBox();
    expect(booking.y).toBeGreaterThanOrEqual(hero.y + hero.height);
    await page.goto("/tai-khoan");
    const password = page.getByLabel("Mật khẩu", { exact: true });
    await password.scrollIntoViewIfNeeded();
    const grid = password.locator("..");
    await expect(grid).toHaveCSS("display", "grid");
    const positions = await grid.evaluate((node) => {
      const icon = node
          .querySelector(".auth-input-icon")
          .getBoundingClientRect(),
        input = node.querySelector("input").getBoundingClientRect(),
        toggle = node.querySelector("button").getBoundingClientRect(),
        box = node.getBoundingClientRect();
      return {
        iconRight: icon.right,
        inputLeft: input.left,
        inputRight: input.right,
        toggleLeft: toggle.left,
        toggleRight: toggle.right,
        boxRight: box.right,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(positions.iconRight).toBeLessThanOrEqual(positions.inputLeft + 1);
    expect(positions.inputRight).toBeLessThanOrEqual(positions.toggleLeft + 1);
    expect(positions.toggleRight).toBeLessThanOrEqual(positions.boxRight + 1);
    expect(positions.overflow).toBe(false);
    await grid
      .getByRole("button", { name: "Hiện mật khẩu", exact: true })
      .click();
    await expect(password).toHaveAttribute("type", "text");
  }
});

test("LAB04 page and modal authentication forms have distinct IDs and control only their own passwords", async ({
  page,
}) => {
  await page.goto("/tai-khoan");
  const embedded = page.locator("main .auth-form");
  await expect(embedded).toBeVisible();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const modal = page.getByRole("dialog", {
    name: "Chào mừng đến C’MEMBER",
    exact: true,
  });
  await expect(modal).toBeVisible();
  const identifiers = await page
    .locator(".auth-form input[id]")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(identifiers.length).toBeGreaterThanOrEqual(4);
  expect(new Set(identifiers).size).toBe(identifiers.length);
  const password = modal.getByLabel("Mật khẩu", { exact: true });
  await password.fill("only-in-the-modal");
  await modal
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(embedded.getByLabel("Mật khẩu", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    embedded.getByLabel("Mật khẩu", { exact: true }),
  ).toHaveAttribute("type", "password");
});
