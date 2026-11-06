import { test, expect } from "@playwright/test";

test("a cold first API route timeout recovers real screenings once without duplicate error banners", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
    window.__catalogueErrors = [];
    window.addEventListener("nova:api-error", (event) =>
      window.__catalogueErrors.push(event.detail.message),
    );
  });
  let requests = 0;
  await page.route("**/api/v1/showtimes/programme/manifest", async (route) => {
    if (++requests === 1) {
      const response = await route.fetch();
      await new Promise((done) => setTimeout(done, 8500));
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  await page.goto("/");
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Boolean(sessionStorage.getItem("nova:programme:raw")),
        ),
      { timeout: 24000 },
    )
    .toBe(true);
  expect(requests).toBe(2);
  await expect(page.locator(".timeline-show").first()).toBeVisible();
  await expect(
    page.locator(".catalog-connection-notice [role=alert]"),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__catalogueErrors)).toEqual([]);
});

test("a real backend error stays visible, never invents shows, and retry reloads actual API data", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  let requests = 0;
  await page.route("**/api/v1/showtimes/programme/manifest", async (route) => {
    requests++;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        code: "BACKEND_UNAVAILABLE",
        message: "Không thể kết nối đến máy chủ Backend",
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.locator(".catalog-connection-notice [role=alert]"),
  ).toContainText("Không thể kết nối");
  expect(requests).toBe(2); // GET-only bounded retry already used by the API client.
  await expect(page.locator(".timeline-show")).toHaveCount(0);
  await page.unroute("**/api/v1/showtimes/programme/manifest");
  await page
    .getByRole("button", { name: "Thử kết nối lại", exact: true })
    .click();
  await expect(page.locator(".timeline-show").first()).toBeVisible();
  await expect(
    page.locator(".catalog-connection-notice [role=alert]"),
  ).toHaveCount(0);
});
