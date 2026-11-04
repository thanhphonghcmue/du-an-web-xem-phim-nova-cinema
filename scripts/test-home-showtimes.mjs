import { chromium } from "playwright";

async function testHomeShowtimes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  
  await context.request.post("http://localhost:3000/api/v1/auth/login", {
    data: { email: "customer@nova.local", password: "nova@12345" }
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Look for showtime buttons in LichChieuPhim
  const showtimeBtns = page.locator(".schedule-timeline button, .timeline-slot, button:has-text(':'), .showtime-chip");
  const count = await showtimeBtns.count();
  console.log("Timeline showtime buttons count on home:", count);

  for (let i = 0; i < Math.min(count, 5); i++) {
    console.log(`Button ${i}:`, await showtimeBtns.nth(i).innerText());
  }

  if (count > 0) {
    await showtimeBtns.first().click();
    await page.waitForTimeout(2000);
    const modalVisible = await page.locator(".booking-console, [class*='seat-map'], .modal-content").count();
    console.log("Modal visible count:", modalVisible);
    const modalHead = await page.evaluate(() => document.querySelector(".booking-console, .modal-content")?.innerText.slice(0, 200));
    console.log("Modal head snippet:", modalHead?.replace(/\n+/g, " "));
  }

  await browser.close();
}

testHomeShowtimes().catch(console.error);
