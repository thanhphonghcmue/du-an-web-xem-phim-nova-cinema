import { test, expect, chromium } from "@playwright/test";

test("Save-Data keeps decorative screens static without probing WebGL and seat preview remains usable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const connection = new EventTarget();
    connection.saveData = true;
    Object.defineProperty(navigator, "connection", { value: connection });
    sessionStorage.setItem("nova-welcome-seen", "1");
    window.__webglProbes = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (/^webgl/.test(kind)) window.__webglProbes++;
      return getContext.call(this, kind, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  // Thực sự đi qua một nhịp idle: kiểm tra loader không khởi tạo context nền.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        if (window.requestIdleCallback)
          window.requestIdleCallback(resolve, { timeout: 1500 });
        else setTimeout(resolve, 1100);
      }),
  );
  await expect(page.locator(".cinematic-canvas canvas")).toHaveCount(0);
  expect(await page.evaluate(() => window.__webglProbes)).toBe(0);
  await page.goto("/xem-truoc");
  await expect(page.locator(".cinematic-screen")).toHaveAttribute(
    "data-screen-state",
    "fallback",
  );
  await expect(page.locator(".cinematic-screen canvas")).toHaveCount(0);
  const seat = page.getByRole("button", {
    name: "Ghế minh họa A1",
    exact: true,
  });
  await seat.click();
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.__webglProbes)).toBe(0);
  expect(errors).toEqual([]);
});

test("ambient WebGL activates after reduced motion, releases contexts and survives context loss", async () => {
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
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() =>
      sessionStorage.setItem("nova-welcome-seen", "1"),
    );
    await page.goto("/");
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".cinematic-canvas canvas")).toHaveCount(0);
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const canvas = page.locator(".cinematic-canvas canvas");
      await expect(canvas).toBeAttached({ timeout: 20000 });
      const context = await canvas.evaluateHandle((node) =>
        node.getContext("webgl2"),
      );
      expect(await context.evaluate((gl) => Boolean(gl))).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(canvas).toHaveCount(0);
      await expect
        .poll(() => context.evaluate((gl) => gl.isContextLost()), {
          timeout: 10000,
        })
        .toBe(true);
      await context.dispose();
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = page.locator(".cinematic-canvas canvas");
    await expect(canvas).toBeAttached({ timeout: 20000 });
    await canvas.evaluate((node) => {
      node
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext();
    });
    await expect(canvas).toHaveCount(0);
    await expect(
      page.locator('.canvas-fallback[data-canvas="fallback"]'),
    ).toBeAttached();
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
