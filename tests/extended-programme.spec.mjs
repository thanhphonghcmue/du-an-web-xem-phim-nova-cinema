import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { chooseOption, chooseDate } from "./ui-choices.mjs";
import calendar from "../content/programme-calendar.cjs";
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
async function programme(page) {
  const response = await page.request.get("/api/v1/showtimes/programme");
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function capture(locator, name) {
  if (!process.env.NOVA_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_CAPTURE_DIR, { recursive: true });
  await locator.screenshot({
    path: `${process.env.NOVA_CAPTURE_DIR}/${name}.jpg`,
    type: "jpeg",
    quality: 80,
    animations: "disabled",
  });
}
test("all 24 movies have four distinct daily times and two real rooms at both cinemas through next month", async ({
  page,
}) => {
  const { extended } = fixture();
  await page.goto("/");
  const runtime = await page.request.get("/api/v1/runtime");
  expect((await runtime.json()).data.mode).toBe("backend");
  const data = await programme(page);
  const groups = new Map();
  for (const show of data.showtimes) {
    const room = data.rooms.find((room) => room.id === show.roomId);
    expect(room).toBeTruthy();
    const key = `${room.cinemaId}:${show.movieId}:${calendar.dayKey(show.startTime)}`;
    groups.set(key, [...(groups.get(key) || []), show]);
  }
  for (const cinema of extended.cinemas)
    for (const movie of extended.movies)
      for (let day = 1; day <= extended.window.daysAhead; day++) {
        const shows =
          groups.get(
            `${cinema.id}:${movie.id}:${calendar.dayKey(extended.window.today + day * calendar.DAY)}`,
          ) || [];
        expect(shows).toHaveLength(4);
        expect(new Set(shows.map((show) => show.startTime)).size).toBe(4);
        expect(new Set(shows.map((show) => show.roomId)).size).toBe(2);
        for (const show of shows)
          expect(new Date(show.endTime) - new Date(show.startTime)).toBe(
            (movie.durationMinutes + 15) * 60000,
          );
      }
  await expect(page.locator("#movies .discovery-film")).toHaveCount(
    data.movies.length,
  );
  expect(data.movies.length).toBeGreaterThanOrEqual(24);
});

for (const cinemaIndex of [0, 1])
  test(`quick-booking offers all 24 selectable films at cinema ${cinemaIndex + 1} without a six-film cap`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const { extended } = fixture();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const failures = [];
    const snapshots = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/showtimes/programme")
        snapshots.push(request.url());
    });
    page.on("response", (response) => {
      if (
        response.url().includes("/api/v1/showtimes") &&
        response.status() >= 429
      )
        failures.push(response.status());
    });
    await page.goto("/dat-ve");
    const cinema = extended.cinemas[cinemaIndex];
    await chooseOption(page, "Chọn cụm rạp", cinema.id);
    for (const movie of extended.movies) {
      await page
        .getByRole("combobox", { name: "Chọn phim", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("option")).toHaveCount(24);
      await expect(dialog.locator(".choice-footnote")).toContainText(
        "24 lựa chọn",
      );
      await dialog.locator(`[role=option][data-value="${movie.id}"]`).click();
      await expect(
        page.getByRole("combobox", { name: "Chọn phim", exact: true }),
      ).toHaveAttribute("data-value", movie.id);
      await expect(
        page.getByRole("button", { name: "Chọn ngày chiếu", exact: true }),
      ).toHaveAttribute("data-max", calendar.dayKey(extended.window.end));
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(snapshots).toHaveLength(1);
  });

test("Vietnam calendar enables every actual screening day through the following month on desktop and mobile", async ({
  page,
}) => {
  const { extended } = fixture();
  await page.goto(
    `/dat-ve?cinema=${extended.cinemas[0].id}&movie=${extended.movies[23].id}`,
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("button", { name: "Chọn ngày chiếu", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const firstMonth = calendar.dayKey(extended.window.today).slice(0, 7);
    let shownMonth = firstMonth;
    for (let month = 0; month < 2; month++) {
      for (let day = 0; day <= extended.window.daysAhead; day++) {
        const key = calendar.dayKey(extended.window.today + day * calendar.DAY);
        if (!key.startsWith(shownMonth)) continue;
        await expect(
          dialog.locator(`[data-calendar-date="${key}"]`),
        ).toBeEnabled();
        await expect(
          dialog.locator(`[data-calendar-date="${key}"]`),
        ).toHaveClass(/rdp-day_button/);
        await expect(
          dialog.locator(`[data-calendar-date="${key}"]`).locator(".."),
        ).toHaveClass(/calendar-available/);
      }
      if (month === 0) {
        const next = new Date(
          calendar.midnight(`${firstMonth}-01T12:00:00+07:00`) +
            32 * calendar.DAY,
        );
        shownMonth = calendar.dayKey(next).slice(0, 7);
        const caption = await dialog.locator(".rdp-caption_label").innerText();
        await dialog
          .getByRole("button", { name: "Tháng sau", exact: true })
          .click();
        await expect(dialog.locator(".rdp-caption_label")).not.toHaveText(
          caption,
        );
      }
    }
    await capture(dialog, `full-calendar-${width}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
  }
});

test("movie 20 can be booked 15 days ahead: D10/D12 warns about D11, then valid seats pay and issue one QR", async ({
  page,
}) => {
  const data = fixture(),
    { extended } = data;
  const movie = extended.movies[19],
    cinema = extended.cinemas[1];
  await page.goto(`/dat-ve?cinema=${cinema.id}&movie=${movie.id}`);
  const login = await page.request.post("/api/v1/auth/login", {
    data: { email: data.accounts.customer.email, password: data.password },
  });
  expect(login.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
  const day = calendar.dayKey(extended.window.today + 15 * calendar.DAY);
  const catalogue = await programme(page);
  const target = catalogue.showtimes.find(
    (show) =>
      show.movieId === movie.id &&
      calendar.dayKey(show.startTime) === day &&
      catalogue.rooms.some(
        (room) => room.id === show.roomId && room.cinemaId === cinema.id,
      ),
  );
  expect(target).toBeTruthy();
  await chooseDate(page, "Chọn ngày chiếu", day);
  await chooseOption(page, "Chọn suất chiếu", target.id);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  for (const label of ["D10", "D12"])
    await page
      .getByRole("button", { name: `Ghế ${label}, còn trống`, exact: true })
      .click();
  await expect(page.locator(".orphan-warning-banner")).toContainText("D11");
  await expect(page.locator(".seat.orphan-seat")).toHaveAttribute(
    "aria-label",
    "Ghế D11, còn trống",
  );
  await expect(
    page.getByRole("button", { name: "Giữ ghế 5 phút", exact: true }),
  ).toBeDisabled();
  const map = (
    await (
      await page.request.get(`/api/v1/showtimes/${target.id}/seats`)
    ).json()
  ).data;
  const invalid = await page.request.post("/api/v1/bookings/hold", {
    data: {
      showtimeId: target.id,
      seatIds: map.seats
        .filter((seat) => seat.row === "D" && [10, 12].includes(seat.column))
        .map((seat) => seat.seatId),
    },
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toBe("ORPHAN_SEAT_DETECTED");
  for (const label of ["D10", "D12"])
    await page
      .getByRole("button", { name: `Ghế ${label}, đang chọn`, exact: true })
      .click();
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const held = page.waitForResponse(
    (response) =>
      response.url().endsWith("/bookings/hold") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const response = await held;
  expect(response.status()).toBe(201);
  const order = (await response.json()).data;
  expect(order.showtimeId).toBe(target.id);
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
  await page
    .getByRole("link", { name: "Quay lại ứng dụng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem vé trong tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/tai-khoan\\?ve=" + order.id + "#ve-cua-toi$"),
  );
  await expect(
    page.getByRole("img", { name: `QR vé ${order.orderCode}`, exact: true }),
  ).toBeVisible();
  const tickets = (
    await (await page.request.get("/api/v1/tickets/me?limit=100")).json()
  ).data.items.filter((ticket) => ticket.bookingId === order.id);
  expect(tickets).toHaveLength(1);
  expect(tickets[0].startTime).toBe(target.startTime);
  expect(tickets[0].movie).toBe(movie.title);
});

test("password eye buttons independently toggle login, signup and confirmation without submitting", async ({
  page,
}) => {
  await page.goto("/dang-nhap");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await password.fill("check-eye-only-2026");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("check-eye-only-2026");
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("tab", { name: "Đăng ký thành viên", exact: true })
    .click();
  const confirm = page.getByLabel("Xác nhận mật khẩu", { exact: true });
  await confirm.fill("check-eye-only-2026");
  await page
    .getByRole("button", { name: "Hiện mật khẩu xác nhận", exact: true })
    .click();
  await expect(confirm).toHaveAttribute("type", "text");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ẩn mật khẩu xác nhận", exact: true })
    .click();
  await expect(confirm).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("type", "text");
});
