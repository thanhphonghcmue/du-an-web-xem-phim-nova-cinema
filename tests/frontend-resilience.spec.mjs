import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
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

for (const mode of ["methods", "getters"]) {
  test(`blocked browser storage (${mode}) preserves navigation, preferences and cookie authentication`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /SecurityError|QuotaExceededError|hydration|same key/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
    await page.addInitScript((storageMode) => {
      const blocked = () => {
        throw new DOMException("Browser storage disabled", "SecurityError");
      };
      if (storageMode === "methods") {
        for (const method of ["getItem", "setItem", "removeItem"])
          Object.defineProperty(Storage.prototype, method, {
            configurable: true,
            value: blocked,
          });
      } else {
        for (const name of ["localStorage", "sessionStorage"])
          Object.defineProperty(window, name, {
            configurable: true,
            get: blocked,
          });
      }
    }, mode);

    const f = fixture();
    expect(
      (
        await page.request.post("/api/v1/auth/login", {
          data: { email: f.accounts.customer.email, password: f.password },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/");
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
    await expect(page.locator(".discovery-film").first()).toBeVisible();

    await page.getByRole("button", { name: "VI / EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "VI / EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");

    await page
      .getByRole("button", { name: "Ưu đãi mở màn", exact: true })
      .click();
    const offer = page.getByRole("dialog", { name: /Mở màn rực rỡ/ });
    await expect(offer).toBeVisible();
    await offer
      .getByRole("checkbox", { name: "Không hiển thị lại hôm nay" })
      .check();
    await page.keyboard.press("Escape");
    await expect(offer).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe("hidden");

    await page.reload();
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
    await expect(page.locator(".discovery-film").first()).toBeVisible();
    expect((await page.request.get("/api/v1/users/me")).status()).toBe(200);
    expect(errors).toEqual([]);
  });
}
