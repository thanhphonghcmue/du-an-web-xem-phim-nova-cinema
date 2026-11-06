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
async function read(page, path) {
  const response = await page.request.get("/api/v1" + path);
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}
async function capture(page, name) {
  if (!process.env.NOVA_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(process.env.NOVA_CAPTURE_DIR, name + ".jpg"),
    type: "jpeg",
    quality: 82,
    animations: "disabled",
    // Dữ liệu fixture cục bộ, được xóa khi kết thúc bộ test; không có tài khoản thật.
    mask: [],
  });
}
async function start(page, i = 3) {
  const data = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: data.accounts.cmember.email, password: data.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/dat-ve");
  const show = data.programmeShowtimes[i];
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
  await expect(
    page.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
  return show;
}
async function hold(page, label = "A1") {
  await page
    .getByRole("button", { name: `Ghế ${label}, còn trống`, exact: true })
    .click();
  const held = page.waitForResponse(
    (r) =>
      r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const response = await held;
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}
async function review(page) {
  const age = page.getByRole("checkbox", {
    name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
  });
  if (await age.count()) await age.check();
  await page
    .getByRole("button", { name: "Xem lại đơn & thanh toán", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Xác nhận đơn hàng & thanh toán",
    exact: true,
  });
}
async function gateway(page) {
  const reviewCard = await review(page);
  await reviewCard.getByRole("button", { name: /^Thanh toán ngay:/ }).click();
  const card = page.getByRole("dialog", {
    name: "Cổng thanh toán Sandbox",
    exact: true,
  });
  await expect(card).toBeVisible();
  return card;
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
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
test.afterEach(async ({ page }) => {
  const response = await page.request.get("/api/v1/bookings/me?limit=100");
  if (!response.ok()) return;
  const { data } = await response.json();
  for (const order of data.items.filter((o) =>
    ["HOLDING", "PENDING"].includes(o.status),
  ))
    expect(
      (await page.request.post(`/api/v1/bookings/${order.id}/cancel`)).status(),
    ).toBe(200);
});
test("two-column review binds actual order and Escape closes only the top dialog without losing the hold", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const order = await hold(page);
  const card = await review(page);
  await expect(card).toContainText(fixture().programmeRoom.name);
  await expect(card).toContainText("A1");
  await expect(card).toContainText("GOLD");
  await expect(card.getByTestId("review-server-total")).toHaveText(
    Number(order.finalAmount).toLocaleString("vi-VN") + " ₫",
  );
  await capture(page, "13-order-review");
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Chọn ghế & đặt vé", exact: true }),
  ).toBeVisible();
  expect((await read(page, `/bookings/${order.id}`)).expiredAt).toBe(
    order.expiredAt,
  );
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  const pay = await gateway(page);
  await expect(pay.locator(".sandbox-transaction-qr svg")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pay).toHaveCount(0);
  expect(["PENDING", "HOLDING"]).toContain(
    (await read(page, `/bookings/${order.id}`)).status,
  );
  expect(errors).toEqual([]);
});
test("Sandbox transaction QR and actions fit 375, 768 and 1440px; cancel releases and immediately rebooks same seat", async ({
  page,
}) => {
  const show = await start(page);
  const order = await hold(page, "A2");
  const card = await gateway(page);
  const originalUrl = page.url();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await card.evaluate((node) => {
        const b = node.getBoundingClientRect();
        return [...node.querySelectorAll("button")].every((x) => {
          const r = x.getBoundingClientRect();
          return (
            r.left >= b.left &&
            r.right <= b.right + 1 &&
            x.scrollWidth <= x.clientWidth
          );
        });
      }),
    ).toBe(true);
  }
  await capture(page, "14-sandbox-gateway");
  await card
    .getByRole("button", { name: "Hủy giao dịch", exact: true })
    .click();
  const canceled = page.getByRole("dialog", {
    name: "Giao dịch đã được hủy bỏ",
    exact: true,
  });
  await expect(canceled).toContainText(order.orderCode);
  expect(page.url()).toBe(originalUrl);
  expect((await read(page, `/bookings/${order.id}`)).status).toBe("CANCELLED");
  const map = await read(page, `/showtimes/${show.id}/seats`);
  expect(map.seats.find((s) => s.seatId === order.seats[0].seatId).status).toBe(
    "AVAILABLE",
  );
  await capture(page, "16-cancelled");
  await canceled.getByRole("button", { name: "Thử thanh toán lại →" }).click();
  const next = await hold(page, "A2");
  expect(next.id).not.toBe(order.id);
  expect(next.seats[0].seatId).toBe(order.seats[0].seatId);
});
test("failed completion request unlocks actions and never invents PAID or a QR ticket", async ({
  page,
}) => {
  await start(page);
  const order = await hold(page, "A3");
  const card = await gateway(page);
  await page.route("**/api/v1/payments/sandbox/complete", (route) =>
    route.abort(),
  );
  await card
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  await expect(card.getByRole("alert")).toContainText("Kết nối bị gián đoạn");
  await expect(
    card.getByRole("button", { name: "Thanh toán thành công", exact: true }),
  ).toBeEnabled();
  expect(["HOLDING", "PENDING"]).toContain(
    (await read(page, `/bookings/${order.id}`)).status,
  );
  await expect(page.locator(".booking-issued-ticket")).toHaveCount(0);
  await page.unroute("**/api/v1/payments/sandbox/complete");
  await card
    .getByRole("button", { name: "Hủy giao dịch", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Giao dịch đã được hủy bỏ", exact: true }),
  ).toBeVisible();
});
test("actual expired backend hold shows selected seat names and returns to the same room for a fresh hold", async ({
  page,
}) => {
  const show = await start(page);
  const order = await hold(page, "A4");
  await gateway(page);
  const { PrismaClient } = req("@prisma/client");
  const { testDatabaseTarget } = req("./scripts/test-database-target.cjs");
  const prisma = new PrismaClient({
    datasources: { db: { url: testDatabaseTarget() } },
  });
  try {
    await prisma.booking.update({
      where: { id: order.id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const expired = page.getByRole("dialog", {
    name: "Hết thời gian giữ ghế (Timeout 5 phút)",
    exact: true,
  });
  await expect(expired).toContainText("A4", { timeout: 12000 });
  await expect(expired).not.toContainText("undefined");
  await expect(
    page.getByRole("dialog", { name: "Cổng thanh toán Sandbox", exact: true }),
  ).toHaveCount(0);
  expect((await read(page, `/bookings/${order.id}`)).status).toBe("EXPIRED");
  await capture(page, "15-expired");
  await expired.getByRole("button", { name: /Đặt lại vé ngay/ }).click();
  const next = await hold(page, "A4");
  expect(next.showtimeId).toBe(show.id);
  expect(next.id).not.toBe(order.id);
});
test("a real API 409 opens the red conflict modal, removes only the blocked seat and refreshes on acknowledgement", async ({
  page,
  browser,
}) => {
  const show = await start(page);
  const selected = page.getByRole("button", {
    name: "Ghế A5, còn trống",
    exact: true,
  });
  await selected.click();
  const snapshot = await read(page, `/showtimes/${show.id}/seats`);
  const seat = snapshot.seats.find((s) => s.row === "A" && s.column === 5);
  const stalePattern = `**/api/v1/showtimes/${show.id}/seats`;
  // Giả lập snapshot cũ trên mạng; request giữ ghế vẫn đi qua API và PostgreSQL thật.
  await page.route(stalePattern, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { success: true, data: snapshot },
    }),
  );
  const other = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  let held;
  try {
    const data = fixture();
    expect(
      (
        await other.request.post("/api/v1/auth/login", {
          data: {
            email: data.accounts.customer.email,
            password: data.password,
          },
        })
      ).status(),
    ).toBe(200);
    const response = await other.request.post("/api/v1/bookings/hold", {
      data: { showtimeId: show.id, seatIds: [seat.seatId] },
    });
    expect(response.status()).toBe(201);
    held = (await response.json()).data;
    const rejected = page.waitForResponse(
      (r) =>
        r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
      .click();
    expect((await rejected).status()).toBe(409);
    const conflict = page.getByRole("alertdialog", {
      name: "Xung đột giữ ghế (Lỗi 409 Conflict)",
      exact: true,
    });
    await expect(conflict).toContainText("A5");
    await capture(page, "11-seat-conflict");
    await page.unroute(stalePattern);
    await conflict
      .getByRole("button", { name: "Đã hiểu · Chọn ghế khác" })
      .click();
    await expect(conflict).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Ghế A5, đang giữ/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("dialog", { name: "Chọn ghế & đặt vé", exact: true }),
    ).toBeVisible();
    await hold(page, "A6");
  } finally {
    if (held) await other.request.post(`/api/v1/bookings/${held.id}/cancel`);
    await other.close();
  }
});
