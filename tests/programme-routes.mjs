/** Simulate a rolling deployment whose backend only has the legacy contract. */
export async function useLegacyProgramme(page) {
  await page.route("**/api/v1/showtimes/programme/manifest*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "NOT_FOUND",
        message: "This backend version has no programme manifest endpoint.",
      }),
    }),
  );
}
