import { chromium } from "playwright";

async function testDatVe() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("http://localhost:3000/dat-ve", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const buttons = await page.locator("button, a.button").evaluateAll(els => els.map(e => ({
    text: e.innerText.replace(/\n+/g, " "),
    className: e.className
  })));
  console.log("Dat-ve buttons:", buttons.slice(0, 15));

  const selectors = await page.locator("select").evaluateAll(els => els.map(e => ({
    label: e.getAttribute("aria-label"),
    options: Array.from(e.options).map(o => o.text).slice(0, 4)
  })));
  console.log("Selects:", selectors);

  await browser.close();
}

testDatVe().catch(console.error);
