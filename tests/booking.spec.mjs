import { chooseOption, chooseDate } from "./ui-choices.mjs";
import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );
async function capture(target, name, mask = []) {
  if (!process.env.NOVA_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_CAPTURE_DIR, { recursive: true });
  await target.screenshot({
    path: resolve(process.env.NOVA_CAPTURE_DIR, name + ".jpg"),
    type: "jpeg",
    quality: 80,
    animations: "disabled",
    mask,
  });
}
const password = () => fixture().password;
async function command(page, path, body, method = "POST") {
  return page.evaluate(
    async ({ path, body, method }) => {
      const r = await fetch("/api/v1" + path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    },
    { path, body, method },
  );
}
async function read(page, path) {
  return page.evaluate(async (path) => {
    const r = await fetch("/api/v1" + path);
    return { status: r.status, body: await r.json() };
  }, path);
}
async function restoredSeatScreen(page) {
  const dialog = page.getByRole("dialog", { name: "Chọn ghế & đặt vé" });
  // A full navigation must finish loading the real programme and seat/order snapshot.
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await expect(
    dialog.getByText("Đang tải trạng thái ghế…", { exact: true }),
  ).toHaveCount(0, { timeout: 15000 });
  return dialog;
}
async function login(page, role = "customer") {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  const account = fixture().accounts[role];
  const result = await command(page, "/auth/login", {
    email: account.email,
    password: password(),
    remember: true,
  });
  expect(result.status).toBe(200);
  expect(result.body.data.accessToken).toBeUndefined();
  await page.reload();
  await expect(page.locator(".login-trigger")).toContainText(
    role.toUpperCase(),
  );
}
async function seats(page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  const { showtime } = fixture();
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  // The timeline uses real room and showtime UUIDs loaded from the catalog.
  await chooseOption(page, "Rạp trong lịch chiếu", fixture().cinema.id);
  const film = page
    .locator(".timeline-film-list [role=tab]")
    .filter({ hasText: "Dune" })
    .first();
  await film.click();
  await page.locator(".timeline-show").first().click();
  await expect(
    page.getByRole("dialog", { name: "Chọn ghế & đặt vé" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ghế A1,/ })).toBeVisible();
  expect((await read(page, `/showtimes/${showtime.id}/seats`)).status).toBe(
    200,
  );
}
async function hold(page, label = "A1") {
  await seats(page);
  await page
    .getByRole("button", { name: new RegExp(`Ghế ${label}, còn trống`) })
    .click();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const r = await response;
  expect(r.status()).toBe(201);
  const order = (await r.json()).data;
  await expect(page.getByTestId("server-total")).toBeVisible();
  return order;
}
async function cancelAll(page) {
  const res = await read(page, "/bookings/me?limit=100");
  if (res.status === 200)
    for (const order of res.body.data.items.filter((o) =>
      ["HOLDING", "PENDING"].includes(o.status),
    ))
      expect((await command(page, `/bookings/${order.id}/cancel`)).status).toBe(
        200,
      );
}
// Reset only this run's limiter namespace between independent cases. Production
// limits remain enabled; the explicit limiter case below verifies them.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() =>
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
test.afterEach(async ({ page }) => {
  await cancelAll(page);
});

test("catalog, quick booking and search use backend UUIDs without browser errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  expect((await read(page, "/runtime")).body.data.mode).toBe("backend");
  await expect(page.locator(".standalone-mode-notice")).toHaveCount(0);
  await chooseOption(page, "Chọn cụm rạp", fixture().cinema.id);
  await chooseOption(page, "Chọn phim", fixture().movie.id);
  const day = new Date(fixture().showtime.startTime).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Ho_Chi_Minh" },
  );
  await chooseDate(page, "Chọn ngày chiếu", day);
  await expect(
    page.getByRole("combobox", { name: "Chọn suất chiếu", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("combobox", { name: "Chọn suất chiếu", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .last()
      .locator(`[role="option"][data-value="${fixture().showtime.id}"]`),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Tìm phim, rạp...", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Tìm phim, rạp..." })
    .fill("Dune");
  await expect(page.locator(".search-modal")).toContainText("Dune");
  expect(errors).toEqual([]);
});

test("registration creates a real account, profile and session; logout revokes refresh", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.locator(".login-trigger").click();
  await page.getByRole("tab", { name: "Đăng ký thành viên" }).click();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách kiểm thử");
  await page.getByLabel("Số điện thoại (không bắt buộc)").fill("123");
  await page.getByLabel("Số điện thoại (không bắt buộc)").blur();
  await expect(page.locator("#error-phone")).toContainText("10 chữ số");
  await page.getByLabel("Số điện thoại (không bắt buộc)").fill("0901234567");
  const email =
    fixture().prefix + "-" + randomUUID().slice(0, 8) + "@example.test";
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password());
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password());
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page.locator(".account-welcome")).toContainText(email);
  const profile = await read(page, "/users/me");
  expect(profile.body.data.cMemberPoints).toBe(0);
  expect(profile.body.data.phone).toBe("0901234567");
  const cookies = await context.cookies();
  expect(
    cookies
      .filter((c) => ["nova_access", "nova_refresh"].includes(c.name))
      .every((c) => c.httpOnly && c.sameSite === "Lax"),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("nova_access_token")),
  ).toBeNull();
  const logout = page.waitForResponse(
    (r) => r.url().endsWith("/auth/logout") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  expect((await logout).status()).toBe(200);
  await expect(page.locator(".login-trigger")).toHaveText("Đăng nhập");
  expect((await read(page, "/users/me")).status).toBe(401);
  expect((await context.cookies()).some((c) => c.name === "nova_refresh")).toBe(
    false,
  );
});

test("signup validates 12 characters and invalid credentials never create a session", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".login-trigger").click();
  await page.getByRole("tab", { name: "Đăng ký thành viên" }).click();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("short");
  await page.getByLabel("Mật khẩu", { exact: true }).blur();
  await expect(page.locator("#error-password")).toContainText("12");
  const bad = await command(page, "/auth/login", {
    email: fixture().accounts.customer.email,
    password: "incorrect",
  });
  expect(bad.status).toBe(401);
  expect((await read(page, "/users/me")).status).toBe(401);
});

test("guests can browse but must sign in before seat booking", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  await chooseOption(page, "Rạp trong lịch chiếu", fixture().cinema.id);
  await page.locator(".timeline-show").first().click();
  await expect(
    page.getByRole("dialog", { name: "Chào mừng đến C’MEMBER" }),
  ).toBeVisible();
  expect(
    (
      await command(page, "/bookings/hold", {
        showtimeId: fixture().showtime.id,
        seatIds: [],
      })
    ).status,
  ).toBe(401);
});

test("orphan warnings identify the real gap, block submission and match backend validation", async ({
  page,
}) => {
  await login(page);
  await seats(page);
  await page
    .getByRole("button", { name: "Ghế A2, còn trống", exact: true })
    .click();
  await expect(page.locator(".orphan-warning-banner")).toContainText("A1");
  await page.locator(".orphan-warning-banner").scrollIntoViewIfNeeded();
  await capture(page, "orphan-seat-warning");
  await expect(page.locator(".seat.orphan-seat")).toHaveAttribute(
    "aria-label",
    "Ghế A1, còn trống",
  );
  await expect(
    page.getByRole("button", { name: "Giữ ghế 5 phút", exact: true }),
  ).toBeDisabled();
  const map = (await read(page, `/showtimes/${fixture().showtime.id}/seats`))
    .body.data;
  const invalid = await command(page, "/bookings/hold", {
    showtimeId: fixture().showtime.id,
    seatIds: [
      map.seats.find((seat) => seat.row === "A" && seat.column === 2).seatId,
    ],
  });
  expect(invalid.status).toBe(400);
  expect(invalid.body.error).toBe("ORPHAN_SEAT_DETECTED");
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await expect(page.locator(".orphan-warning-banner")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Giữ ghế 5 phút", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Ghế A2, đang chọn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ghế A3, còn trống", exact: true })
    .click();
  await expect(page.locator(".orphan-warning-banner")).toContainText("A2");
  await page
    .getByRole("combobox", { name: "Loại ghế gợi ý", exact: true })
    .selectOption("VIP");
  await page
    .getByLabel("Số người trong nhóm", { exact: true })
    .selectOption("2");
  const suggestion = page.waitForResponse(
    (response) =>
      response.url().includes("group-seat-suggestion") &&
      response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Xếp ghế", exact: true }).click();
  const response = await suggestion;
  expect(response.status()).toBe(200);
  expect(response.url()).toContain("seatType=VIP");
  await expect(page.locator(".orphan-warning-banner")).toHaveCount(0);
  await expect(page.locator(".seat.selected")).toHaveCount(2);
  const chosen = await page
    .locator(".seat.selected")
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute("aria-label")),
    );
  expect(chosen.every((label) => label.startsWith("Ghế B"))).toBe(true);
});

test("two independent sessions race for one seat with exactly one persisted winner", async ({
  browser,
  page,
}) => {
  await login(page);
  await seats(page);
  const other = await browser.newContext();
  const p2 = await other.newPage();
  try {
    await p2.goto("/");
    const email =
      fixture().prefix + "-race-" + randomUUID().slice(0, 8) + "@example.test";
    expect(
      (
        await command(p2, "/auth/register", {
          email,
          password: password(),
          fullName: "Race customer",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await command(p2, "/auth/login", {
          email,
          password: password(),
          remember: false,
        })
      ).status,
    ).toBe(200);
    await p2.reload();
    await seats(p2);
    for (const p of [page, p2])
      await p.getByRole("button", { name: /Ghế A1, còn trống/ }).click();
    const responses = [page, p2].map((p) =>
      p.waitForResponse(
        (r) =>
          r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
      ),
    );
    await Promise.all(
      [page, p2].map((p) =>
        p.getByRole("button", { name: "Giữ ghế 5 phút", exact: true }).click(),
      ),
    );
    const result = await Promise.all(responses);
    expect(result.map((r) => r.status()).sort()).toEqual([201, 409]);
    const map = (await read(page, `/showtimes/${fixture().showtime.id}/seats`))
      .body.data;
    expect(map.seats.find((s) => s.row === "A" && s.column === 1).status).toBe(
      "HOLDING",
    );
    await cancelAll(p2);
  } finally {
    await other.close();
  }
});

test("Sweetbox UI and backend hold, price and release both halves atomically", async ({
  page,
}) => {
  await login(page);
  await seats(page);
  await expect(page.locator(".sandbox-note")).toContainText(
    "Đồng bộ ghế trực tiếp",
  );
  await page.getByRole("button", { name: /Ghế H1, còn trống/ }).click();
  await expect(page.getByRole("button", { name: /Ghế H2,/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const map = (await read(page, `/showtimes/${fixture().showtime.id}/seats`))
    .body.data;
  const first = map.seats.find((s) => s.row === "H" && s.column === 1);
  const result = await command(page, "/bookings/hold", {
    showtimeId: fixture().showtime.id,
    seatIds: [first.seatId],
  });
  expect(result.status).toBe(201);
  expect(result.body.data.seats).toHaveLength(2);
  expect(result.body.data.totalTicketAmount).toBe("270000.00");
  await cancelAll(page);
  const released = (
    await read(page, `/showtimes/${fixture().showtime.id}/seats`)
  ).body.data;
  expect(
    released.seats
      .filter((s) => s.row === "H" && s.column <= 2)
      .map((s) => s.status),
  ).toEqual(["AVAILABLE", "AVAILABLE"]);
});

test("group of20 and combo use exact server prices and member discount", async ({
  page,
}) => {
  await login(page);
  await seats(page);
  await page.getByLabel("Số người trong nhóm").selectOption("20");
  await page.getByRole("button", { name: "Xếp ghế", exact: true }).click();
  await expect(page.locator(".seat[aria-pressed=true]")).toHaveCount(20);
  await page
    .getByLabel(`Số lượng ${fixture().combo.name}`, { exact: true })
    .fill("1");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const r = await response;
  expect(r.status()).toBe(201);
  const order = (await r.json()).data;
  expect(order.seats).toHaveLength(20);
  expect(order.totalComboAmount).toBe("69000.00");
  expect(order.finalAmount).toBe("1775550.00");
  await expect(page.getByTestId("server-total")).toContainText("1.775.550");
});

test("refresh restores the same hold and deadline, cancel releases it", async ({
  page,
}) => {
  await login(page);
  const order = await hold(page);
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Chọn ghế & đặt vé" }),
  ).toBeVisible();
  const restored = (await read(page, `/bookings/${order.id}`)).body.data;
  expect(restored.expiredAt).toBe(order.expiredAt);
  expect(new Date(restored.expiredAt) - new Date(restored.createdAt)).toBe(
    300000,
  );
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  await page.getByRole("button", { name: "Hủy đơn & trả ghế" }).click();
  await expect(page.locator(".modal-panel [role=alert]")).toContainText(
    "Đã hủy",
  );
  expect((await read(page, `/bookings/${order.id}`)).body.data.status).toBe(
    "CANCELLED",
  );
});

for (const [button, state] of [
  ["Mô phỏng thất bại", "CANCELLED"],
  ["Hủy thanh toán", "CANCELLED"],
])
  test(`Sandbox ${button} returns verified state and releases seats`, async ({
    page,
  }) => {
    await login(page);
    const order = await hold(page);
    await page
      .getByRole("checkbox", {
        name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
      })
      .check();
    await page
      .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Thanh toán mô phỏng" }),
    ).toBeVisible();
    await page.getByRole("button", { name: button, exact: true }).click();
    expect(
      (await read(page, `/payments/${order.id}/status`)).body.data
        .bookingStatus,
    ).toBe(state);
    await page.getByRole("link", { name: "Quay lại ứng dụng" }).click();
    const restored = await restoredSeatScreen(page);
    await expect(restored).toContainText(state);
  });

test("Sandbox success issues one real QR, ICS and atomic staff check-in", async ({
  page,
  browser,
}) => {
  await login(page);
  const order = await hold(page, "B1");
  // A second active order must not replace the just-paid result when points refresh.
  const map = (await read(page, `/showtimes/${fixture().showtime.id}/seats`))
    .body.data;
  // Use an edge seat so the second booking respects the existing orphan-seat rule.
  const anotherSeat = map.seats.find((s) => s.row === "A" && s.column === 1);
  expect(
    (
      await command(page, "/bookings/hold", {
        showtimeId: fixture().showtime.id,
        seatIds: [anotherSeat.seatId],
      })
    ).status,
  ).toBe(201);
  await page
    .getByRole("checkbox", {
      name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
    })
    .check();
  await page
    .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  expect(
    (await read(page, `/payments/${order.id}/status`)).body.data.bookingStatus,
  ).toBe("PAID");
  await page.getByRole("link", { name: "Quay lại ứng dụng" }).click();
  await restoredSeatScreen(page);
  await expect(
    page.getByRole("heading", { name: "Thanh toán đã được xác nhận" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem vé trong tài khoản" }).click();
  await page.locator(".login-trigger").click();
  await expect(page.getByAltText(`QR vé ${order.orderCode}`)).toBeVisible();
  const tickets = (
    await read(page, "/tickets/me?limit=100")
  ).body.data.items.filter((t) => t.bookingId === order.id);
  expect(tickets).toHaveLength(1);
  const ticket = tickets[0];
  const png = req("pngjs").PNG.sync.read(
    Buffer.from(ticket.qrCodeBase64.split(",")[1], "base64"),
  );
  const decoded = req("jsqr")(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
  );
  expect(decoded?.data === ticket.ticketHash).toBe(true);
  const calendar = await page.request.get(
    `/api/v1/tickets/${ticket.id}/calendar`,
  );
  expect(calendar.status()).toBe(200);
  expect(await calendar.text()).toContain("BEGIN:VCALENDAR");
  expect(await calendar.text()).toContain("TRIGGER:-PT30M");
  const ticketCard = page
    .locator(".cinema-ticket")
    .filter({ hasText: order.orderCode });
  await ticketCard
    .getByRole("button", { name: "Xem email xác nhận", exact: true })
    .click();
  await expect(ticketCard.locator(".confirmation-panel")).toContainText(
    "NOVA Cinema — Vé",
  );
  await expect(
    ticketCard
      .frameLocator('iframe[title="Nội dung email NOVA Cinema"]')
      .locator("body"),
  ).toContainText(ticket.movie);
  await expect(ticketCard.locator(".confirmation-delivery")).toContainText(
    /SMTP|chờ gửi/,
  );
  await capture(
    ticketCard.locator(".confirmation-panel"),
    "owner-confirmation-email",
    [
      ticketCard
        .frameLocator('iframe[title="Nội dung email NOVA Cinema"]')
        .getByAltText("QR check-in"),
    ],
  );
  const other = await browser.newContext();
  const staff = await other.newPage();
  try {
    await login(staff, "staff");
    await staff.getByRole("button", { name: "Soát vé", exact: true }).click();
    await staff.getByLabel("Mã đọc từ QR").fill(ticket.ticketHash);
    const wrongScreening = fixture().programmeShowtimes[0];
    await staff.getByLabel("Ngày đang soát", { exact: true }).fill(
      new Date(wrongScreening.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    );
    await staff
      .getByRole("combobox", { name: "Suất chiếu đang soát", exact: true })
      .selectOption(wrongScreening.id);
    await staff
      .getByRole("button", { name: "Kiểm tra vé", exact: true })
      .click();
    await expect(staff.locator(".admission-result.warning")).toContainText(
      "không khớp",
    );
    expect(
      (await read(page, `/tickets/${ticket.id}`)).body.data.isCheckedIn,
    ).toBe(false);
    const screeningDay = new Date(
      fixture().showtime.startTime,
    ).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    await staff
      .getByLabel("Ngày đang soát", { exact: true })
      .fill(screeningDay);
    await staff
      .getByRole("combobox", { name: "Suất chiếu đang soát", exact: true })
      .selectOption(fixture().showtime.id);
    await staff
      .getByRole("button", { name: "Kiểm tra vé", exact: true })
      .click();
    await expect(staff.locator(".admission-result.valid")).toContainText(
      "Chưa xác nhận vào rạp",
    );
    expect(
      (await read(page, `/tickets/${ticket.id}`)).body.data.isCheckedIn,
    ).toBe(false);
    await capture(staff.locator(".modal-panel"), "staff-valid-preview", [
      staff.locator("#ticket-hash"),
    ]);
    await staff.getByRole("button", { name: "Xác nhận soát vé" }).click();
    await expect(
      staff.getByRole("heading", { name: "Soát vé thành công" }),
    ).toBeVisible();
    await staff
      .getByRole("button", { name: "Kiểm tra vé", exact: true })
      .click();
    await expect(staff.locator(".admission-result.invalid")).toContainText(
      "Vé đã sử dụng",
    );
    await expect(staff.locator(".admission-result.invalid")).toContainText(
      "Đã soát lúc",
    );
    await staff.getByLabel("Mã đọc từ QR").fill("0".repeat(64));
    await staff
      .getByRole("button", { name: "Kiểm tra vé", exact: true })
      .click();
    await expect(staff.locator(".admission-result.invalid")).toContainText(
      "Không tìm thấy",
    );
    expect(
      (
        await command(staff, "/staff/check-in", {
          ticketHash: ticket.ticketHash,
        })
      ).status,
    ).toBe(409);
  } finally {
    await other.close();
  }
});

test("staff date lookup includes started shows, camera fallback is clear and mobile has no overflow", async ({
  page,
}) => {
  const errors = [];
  const adminReads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/admin/reports/overview"))
      adminReads.push(request.url());
  });
  await login(page, "staff");
  await page.goto("/soat-ve");
  const data = fixture();
  await page.getByLabel("Ngày đang soát", { exact: true }).fill(
    new Date(data.admissionShowtime.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  await page
    .getByRole("combobox", { name: "Suất chiếu đang soát", exact: true })
    .selectOption(data.admissionShowtime.id);
  const defaultList = (await read(page, "/showtimes?limit=100")).body.data
    .items;
  expect(
    defaultList.some((show) => show.id === data.admissionShowtime.id),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Quét Camera QR", exact: true })
    .click();
  await page.evaluate(() => {
    delete window.BarcodeDetector;
  });
  await page.getByRole("button", { name: "Bật camera", exact: true }).click();
  await expect(page.locator(".scanner-error-message")).toContainText(
    "chưa hỗ trợ",
  );
  await page.getByRole("button", { name: "Nhập mã", exact: true }).click();
  await page.getByLabel("Mã đọc từ QR").fill("0".repeat(64));
  await page.getByRole("button", { name: "Kiểm tra vé", exact: true }).click();
  await expect(page.locator(".admission-result.invalid")).toContainText(
    "Không tìm thấy",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".admission-intro").scrollIntoViewIfNeeded();
  await capture(page, "staff-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(adminReads).toEqual([]);
  expect(errors).toEqual([]);
});

test("customer cannot forge payment or gain ADMIN access and health errors show UNKNOWN", async ({
  page,
}) => {
  await login(page);
  expect((await read(page, "/admin/reports/overview")).status).toBe(403);
  await page.goto("/?booking=forged&status=SUCCESS");
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(
    page.getByText("Thanh toán đã được xác nhận", { exact: true }),
  ).toHaveCount(0);
  await login(page, "admin");
  await page.getByRole("button", { name: "Quản trị", exact: true }).click();
  await page.route("**/api/v1/health", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Health unavailable" }),
    }),
  );
  await page.getByRole("button", { name: /Làm mới/ }).click();
  await page.getByRole("button", { name: "Hạ Tầng & Dọn Dẹp Outbox" }).click();
  await expect(page.getByText("Trạng thái: UNKNOWN")).toHaveCount(4);
});

test("mobile layout, modal keyboard, language and backend failure are usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "VI / EN" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.route("**/api/v1/showtimes/programme", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Backend unavailable" }),
    }),
  );
  await page.reload();
  await expect(
    page.locator(".catalog-connection-notice [role=alert]"),
  ).toContainText("Backend unavailable");
  // Failed backend reads cannot manufacture bookable catalogue records.
  await expect(page.locator(".discovery-film")).toHaveCount(0);
  await expect(page.locator(".timeline-show")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry connection" }),
  ).toBeVisible();
});

test("auth limiter remains enabled and browser proxy rejects foreign origins", async ({
  page,
}) => {
  await page.goto("/");
  for (let attempt = 0; attempt < 5; attempt++)
    expect(
      (
        await command(page, "/auth/login", {
          email: fixture().accounts.customer.email,
          password: "incorrect",
        })
      ).status,
    ).toBe(401);
  expect(
    (
      await command(page, "/auth/login", {
        email: fixture().accounts.customer.email,
        password: "incorrect",
      })
    ).status,
  ).toBe(429);
  const response = await page.request.post("/api/v1/auth/login", {
    headers: { origin: "https://foreign.example" },
    data: { email: fixture().accounts.customer.email, password: "incorrect" },
  });
  expect(response.status()).toBe(403);
});

test("ADMIN creates, edits and deletes a real movie using the operational form", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Quản trị", exact: true }).click();
  await page.getByRole("button", { name: "Rạp, Phim & Suất Chiếu" }).click();
  const title = "Movie " + randomUUID().slice(0, 8);
  const form = page.locator(".live-admin-form").first();
  await form.getByLabel("Tên phim", { exact: true }).fill(title);
  await form
    .getByLabel("Nội dung", { exact: true })
    .fill(fixture().prefix + " operational fixture");
  await form.getByLabel("Thời lượng (phút)").fill("100");
  await form.getByLabel("Ngày phát hành").fill("2026-10-01T10:00");
  await form.getByLabel("Nhãn tuổi").selectOption("T13");
  await form.getByLabel("Trạng thái").selectOption("COMING_SOON");
  await form.getByRole("button", { name: "Lưu phim", exact: true }).click();
  let row = page.locator(".live-admin tr").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  await form.getByLabel("Tên phim", { exact: true }).fill(title + " Edited");
  await form.getByRole("button", { name: "Lưu phim", exact: true }).click();
  row = page.locator(".live-admin tr").filter({ hasText: title + " Edited" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page
    .getByRole("button", { name: "Nhật ký quản trị", exact: true })
    .click();
  await expect(
    page.locator(".audit-entry").filter({ hasText: title }),
  ).toHaveCount(3);
  const update = page
    .locator(".audit-entry")
    .filter({ hasText: "Sửa phim" })
    .filter({ hasText: title });
  await update.locator("summary").click();
  await expect(update.locator("dl")).toContainText(`Sau: ${title} Edited`);
});

test("two tabs rotate one expired HttpOnly session without exposing tokens", async ({
  page,
  context,
}) => {
  await login(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator(".login-trigger")).toContainText("CUSTOMER");
  const original = await context.cookies();
  const access = original.find((c) => c.name === "nova_access");
  const refresh = original.find((c) => c.name === "nova_refresh");
  expect(access).toBeTruthy();
  expect(refresh).toBeTruthy();
  const rotations = [];
  const record = async (response) => {
    if (
      response.url().endsWith("/auth/refresh") &&
      response.request().method() === "POST"
    ) {
      rotations.push(response.status());
      const body = await response.json();
      expect(body.data?.accessToken).toBeUndefined();
      expect(body.data?.refreshToken).toBeUndefined();
    }
  };
  page.on("response", record);
  other.on("response", record);
  await context.addCookies([{ ...access, value: "expired-access-test" }]);
  await Promise.all([page.reload(), other.reload()]);
  await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
  await expect(other.locator(".login-trigger")).toContainText("CUSTOMER");
  expect(rotations).toEqual([200]);
  expect(
    (await context.cookies()).find((c) => c.name === "nova_refresh").value !==
      refresh.value,
  ).toBe(true);
  await other.close();
});
