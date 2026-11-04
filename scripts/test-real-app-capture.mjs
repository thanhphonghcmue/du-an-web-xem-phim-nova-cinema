import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/dang-nhap...");
  await page.goto("http://localhost:3000/dang-nhap");
  await page.waitForTimeout(2000);

  console.log("Logging in as admin@nova.vn...");
  await page.fill('input[type="email"]', "admin@nova.vn");
  await page.fill('input[type="password"]', "nova@12345");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log("Current URL after login:", page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300).replace(/\n/g, " "));
  console.log("Page after login:", bodyText);

  console.log("Navigating to http://localhost:3000/quan-tri...");
  await page.goto("http://localhost:3000/quan-tri");
  await page.waitForTimeout(3000);
  console.log("URL on /quan-tri:", page.url());
  const adminText = await page.evaluate(() => document.body.innerText.substring(0, 500).replace(/\n/g, " "));
  console.log("Admin page text:\n", adminText);

  console.log("Navigating to http://localhost:3000/soat-ve...");
  await page.goto("http://localhost:3000/soat-ve");
  await page.waitForTimeout(3000);
  console.log("URL on /soat-ve:", page.url());
  const staffText = await page.evaluate(() => document.body.innerText.substring(0, 500).replace(/\n/g, " "));
  console.log("Staff page text:\n", staffText);

  await browser.close();
}

main().catch(console.error);
