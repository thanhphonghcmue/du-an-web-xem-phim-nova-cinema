import { test, expect } from "@playwright/test";
for (const [source, destination] of [
  ["movies", "phim"],
  ["booking", "dat-ve"],
  ["checkout", "dat-ve"],
  ["tickets", "tai-khoan"],
  ["admin", "quan-tri"],
  ["staff", "soat-ve"],
]) {
  test(`new folder route /${source} reaches the existing /${destination} flow and preserves query values`, async ({
    page,
  }) => {
    const response = await page.request.get("/" + source + "?audit=monorepo", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const target = new URL(response.headers().location, "http://127.0.0.1");
    expect(target.pathname).toBe("/" + destination);
    expect(target.searchParams.get("audit")).toBe("monorepo");
    if (source === "tickets") expect(target.hash).toBe("#ve-cua-toi");
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("nova-welcome-seen", "1");
      } catch {
        /* Storage may be disabled. */
      }
    });
    const errors = [];
    page.on("pageerror", () => errors.push("runtime"));
    await page.goto("/" + source);
    await expect(page).toHaveURL(
      new RegExp("/" + destination + "(?:#ve-cua-toi)?$"),
    );
    await expect(page.locator(".site-header")).toBeVisible();
    if (["movies", "booking", "checkout"].includes(source))
      await expect(page.locator("main")).toContainText(
        source === "movies" ? "Chọn một phim" : "Một buổi hẹn hay",
      );
    else await expect(page.locator("main")).toContainText("Đăng nhập");
    expect(errors).toEqual([]);
  });
}
