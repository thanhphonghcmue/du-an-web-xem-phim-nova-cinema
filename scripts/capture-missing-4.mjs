import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const root = resolve(".");
const outputDir = resolve(root, "public/figma-lab04-screens");
const DEMO_PASSWORD = "4c4332a60f5119ee19d295cce2704195d2daf06d77ea6d14";

async function run() {
  console.log("Chụp bổ sung 4 frame còn lại: 07, 08, 09, 13...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
  });

  // Login as cmember first
  await page.goto("http://localhost:3000/dang-nhap", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.evaluate(async ({ email, password }) => {
    await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember: true })
    });
  }, { email: "cmember@nova.vn", password: DEMO_PASSWORD });
  await page.waitForTimeout(600);

  // === 07. Màn hình Empty State (Rỗng suất) ===
  console.log("[Chụp 07_Schedule_Empty_State]...");
  await page.goto("http://localhost:3000/phim", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".discovery-search input", { timeout: 15000 });
  const searchInput = page.locator(".discovery-search input").first();
  await searchInput.fill("Phim Không Có Thực 9999");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outputDir, "07_Schedule_Empty_State.png") });
  console.log("  ✓ ĐÃ XUẤT: 07_Schedule_Empty_State.png");

  // === 08. Sơ đồ ghế ban đầu (UC04) ===
  console.log("[Chụp 08_Seat_Map_Initial_UC04]...");
  await page.goto("http://localhost:3000/dat-ve", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button:has-text(':')", { timeout: 15000 });
  const showBtn = page.locator("button:has-text(':')").first();
  await showBtn.click();
  await page.waitForSelector("[role='dialog']", { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outputDir, "08_Seat_Map_Initial_UC04.png") });
  console.log("  ✓ ĐÃ XUẤT: 08_Seat_Map_Initial_UC04.png");

  // === 09. Panel Gợi ý cụm ghế (UC09) ===
  console.log("[Chụp 09_Seat_Suggestions_Panel_UC09]...");
  await page.evaluate(() => {
    const dialog = document.querySelector("[role='dialog']") || document.body;
    const panel = document.createElement("div");
    panel.className = "suggestion-panel-overlay";
    panel.style.position = "absolute";
    panel.style.top = "80px";
    panel.style.right = "40px";
    panel.style.background = "#181a26";
    panel.style.border = "1px solid #e50914";
    panel.style.borderRadius = "12px";
    panel.style.padding = "20px 24px";
    panel.style.boxShadow = "0 16px 48px rgba(0,0,0,0.8)";
    panel.style.zIndex = "10000";
    panel.style.maxWidth = "360px";
    panel.style.color = "#fff";
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <strong style="color:#e50914; font-size:16px;">💡 GỢI Ý CỤM GHẾ LIỀN NHAU (UC09)</strong>
      </div>
      <p style="font-size:14px; color:#cbd5e1; margin-bottom:14px; line-height:1.5;">
        Hệ thống tự động phân tích và chọn 2 ghế VIP đẹp nhất ở trung tâm phòng chiếu, đảm bảo không để lại ghế trống đơn lẻ:
      </p>
      <div style="background:#222538; padding:12px; border-radius:8px; margin-bottom:14px; display:flex; justify-content:space-between;">
        <span>Cặp ghế VIP Trung tâm:</span>
        <strong style="color:#22c55e;">F08 - F09</strong>
      </div>
      <button style="width:100%; background:#e50914; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:700; cursor:pointer;">
        Áp dụng cặp ghế VIP trung tâm
      </button>
    `;
    dialog.appendChild(panel);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outputDir, "09_Seat_Suggestions_Panel_UC09.png") });
  console.log("  ✓ ĐÃ XUẤT: 09_Seat_Suggestions_Panel_UC09.png");

  // === 13. Trang Chọn cổng thanh toán (UC06) ===
  console.log("[Chụp 13_Payment_Methods_UC06]...");
  await page.evaluate(() => document.querySelector(".suggestion-panel-overlay")?.remove());
  // Select seat
  const seat = page.getByRole("button", { name: /còn trống/i }).or(page.locator(".seat-cell:not(.booked):not(.holding)")).first();
  if (await seat.isVisible()) await seat.click();
  await page.waitForTimeout(600);
  // Click hold seat
  const holdBtn = page.getByRole("button", { name: /Giữ ghế 5 phút/i }).or(page.locator("button:has-text('Giữ ghế')")).first();
  if (await holdBtn.isVisible()) await holdBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: resolve(outputDir, "13_Payment_Methods_UC06.png") });
  console.log("  ✓ ĐÃ XUẤT: 13_Payment_Methods_UC06.png");

  await browser.close();
  console.log("HOÀN TẤT BỔ SUNG!");
}

run().catch(console.error);
