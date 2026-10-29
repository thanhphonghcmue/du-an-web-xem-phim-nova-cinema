import { test, expect } from "@playwright/test";
import { useLegacyProgramme } from "./programme-routes.mjs";

// Chỉ sửa phản hồi trên trình duyệt để thử dữ liệu cũ/lỗi; không ghi vào DB.
test("an invalid legacy trailer cannot hide the catalogue and clearing today's filter restores all movies", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await useLegacyProgramme(page);
  let movieCount = 0;
  await page.route(
    /\/api\/v1\/showtimes\/programme(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      expect(response.ok()).toBe(true);
      movieCount = body.data.movies.filter(
        (movie) => movie.status !== "ENDED",
      ).length;
      expect(movieCount).toBeGreaterThan(0);
      body.data.movies[0].trailerUrl = "/invalid-legacy-trailer";
      body.data.showtimes = [];
      await route.fulfill({ response, json: body });
    },
  );
  await page.goto("/phim");
  await expect.poll(() => movieCount).toBeGreaterThan(0);
  await expect(page.locator(".discovery-film")).toHaveCount(movieCount);
  await expect(page.locator(".catalog-connection-notice")).toHaveCount(0);
  const today = page.getByRole("checkbox", {
    name: "Chỉ phim có suất hôm nay",
  });
  await today.check();
  await expect(page.locator(".discovery-film")).toHaveCount(0);
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(today).not.toBeChecked();
  await expect(page.locator(".discovery-film")).toHaveCount(movieCount);
  expect(errors).toEqual([]);
});

test("unaccented header search matches Vietnamese uppercase Đ", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await useLegacyProgramme(page);
  await page.route(
    /\/api\/v1\/showtimes\/programme(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      expect(body.data.cinemas.length).toBeGreaterThan(0);
      body.data.cinemas[0].name = "Đà Nẵng kiểm thử tìm kiếm";
      body.data.cinemas[0].city = "Đà Nẵng";
      await route.fulfill({ response, json: body });
    },
  );
  await page.goto("/phim");
  await expect(page.locator(".discovery-film").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Tìm phim, rạp...", exact: true })
    .click();
  const search = page.getByRole("dialog", { name: "Tìm câu chuyện của bạn" });
  await search
    .getByRole("textbox", { name: "Tìm phim, rạp...", exact: true })
    .fill("da nang");
  await expect(
    search.getByRole("button", { name: /Đà Nẵng kiểm thử tìm kiếm/ }),
  ).toBeVisible();
});
