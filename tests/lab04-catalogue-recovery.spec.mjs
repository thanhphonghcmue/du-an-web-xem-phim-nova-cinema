import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { useLegacyProgramme } from "./programme-routes.mjs";
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

test("LAB04 an Admin mutation queues a fresh catalogue after an older initial snapshot completes", async ({
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
  await useLegacyProgramme(page);
  let release,
    captured = false,
    cinemaId;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(
    /\/api\/v1\/showtimes\/programme(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch(),
        body = await response.text();
      if (!captured) {
        captured = true;
        await gate;
      }
      await route.fulfill({ response, body });
    },
  );
  try {
    await page.goto("/quan-tri");
    await expect.poll(() => captured).toBe(true);
    await page
      .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
      .click();
    const nav = page.getByRole("navigation", { name: "Danh mục vận hành" });
    await nav.getByRole("button", { name: "Cụm rạp", exact: true }).click();
    const form = page.locator(".live-admin-form");
    await form
      .getByLabel("Tên rạp", { exact: true })
      .fill(f.prefix + "-catalogue-flight");
    await form.getByLabel("Thành phố", { exact: true }).fill("TP. Hồ Chí Minh");
    await form
      .getByLabel("Địa chỉ", { exact: true })
      .fill("Owned catalogue refresh fixture");
    const creating = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === "/api/v1/cinemas",
    );
    await form
      .getByRole("button", { name: "Lưu cụm rạp", exact: true })
      .click();
    const response = await creating;
    expect(response.status()).toBe(201);
    cinemaId = (await response.json()).data.id;
    release();
    await nav.getByRole("button", { name: "Phòng chiếu", exact: true }).click();
    const choices = page
      .locator(".live-admin-form")
      .getByLabel("Thuộc cụm rạp", { exact: true });
    await choices.selectOption(cinemaId);
    await expect(choices).toHaveValue(cinemaId);
    await expect(page.locator(".catalog-connection-notice")).toHaveCount(0);
  } finally {
    release();
    if (cinemaId) await page.request.delete(`/api/v1/cinemas/${cinemaId}`);
  }
});

test("LAB04 chunk quota recovery reads the real complete legacy catalogue once", async ({
  page,
}) => {
  let chunks = 0,
    legacy = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/showtimes/programme")
      legacy++;
  });
  await page.route("**/api/v1/showtimes/programme/chunks/**", (route) => {
    chunks++;
    return route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Owned chunk throttle fixture.",
      }),
    });
  });
  await page.goto("/phim");
  await expect(page.locator(".discovery-film").first()).toBeVisible();
  const real = await page.request.get("/api/v1/showtimes/programme?days=60");
  expect(real.status()).toBe(200);
  const source = (await real.json()).data.movies
    .filter((movie) => movie.status !== "ENDED")
    .map((movie) => movie.id)
    .sort();
  const visible = await page
    .locator(".discovery-film")
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.movieId).sort());
  expect(visible).toEqual(source);
  expect(legacy).toBe(1);
  expect(chunks).toBeGreaterThan(0);
  expect(chunks).toBeLessThanOrEqual(4);
  await expect(page.locator(".catalog-connection-notice")).toHaveCount(0);
});
