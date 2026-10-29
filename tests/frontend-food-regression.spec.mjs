import { expect, test } from "@playwright/test";

test("rapid food actions preserve every quantity and a failed draft clear is explained", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await page.goto("/bap-nuoc");
  const card = page.locator(".food-product").filter({
    has: page.getByRole("heading", { name: "Party Combo 69K", exact: true }),
  });
  const add = card.getByRole("button", {
    name: "Thêm Party Combo 69K",
    exact: true,
  });
  await expect(add).toBeEnabled();
  // Dispatch in one turn: React can batch these updates before the next render.
  await add.evaluate((button) => {
    for (let index = 0; index < 5; index++) button.click();
  });
  await expect(page.locator(".food-basket-count")).toHaveText("5");
  const id = await card.getAttribute("data-combo-id");
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem("nova-food-cart"))[key],
      id,
    ),
  ).toBe(5);
  await page.reload();
  await expect(page.locator(".food-basket-count")).toHaveText("5");

  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "nova-food-cart")
        throw new DOMException("Blocked", "SecurityError");
      return setItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Xóa giỏ bắp nước" }).click();
  await expect(page.locator(".food-basket-count")).toHaveText("0");
  await expect(page.locator(".food-studio [role=alert]")).toContainText(
    "chưa xóa được bản nháp",
  );
  // Storage remains unchanged when blocked; report this rather than promising persistence.
  await page.reload();
  await expect(page.locator(".food-basket-count")).toHaveText("5");
  await page.getByRole("button", { name: "Xóa giỏ bắp nước" }).click();
  await expect(page.locator(".food-studio [role=alert]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".food-basket-count")).toHaveText("0");
  expect(errors).toEqual([]);
});
