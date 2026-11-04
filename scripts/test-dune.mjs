import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("http://localhost:3000/phim/dune", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const heading = await page.locator("h1, h2").allInnerTexts();
  console.log("Headings on /phim/dune:", heading);
  const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, " ").slice(0, 300));
  console.log("Body snippet:", bodyText);

  await browser.close();
}

run().catch(console.error);
