import { chromium } from "playwright";

async function probe() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  // Test 1: Home page
  console.log("--- PROBING HOME ---");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const homeTitle = await page.title();
  const heroText = await page.evaluate(() => document.querySelector(".hero-content, .hero, h1")?.innerText);
  console.log("Home:", homeTitle, "Hero:", heroText?.slice(0, 80));

  // Test 2: Phim
  console.log("--- PROBING PHIM ---");
  await page.goto("http://localhost:3000/phim", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const movieCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".discovery-card, .movie-card, article")).map(el => el.innerText.replace(/\n+/g, " ").slice(0, 60));
  });
  console.log("Phim count:", movieCards.length, "Sample:", movieCards.slice(0, 3));

  // Test 3: Bap nuoc
  console.log("--- PROBING BAP NUOC ---");
  await page.goto("http://localhost:3000/bap-nuoc", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const bapNuocItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".food-card, .concession-card, article, [class*='card']")).map(el => el.innerText.replace(/\n+/g, " ").slice(0, 60));
  });
  console.log("Bap nuoc items:", bapNuocItems.length, "Sample:", bapNuocItems.slice(0, 3));

  // Test 4: Soat ve as staff
  console.log("--- PROBING SOAT VE WITH STAFF LOGIN ---");
  const loginRes = await context.request.post("http://localhost:3000/api/v1/auth/login", {
    data: { email: "staff@nova.local", password: "nova@12345" }
  });
  console.log("Staff login status:", loginRes.status());
  await page.goto("http://localhost:3000/soat-ve", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const staffSnippet = await page.evaluate(() => document.body.innerText.replace(/\n+/g, " ").slice(0, 200));
  console.log("Staff view snippet:", staffSnippet);

  // Test 5: Admin as admin
  console.log("--- PROBING ADMIN WITH ADMIN LOGIN ---");
  const adminLoginRes = await context.request.post("http://localhost:3000/api/v1/auth/login", {
    data: { email: "admin@nova.local", password: "nova@12345" }
  });
  console.log("Admin login status:", adminLoginRes.status());
  await page.goto("http://localhost:3000/quan-tri", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const adminSnippet = await page.evaluate(() => document.body.innerText.replace(/\n+/g, " ").slice(0, 200));
  console.log("Admin view snippet:", adminSnippet);

  await browser.close();
}

probe().catch(console.error);
