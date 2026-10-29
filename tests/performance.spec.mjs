import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
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
async function openSeats(page) {
  const f = fixture(),
    show = f.programmeShowtimes[1];
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
test("missing booking inputs receive an immediate visible explanation without posting an order", async ({
  page,
}) => {
  const commands = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/bookings/hold"))
      commands.push(r.url());
  });
  await page.goto("/dat-ve");
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toBeEnabled();
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Hãy chọn đủ rạp" }),
  ).toBeVisible();
  expect(commands).toEqual([]);
});
test("cinema, film and time choices use local data, cache programme and never fetch every seat map", async ({
  page,
}) => {
  const seatCalls = [],
    programmeCalls = [],
    chunkCalls = [],
    legacyProgrammeCalls = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (/\/showtimes\/[^/]+\/seats$/.test(p)) seatCalls.push(p);
    if (p === "/api/v1/showtimes/programme/manifest") programmeCalls.push(p);
    if (p.startsWith("/api/v1/showtimes/programme/chunks/")) chunkCalls.push(p);
    if (p === "/api/v1/showtimes/programme") legacyProgrammeCalls.push(p);
  });
  await page.goto("/dat-ve");
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    window.__choiceMetrics = [];
    document.addEventListener(
      "click",
      (e) => {
        const option = e.target.closest("[role=option]"),
          dialog = option?.closest("[role=dialog]");
        if (!dialog) return;
        const started = performance.now(),
          observer = new MutationObserver(() => {
            if (!dialog.isConnected) {
              window.__choiceMetrics.push(performance.now() - started);
              observer.disconnect();
            }
          });
        observer.observe(document.body, { childList: true, subtree: true });
      },
      true,
    );
  });
  const f = fixture();
  for (const id of [
    f.extended.cinemas[0].id,
    f.cinema.id,
    f.extended.cinemas[1].id,
    f.cinema.id,
  ])
    await chooseOption(page, "Chọn cụm rạp", id);
  await chooseOption(page, "Chọn phim", f.movie.id);
  const show = f.programmeShowtimes[0];
  await chooseDate(
    page,
    "Chọn ngày chiếu",
    new Date(show.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  await chooseOption(page, "Chọn suất chiếu", show.id);
  expect(seatCalls).toEqual([]);
  const measured = await page.evaluate(() => window.__choiceMetrics);
  expect(measured.length).toBeGreaterThanOrEqual(5);
  const sorted = [...measured].sort((a, b) => a - b);
  console.log(
    `local choice click-to-DOM p50=${sorted[Math.floor(sorted.length / 2)].toFixed(2)}ms p95=${sorted.at(-1).toFixed(2)}ms (not network time or INP)`,
  );
  await page
    .locator(".desktop-nav")
    .getByRole("link", { name: "Bắp nước", exact: true })
    .click();
  await expect(page.locator(".food-product")).not.toHaveCount(0);
  await page
    .locator(".desktop-nav")
    .getByRole("link", { name: "Lịch chiếu", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toBeEnabled();
  expect(programmeCalls.length).toBeGreaterThan(0);
  expect(programmeCalls.length).toBeLessThanOrEqual(2);
  expect(chunkCalls.length).toBeGreaterThan(0);
  expect(legacyProgrammeCalls).toEqual([]);
  expect(seatCalls).toEqual([]);
});
test("a dead hold request releases submitting state at eight seconds and can be retried safely", async ({
  page,
}) => {
  const dialog = await openSeats(page);
  await dialog
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const endpoint = "**/api/v1/bookings/hold";
  await page.route(endpoint, () => {});
  const started = Date.now();
  const hold = dialog.getByRole("button", {
    name: "Giữ ghế 5 phút",
    exact: true,
  });
  await hold.click();
  await expect(
    dialog.getByRole("button", { name: "Đang xử lý…", exact: true }),
  ).toBeDisabled();
  await expect(dialog.locator(".auth-notice")).toContainText("8 giây", {
    timeout: 10000,
  });
  await expect(hold).toBeEnabled();
  expect(Date.now() - started).toBeLessThan(10500);
  await page.unroute(endpoint);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/bookings/hold" &&
      r.request().method() === "POST",
  );
  await hold.click();
  expect((await response).status()).toBe(201);
  await dialog.getByRole("button", { name: "Hủy đơn & trả ghế" }).click();
});
test("countdown ticks do not mutate the seat grid and do not issue one request each second", async ({
  page,
}) => {
  const dialog = await openSeats(page);
  await dialog
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  await expect(page.getByTestId("hold-timer")).toBeVisible();
  await expect(dialog.locator(".cinematic-screen")).toHaveAttribute(
    "data-screen-state",
    "reduced-motion",
  );
  await page.evaluate(() => {
    window.__seatMutations = 0;
    const target = document.querySelector(".booking-console .seat-area");
    window.__seatObserver = new MutationObserver((list) => {
      window.__seatMutations += list.length;
    });
    window.__seatObserver.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  const timer = await page.getByTestId("hold-timer").innerText();
  await expect(page.getByTestId("hold-timer")).not.toHaveText(timer, {
    timeout: 2500,
  });
  const nextTick = await page.getByTestId("hold-timer").innerText();
  await expect(page.getByTestId("hold-timer")).not.toHaveText(nextTick, {
    timeout: 2500,
  });
  const mutations = await page.evaluate(() => {
    window.__seatObserver.disconnect();
    return window.__seatMutations;
  });
  expect(mutations).toBe(0);
  await dialog.getByRole("button", { name: "Hủy đơn & trả ghế" }).click();
});
