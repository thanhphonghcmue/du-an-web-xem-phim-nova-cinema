import { expect } from "@playwright/test";
export async function chooseOption(page, label, value) {
  const trigger = page.getByRole("combobox", { name: label, exact: true });
  await trigger.click();
  const option = page
    .getByRole("dialog")
    .last()
    .locator(`[role="option"][data-value="${value}"]`);
  await expect(option).toBeEnabled();
  await option.click();
  await expect(trigger).toHaveAttribute("data-value", value);
}
export async function chooseDate(page, label, key) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog").last();
  for (
    let i = 0;
    i < 24 &&
    (await dialog.locator(`[data-calendar-date="${key}"]`).count()) === 0;
    i++
  ) {
    const caption = await dialog.locator(".rdp-caption_label").innerText();
    await dialog
      .getByRole("button", { name: "Tháng sau", exact: true })
      .click();
    await expect(dialog.locator(".rdp-caption_label")).not.toHaveText(caption);
  }
  const date = dialog.locator(`[data-calendar-date="${key}"]`);
  await expect(date).toBeEnabled();
  await date.click();
  await expect(
    page.getByRole("button", { name: label, exact: true }),
  ).toHaveAttribute("data-value", key);
}
