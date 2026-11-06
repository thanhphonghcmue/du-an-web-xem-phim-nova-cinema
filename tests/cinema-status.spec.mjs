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
  await page.route("**/api/v1/payments/sandbox/confirm", (route) =>
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
  await page.unroute("**/api/v1/payments/sandbox/confirm");
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

test("TC_FR07_05: Admin locks a booked show, releases only unpaid holds and client sees a neon unavailable dialog", async ({
  page,
  browser,
}) => {
  const show = await start(page);
  const order = await hold(page, "A7");
  const checkoutResponse = await page.request.post(
    "/api/v1/payments/create-sandbox-url",
    {
      data: {
        bookingId: order.id,
        returnUrl: new URL(page.url()).origin + "/?booking=" + order.id,
      },
    },
  );
  expect(checkoutResponse.status()).toBe(201);
  const signed = Object.fromEntries(
    new URL((await checkoutResponse.json()).data.url).searchParams,
  );
  const mapBefore = await read(page, `/showtimes/${show.id}/seats`);
  const paidHold = await page.request.post("/api/v1/bookings/hold", {
    data: {
      showtimeId: show.id,
      seatIds: [
        mapBefore.seats.find((s) => s.row === "A" && s.column === 9).seatId,
      ],
    },
  });
  expect(paidHold.status()).toBe(201);
  const paidOrder = (await paidHold.json()).data;
  const paidUrl = await page.request.post(
    "/api/v1/payments/create-sandbox-url",
    {
      data: {
        bookingId: paidOrder.id,
        returnUrl: new URL(page.url()).origin + "/?booking=" + paidOrder.id,
      },
    },
  );
  expect(paidUrl.status()).toBe(201);
  const paidFields = Object.fromEntries(
    new URL((await paidUrl.json()).data.url).searchParams,
  );
  expect(
    (
      await page.request.post("/api/v1/payments/sandbox/confirm", {
        data: { ...paidFields, result: "SUCCESS" },
      })
    ).status(),
  ).toBe(200);
  const admin = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const data = fixture();
    expect(
      (
        await admin.request.post("/api/v1/auth/login", {
          data: { email: data.accounts.admin.email, password: data.password },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.patch(`/api/v1/showtimes/${show.id}/status`, {
          data: { status: "LOCKED" },
        })
      ).status(),
    ).toBe(403);
    const changed = await admin.request.patch(
      `/api/v1/showtimes/${show.id}/status`,
      { data: { status: "LOCKED" } },
    );
    expect(changed.status()).toBe(200);
    expect((await read(page, `/bookings/${order.id}`)).status).toBe(
      "CANCELLED",
    );
    const preserved = await read(page, `/bookings/${paidOrder.id}`);
    expect(preserved.status).toBe("PAID");
    expect(preserved.seats.every((s) => s.status === "SOLD")).toBe(true);
    const refused = await page.request.post("/api/v1/bookings/hold", {
      data: { showtimeId: show.id, seatIds: [order.seats[0].seatId] },
    });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).errorCode).toBe("SHOWTIME_UNAVAILABLE");
    const forbiddenPayment = await page.request.post(
      "/api/v1/payments/sandbox/confirm",
      { data: { ...signed, result: "SUCCESS" } },
    );
    expect(forbiddenPayment.status()).toBe(409);
    expect((await forbiddenPayment.json()).error).toBe("SHOWTIME_UNAVAILABLE");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const notice = page.getByRole("dialog", {
      name: "Thông báo thay đổi suất chiếu",
      exact: true,
    });
    await expect(notice).toContainText(
      "Rất tiếc, suất chiếu này đã bị hủy hoặc thay đổi. Vui lòng chọn suất khác",
      { timeout: 12000 },
    );
    await notice.getByRole("button", { name: "Chọn suất chiếu khác" }).click();
    await expect(notice).toHaveCount(0);
  } finally {
    await admin.request.patch(`/api/v1/showtimes/${show.id}/status`, {
      data: { status: "ACTIVE" },
    });
    await admin.close();
  }
});

test("TC_FR08_04: signed test expiry returns JSON409, no PAID/QR, keeps CSS and frees physical seats", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const show = await start(page);
  const order = await hold(page, "A8");
  const card = await gateway(page);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/payments/sandbox/confirm") &&
      r.request().method() === "POST",
  );
  await card.getByRole("button", { name: "Test: Hết hạn 5p ngay" }).click();
  const rejected = await response;
  expect(rejected.status()).toBe(409);
  expect(rejected.headers()["content-type"]).toContain("application/json");
  expect((await rejected.json()).errorCode).toBe("ORDER_EXPIRED_TIMEOUT");
  const expired = page.getByRole("dialog", {
    name: "Hết thời gian giữ ghế (Timeout 5 phút)",
    exact: true,
  });
  await expect(expired).toContainText(
    "Đơn đã hết hạn, không còn thanh toán được",
  );
  expect(
    await expired.evaluate((n) => getComputedStyle(n).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  expect((await read(page, `/bookings/${order.id}`)).status).toBe("EXPIRED");
  const map = await read(page, `/showtimes/${show.id}/seats`);
  expect(map.seats.find((s) => s.seatId === order.seats[0].seatId).status).toBe(
    "AVAILABLE",
  );
  expect(
    (await read(page, "/tickets/me?limit=100")).items.filter(
      (t) => t.bookingId === order.id,
    ),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("TC_FR12_01: persisted seat ranges rank Solo, Couple and Party69K; taste chips filter locally without changing the cart", async ({
  page,
}) => {
  await start(page);
  const seat = (n) =>
    page.getByRole("button", { name: `Ghế A${n}, còn trống`, exact: true });
  await seat(10).click();
  await expect(page.locator(".live-combos")).toContainText("Solo - 1 người");
  await seat(11).click();
  await expect(page.locator(".live-combos")).toContainText("Cặp đôi - 2 người");
  await seat(12).click();
  await expect(page.locator(".live-combos > label").first()).toContainText(
    "Party Combo 69K",
  );
  await expect(page.locator(".live-combos > label").first()).toContainText(
    "Phù hợp nhất cho nhóm 3 người",
  );
  const labels = page.locator(".live-combos > label");
  await page
    .getByRole("group", { name: "Khẩu vị combo" })
    .getByRole("button", { name: "Phô Mai", exact: true })
    .click();
  await expect(labels).toContainText(["Couple Phô Mai Combo"]);
  await page
    .getByRole("group", { name: "Khẩu vị combo" })
    .getByRole("button", { name: "Tất cả", exact: true })
    .click();
  await expect(labels.first()).toContainText("Party Combo 69K");
});

test("TC_FR12_02: admin creates metadata in a modal, edits price and hides/restores a combo; customer cannot administer it", async ({
  page,
  browser,
}) => {
  const data = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: data.accounts.admin.email, password: data.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/admin/combos");
  await expect(page).toHaveURL(/\/quan-tri\?tab=combos/);
  await page
    .getByRole("button", { name: "Thêm mới Combo", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Quản trị combo",
    exact: true,
  });
  const name = "00 " + data.prefix + " combo";
  await modal.getByLabel("Đang bán", { exact: true }).selectOption("true");
  await modal.getByLabel("Tên combo", { exact: true }).fill(name);
  await modal
    .getByLabel("Mô tả", { exact: true })
    .fill(data.prefix + " menu · Owned combo fixture");
  await modal.getByLabel("Giá (VND)", { exact: true }).fill("49000");
  await modal.getByLabel("Khẩu vị", { exact: true }).selectOption("NGỌT");
  await modal
    .getByLabel("Thành phần combo", { exact: true })
    .fill("1 bắp + 1 nước");
  await modal.getByLabel("Số người tối thiểu", { exact: true }).fill("1");
  await modal.getByLabel("Số người tối đa", { exact: true }).fill("1");
  await modal.getByLabel("Nhãn", { exact: true }).selectOption("SOLO");
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/combos") && r.request().method() === "POST",
  );
  await modal
    .getByRole("button", { name: "Lưu bắp nước", exact: true })
    .click();
  const r = await created;
  expect(r.status()).toBe(201);
  const combo = (await r.json()).data;
  expect(combo).toMatchObject({
    tasteTag: "NGỌT",
    suggestedMinSeats: 1,
    suggestedMaxSeats: 1,
    badgeLabel: "SOLO",
  });
  await expect(modal).toHaveCount(0);
  const row = page.locator(`[data-entity-id="${combo.id}"]`);
  await expect(row).toContainText(name);
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  await modal.getByLabel("Giá (VND)", { exact: true }).fill("51000");
  await modal
    .getByRole("button", { name: "Lưu bắp nước", exact: true })
    .click();
  await expect(row).toContainText("51000");
  await row.getByRole("button", { name: "Ẩn combo", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Hiện combo", exact: true }),
  ).toBeVisible();
  const publicRows = await read(page, "/combos?limit=100");
  expect(publicRows.items.some((c) => c.id === combo.id)).toBe(false);
  const all = await read(page, "/admin/combos?limit=100");
  expect(all.items.find((c) => c.id === combo.id).isActive).toBe(false);
  const other = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
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
    expect(
      (
        await other.request.patch(
          `/api/v1/admin/combos/${combo.id}/toggle-status`,
          { data: {} },
        )
      ).status(),
    ).toBe(403);
  } finally {
    await other.close();
  }
  await row.getByRole("button", { name: "Hiện combo", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Ẩn combo", exact: true }),
  ).toBeVisible();
  expect(
    (await read(page, "/combos?limit=100")).items.some(
      (c) => c.id === combo.id,
    ),
  ).toBe(true);
});

test("TC_FR12_02: another customer refreshes hidden combos and removes an unheld cart item", async ({
  page,
  browser,
}) => {
  const data = fixture();
  const admin = await browser.newContext({
    baseURL: new URL(test.info().project.use.baseURL).origin,
  });
  try {
    expect(
      (
        await admin.request.post("/api/v1/auth/login", {
          data: { email: data.accounts.admin.email, password: data.password },
        })
      ).status(),
    ).toBe(200);
    const payload = {
      name: data.prefix + " live combo",
      description: data.prefix + " menu · Live visibility",
      price: "49000",
      tasteTag: "NGỌT",
      itemsSummary: "1 bắp + 1 nước",
      suggestedMinSeats: 1,
      suggestedMaxSeats: 1,
      badgeLabel: "SOLO",
      isActive: true,
    };
    expect(
      (
        await admin.request.post("/api/v1/admin/combos", {
          data: { ...payload, suggestedMinSeats: 3, suggestedMaxSeats: 1 },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await admin.request.post("/api/v1/admin/combos", {
          data: { ...payload, tasteTag: null },
        })
      ).status(),
    ).toBe(400);
    const response = await admin.request.post("/api/v1/admin/combos", {
      data: payload,
    });
    expect(response.status()).toBe(201);
    const combo = (await response.json()).data;
    expect(
      (
        await admin.request.put(`/api/v1/admin/combos/${combo.id}`, {
          data: { price: "51000", suggestedMaxSeats: null },
        })
      ).status(),
    ).toBe(200);
    await start(page);
    const quantity = page.getByRole("spinbutton", {
      name: `Số lượng ${combo.name}`,
      exact: true,
    });
    await expect(quantity).toBeVisible();
    await quantity.fill("1");
    expect(
      (
        await admin.request.patch(
          `/api/v1/admin/combos/${combo.id}/toggle-status`,
          { data: {} },
        )
      ).status(),
    ).toBe(200);
    await expect(quantity).toHaveCount(0, { timeout: 10000 });
    expect(
      (
        await admin.request.patch(
          `/api/v1/admin/combos/${combo.id}/toggle-status`,
          { data: {} },
        )
      ).status(),
    ).toBe(200);
    await expect(quantity).toBeVisible({ timeout: 10000 });
    await expect(quantity).toHaveValue("0");
    await page.goto("/bap-nuoc");
    const product = page.getByRole("heading", {
      name: combo.name,
      exact: true,
    });
    await expect(product).toBeVisible();
    expect(
      (
        await admin.request.patch(
          `/api/v1/admin/combos/${combo.id}/toggle-status`,
          { data: {} },
        )
      ).status(),
    ).toBe(200);
    await expect(product).toHaveCount(0, { timeout: 10000 });
  } finally {
    await admin.close();
  }
});
