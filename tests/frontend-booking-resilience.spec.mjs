import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chooseOption, chooseDate } from "./ui-choices.mjs";

const require = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  require("dotenv").config({
    path: new URL("../backend/.env", import.meta.url).pathname,
    quiet: true,
  });
  const Redis = require("ioredis");
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

test("a late HOLDING poll cannot resurrect a cancelled booking or its payment button", async ({
  page,
}) => {
  const f = fixture();
  const show = f.programmeShowtimes[2];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts.customer.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/dat-ve");
  await chooseOption(page, "Chọn cụm rạp", f.cinema.id);
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
  const seat = dialog.getByRole("button", {
    name: "Ghế A1, còn trống",
    exact: true,
  });
  await expect(seat).toBeEnabled();
  await seat.click();
  const held = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/v1/bookings/hold",
  );
  await dialog
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const order = (await (await held).json()).data;
  await expect(dialog.getByTestId("hold-timer")).toBeVisible();

  let captured = false;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/bookings/me?**", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const stale = JSON.parse(body).data.items.find(
      (item) => item.id === order.id,
    );
    if (captured || !["HOLDING", "PENDING"].includes(stale?.status)) {
      await route.fulfill({ response, body });
      return;
    }
    captured = true;
    await gate;
    await route.fulfill({ response, body });
  });
  try {
    await expect
      .poll(async () => {
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        return captured;
      })
      .toBe(true);
    await dialog
      .getByRole("button", { name: "Hủy đơn & trả ghế", exact: true })
      .click();
    await expect(dialog.getByTestId("hold-timer")).toHaveCount(0);
    const resumed = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/v1/bookings/me",
    );
    release();
    await (await resumed).finished();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(dialog.getByTestId("hold-timer")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Thanh toán Sandbox", exact: true }),
    ).toHaveCount(0);
    await expect(seat).toBeEnabled();
    const persisted = await page.request.get(`/api/v1/bookings/${order.id}`);
    expect((await persisted.json()).data.status).toBe("CANCELLED");
    expect(errors).toEqual([]);
  } finally {
    release();
    // Also release the real hold if an assertion failed before cancellation.
    await page.request.post(`/api/v1/bookings/${order.id}/cancel`);
  }
});

test("typing a manual QR does not reformat every screening option", async ({
  page,
}) => {
  const f = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts.staff.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/soat-ve");
  await page.getByLabel("Ngày đang soát", { exact: true }).fill(
    new Date(f.admissionShowtime.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  const select = page.getByRole("combobox", {
    name: "Suất chiếu đang soát",
    exact: true,
  });
  await select.selectOption(f.admissionShowtime.id);
  const before = await select.locator("option").allTextContents();
  expect(before.length).toBeGreaterThan(1);
  await page.evaluate(() => {
    window.__qrOptionFormats = 0;
    const descriptor = Object.getOwnPropertyDescriptor(
      Intl.DateTimeFormat.prototype,
      "format",
    );
    Object.defineProperty(Intl.DateTimeFormat.prototype, "format", {
      ...descriptor,
      get() {
        const bound = descriptor.get.call(this);
        return (...args) => {
          window.__qrOptionFormats++;
          return bound(...args);
        };
      },
    });
    const time = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function (...args) {
      window.__qrOptionFormats++;
      return time.apply(this, args);
    };
  });
  await page.getByLabel("Mã đọc từ QR").pressSequentially("0".repeat(64));
  expect(await page.evaluate(() => window.__qrOptionFormats)).toBe(0);
  expect(await select.locator("option").allTextContents()).toEqual(before);
  expect(await select.inputValue()).toBe(f.admissionShowtime.id);
});
