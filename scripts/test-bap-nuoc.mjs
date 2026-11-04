import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("http://localhost:3000/bap-nuoc", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".food-product", { timeout: 10000 });
  const count = await page.locator(".food-product").count();
  const names = await page.locator(".food-product h3").allInnerTexts();
  console.log(`Food products found: ${count}`, names);
  await browser.close();
}

run().catch(console.error);
