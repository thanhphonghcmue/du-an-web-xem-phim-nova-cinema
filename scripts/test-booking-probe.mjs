import { chromium } from "playwright";

async function testBooking() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  
  // Login first so booking works seamlessly
  await context.request.post("http://localhost:3000/api/v1/auth/login", {
    data: { email: "customer@nova.local", password: "nova@12345" }
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/phim/dune", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Look for showtime buttons
  const showtimeBtns = page.locator(".timeline-show, .showtime-slot, button:has-text(':')");
  const count = await showtimeBtns.count();
  console.log("Showtime buttons count:", count);

  if (count > 0) {
    console.log("Clicking first showtime button:", await showtimeBtns.first().innerText());
    await showtimeBtns.first().click();
    await page.waitForTimeout(2000);

    const modalText = await page.evaluate(() => {
      const modal = document.querySelector(".modal-content, .booking-console, [class*='seat'], [class*='modal']");
      return modal ? modal.className + " | " + modal.innerText.replace(/\n+/g, " ").slice(0, 200) : "No modal found";
    });
    console.log("Modal state:", modalText);
  }

  await browser.close();
}

testBooking().catch(console.error);
