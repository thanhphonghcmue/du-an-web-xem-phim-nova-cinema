import { test, expect, chromium } from "@playwright/test";
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
async function capture(page, name) {
  if (!process.env.NOVA_CREATIVE_CAPTURE_DIR) return;
  mkdirSync(process.env.NOVA_CREATIVE_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(process.env.NOVA_CREATIVE_CAPTURE_DIR, name + ".jpg"),
    type: "jpeg",
    quality: 86,
    fullPage: true,
  });
}

test("a labelled preview works without API calls and cannot create holds, PAID orders or tickets", async ({
  page,
}) => {
  const calls = [],
    errors = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/xem-truoc");
  await expect(
    page.getByText("BẢN XEM TRƯỚC · CHỈ ĐỌC", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thanh toán cần backend", exact: true }),
  ).toBeDisabled();
  const seat = page.getByRole("button", {
    name: "Ghế minh họa A1",
    exact: true,
  });
  await seat.click();
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".preview-selection")).toContainText("A1");
  await expect(
    page.getByRole("button", { name: "Ghế minh họa B5", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".ticket-qr-svg")).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width !== 320) await capture(page, `preview-${width}`);
  }
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("reduced motion uses the static Cinemascope screen with usable preview controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/xem-truoc");
  const screen = page.locator(".cinematic-screen");
  await expect(screen).toHaveAttribute("data-screen-state", "reduced-motion");
  await expect(screen.locator("canvas")).toHaveCount(0);
  await page.locator(".nova-logo").hover();
  await expect(page.locator(".nova-logo__star")).toHaveCSS("transform", "none");
  await page
    .getByRole("button", { name: "Ghế minh họa A2", exact: true })
    .click();
  await expect(page.locator(".preview-selection")).toContainText("A2");
});

test("real WebGL caps DPR, pauses offscreen and releases its context across three motion toggles", async () => {
  test.setTimeout(90000);
  const browser = await chromium.launch({
    executablePath: test.info().project.use.launchOptions?.executablePath,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
      baseURL: test.info().project.use.baseURL,
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 3,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/xem-truoc");
    const screen = page.locator(".cinematic-screen");
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(screen).toHaveAttribute("data-screen-state", "webgl", {
        timeout: 20000,
      });
      const stage = screen.locator(".cinematic-screen__stage");
      await expect(stage).toHaveAttribute("data-dpr", "2");
      const context = await screen
        .locator("canvas")
        .evaluateHandle((canvas) => canvas.getContext("webgl2"));
      if (cycle === 0) {
        await page.addStyleTag({ content: "body { min-height: 5000px; }" });
        await page.evaluate(() => scrollTo(0, 4500));
        await expect(stage).toHaveAttribute("data-rendering", "paused");
        await stage.scrollIntoViewIfNeeded();
        await expect(stage).toHaveAttribute("data-rendering", "active");
        if (process.env.NOVA_CREATIVE_CAPTURE_DIR) {
          mkdirSync(process.env.NOVA_CREATIVE_CAPTURE_DIR, { recursive: true });
          await screen.screenshot({
            path: resolve(
              process.env.NOVA_CREATIVE_CAPTURE_DIR,
              "webgl-screen.jpg",
            ),
            type: "jpeg",
            quality: 90,
          });
        }
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(screen).toHaveAttribute(
        "data-screen-state",
        "reduced-motion",
      );
      await expect(screen.locator("canvas")).toHaveCount(0);
      await expect
        .poll(() => context.evaluate((gl) => gl.isContextLost()))
        .toBe(true);
      await context.dispose();
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(screen).toHaveAttribute("data-screen-state", "webgl");
    const unmountedContext = await screen
      .locator("canvas")
      .evaluateHandle((canvas) => canvas.getContext("webgl2"));
    await page.locator(".preview-header a").last().click();
    await expect(page).toHaveURL(/\/dat-ve$/);
    await expect(page.locator(".booking-preview")).toHaveCount(0);
    await expect
      .poll(() => unmountedContext.evaluate((gl) => gl.isContextLost()))
      .toBe(true);
    await unmountedContext.dispose();
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test("the supernova logo has unique SVG definitions across header/footer and no infinity icon", async ({
  page,
}) => {
  await page.goto("/");
  const marks = page.locator('.nova-logo [data-nova-mark="supernova"]');
  await expect(marks.first()).toBeVisible();
  expect(await marks.count()).toBeGreaterThan(1);
  const ids = await page
    .locator(".nova-logo defs [id]")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(ids.length).toBeGreaterThan(4);
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator(".lucide-infinity")).toHaveCount(0);
  await page.locator(".site-header .brand").hover();
  await expect(page.locator(".site-header .nova-logo__star")).not.toHaveCSS(
    "transform",
    "none",
  );
});

test("duplicate catalogue/seat records keep UUID payloads and an expired real hold cannot be paid", async ({
  page,
}) => {
  const data = fixture(),
    errors = [];
  page.on("console", (message) => {
    if (/same key|unique.*key/i.test(message.text()))
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const pattern of [
    "**/api/v1/showtimes/programme",
    "**/api/v1/showtimes/*/seats",
  ])
    await page.route(pattern, async (route) => {
      const response = await route.fetch(),
        body = await response.json();
      if (response.ok() && body.data)
        for (const key of [
          "movies",
          "cinemas",
          "rooms",
          "showtimes",
          "combos",
          "seats",
        ])
          if (body.data[key]?.length) body.data[key].push(body.data[key][0]);
      await route.fulfill({ response, json: body });
    });
  const login = await page.request.post("/api/v1/auth/login", {
    data: { email: data.accounts.customer.email, password: data.password },
  });
  expect(login.status()).toBe(200);
  await page.goto("/dat-ve");
  const show = data.programmeShowtimes[1];
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
  ).toHaveCount(1);
  await expect(
    page.locator(".booking-console .cinematic-screen"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const held = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/bookings/hold" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const response = await held;
  expect(response.status()).toBe(201);
  const payload = response.request().postDataJSON();
  expect(Object.keys(payload).sort()).toEqual([
    "comboItems",
    "seatIds",
    "showtimeId",
  ]);
  expect(payload.showtimeId).toBe(show.id);
  const order = (await response.json()).data;
  expect(new Date(order.expiredAt) - new Date(order.createdAt)).toBe(300000);
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  const { PrismaClient } = req("@prisma/client");
  const { testDatabaseTarget } = req("./scripts/test-database-target.cjs");
  const prisma = new PrismaClient({
    datasources: { db: { url: testDatabaseTarget() } },
  });
  try {
    const result = await prisma.booking.updateMany({
      where: {
        id: order.id,
        userId: data.accounts.customer.id,
        status: "HOLDING",
      },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
    expect(result.count).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
  expect(
    (await (await page.request.get(`/api/v1/bookings/${order.id}`)).json()).data
      .status,
  ).toBe("EXPIRED");
  await expect(
    page.getByText("Trạng thái đơn trước: EXPIRED", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("button", { name: "Thanh toán Sandbox", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
  const map = (
    await (await page.request.get(`/api/v1/showtimes/${show.id}/seats`)).json()
  ).data;
  expect(map.capacity.holding).toBe(0);
  expect(errors).toEqual([]);
});

test("a network error displays a dismissible toast and can open the isolated preview", async ({
  page,
}) => {
  await page.route("**/api/v1/showtimes/programme", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".nova-api-toast")).toContainText(
    "Kết nối bị gián đoạn",
  );
  await page
    .getByRole("button", { name: "Đóng thông báo kết nối", exact: true })
    .click();
  await expect(page.locator(".nova-api-toast")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Xem trước giao diện (chỉ đọc)", exact: true })
    .click();
  await expect(page).toHaveURL(/\/xem-truoc$/);
  await expect(
    page.getByRole("button", { name: "Thanh toán cần backend", exact: true }),
  ).toBeDisabled();
});
