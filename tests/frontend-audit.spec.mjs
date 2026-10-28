import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
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
  await page.emulateMedia({ reducedMotion: "reduce" });
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
async function capture(locator, name) {
  if (!process.env.NOVA_QA_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_QA_CAPTURE_DIR, { recursive: true });
  await locator.screenshot({
    path: process.env.NOVA_QA_CAPTURE_DIR + "/" + name + ".jpg",
    type: "jpeg",
    quality: 80,
    animations: "disabled",
  });
}
async function login(page) {
  const f = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts.customer.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
}
async function openSeats(page, show) {
  const f = fixture();
  await login(page);
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
  await expect(
    dialog.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
  return dialog;
}

test("cinema regions filter actual venues, retain full addresses, and fit a 320px screen", async ({
  page,
}) => {
  const f = fixture();
  await page.goto("/dat-ve");
  await page
    .getByRole("combobox", { name: "Chọn cụm rạp", exact: true })
    .click();
  const dialog = page.getByRole("dialog").last(),
    nav = dialog.getByRole("navigation", { name: "Khu vực rạp" });
  await expect(nav).toBeVisible();
  const list = await page.request.get("/api/v1/cinemas?limit=100");
  const cinemas = (await list.json()).data.items;
  const groups = [...new Set(cinemas.map((c) => c.city))];
  for (const city of groups) {
    await nav.getByRole("button", { name: city, exact: false }).click();
    await expect(dialog.getByRole("option")).toHaveCount(
      cinemas.filter((c) => c.city === city).length,
    );
    for (const cinema of cinemas.filter((c) => c.city === city))
      await expect(
        dialog.locator(`[role="option"][data-value="${cinema.id}"]`),
      ).toContainText(cinema.address);
  }
  await nav
    .getByRole("button", { name: "Tất cả khu vực", exact: false })
    .click();
  await capture(dialog, "cinema-regions-desktop");
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() => dialog.evaluate((n) => n.scrollWidth <= n.clientWidth + 1))
    .toBe(true);
  await capture(dialog, "cinema-regions-mobile");
  await dialog.locator(`[role="option"][data-value="${f.cinema.id}"]`).click();
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toHaveAttribute("data-value", f.cinema.id);
});

test("capacity batches match real seat maps after hold, read-only lazy expiry, reclaim and cancel", async ({
  page,
}) => {
  const f = fixture();
  expect(f.prefix).toMatch(/^web-e2e-/);
  await login(page);
  const id = f.programmeShowtimes[3].id;
  const map = async () =>
    (await (await page.request.get(`/api/v1/showtimes/${id}/seats`)).json())
      .data;
  const counts = async () => {
    const response = await page.request.get(
      "/api/v1/showtimes/capacities?ids=" + id,
    );
    expect(response.status()).toBe(200);
    const data = (await response.json()).data;
    expect(data).toHaveLength(1);
    return data[0];
  };
  const initial = await map();
  expect(await counts()).toMatchObject(initial.capacity);
  const seat = initial.seats.find((s) => s.row === "A" && s.column === 1);
  const hold = async () => {
    const r = await page.request.post("/api/v1/bookings/hold", {
      data: { showtimeId: id, seatIds: [seat.seatId] },
    });
    expect(r.status()).toBe(201);
    return (await r.json()).data;
  };
  const order = await hold();
  const { PrismaClient } = req("@prisma/client");
  const { testDatabaseTarget } = req("./scripts/test-database-target.cjs");
  const db = new PrismaClient({
    datasources: { db: { url: testDatabaseTarget() } },
  });
  let reclaimed;
  try {
    expect(await counts()).toMatchObject({
      total: initial.capacity.total,
      available: initial.capacity.available - 1,
      holding: initial.capacity.holding + 1,
    });
    expect(await counts()).toMatchObject((await map()).capacity);
    await db.booking.update({
      where: { id: order.id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
    expect(await counts()).toMatchObject(initial.capacity);
    expect(await counts()).toMatchObject((await map()).capacity);
    expect(
      (
        await db.booking.findUnique({
          where: { id: order.id },
          select: { status: true },
        })
      ).status,
    ).toBe("HOLDING");
    reclaimed = await hold();
    expect(await counts()).toMatchObject({
      available: initial.capacity.available - 1,
    });
    expect(
      (
        await page.request.post(`/api/v1/bookings/${reclaimed.id}/cancel`)
      ).status(),
    ).toBe(200);
    reclaimed = null;
    expect(await counts()).toMatchObject(initial.capacity);
  } finally {
    if (reclaimed)
      await page.request.post(`/api/v1/bookings/${reclaimed.id}/cancel`);
    await page.request.post(`/api/v1/bookings/${order.id}/cancel`);
    await db.$disconnect();
  }
});

test("capacity endpoint rejects malformed/duplicate/oversized batches and omits nonexistent shows", async ({
  page,
}) => {
  const id = fixture().showtime.id;
  for (const ids of [
    "",
    "not-a-uuid",
    id + "," + id,
    Array.from({ length: 51 }, () => randomUUID()).join(","),
  ])
    expect(
      (
        await page.request.get("/api/v1/showtimes/capacities?ids=" + ids)
      ).status(),
    ).toBe(400);
  const response = await page.request.get(
    "/api/v1/showtimes/capacities?ids=" + randomUUID(),
  );
  expect(response.status()).toBe(200);
  expect((await response.json()).data).toEqual([]);
});

test("public catalogue negotiates gzip without changing JSON or caching live seat counts", async ({
  page,
}) => {
  const id = fixture().showtime.id;
  for (const path of [
    "/movies?limit=100",
    "/cinemas?limit=100",
    `/showtimes/${id}/seats`,
  ]) {
    const encoded = await page.request.get("/api/v1" + path, {
      headers: { "Accept-Encoding": "gzip" },
    });
    const plain = await page.request.get("/api/v1" + path, {
      headers: { "Accept-Encoding": "identity" },
    });
    expect(encoded.status()).toBe(200);
    expect(encoded.headers()["content-encoding"]).toBe("gzip");
    expect(plain.headers()["content-encoding"]).toBeUndefined();
    const a = (await encoded.json()).data,
      b = (await plain.json()).data;
    if (path.endsWith("/seats")) {
      expect(a.capacity).toEqual(b.capacity);
      expect(a.seats).toEqual(b.seats);
    } else expect(a).toEqual(b);
    expect(encoded.headers()["cache-control"]).toBe("no-store");
  }
});

test("timeline uses one bounded capacity batch, renders backend counts, and never preloads full seat maps", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/showtimes/"))
      requests.push(new URL(r.url()).pathname);
  });
  await page.goto("/");
  await chooseOption(page, "Rạp trong lịch chiếu", fixture().cinema.id);
  await expect(
    page.locator(".timeline-show .show-capacity-label").first(),
  ).toContainText(/\d+\/\d+ ghế trống/);
  expect(requests.filter((p) => p.endsWith("/seats"))).toHaveLength(0);
  expect(
    requests.filter((p) => p.endsWith("/capacities")).length,
  ).toBeLessThanOrEqual(3);
  // The future fixture starts in 30 minutes, which can be tomorrow in Vietnam.
  // A correct timeline must not invent a "today" screening near midnight.
  const vietnamDay = (value) =>
    new Date(value).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  const expected =
    vietnamDay(fixture().showtime.startTime) === vietnamDay(Date.now())
      ? "Hôm nay"
      : "Ngày mai";
  await expect(
    page
      .locator(".timeline-dates .date-relative")
      .filter({ hasText: expected }),
  ).toBeVisible();
});

test("mobile seats stay at least 32px at 70% zoom and sticky summary updates combo totals then server deadline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Each paid browser journey keeps its history. Use a fresh real screening,
  // rather than assuming an earlier suite has left fixture seat A1 unsold.
  const f = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts.admin.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  const created = await page.request.post("/api/v1/showtimes", {
    data: {
      movieId: f.movie.id,
      roomId: f.programmeRoom.id,
      startTime: new Date(Date.now() + 45 * 86400000).toISOString(),
      baseTicketPrice: "90000.00",
    },
  });
  expect(created.status()).toBe(201);
  const show = (await created.json()).data;
  const dialog = await openSeats(page, show);
  const dock = dialog.getByTestId("booking-dock");
  await expect(dock).toBeInViewport({ ratio: 1 });
  for (let n = 0; n < 3; n++)
    await dialog
      .getByRole("button", { name: "Thu nhỏ sơ đồ ghế", exact: true })
      .click();
  const seat = dialog.getByRole("button", {
    name: "Ghế A1, còn trống",
    exact: true,
  });
  const bounds = await seat.boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(31.99);
  expect(bounds.height).toBeGreaterThanOrEqual(31.99);
  await seat.click();
  await expect(dock).toContainText("1 ghế");
  const before = await dock.locator(".booking-dock-total strong").innerText();
  const party = fixture().menuCombos.find((c) => c.name.includes("Party"));
  await dialog
    .getByRole("button", { name: "Tăng " + party.name, exact: true })
    .click();
  await expect(dock.locator(".booking-dock-total strong")).not.toHaveText(
    before,
  );
  await dialog.evaluate((n) => (n.scrollTop = 0));
  await expect(dock).toBeInViewport({ ratio: 1 });
  await capture(dialog, "booking-dock-mobile");
  await dock
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  try {
    await expect(dock.getByTestId("hold-timer")).toBeVisible();
    await expect(dock).toContainText("Tổng thanh toán");
    await expect(
      dock.getByRole("button", { name: "Thanh toán Sandbox", exact: true }),
    ).toBeEnabled();
    await page.setViewportSize({ width: 320, height: 740 });
    await expect
      .poll(() => dialog.evaluate((n) => n.scrollWidth <= n.clientWidth + 1))
      .toBe(true);
    const button = await dock
        .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
        .boundingBox(),
      card = await dock.boundingBox();
    expect(button.x).toBeGreaterThanOrEqual(card.x - 1);
    expect(button.x + button.width).toBeLessThanOrEqual(
      card.x + card.width + 1,
    );
    const totalBox = await dock.locator(".booking-dock-total").boundingBox();
    const timerBox = await dock.locator(".hold-timer").boundingBox();
    expect(totalBox.x + totalBox.width).toBeLessThanOrEqual(timerBox.x - 1);
    expect(
      await dock
        .locator(".booking-dock-total strong")
        .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    ).toBe(true);
    await capture(dialog, "payment-mobile");
  } finally {
    await dialog
      .getByRole("button", { name: "Hủy đơn & trả ghế", exact: true })
      .click();
  }
});
