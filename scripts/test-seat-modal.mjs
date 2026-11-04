import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/dat-ve");
  await page.waitForTimeout(1000);
  const dune = page.locator("button:has-text('Dune')").first();
  await dune.click();
  await page.waitForTimeout(1000);
  const timeBtn = page.locator("button:has-text(':')").first();
  console.log("Time button found:", await timeBtn.isVisible());
  if (await timeBtn.isVisible()) {
    await timeBtn.click();
    await page.waitForTimeout(1500);
    const hasModal = await page.evaluate(() => !!document.querySelector("[role='dialog']"));
    console.log("Has seat modal:", hasModal);
  }
  await browser.close();
}
main();
