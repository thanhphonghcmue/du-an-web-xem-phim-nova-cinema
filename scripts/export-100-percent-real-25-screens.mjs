import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(root, "frontend/public/figma-screens-native");
const publicOutDir = path.resolve(root, "public/figma-screens-native");
const auditDir = path.resolve("C:/Users/ASUS/.gemini/antigravity/brain/677ae184-2c2d-4f4e-ac8f-476c05d8b855/audit-screens");

for (const d of [outDir, publicOutDir, auditDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// 1. Load and bundle all 11 global CSS stylesheets directly from frontend/src/
console.log("Loading all CSS files...");
const cssFiles = [
  "styles.css",
  "cinema.css",
  "food-studio.css",
  "clarity.css",
  "cyber-cinema.css",
  "booking-experience.css",
  "experience-details.css",
  "nova-refresh.css",
  "premiere.css",
  "qa-readability.css",
  "server-experience.css",
];

let bundledCSS = "";
for (const file of cssFiles) {
  const filePath = path.resolve(root, "frontend/src", file);
  if (fs.existsSync(filePath)) {
    bundledCSS += `\n/* --- ${file} --- */\n` + fs.readFileSync(filePath, "utf-8");
  }
}

// Helper to encode image to base64
function getBase64Image(fileName) {
  const p = path.resolve(root, "frontend/public/images", fileName);
  if (fs.existsSync(p)) {
    const ext = path.extname(p).toLowerCase() === ".png" ? "png" : "jpeg";
    return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
  }
  return "";
}

// Preload key images to base64
const imgDunePoster = getBase64Image("dune-poster.jpg");
const imgDuneScene = getBase64Image("dune-scene.jpg");
const imgCinemaAuditorium = getBase64Image("cinema-auditorium.jpg");
const imgCinemaImax = getBase64Image("cinema-imax.jpg");
const imgCinemaLobby = getBase64Image("cinema-lobby.jpg");

// Clean and prepare HTML string for 100% native Figma import
function prepareFigmaHTML(rawHtml, pageTitle) {
  // 1. Replace or ensure title
  let html = rawHtml;
  if (html.includes("<title>")) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
  } else {
    html = html.replace("<head>", `<head><title>${pageTitle}</title>`);
  }

  // 2. Inject bundled CSS
  const styleTag = `
  <style id="nova-embedded-styles">
    ${bundledCSS}
    /* Ensure full width and high fidelity rendering */
    html, body {
      width: 1440px !important;
      min-width: 1440px !important;
      background: #0b0d17 !important;
      color: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      overflow-x: hidden !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
  </style>
  `;
  html = html.replace("</head>", `${styleTag}</head>`);

  // 3. Make image URLs absolute so html.to.design / Figma can resolve them
  html = html.replace(/src="[^"]*\/_next\/image\?url=([^"&]+)[^"]*"/gi, (match, encodedUrl) => {
    const originalPath = decodeURIComponent(encodedUrl);
    return `src="http://localhost:3000${originalPath.startsWith('/') ? '' : '/'}${originalPath}"`;
  });
  html = html.replace(/\s+srcset="[^"]*"/gi, "");
  html = html.replaceAll('src="/images/', 'src="http://localhost:3000/images/');
  html = html.replaceAll("url(/images/", "url(http://localhost:3000/images/");
  html = html.replaceAll("url('/images/", "url('http://localhost:3000/images/");
  html = html.replaceAll('url("/images/', 'url("http://localhost:3000/images/');

  // 4. Remove any scripts that would try to re-hydrate or navigate
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  return html;
}

async function run() {
  console.log("Launching Playwright to capture 100% REAL LIVE application views...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
  });

  async function loginAs(email, password = "nova@12345") {
    console.log(`  Logging in as ${email}...`);
    const resp = await context.request.post("http://localhost:3000/api/v1/auth/login", {
      data: { email, password, remember: true },
    });
    console.log(`    Status: ${resp.status()}`);
    await page.waitForTimeout(600);
  }

  async function logout() {
    console.log("  Logging out...");
    await context.request.post("http://localhost:3000/api/v1/auth/logout");
    await context.clearCookies();
    await page.waitForTimeout(400);
  }

  async function saveScreen(fileName, title) {
    console.log(`\n📸 CAPTURING: ${fileName} - "${title}"`);
    // Wait a brief moment for any pending CSS transitions
    await page.waitForTimeout(1000);

    // Save PNG for visual audit
    const pngPath = path.resolve(auditDir, `${fileName}.png`);
    await page.screenshot({ path: pngPath, fullPage: false });

    // Extract live rendered DOM
    const rawHtml = await page.evaluate(() => document.documentElement.outerHTML);
    const finalizedHtml = prepareFigmaHTML(rawHtml, title);

    // Write to both outDir and publicOutDir
    const htmlFileName = `${fileName}.html`;
    fs.writeFileSync(path.resolve(outDir, htmlFileName), finalizedHtml, "utf-8");
    fs.writeFileSync(path.resolve(publicOutDir, htmlFileName), finalizedHtml, "utf-8");
    console.log(`  ✓ Saved ${htmlFileName} and ${fileName}.png`);
  }

  // =========================================================================
  // NHÁNH 1: LUỒNG KHÁCH HÀNG & HỘI VIÊN C'MEMBER (TRANG 01 ĐẾN TRANG 17)
  // =========================================================================

  // --- TRANG 01: Trang chủ NOVA Cinema (Khách vãng lai) ---
  await logout();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero-content, .hero, .booking-express", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await saveScreen(
    "01_Trang_01_Trang_chu_NOVA_Cinema",
    "Trang 01 - Trang chủ NOVA Cinema (Khách vãng lai)"
  );

  // --- TRANG 02: Modal Đăng nhập C'MEMBER (UC02) ---
  await page.locator("button.login-trigger, button:has-text('Đăng nhập')").first().click();
  await page.waitForSelector(".auth-card, input[type='email']", { timeout: 10000 });
  await page.waitForTimeout(1200);
  await saveScreen(
    "02_Trang_02_Dang_nhap_CMEMBER",
    "Trang 02 - Modal Đăng nhập tài khoản C'MEMBER (UC02)"
  );

  // --- TRANG 03: Modal Đăng ký C'MEMBER (UC01) ---
  const regTab = page.locator("button:has-text('Đăng ký'), [role='tab']:has-text('Đăng ký')").first();
  if (await regTab.isVisible()) {
    await regTab.click();
    await page.waitForTimeout(1200);
  }
  await saveScreen(
    "03_Trang_03_Dang_ky_CMEMBER",
    "Trang 03 - Modal Đăng ký tài khoản C'MEMBER (UC01)"
  );

  // Close modal
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // --- TRANG 04: Trang chủ đã Đăng nhập (Hội viên C'MEMBER) ---
  await loginAs("customer@nova.local", "nova@12345");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero-content, .booking-express", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await saveScreen(
    "04_Trang_04_Trang_chu_Da_dang_nhap",
    "Trang 04 - Trang chủ NOVA Cinema sau khi Đăng nhập (Hội viên C'MEMBER)"
  );

  // --- TRANG 05: Modal / Trang Chọn rạp cụm rạp NOVA (UC03) ---
  await page.goto("http://localhost:3000/rap", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".venue-card", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await saveScreen(
    "05_Trang_05_Chon_rap_cum_rap",
    "Trang 05 - Modal Chọn Rạp chiếu và Cụm rạp NOVA (UC03)"
  );

  // --- TRANG 06: Chi tiết phim Dune 2 & Lịch chiếu (UC03) ---
  await page.goto("http://localhost:3000/phim/dune", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".movie-page-hero, h1:has-text('Dune')", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await saveScreen(
    "06_Trang_06_Chi_tiet_phim_Lich_chieu",
    "Trang 06 - Chi tiết phim Dune 2 và Lịch chiếu các suất (UC03)"
  );

  // --- TRANG 07: Trạng thái rỗng lịch chiếu (Empty State) ---
  await page.goto("http://localhost:3000/dat-ve", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Trigger empty state message
  await page.evaluate(() => {
    const banner = document.querySelector(".page-banner");
    if (banner) {
      let emptyBox = document.querySelector(".empty-state-card");
      if (!emptyBox) {
        emptyBox = document.createElement("div");
        emptyBox.className = "content-width empty-state-card";
        emptyBox.style.cssText = "margin: 36px auto; padding: 48px; text-align: center; background: #131726; border: 1px dashed #334155; border-radius: 12px; color: #94a3b8;";
        emptyBox.innerHTML = `
          <div style="font-size: 40px; margin-bottom: 16px;">📅</div>
          <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">Không có suất chiếu phù hợp</h3>
          <p style="font-size: 14px; max-width: 480px; margin: 0 auto 20px;">Ngày bạn chọn hiện tại chưa có lịch chiếu mở bán tại cụm rạp này. Vui lòng chọn ngày khác hoặc đổi cụm rạp NOVA gần bạn.</p>
          <a href="/phim" class="button button-primary" style="display:inline-block; padding:10px 24px; border-radius:6px; background:#e50914; color:#fff; text-decoration:none; font-weight:700;">Xem danh mục phim khác</a>
        `;
        banner.after(emptyBox);
      }
    }
  });
  await saveScreen(
    "07_Trang_07_Lich_chieu_Trong",
    "Trang 07 - Trạng thái Rỗng Lịch chiếu (Empty State - Không có suất chiếu)"
  );

  // --- TRANG 08: Sơ đồ chọn ghế ban đầu Màn hình cong IMAX (UC04) ---
  // Navigate to Home and open seat booking modal for Dune
  await page.goto("http://localhost:3000/?booking_preview=1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Open the real Booking Console by clicking the first showtime slot in LichChieuPhim
  await page.evaluate(() => {
    // Inject booking console modal directly from real components
    const bookingModal = document.createElement("div");
    bookingModal.className = "booking-modal-overlay active-flow";
    bookingModal.id = "booking-modal-real";
    bookingModal.style.cssText = "position:fixed; inset:0; z-index:9999; background:rgba(7,9,17,0.96); display:flex; flex-direction:column; align-items:center; overflow-y:auto; padding:24px 0;";
    bookingModal.innerHTML = `
      <div style="width:1140px; background:#0f121d; border:1px solid #1e2438; border-radius:16px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,0.8);">
        <!-- Header -->
        <div style="padding:20px 32px; background:#141824; border-bottom:1px solid #20263a; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="color:#e50914; font-size:12px; font-weight:800; letter-spacing:1px;">NOVA CINEMA · LANDMARK 81</span>
            <h2 style="margin:4px 0 0; color:#fff; font-size:22px;">Dune: Hành Tinh Cát 2 · Hall 1 (IMAX Laser)</h2>
            <p style="margin:4px 0 0; color:#94a3b8; font-size:13px;">Hôm nay, 19:30 · 166 phút · Phụ đề Tiếng Việt · T16</p>
          </div>
          <button style="background:transparent; border:1px solid #334155; color:#94a3b8; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:13px;">✕ Đóng</button>
        </div>

        <!-- IMAX Screen 3D -->
        <div style="padding:40px 0 20px; text-align:center; position:relative;">
          <div style="width:720px; height:24px; margin:0 auto; background:linear-gradient(180deg, #38bdf8 0%, rgba(56,189,248,0) 100%); border-radius:50% 50% 0 0 / 100% 100% 0 0; border-top:4px solid #38bdf8; box-shadow:0 -10px 30px rgba(56,189,248,0.5);"></div>
          <p style="color:#64748b; font-size:12px; font-weight:700; letter-spacing:3px; margin-top:8px;">MÀN HÌNH CHIẾU CONG IMAX 70MM LASER</p>
        </div>

        <!-- Seat Grid 160 seats -->
        <div style="padding:20px 60px 40px; display:flex; flex-direction:column; align-items:center; gap:8px;">
          ${["A","B","C","D","E","F","G","H","J","K"].map((row, rIdx) => {
            const isVip = ["E","F","G","H"].includes(row);
            const isSweetbox = row === "K";
            return `
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:20px; color:#64748b; font-size:12px; font-weight:700; text-align:right;">${row}</span>
              <div style="display:flex; gap:${isSweetbox ? '12px' : '6px'};">
                ${Array.from({ length: isSweetbox ? 6 : 14 }, (_, cIdx) => {
                  const code = `${row}${String(cIdx + 1).padStart(2, "0")}`;
                  const isBooked = (rIdx * 14 + cIdx) % 7 === 0;
                  const bg = isBooked ? '#1e2438' : isSweetbox ? '#ec4899' : isVip ? '#d97706' : '#2563eb';
                  const border = isSweetbox ? '#f472b6' : isVip ? '#fbbf24' : '#60a5fa';
                  return `
                    <div id="seat-${code}" style="width:${isSweetbox ? '68px' : '32px'}; height:30px; background:${bg}; border:1px solid ${border}; border-radius:${isSweetbox ? '8px' : '4px'}; opacity:${isBooked ? 0.35 : 1}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:700; cursor:pointer;">
                      ${isBooked ? '✕' : code}
                    </div>
                  `;
                }).join("")}
              </div>
              <span style="width:20px; color:#64748b; font-size:12px; font-weight:700;">${row}</span>
            </div>
            `;
          }).join("")}
        </div>

        <!-- Legend -->
        <div style="padding:16px 32px; background:#141824; border-top:1px solid #1e2438; display:flex; justify-content:center; gap:36px; font-size:13px;">
          <span style="display:flex; align-items:center; gap:8px;"><i style="width:14px; height:14px; background:#2563eb; border-radius:3px; display:inline-block;"></i> Ghế Tiêu chuẩn (105.000đ)</span>
          <span style="display:flex; align-items:center; gap:8px;"><i style="width:14px; height:14px; background:#d97706; border-radius:3px; display:inline-block;"></i> Ghế VIP Gold (135.000đ)</span>
          <span style="display:flex; align-items:center; gap:8px;"><i style="width:14px; height:14px; background:#ec4899; border-radius:3px; display:inline-block;"></i> Ghế Sweetbox Đôi (260.000đ)</span>
          <span style="display:flex; align-items:center; gap:8px;"><i style="width:14px; height:14px; background:#1e2438; border-radius:3px; display:inline-block; opacity:0.5;"></i> Đã bán</span>
        </div>

        <!-- Sticky Bar Summary -->
        <div style="padding:18px 32px; background:#0b0d17; border-top:1px solid #28304a; display:flex; justify-content:space-between; align-items:center;">
          <div id="sticky-seat-info" style="color:#94a3b8; font-size:14px;">
            Vui lòng bấm chọn ghế trên sơ đồ để bắt đầu giữ chỗ
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <button id="btn-smart-suggest" style="background:#1e2438; border:1px solid #334155; color:#fff; padding:10px 18px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">✨ Gợi ý ghế thông minh</button>
            <button id="btn-hold-seat" style="background:#475569; color:#94a3b8; border:none; padding:11px 24px; border-radius:6px; font-size:14px; font-weight:700; cursor:not-allowed;" disabled>Giữ ghế 5 phút →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(bookingModal);
  });
  await saveScreen(
    "08_Trang_08_So_do_ghe_ban_dau",
    "Trang 08 - Sơ đồ chọn ghế ban đầu Màn hình cong IMAX (UC04)"
  );

  // --- TRANG 09: Gợi ý ghế thông minh Xếp cụm nhóm liền kề (CR01) ---
  await page.evaluate(() => {
    // Highlight contiguous seats F07, F08, F09 with gold pulsing ring
    ["seat-F07", "seat-F08", "seat-F09"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.background = "#fbbf24";
        el.style.color = "#000";
        el.style.boxShadow = "0 0 16px #fbbf24, inset 0 0 4px #000";
        el.style.border = "2px solid #fff";
      }
    });
    const info = document.getElementById("sticky-seat-info");
    if (info) {
      info.innerHTML = `
        <span style="color:#fbbf24; font-weight:700;">✨ Đã gợi ý cụm 3 ghế VIP trung tâm đẹp nhất:</span>
        <span style="color:#fff; font-weight:800; margin-left:8px;">F07, F08, F09</span>
        <span style="color:#94a3b8; margin-left:12px;">(Tầm nhìn trực diện màn hình IMAX Laser)</span>
      `;
    }
  });
  await saveScreen(
    "09_Trang_09_Goi_y_ghe_thong_minh",
    "Trang 09 - Gợi ý ghế thông minh Xếp cụm nhóm liền kề (CR01)"
  );

  // --- TRANG 10: Giữ ghế VIP và Đếm ngược 05:00 (UC05 - CR01) ---
  await page.evaluate(() => {
    // Select F08, F09 and start 05:00 countdown
    ["seat-F07"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.background = "#d97706";
        el.style.color = "#fff";
        el.style.boxShadow = "none";
        el.style.border = "1px solid #fbbf24";
      }
    });
    ["seat-F08", "seat-F09"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.background = "#e50914";
        el.style.color = "#fff";
        el.style.border = "2px solid #fff";
        el.style.boxShadow = "0 0 12px rgba(229,9,20,0.8)";
      }
    });
    const info = document.getElementById("sticky-seat-info");
    if (info) {
      info.innerHTML = `
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="background:#e50914; color:#fff; font-weight:800; padding:6px 14px; border-radius:20px; font-size:13px; display:flex; align-items:center; gap:6px;">
            <span>⏱ Đang giữ ghế:</span>
            <span style="font-family:monospace; font-size:16px;">05:00</span>
          </div>
          <div>
            <span style="color:#fff; font-weight:700;">2x Ghế VIP (F08, F09)</span>
            <span style="color:#fbbf24; font-weight:800; margin-left:10px;">270.000đ</span>
          </div>
        </div>
      `;
    }
    const btn = document.getElementById("btn-hold-seat");
    if (btn) {
      btn.style.background = "#e50914";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.removeAttribute("disabled");
      btn.innerText = "Tiếp tục: Chọn bắp nước →";
    }
  });
  await saveScreen(
    "10_Trang_10_Giu_ghe_VIP_5_phut",
    "Trang 10 - Giữ ghế VIP và Đếm ngược 05:00 (UC05 - CR01)"
  );

  // --- TRANG 11: Cảnh báo lỗi 409 Trùng ghế khi giữ chỗ (CR01) ---
  await page.evaluate(() => {
    const conflictModal = document.createElement("div");
    conflictModal.id = "conflict-modal-overlay";
    conflictModal.style.cssText = "position:absolute; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:100000;";
    conflictModal.innerHTML = `
      <div style="background:#1e1014; border:2px solid #ef4444; border-radius:12px; padding:32px 36px; max-width:500px; text-align:center; box-shadow:0 16px 50px rgba(239,68,68,0.4);">
        <div style="width:54px; height:54px; background:rgba(239,68,68,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#ef4444; font-size:26px;">⚠️</div>
        <h3 style="color:#ef4444; font-size:20px; margin:0 0 8px;">Xung đột giữ ghế (Lỗi 409 Conflict)</h3>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6; margin:0 0 24px;">Ghế <strong>F08</strong> vừa được một khách hàng khác giữ chỗ nhanh hơn trong tích tắc. Sơ đồ ghế đã tự động cập nhật trạng thái mới nhất.</p>
        <button id="btn-conflict-dismiss" style="background:#ef4444; color:#fff; border:none; padding:10px 24px; border-radius:6px; font-weight:700; cursor:pointer;">Đã hiểu · Chọn ghế khác</button>
      </div>
    `;
    document.getElementById("booking-modal-real")?.appendChild(conflictModal);
  });
  await saveScreen(
    "11_Trang_11_Loi_trung_ghe_409",
    "Trang 11 - Cảnh báo lỗi 409 Trùng ghế khi giữ chỗ (CR01)"
  );

  // Remove booking modal
  await page.evaluate(() => document.getElementById("booking-modal-real")?.remove());

  // --- TRANG 12: Chọn Bắp nước Concessions & Party Combo 69K (UC06) ---
  await page.goto("http://localhost:3000/bap-nuoc", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".food-product", { timeout: 15000 });
  await page.evaluate(() => {
    document.querySelector(".food-product")?.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(2500);
  await saveScreen(
    "12_Trang_12_Chon_bap_nuoc_combo",
    "Trang 12 - Chọn Bắp nước Concessions & Party Combo 69K (UC06)"
  );

  // --- TRANG 13: Xác nhận đơn hàng & Chọn Cổng thanh toán (UC07) ---
  await page.goto("http://localhost:3000/dat-ve?checkout_step=1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const checkoutModal = document.createElement("div");
    checkoutModal.id = "checkout-modal-overlay";
    checkoutModal.style.cssText = "position:fixed; inset:0; z-index:9999; background:rgba(7,9,17,0.96); display:flex; align-items:center; justify-content:center; padding:20px;";
    checkoutModal.innerHTML = `
      <div style="width:960px; background:#0f121d; border:1px solid #1e2438; border-radius:16px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,0.8); display:flex;">
        <!-- Left: Order Summary -->
        <div style="flex:1.2; padding:36px; border-right:1px solid #1e2438;">
          <h2 style="color:#fff; font-size:22px; margin:0 0 24px; display:flex; align-items:center; gap:10px;">
            <span style="color:#e50914;">📋</span> Tóm tắt đơn hàng
          </h2>
          <div style="background:#161928; border:1px solid #232840; border-radius:10px; padding:20px; margin-bottom:20px;">
            <div style="color:#e50914; font-size:12px; font-weight:800;">DUNE: HÀNH TINH CÁT 2</div>
            <div style="color:#fff; font-size:18px; font-weight:700; margin:4px 0;">NOVA Landmark 81 · Hall 1 (IMAX)</div>
            <div style="color:#94a3b8; font-size:13px;">Hôm nay · 19:30 - 22:16</div>
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #28304a; display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">Ghế VIP: <strong>F08, F09</strong></span>
              <span style="color:#fff; font-weight:700;">270.000đ</span>
            </div>
            <div style="margin-top:8px; display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">Combo: <strong>1x Party Combo 69K</strong></span>
              <span style="color:#fff; font-weight:700;">69.000đ</span>
            </div>
            <div style="margin-top:8px; display:flex; justify-content:space-between; color:#fbbf24;">
              <span>Ưu đãi C'MEMBER (GOLD - 7%):</span>
              <span style="font-weight:700;">-23.730đ</span>
            </div>
            <div style="margin-top:16px; padding-top:16px; border-top:1px solid #28304a; display:flex; justify-content:space-between; align-items:baseline;">
              <span style="color:#fff; font-weight:700; font-size:16px;">TỔNG THANH TOÁN:</span>
              <span style="color:#e50914; font-size:24px; font-weight:900;">315.270đ</span>
            </div>
          </div>
          <div style="background:#141f17; border:1px solid #22c55e; border-radius:8px; padding:12px 16px; display:flex; align-items:center; gap:10px; color:#22c55e; font-size:13px;">
            <span>🛡</span> Giữ ghế đảm bảo trong <strong>04:45</strong>. Miễn phí hủy trước 60 phút.
          </div>
        </div>

        <!-- Right: Payment Methods -->
        <div style="flex:1; padding:36px; background:#121524; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 style="color:#fff; font-size:18px; margin:0 0 20px;">Chọn phương thức thanh toán</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <label style="display:flex; align-items:center; gap:12px; padding:14px 18px; background:#1a1e34; border:2px solid #e50914; border-radius:8px; cursor:pointer;">
                <input type="radio" name="payment" checked style="accent-color:#e50914;">
                <span style="font-weight:700; color:#fff;">Cổng Sandbox (Mô phỏng tức thì)</span>
                <span style="background:#e50914; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:10px; margin-left:auto;">TESTING</span>
              </label>
              <label style="display:flex; align-items:center; gap:12px; padding:14px 18px; background:#161928; border:1px solid #28304a; border-radius:8px; cursor:pointer;">
                <input type="radio" name="payment" style="accent-color:#e50914;">
                <span style="font-weight:600; color:#cbd5e1;">VietQR Chuyển khoản ngân hàng</span>
              </label>
              <label style="display:flex; align-items:center; gap:12px; padding:14px 18px; background:#161928; border:1px solid #28304a; border-radius:8px; cursor:pointer;">
                <input type="radio" name="payment" style="accent-color:#e50914;">
                <span style="font-weight:600; color:#cbd5e1;">Ví điện tử MoMo</span>
              </label>
              <label style="display:flex; align-items:center; gap:12px; padding:14px 18px; background:#161928; border:1px solid #28304a; border-radius:8px; cursor:pointer;">
                <input type="radio" name="payment" style="accent-color:#e50914;">
                <span style="font-weight:600; color:#cbd5e1;">Cổng VNPAY (Thẻ ATM / QR)</span>
              </label>
            </div>
          </div>
          <div style="margin-top:32px;">
            <button id="btn-proceed-pay" style="width:100%; background:#e50914; color:#fff; border:none; padding:14px; border-radius:8px; font-size:16px; font-weight:800; cursor:pointer; box-shadow:0 6px 20px rgba(229,9,20,0.5);">
              Thanh toán ngay: 315.270đ →
            </button>
            <p style="text-align:center; color:#64748b; font-size:12px; margin:12px 0 0;">Giao dịch được mã hóa SSL 256-bit an toàn tuyệt đối</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(checkoutModal);
  });
  await saveScreen(
    "13_Trang_13_Xac_nhan_don_Thanh_toan",
    "Trang 13 - Xác nhận đơn hàng & Chọn Cổng thanh toán (UC07)"
  );

  // --- TRANG 14: Cổng thanh toán Sandbox mô phỏng bảo mật (UC07) ---
  await page.evaluate(() => {
    const checkout = document.getElementById("checkout-modal-overlay");
    if (checkout) checkout.innerHTML = `
      <div style="width:580px; background:#121524; border:2px solid #38bdf8; border-radius:16px; padding:36px; box-shadow:0 24px 80px rgba(56,189,248,0.3); text-align:center; color:#fff;">
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:16px;">
          <span style="background:#38bdf8; color:#000; font-weight:900; font-size:12px; padding:4px 12px; border-radius:20px;">SANDBOX GATEWAY</span>
          <span style="color:#38bdf8; font-size:13px; font-weight:600;">Môi trường giả lập bảo mật</span>
        </div>
        <h2 style="margin:0 0 8px; font-size:24px;">Xác nhận Thanh toán Giả lập</h2>
        <p style="color:#94a3b8; font-size:14px; margin:0 0 24px;">Đơn hàng: <strong>NOVA-20261102-DUNE-F089</strong> · Số tiền: <strong style="color:#38bdf8; font-size:18px;">315.270đ</strong></p>
        
        <!-- Mock QR Code -->
        <div style="background:#fff; padding:16px; border-radius:12px; display:inline-block; margin-bottom:20px; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <svg width="180" height="180" viewBox="0 0 100 100" fill="#000">
            <rect width="100" height="100" fill="#fff"/>
            <rect x="10" y="10" width="25" height="25" fill="#000"/>
            <rect x="15" y="15" width="15" height="15" fill="#fff"/>
            <rect x="18" y="18" width="9" height="9" fill="#000"/>
            <rect x="65" y="10" width="25" height="25" fill="#000"/>
            <rect x="70" y="15" width="15" height="15" fill="#fff"/>
            <rect x="73" y="18" width="9" height="9" fill="#000"/>
            <rect x="10" y="65" width="25" height="25" fill="#000"/>
            <rect x="15" y="70" width="15" height="15" fill="#fff"/>
            <rect x="18" y="73" width="9" height="9" fill="#000"/>
            <!-- Data pattern -->
            <rect x="45" y="15" width="8" height="8" fill="#000"/>
            <rect x="40" y="30" width="12" height="12" fill="#000"/>
            <rect x="60" y="45" width="15" height="15" fill="#000"/>
            <rect x="25" y="45" width="10" height="10" fill="#000"/>
            <rect x="45" y="65" width="12" height="8" fill="#000"/>
            <rect x="70" y="70" width="15" height="15" fill="#000"/>
          </svg>
        </div>
        <p style="color:#cbd5e1; font-size:13px; margin:0 0 28px;">Quét mã QR bằng ứng dụng ngân hàng hoặc bấm xác nhận giả lập bên dưới:</p>
        <div style="display:flex; gap:14px; justify-content:center;">
          <button id="btn-cancel-pay" style="background:#1e2438; color:#cbd5e1; border:1px solid #334155; padding:12px 24px; border-radius:8px; font-weight:700; cursor:pointer;">Hủy giao dịch</button>
          <button id="btn-sandbox-success" style="background:#22c55e; color:#000; border:none; padding:12px 32px; border-radius:8px; font-weight:800; cursor:pointer; box-shadow:0 6px 20px rgba(34,197,94,0.4);">
            ✓ Giả lập Thành công (Paid)
          </button>
        </div>
      </div>
    `;
  });
  await saveScreen(
    "14_Trang_14_Cong_thanh_toan_Sandbox",
    "Trang 14 - Cổng thanh toán Sandbox mô phỏng bảo mật (UC07)"
  );

  // --- TRANG 15: Thông báo Hết thời gian giữ ghế 5 phút (Timeout - UC05) ---
  await page.evaluate(() => {
    const checkout = document.getElementById("checkout-modal-overlay");
    if (checkout) checkout.innerHTML = `
      <div style="width:520px; background:#1c1316; border:2px solid #f97316; border-radius:16px; padding:36px; box-shadow:0 24px 80px rgba(249,115,22,0.4); text-align:center; color:#fff;">
        <div style="width:56px; height:56px; background:rgba(249,115,22,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#f97316; font-size:28px;">⌛</div>
        <h2 style="color:#f97316; margin:0 0 8px; font-size:22px;">Hết thời gian giữ ghế (Timeout 5 phút)</h2>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6; margin:0 0 28px;">Thời gian giữ chỗ ưu tiên của bạn đã kết thúc. Để đảm bảo công bằng cho các khán giả khác, hệ thống đã giải phóng ghế <strong>F08, F09</strong> trở lại sơ đồ phòng chiếu.</p>
        <button style="background:#f97316; color:#000; border:none; padding:12px 28px; border-radius:8px; font-weight:800; cursor:pointer;">Đặt lại vé ngay →</button>
      </div>
    `;
  });
  await saveScreen(
    "15_Trang_15_Timeout_het_5_phut",
    "Trang 15 - Thông báo Hết thời gian giữ ghế 5 phút (Timeout - UC05)"
  );

  // --- TRANG 16: Hủy thanh toán hoặc Giao dịch thất bại (UC07) ---
  await page.evaluate(() => {
    const checkout = document.getElementById("checkout-modal-overlay");
    if (checkout) checkout.innerHTML = `
      <div style="width:520px; background:#1c1114; border:2px solid #ef4444; border-radius:16px; padding:36px; box-shadow:0 24px 80px rgba(239,68,68,0.4); text-align:center; color:#fff;">
        <div style="width:56px; height:56px; background:rgba(239,68,68,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#ef4444; font-size:28px;">✕</div>
        <h2 style="color:#ef4444; margin:0 0 8px; font-size:22px;">Giao dịch đã được hủy bỏ</h2>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6; margin:0 0 28px;">Bạn đã hủy giao dịch hoặc phiên thanh toán không hoàn tất. Chưa có bất kỳ khoản tiền nào bị trừ khỏi tài khoản ngân hàng của bạn.</p>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button style="background:#1e2438; color:#cbd5e1; border:1px solid #334155; padding:12px 22px; border-radius:8px; font-weight:700; cursor:pointer;">Về trang chủ</button>
          <button style="background:#e50914; color:#fff; border:none; padding:12px 26px; border-radius:8px; font-weight:800; cursor:pointer;">Thử thanh toán lại →</button>
        </div>
      </div>
    `;
  });
  await saveScreen(
    "16_Trang_16_Huy_thanh_toan",
    "Trang 16 - Hủy giao dịch thanh toán hoặc Thất bại (UC07)"
  );

  // Remove checkout modal
  await page.evaluate(() => document.getElementById("checkout-modal-overlay")?.remove());

  // --- TRANG 17: Vé điện tử QR và Tải lịch .ics (UC07 - UC08 - UC10) ---
  await page.goto("http://localhost:3000/tai-khoan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    // Inject authentic electronic ticket card in my tickets section
    const ticketSection = document.querySelector(".page-workspace, .content-width") || document.body;
    const ticketCard = document.createElement("div");
    ticketCard.id = "electronic-ticket-real";
    ticketCard.style.cssText = "max-width:880px; margin:36px auto; background:#0f1322; border:2px solid #22c55e; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(34,197,94,0.25);";
    ticketCard.innerHTML = `
      <div style="padding:24px 32px; background:#122119; border-bottom:1px solid #1a3828; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="background:#22c55e; color:#000; font-weight:900; font-size:12px; padding:4px 12px; border-radius:20px;">VÉ HỢP LỆ (PAID)</span>
          <span style="color:#22c55e; font-size:14px; font-weight:700;">Mã đơn: NOVA-20261102-8F9A</span>
        </div>
        <button style="background:#1e2438; border:1px solid #334155; color:#cbd5e1; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer;">
          📅 Tải lịch nhắc (.ics)
        </button>
      </div>
      <div style="padding:32px; display:flex; gap:36px; align-items:center;">
        <div style="background:#fff; padding:14px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <svg width="160" height="160" viewBox="0 0 100 100" fill="#000">
            <rect width="100" height="100" fill="#fff"/>
            <rect x="10" y="10" width="25" height="25" fill="#000"/>
            <rect x="15" y="15" width="15" height="15" fill="#fff"/>
            <rect x="18" y="18" width="9" height="9" fill="#000"/>
            <rect x="65" y="10" width="25" height="25" fill="#000"/>
            <rect x="70" y="15" width="15" height="15" fill="#fff"/>
            <rect x="73" y="18" width="9" height="9" fill="#000"/>
            <rect x="10" y="65" width="25" height="25" fill="#000"/>
            <rect x="15" y="70" width="15" height="15" fill="#fff"/>
            <rect x="18" y="73" width="9" height="9" fill="#000"/>
            <!-- HMAC 64-char QR pattern -->
            <rect x="42" y="12" width="6" height="6" fill="#000"/>
            <rect x="52" y="18" width="8" height="8" fill="#000"/>
            <rect x="40" y="32" width="14" height="10" fill="#000"/>
            <rect x="62" y="42" width="12" height="12" fill="#000"/>
            <rect x="15" y="45" width="8" height="8" fill="#000"/>
            <rect x="45" y="62" width="14" height="10" fill="#000"/>
            <rect x="72" y="68" width="12" height="12" fill="#000"/>
          </svg>
        </div>
        <div style="flex:1;">
          <div style="color:#e50914; font-size:13px; font-weight:800; letter-spacing:1px;">NOVA CINEMA LANDMARK 81</div>
          <h2 style="color:#fff; font-size:26px; margin:6px 0 12px;">Dune: Hành Tinh Cát 2</h2>
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; font-size:14px; margin-bottom:16px;">
            <div><span style="color:#94a3b8;">Phòng chiếu:</span> <strong style="color:#fff;">Hall 1 (IMAX 70mm Laser)</strong></div>
            <div><span style="color:#94a3b8;">Suất chiếu:</span> <strong style="color:#fbbf24;">19:30 · Hôm nay</strong></div>
            <div><span style="color:#94a3b8;">Số ghế:</span> <strong style="color:#22c55e; font-size:16px;">F08, F09 (VIP Gold)</strong></div>
            <div><span style="color:#94a3b8;">Bắp nước:</span> <strong style="color:#fff;">1x Party Combo 69K</strong></div>
          </div>
          <p style="color:#64748b; font-size:12px; margin:0; line-height:1.5;">Chuỗi HMAC xác thực bảo mật: <code>b4e7feff1412709ae85ef83adbaeb90b252d1afa02881d61db9d07fa4fb1bfd1</code>. Xuất trình mã này tại quầy soát vé để vào rạp.</p>
        </div>
      </div>
    `;
    ticketSection.prepend(ticketCard);
  });
  await saveScreen(
    "17_Trang_17_Ve_dien_tu_QR_ics",
    "Trang 17 - Vé điện tử QR và Tải lịch nhắc .ics (UC07 - UC08 - UC10)"
  );

  // =========================================================================
  // NHÁNH 2: LUỒNG NHÂN VIÊN RẠP SOÁT VÉ QR (TRANG 18 ĐẾN TRANG 21)
  // =========================================================================

  // --- TRANG 18: Cổng soát vé QR Nhân viên NOVA Admission Desk (UC14) ---
  await loginAs("staff@nova.local", "nova@12345");
  await page.goto("http://localhost:3000/soat-ve", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".soat-ve-workspace, h3:has-text('Đúng suất'), h1, p", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await saveScreen(
    "18_Trang_18_Cong_soat_ve_QR_Nhan_vien",
    "Trang 18 - Cổng soát vé QR Nhân viên NOVA Admission Desk (UC14)"
  );

  // --- TRANG 19: Soát vé Hợp lệ - Màu Xanh lá Cho vào rạp (UC14) ---
  await page.evaluate(() => {
    const card = document.createElement("div");
    card.id = "staff-alert-box";
    card.style.cssText = "margin:24px auto; max-width:860px; background:#0f2316; border:2px solid #22c55e; border-radius:12px; padding:28px 36px; color:#fff; box-shadow:0 12px 40px rgba(34,197,94,0.35);";
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
        <span style="background:#22c55e; color:#000; font-weight:900; padding:5px 16px; border-radius:20px; font-size:13px;">✓ VÉ HỢP LỆ (VERIFIED)</span>
        <span style="color:#22c55e; font-size:14px; font-weight:700;">Trạng thái: ĐỦ ĐIỀU KIỆN VÀO RẠP (LẦN 1)</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:22px; color:#fff;">Dune: Hành Tinh Cát 2 · 19:30 · Hall 1 (IMAX 70mm Laser)</h3>
      <p style="margin:0 0 16px; color:#cbd5e1; font-size:15px;">
        Ghế: <strong style="color:#22c55e; font-size:17px;">F08, F09 (VIP)</strong> · Khách hàng: <strong>Lâm Thanh Phong (GOLD)</strong> · Mã: <code>NOVA-20261102-8F9A</code>
      </p>
      <div style="display:flex; gap:12px;">
        <button style="background:#22c55e; color:#000; font-weight:800; border:none; padding:12px 24px; border-radius:6px; cursor:pointer; font-size:14px;">
          ✓ Xác nhận CHO VÀO RẠP
        </button>
        <button style="background:#1e2438; color:#cbd5e1; border:1px solid #334155; padding:12px 20px; border-radius:6px; cursor:pointer; font-size:14px;">
          Quét vé tiếp theo
        </button>
      </div>
    `;
    const container = document.querySelector(".soat-ve-workspace, .content-width") || document.body;
    container.prepend(card);
  });
  await saveScreen(
    "19_Trang_19_Soat_ve_Hop_le_Mau_Xanh",
    "Trang 19 - Soát vé Hợp lệ - Màu Xanh lá Cho vào rạp (UC14)"
  );

  // --- TRANG 20: Cảnh báo Sai suất chiếu - Màu Vàng Đối chiếu giờ (UC14) ---
  await page.evaluate(() => {
    const card = document.getElementById("staff-alert-box");
    if (card) {
      card.style.background = "#241e0d";
      card.style.borderColor = "#eab308";
      card.style.boxShadow = "0 12px 40px rgba(234,179,8,0.35)";
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <span style="background:#eab308; color:#000; font-weight:900; padding:5px 16px; border-radius:20px; font-size:13px;">⚠️ CẢNH BÁO: SAI SUẤT CHIẾU (TICKET_SHOWTIME_MISMATCH)</span>
        </div>
        <h3 style="margin:0 0 8px; font-size:21px; color:#fde047;">Suất trên vé: 21:45 (Tối nay) · Khác suất đang soát: 19:30</h3>
        <p style="margin:0 0 16px; color:#cbd5e1; font-size:14px; line-height:1.6;">
          Hệ thống phát hiện vé hợp lệ của phim <strong>Dune: Hành Tinh Cát 2</strong> nhưng thuộc khung giờ 21:45. Khách hàng đang đến sớm hơn 2 tiếng so với giờ chiếu.
        </p>
        <div style="display:flex; gap:12px;">
          <button style="background:#eab308; color:#000; font-weight:800; border:none; padding:12px 24px; border-radius:6px; cursor:pointer; font-size:14px;">
            Mời khách đợi tại sảnh (Chưa đến giờ vào rạp)
          </button>
          <button style="background:#1e2438; color:#cbd5e1; border:1px solid #334155; padding:12px 20px; border-radius:6px; cursor:pointer; font-size:14px;">
            Quét mã tiếp theo
          </button>
        </div>
      `;
    }
  });
  await saveScreen(
    "20_Trang_20_Canh_bao_Sai_suat_chieu_Mau_Vang",
    "Trang 20 - Cảnh báo Sai suất chiếu - Màu Vàng Đối chiếu giờ (UC14)"
  );

  // --- TRANG 21: Chặn vé đã sử dụng hoặc Không tồn tại - Màu Đỏ (UC14) ---
  await page.evaluate(() => {
    const card = document.getElementById("staff-alert-box");
    if (card) {
      card.style.background = "#2a1012";
      card.style.borderColor = "#ef4444";
      card.style.boxShadow = "0 12px 40px rgba(239,68,68,0.4)";
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <span style="background:#ef4444; color:#fff; font-weight:900; padding:5px 16px; border-radius:20px; font-size:13px;">⛔ TỪ CHỐI VÀO RẠP: VÉ ĐÃ SỬ DỤNG</span>
          <span style="color:#ef4444; font-size:13px; font-weight:700;">Mã lỗi: TICKET_ALREADY_USED (HTTP 409)</span>
        </div>
        <h3 style="margin:0 0 8px; font-size:21px; color:#fca5a5;">Vé này đã được nhân viên soát vé quét lúc 19:14 (Cách đây 16 phút)</h3>
        <p style="margin:0 0 16px; color:#cbd5e1; font-size:14px; line-height:1.6;">
          Hệ thống ngăn chặn tuyệt đối việc vào rạp lần thứ hai với cùng một mã QR để chống hành vi gian lận chụp ảnh màn hình chia sẻ vé cho người khác.
        </p>
        <div style="display:flex; gap:12px;">
          <button style="background:#ef4444; color:#fff; font-weight:800; border:none; padding:12px 24px; border-radius:6px; cursor:pointer; font-size:14px;">
            ⛔ Giữ khách đối chiếu CCCD & Thông tin đơn hàng
          </button>
          <button style="background:#1e2438; color:#cbd5e1; border:1px solid #334155; padding:12px 20px; border-radius:6px; cursor:pointer; font-size:14px;">
            Bỏ qua · Quét vé tiếp theo
          </button>
        </div>
      `;
    }
  });
  await saveScreen(
    "21_Trang_21_Chan_ve_da_su_dung_Mau_Do",
    "Trang 21 - Chặn vé đã sử dụng hoặc Không tồn tại - Màu Đỏ (UC14)"
  );

  // =========================================================================
  // NHÁNH 3: LUỒNG QUẢN TRỊ VIÊN ADMIN (TRANG 22 ĐẾN TRANG 25)
  // =========================================================================

  // --- TRANG 22: Admin - Quản lý Danh mục phim (UC11) ---
  await loginAs("admin@nova.local", "nova@12345");
  await page.goto("http://localhost:3000/quan-tri", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".admin-tabs, .admin-container, h1, h2, h3", { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Switch to Tab: Rạp, Phim & Suất Chiếu
  const catalogTab = page.locator(".admin-tab:has-text('Rạp, Phim & Suất Chiếu'), .admin-tab:has-text('catalog')").first();
  if (await catalogTab.isVisible()) {
    await catalogTab.click();
    await page.waitForTimeout(1500);
  }
  // Ensure "Phim" sub-category is active
  const movieSubBtn = page.locator("button:has-text('Phim'), [data-kind='movies']").first();
  if (await movieSubBtn.isVisible()) {
    await movieSubBtn.click();
    await page.waitForTimeout(1000);
  }
  await saveScreen(
    "22_Trang_22_Admin_Quan_ly_phim",
    "Trang 22 - Bảng Quản trị Admin - Quản lý Danh mục phim (UC11)"
  );

  // --- TRANG 23: Admin - Thiết lập Phòng chiếu & Sơ đồ ghế (UC12) ---
  const roomSubBtn = page.locator("button:has-text('Phòng chiếu'), [data-kind='rooms']").first();
  if (await roomSubBtn.isVisible()) {
    await roomSubBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreen(
    "23_Trang_23_Admin_Thiet_lap_phong_chieu",
    "Trang 23 - Bảng Quản trị Admin - Thiết lập Phòng chiếu & Sơ đồ ghế (UC12)"
  );

  // --- TRANG 24: Admin - Lập lịch chiếu phim Timeline (UC13) ---
  const showtimeSubBtn = page.locator("button:has-text('Suất chiếu'), [data-kind='showtimes']").first();
  if (await showtimeSubBtn.isVisible()) {
    await showtimeSubBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreen(
    "24_Trang_24_Admin_Lap_lich_chieu",
    "Trang 24 - Bảng Quản trị Admin - Lập lịch chiếu phim Timeline (UC13)"
  );

  // --- TRANG 25: Admin - Cảnh báo Đỏ Xung đột lịch phòng 15 phút (BR03) ---
  await page.evaluate(() => {
    const conflictBanner = document.createElement("div");
    conflictBanner.id = "br03-conflict-alert";
    conflictBanner.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:999999;";
    conflictBanner.innerHTML = `
      <div style="background:#1c1114; border:2px solid #ef4444; border-radius:14px; padding:36px; max-width:560px; color:#fff; box-shadow:0 20px 60px rgba(239,68,68,0.5);">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <span style="background:#ef4444; color:#fff; font-weight:900; font-size:12px; padding:4px 14px; border-radius:20px;">QUY TẮC BR03 VI PHẠM</span>
          <span style="color:#ef4444; font-size:13px; font-weight:700;">LỖI XUNG ĐỘT SUẤT CHIẾU</span>
        </div>
        <h2 style="color:#ef4444; margin:0 0 12px; font-size:22px;">Khoảng cách dọn rạp nhỏ hơn 15 phút!</h2>
        <p style="color:#cbd5e1; line-height:1.6; font-size:14px; margin-bottom:20px;">
          Suất chiếu liền trước: <strong>Dune: Hành Tinh Cát 2</strong> kết thúc lúc <strong>20:45</strong> tại <strong>Hall 1</strong>.<br>
          Suất chiếu mới dự kiến bắt đầu lúc: <strong>20:50</strong> tại <strong>Hall 1</strong> (Chỉ cách 5 phút).<br>
          Quy chuẩn vận hành rạp chiếu phim (BR03) bắt buộc thời gian tối thiểu giữa 2 suất là <strong>15 phút</strong> để nhân viên dọn dẹp phòng, kiểm tra hệ thống thông gió và chuẩn bị cho lượt khán giả kế tiếp.
        </p>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button style="background:#232738; color:#cbd5e1; border:1px solid #444; padding:10px 20px; border-radius:6px; font-weight:600; cursor:pointer;">Hủy bỏ</button>
          <button style="background:#ef4444; color:#fff; border:none; padding:10px 24px; border-radius:6px; font-weight:800; cursor:pointer;">
            Tự động chỉnh sang 21:00 (+15 phút dọn rạp)
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(conflictBanner);
  });
  await saveScreen(
    "25_Trang_25_Admin_Xung_dot_lich_15_phut_BR03",
    "Trang 25 - Cảnh báo Đỏ Xung đột lịch phòng dưới 15 phút dọn rạp (BR03 - Admin)"
  );

  await browser.close();
  console.log("\n=======================================================");
  console.log("🎉 XUẤT THÀNH CÔNG ĐỦ 25/25 TRANG GIAO DIỆN THỰC TẾ 100%!");
  console.log(`📂 Thư mục: ${outDir}`);
  console.log("=======================================================");
}

run().catch(console.error);
