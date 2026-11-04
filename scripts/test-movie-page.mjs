import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("http://localhost:3000/phim", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const links = await page.locator("a[href*='/phim/']").evaluateAll(els => els.map(e => e.href));
  console.log("Movie links on /phim:", links);

  const cardButtons = await page.locator(".discovery-card button, .discovery-card a").evaluateAll(els => els.map(e => ({
    text: e.innerText,
    href: e.getAttribute("href"),
    className: e.className
  })));
  console.log("Card action elements:", cardButtons.slice(0, 6));

  // Let's also check App.jsx: what happens when you click on a movie card on Home or /phim
  await browser.close();
}

run().catch(console.error);
