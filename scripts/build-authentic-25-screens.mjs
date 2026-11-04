import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(root, "frontend/public/figma-screens-native");
const rootOut = path.resolve(root, "public/figma-screens-native");

for (const d of [outDir, rootOut]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Read and encode key images to base64
function toBase64(relPath) {
  const full = path.resolve(root, "frontend/public/images", relPath);
  if (fs.existsSync(full)) {
    const ext = path.extname(full).toLowerCase() === ".png" ? "png" : "jpeg";
    return `data:image/${ext};base64,${fs.readFileSync(full).toString("base64")}`;
  }
  return "";
}

console.log("Encoding artwork to base64...");
const imgDunePoster = toBase64("dune-poster.jpg");
const imgDuneScene = toBase64("dune-scene.jpg");
const imgKongArt = toBase64("kong-art.jpg");
const imgOppenheimer = toBase64("oppenheimer-art.jpg");
const imgBatman = toBase64("batman-poster.jpg");
const imgCinemaAuditorium = toBase64("cinema-auditorium.jpg");
const imgCinemaImax = toBase64("cinema-imax.jpg");

// Brand Header Helper
function renderHeader(isLoggedIn = false, activeNav = "Phim") {
  return `
  <header style="display:flex;justify-content:space-between;align-items:center;padding:16px 60px;background:rgba(11,13,23,0.95);border-bottom:1px solid #1f2438;width:1440px;box-sizing:border-box;position:sticky;top:0;z-index:50;">
    <div style="display:flex;align-items:center;gap:36px;">
      <div style="display:flex;align-items:center;gap:10px;font-weight:900;font-size:22px;letter-spacing:1px;">
        <svg width="32" height="24" viewBox="0 0 34 26" fill="none">
          <path d="M2 24L10 2L15 14L20 2L28 24H22L18 12L14 24H2Z" fill="url(#novaGrad)"/>
          <defs>
            <linearGradient id="novaGrad" x1="2" y1="2" x2="28" y2="24" gradientUnits="userSpaceOnUse">
              <stop stop-color="#00d2ff"/>
              <stop offset="0.5" stop-color="#fbbf24"/>
              <stop offset="1" stop-color="#e50914"/>
            </linearGradient>
          </defs>
        </svg>
        <span style="color:#ffffff;">NOVA</span>
        <span style="color:#e50914;font-size:13px;margin-left:-6px;letter-spacing:3px;">CINEMA</span>
      </div>
      <nav style="display:flex;gap:24px;font-size:14px;font-weight:600;">
        ${["Phim", "Sắp chiếu", "Lịch chiếu", "Tìm rạp NOVA", "Ưu đãi", "Bắp nước", "C'MEMBER"].map(n => `
          <span style="color:${n === activeNav ? '#ffffff' : '#94a3b8'};cursor:pointer;border-bottom:${n === activeNav ? '2px solid #e50914' : 'none'};padding-bottom:4px;">${n}</span>
        `).join("")}
      </nav>
    </div>
    <div style="display:flex;align-items:center;gap:18px;">
      <div style="display:flex;align-items:center;gap:8px;background:#161928;padding:6px 14px;border-radius:20px;border:1px solid #28304a;color:#94a3b8;font-size:13px;">
        <span style="color:#fff;font-weight:700;">VI</span> | <span>EN</span>
      </div>
      ${isLoggedIn ? `
        <div style="display:flex;align-items:center;gap:10px;background:#1a1d30;border:1px solid #fbbf24;padding:8px 16px;border-radius:20px;">
          <span style="color:#fbbf24;font-size:14px;">👑</span>
          <span style="color:#fff;font-weight:700;font-size:13px;">Lâm Thanh Phong</span>
          <span style="background:#fbbf24;color:#000;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;">GOLD · 50.000đ</span>
        </div>
      ` : `
        <button style="background:transparent;border:1px solid #334155;color:#fff;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;">Đăng nhập</button>
      `}
      <button style="background:#e50914;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(229,9,20,0.4);">Đặt vé ngay</button>
    </div>
  </header>
  `;
}

// Common Footer Helper
function renderFooter() {
  return `
  <footer style="background:#070911;border-top:1px solid #1a1e30;padding:48px 60px 24px;width:1440px;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;margin-bottom:36px;">
      <div style="max-width:340px;">
        <div style="font-weight:900;font-size:20px;color:#fff;margin-bottom:12px;">▲ NOVA CINEMA</div>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">Hệ thống rạp chiếu phim chuẩn quốc tế với màn hình IMAX Laser và âm thanh Dolby Atmos đa chiều rúng động.</p>
      </div>
      <div style="display:flex;gap:60px;font-size:13px;color:#94a3b8;">
        <div>
          <h4 style="color:#fff;font-size:14px;margin-bottom:14px;">KHÁM PHÁ NOVA</h4>
          <p style="margin:8px 0;">Phim đang chiếu</p>
          <p style="margin:8px 0;">Sắp chiếu tháng sau</p>
          <p style="margin:8px 0;">Hệ thống rạp & phòng</p>
        </div>
        <div>
          <h4 style="color:#fff;font-size:14px;margin-bottom:14px;">ĐỒNG HÀNH</h4>
          <p style="margin:8px 0;">Hướng dẫn đặt vé</p>
          <p style="margin:8px 0;">Câu hỏi thường gặp</p>
          <p style="margin:8px 0;">Hội viên C'MEMBER</p>
        </div>
        <div>
          <h4 style="color:#fff;font-size:14px;margin-bottom:14px;">THANH TOÁN</h4>
          <p style="margin:8px 0;">VietQR chuyển khoản</p>
          <p style="margin:8px 0;">Ví MoMo / ZaloPay</p>
          <p style="margin:8px 0;">Payment Sandbox Test</p>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid #141724;padding-top:18px;display:flex;justify-content:space-between;color:#475569;font-size:12px;">
      <span>© 2026 NOVA Cinema (INFINITY Club). Dự án môn Công nghệ phần mềm.</span>
      <span>Bảo mật dữ liệu chuẩn Argon2id & JWT Token</span>
    </div>
  </footer>
  `;
}

// Seat Grid Generator Helper
function renderSeatGrid(selectedCodes = [], isHolding = false) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];
  return `
  <div style="display:flex;flex-direction:column;align-items:center;padding:20px 40px;background:#080a13;width:1440px;box-sizing:border-box;">
    <!-- Screen Curved Bar -->
    <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:30px;">
      <div style="width:720px;height:8px;background:linear-gradient(90deg, #00d2ff, #e50914);border-radius:4px;box-shadow:0 6px 30px rgba(229,9,20,0.6);"></div>
      <span style="color:#64748b;font-size:12px;letter-spacing:4px;margin-top:10px;font-weight:700;">MÀN HÌNH CHIẾU VÔ CỰC IMAX LASER</span>
    </div>

    <!-- Seat Matrix -->
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:28px;">
      ${rows.map(r => `
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="width:24px;font-size:13px;font-weight:800;color:#64748b;text-align:center;">${r}</span>
          ${Array.from({ length: 14 }, (_, i) => i + 1).map(c => {
            const code = `${r}${String(c).padStart(2, "0")}`;
            const isSelected = selectedCodes.includes(code);
            const isVip = ["E", "F", "G"].includes(r);
            const isSweetbox = r === "K";
            let bg = isVip ? "#241829" : "#141728";
            let border = isVip ? "1px solid #7c2d12" : "1px solid #232840";
            let color = "#94a3b8";

            if (isSelected) {
              bg = "#e50914";
              border = "2px solid #ffffff";
              color = "#ffffff";
            }
            if (isSweetbox) {
              bg = "#3b1222";
              border = "1px solid #be185d";
            }

            return `
              <div style="width:36px;height:34px;background:${bg};border:${border};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:${isSelected ? '800' : '600'};color:${color};box-shadow:${isSelected ? '0 0 14px rgba(229,9,20,0.8)' : 'none'};cursor:pointer;">
                ${code}
              </div>
            `;
          }).join("")}
          <span style="width:24px;font-size:13px;font-weight:800;color:#64748b;text-align:center;">${r}</span>
        </div>
      `).join("")}
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:36px;font-size:13px;color:#94a3b8;background:#101322;padding:12px 28px;border-radius:24px;border:1px solid #1f253d;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;background:#141728;border:1px solid #232840;border-radius:4px;"></span> Ghế thường (110.000đ)</div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;background:#241829;border:1px solid #7c2d12;border-radius:4px;"></span> Ghế VIP (140.000đ)</div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;background:#3b1222;border:1px solid #be185d;border-radius:4px;"></span> Ghế đôi Sweetbox (260.000đ)</div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;background:#e50914;border:2px solid #fff;border-radius:4px;"></span> Đang chọn (${selectedCodes.length ? selectedCodes.join(", ") : "0"})</div>
    </div>
  </div>
  `;
}

// Generate an HTML Document with full CSS
function wrapHtml(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1440, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #0b0d17; color: #f8fafc; width: 1440px; margin: 0 auto; overflow-x: hidden; }
    button { cursor: pointer; transition: all 0.2s ease; outline: none; }
    button:hover { opacity: 0.92; transform: translateY(-1px); }
    input, select { outline: none; }
  </style>
</head>
<body id="${title.replace(/[^\w]/g, '_')}">
  ${bodyContent}
</body>
</html>`;
}

console.log("Constructing 25 authentic, high-fidelity screens...");

const screens = [];

// =========================================================================
// TRANG 01: Trang chủ Khách vãng lai
// =========================================================================
screens.push({
  file: "01_Trang_01_Trang_chu_NOVA_Cinema.html",
  title: "Trang 01 - Trang chủ NOVA Cinema (Khách vãng lai)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(false, "Phim")}
    <!-- Hero Banner with Real Artwork -->
    <section style="position:relative;height:540px;background:linear-gradient(180deg, rgba(11,13,23,0.3) 0%, #0b0d17 100%), url('${imgDuneScene || imgCinemaImax}') center/cover;padding:60px 80px;display:flex;flex-direction:column;justify-content:flex-end;">
      <span style="color:#e50914;font-weight:900;font-size:14px;letter-spacing:3px;margin-bottom:8px;">BOM TẤN THÁNG 2 · CÔNG NGHỆ IMAX LASER</span>
      <h1 style="font-size:52px;font-weight:900;margin:0 0 16px;line-height:1.15;max-width:800px;text-shadow:0 4px 20px rgba(0,0,0,0.8);">
        Dune: Hành Tinh Cát 2
      </h1>
      <p style="color:#cbd5e1;max-width:680px;font-size:15px;line-height:1.6;margin:0 0 28px;text-shadow:0 2px 8px rgba(0,0,0,0.8);">
        Hành trình định mệnh của Paul Atreides giữa biển cát Arrakis trên màn chiếu vô cực IMAX Laser 70mm và hệ thống âm thanh vòm Dolby Atmos đa chiều.
      </p>
      <div style="display:flex;gap:16px;">
        <button style="background:#e50914;color:#fff;border:none;padding:15px 32px;border-radius:8px;font-weight:800;font-size:15px;box-shadow:0 4px 18px rgba(229,9,20,0.5);">Đặt vé nhanh ngay</button>
        <button style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.25);padding:15px 28px;border-radius:8px;font-weight:600;font-size:15px;backdrop-filter:blur(8px);">Xem Trailer 4K</button>
      </div>
    </section>

    <!-- Quick Booking Strip -->
    <section style="padding:28px 80px;background:#111422;border-top:1px solid #1f253d;border-bottom:1px solid #1f253d;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="color:#e50914;font-weight:800;font-size:12px;letter-spacing:2px;">ĐẶT VÉ NHANH</span>
          <h2 style="font-size:20px;margin:2px 0 0;">Chọn rạp · Chọn phim · Hẹn giờ</h2>
        </div>
        <div style="display:flex;gap:16px;">
          <select style="background:#1a1e30;color:#fff;border:1px solid #2d3552;padding:12px 18px;border-radius:8px;font-size:14px;"><option>01 · NOVA Sala Thủ Thiêm</option></select>
          <select style="background:#1a1e30;color:#fff;border:1px solid #2d3552;padding:12px 18px;border-radius:8px;font-size:14px;"><option>02 · Dune: Hành Tinh Cát 2</option></select>
          <select style="background:#1a1e30;color:#fff;border:1px solid #2d3552;padding:12px 18px;border-radius:8px;font-size:14px;"><option>03 · Hôm nay (11/02)</option></select>
          <select style="background:#1a1e30;color:#fff;border:1px solid #2d3552;padding:12px 18px;border-radius:8px;font-size:14px;"><option>04 · 18:30 (IMAX Laser)</option></select>
          <button style="background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:800;font-size:14px;">Mua vé</button>
        </div>
      </div>
    </section>

    <!-- Movie Catalogue Grid with Real Posters -->
    <section style="padding:48px 80px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <h2 style="font-size:24px;font-weight:800;">Phim Đang Chiếu Tuyển Chọn</h2>
        <span style="color:#94a3b8;font-size:14px;cursor:pointer;">Xem tất cả 12 phim ↗</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:28px;">
        <!-- Card 1: Dune -->
        <div style="background:#131626;border:1px solid #222840;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="height:380px;background:url('${imgDunePoster}') center/cover;position:relative;">
            <span style="position:absolute;top:12px;left:12px;background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px;">T16</span>
            <span style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);color:#fbbf24;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">★ 8.8</span>
          </div>
          <div style="padding:16px;">
            <h3 style="font-size:16px;font-weight:800;margin:0 0 6px;">Dune: Hành Tinh Cát 2</h3>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 14px;">IMAX Laser · 166 phút</p>
            <button style="width:100%;background:#e50914;color:#fff;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700;">Đặt vé ngay</button>
          </div>
        </div>

        <!-- Card 2: Kong -->
        <div style="background:#131626;border:1px solid #222840;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="height:380px;background:url('${imgKongArt}') center/cover;position:relative;">
            <span style="position:absolute;top:12px;left:12px;background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px;">T13</span>
            <span style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);color:#fbbf24;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">★ 7.2</span>
          </div>
          <div style="padding:16px;">
            <h3 style="font-size:16px;font-weight:800;margin:0 0 6px;">Godzilla x Kong</h3>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 14px;">3D IMAX · 115 phút</p>
            <button style="width:100%;background:#1e2438;color:#fff;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700;">Đặt vé ngay</button>
          </div>
        </div>

        <!-- Card 3: Oppenheimer -->
        <div style="background:#131626;border:1px solid #222840;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="height:380px;background:url('${imgOppenheimer}') center/cover;position:relative;">
            <span style="position:absolute;top:12px;left:12px;background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px;">T18</span>
            <span style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);color:#fbbf24;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">★ 8.9</span>
          </div>
          <div style="padding:16px;">
            <h3 style="font-size:16px;font-weight:800;margin:0 0 6px;">Oppenheimer</h3>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 14px;">70mm Re-release · 180 phút</p>
            <button style="width:100%;background:#1e2438;color:#fff;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700;">Đặt vé ngay</button>
          </div>
        </div>

        <!-- Card 4: Batman -->
        <div style="background:#131626;border:1px solid #222840;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="height:380px;background:url('${imgBatman}') center/cover;position:relative;">
            <span style="position:absolute;top:12px;left:12px;background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px;">T16</span>
            <span style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);color:#fbbf24;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">★ 9.0</span>
          </div>
          <div style="padding:16px;">
            <h3 style="font-size:16px;font-weight:800;margin:0 0 6px;">The Dark Knight</h3>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 14px;">Dolby Atmos · 152 phút</p>
            <button style="width:100%;background:#1e2438;color:#fff;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700;">Đặt vé ngay</button>
          </div>
        </div>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 02: Hộp thoại Đăng nhập tài khoản (UC02) - Overlay trên Trang chủ
// =========================================================================
screens.push({
  file: "02_Trang_02_Dang_nhap_UC02.html",
  title: "Trang 02 - Hộp thoại Đăng nhập tài khoản (UC02)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#0b0d17;">
    <!-- Background Homepage with Blur -->
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(false)}
      <div style="height:500px;background:url('${imgDuneScene || imgCinemaImax}') center/cover;"></div>
      ${renderFooter()}
    </div>
    <!-- Modal Dialog in Center -->
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:520px;background:#121524;padding:40px;border-radius:18px;border:1px solid #2a3350;box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <span style="color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:2px;">C'MEMBER / INFINITY CLUB</span>
            <h2 style="font-size:24px;font-weight:800;margin:4px 0 0;">Điện ảnh, dành riêng cho bạn.</h2>
          </div>
          <span style="cursor:pointer;color:#94a3b8;font-size:20px;">✕</span>
        </div>
        <!-- Tabs -->
        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <button style="flex:1;padding:12px;background:#e50914;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;">Đăng nhập</button>
          <button style="flex:1;padding:12px;background:#1a1f33;color:#94a3b8;border:none;border-radius:8px;font-weight:600;font-size:14px;">Đăng ký thành viên</button>
        </div>
        <!-- Form -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Email hoặc Số điện thoại</label>
            <input type="text" value="customer@nova.vn" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:13px 16px;border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Mật khẩu</label>
            <input type="password" value="••••••••••••" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:13px 16px;border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;" />
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#94a3b8;margin:4px 0;">
            <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" checked /> Ghi nhớ đăng nhập</label>
            <span style="color:#e50914;cursor:pointer;">Quên mật khẩu?</span>
          </div>
          <button style="background:#e50914;color:#fff;border:none;padding:15px;border-radius:8px;font-weight:800;font-size:15px;margin-top:6px;box-shadow:0 4px 16px rgba(229,9,20,0.4);">
            Đăng nhập ngay →
          </button>
          <div style="text-align:center;font-size:12px;color:#64748b;margin-top:10px;">
            🔒 Bảo mật mật khẩu Argon2id & JWT Token chuẩn Next.js
          </div>
        </div>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 03: Hộp thoại Đăng ký hội viên mới (UC01)
// =========================================================================
screens.push({
  file: "03_Trang_03_Dang_ky_UC01.html",
  title: "Trang 03 - Hộp thoại Đăng ký hội viên mới (UC01)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#0b0d17;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(false)}
      <div style="height:500px;background:url('${imgDuneScene || imgCinemaImax}') center/cover;"></div>
      ${renderFooter()}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:520px;background:#121524;padding:40px;border-radius:18px;border:1px solid #2a3350;box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <span style="color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:2px;">GIA NHẬP C'MEMBER</span>
            <h2 style="font-size:24px;font-weight:800;margin:4px 0 0;">Tạo tài khoản hội viên mới</h2>
          </div>
          <span style="cursor:pointer;color:#94a3b8;font-size:20px;">✕</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;">Họ và tên</label>
            <input type="text" value="Lâm Thanh Phong" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:11px 14px;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;">Địa chỉ Email</label>
            <input type="email" value="lamthanhphong@gmail.com" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:11px 14px;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;">Số điện thoại</label>
            <input type="tel" value="0901234567" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:11px 14px;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;">Mật khẩu (tối thiểu 8 ký tự)</label>
            <input type="password" value="NovaMember2026!" style="width:100%;background:#1b2034;border:1px solid #2f3856;padding:11px 14px;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>
          <!-- Perks Badge -->
          <div style="background:#1a1e30;padding:12px;border-radius:8px;border:1px solid #29324e;display:flex;gap:12px;align-items:center;">
            <span style="color:#fbbf24;font-size:20px;">🎁</span>
            <span style="font-size:12px;color:#cbd5e1;line-height:1.4;">Tặng ngay voucher bắp 69K & giảm 5% giá vé ngay từ hạng SILVER đầu tiên.</span>
          </div>
          <button style="background:#e50914;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:800;font-size:15px;margin-top:6px;">
            Hoàn tất đăng ký hội viên
          </button>
        </div>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 04: Trang chủ Đã đăng nhập (Hội viên C'MEMBER)
// =========================================================================
screens.push({
  file: "04_Trang_04_Trang_chu_CMEMBER.html",
  title: "Trang 04 - Trang chủ Đã đăng nhập (Hội viên C'MEMBER)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Phim")}
    <!-- Welcome Member VIP Strip -->
    <section style="padding:28px 80px;background:linear-gradient(90deg, #161a2e 0%, #1e172a 100%);border-bottom:1px solid #28304d;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="width:60px;height:60px;border-radius:50%;background:#fbbf24;color:#000;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;">
          P
        </div>
        <div>
          <span style="color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:2px;">C'MEMBER GOLD MEMBER</span>
          <h2 style="font-size:22px;margin:2px 0 0;">Chào mừng trở lại, Lâm Thanh Phong!</h2>
          <p style="color:#94a3b8;font-size:13px;margin:2px 0 0;">Điểm tích lũy: <strong style="color:#22c55e;">50.000 điểm</strong> (Giảm 50.000đ khi đặt vé) · 2 vé đã xem tháng này</p>
        </div>
      </div>
      <div style="display:flex;gap:14px;">
        <button style="background:#1b2138;color:#fff;border:1px solid #323d60;padding:11px 20px;border-radius:8px;font-weight:600;font-size:13px;">Ví vé của tôi (1 vé sắp chiếu)</button>
        <button style="background:#e50914;color:#fff;border:none;padding:11px 22px;border-radius:8px;font-weight:800;font-size:13px;">Đặt vé suất mới</button>
      </div>
    </section>

    <!-- Main Hero -->
    <section style="position:relative;height:480px;background:linear-gradient(180deg, rgba(11,13,23,0.2) 0%, #0b0d17 100%), url('${imgDuneScene || imgCinemaImax}') center/cover;padding:60px 80px;display:flex;flex-direction:column;justify-content:flex-end;">
      <span style="color:#e50914;font-weight:900;font-size:13px;letter-spacing:3px;">PHIM ĐỀ XUẤT CHO BẠN</span>
      <h1 style="font-size:46px;font-weight:900;margin:8px 0 14px;">Dune: Hành Tinh Cát 2</h1>
      <p style="color:#cbd5e1;max-width:640px;font-size:14px;line-height:1.6;margin:0 0 24px;">Hôm nay bạn có suất chiếu yêu thích tại NOVA Sala. Giảm ngay 7% cho hội viên GOLD trên tổng hóa đơn vé và bắp nước.</p>
      <div style="display:flex;gap:14px;">
        <button style="background:#e50914;color:#fff;border:none;padding:14px 28px;border-radius:8px;font-weight:800;font-size:14px;">Chọn suất 18:30 (IMAX)</button>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 05: Hộp thoại Chọn cụm rạp theo khu vực (UC03)
// =========================================================================
screens.push({
  file: "05_Trang_05_Chon_cum_rap_UC03.html",
  title: "Trang 05 - Hộp thoại Chọn cụm rạp theo khu vực (UC03)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#0b0d17;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(true)}
      <div style="height:500px;background:url('${imgDuneScene || imgCinemaImax}') center/cover;"></div>
      ${renderFooter()}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:680px;background:#121524;padding:36px;border-radius:18px;border:1px solid #2a3350;box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <span style="color:#e50914;font-size:12px;font-weight:800;letter-spacing:2px;">ĐIỂM HẸN ĐIỆN ẢNH</span>
            <h2 style="font-size:24px;font-weight:800;margin:4px 0 0;">Chọn Cụm Rạp NOVA Gần Bạn</h2>
          </div>
          <span style="cursor:pointer;color:#94a3b8;font-size:20px;">✕</span>
        </div>
        <!-- Filter Tabs -->
        <div style="display:flex;gap:10px;margin-bottom:20px;">
          <button style="padding:8px 16px;background:#e50914;color:#fff;border:none;border-radius:20px;font-weight:700;font-size:13px;">TP. Hồ Chí Minh</button>
          <button style="padding:8px 16px;background:#1a1f33;color:#94a3b8;border:none;border-radius:20px;font-weight:600;font-size:13px;">Hà Nội</button>
          <button style="padding:8px 16px;background:#1a1f33;color:#94a3b8;border:none;border-radius:20px;font-weight:600;font-size:13px;">Đà Nẵng</button>
        </div>
        <!-- Cinema List -->
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="background:#1a1f34;border:2px solid #e50914;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                <h3 style="font-size:17px;font-weight:800;color:#fff;">NOVA Sala Thủ Thiêm</h3>
                <span style="background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:4px;">RẠP NỔI BẬT</span>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">Khu đô thị Sala, TP. Thủ Đức, TP.HCM · 8 phòng chiếu</p>
              <div style="display:flex;gap:6px;">
                <span style="background:#262f48;color:#00d2ff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">IMAX Laser 70mm</span>
                <span style="background:#262f48;color:#fbbf24;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">Dolby Atmos</span>
              </div>
            </div>
            <button style="background:#e50914;color:#fff;border:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:13px;">Chọn rạp này</button>
          </div>

          <div style="background:#151829;border:1px solid #232a42;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
            <div>
              <h3 style="font-size:17px;font-weight:800;color:#fff;margin-bottom:4px;">NOVA Landmark 81</h3>
              <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">Tầng B1, TTTM Landmark 81, Bình Thạnh · 10 phòng chiếu</p>
              <span style="background:#262f48;color:#00d2ff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">IMAX Laser</span>
            </div>
            <button style="background:#1f263e;color:#fff;border:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:13px;">Chọn rạp</button>
          </div>
        </div>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 06: Chi tiết phim & Lịch chiếu theo ngày (UC03)
// =========================================================================
screens.push({
  file: "06_Trang_06_Chi_tiet_phim_Lich_chieu_UC03.html",
  title: "Trang 06 - Chi tiết phim & Lịch chiếu theo ngày (UC03)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Lịch chiếu")}
    <section style="padding:40px 80px;display:flex;gap:48px;">
      <!-- Poster Column -->
      <div style="width:320px;flex-shrink:0;">
        <div style="width:320px;height:460px;background:url('${imgDunePoster}') center/cover;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,0.8);border:1px solid #272f4a;margin-bottom:16px;"></div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <span style="background:#e50914;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:800;">T16</span>
          <span style="background:#1a2034;color:#00d2ff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;">IMAX Laser</span>
          <span style="background:#1a2034;color:#fbbf24;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;">★ 8.8/10</span>
        </div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.5;">Thời lượng: 166 phút · Đạo diễn: Denis Villeneuve · Diễn viên: Timothée Chalamet, Zendaya</p>
      </div>

      <!-- Showtimes Column -->
      <div style="flex:1;">
        <h1 style="font-size:36px;font-weight:900;margin:0 0 8px;">Dune: Hành Tinh Cát 2</h1>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Paul Atreides hội tụ cùng Chani và người Fremen trên sa mạc cằn cỗi Arrakis, bước vào cuộc chiến báo thù chống lại những kẻ đã hủy diệt gia tộc anh.
        </p>

        <!-- Date Strip -->
        <div style="display:flex;gap:12px;margin-bottom:28px;">
          ${["Hôm nay (11/02)", "Ngày mai (12/02)", "Thứ năm (13/02)", "Thứ sáu (14/02)", "Thứ bảy (15/02)"].map((d, i) => `
            <button style="padding:10px 20px;background:${i === 0 ? '#e50914' : '#141728'};color:#fff;border:${i === 0 ? 'none' : '1px solid #232a42'};border-radius:8px;font-weight:${i === 0 ? '800' : '600'};font-size:13px;">
              ${d}
            </button>
          `).join("")}
        </div>

        <!-- Cinema Showtimes -->
        <div style="background:#121524;border:1px solid #22283e;border-radius:14px;padding:24px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <h3 style="font-size:18px;font-weight:800;color:#fff;">NOVA Sala Thủ Thiêm</h3>
              <p style="color:#94a3b8;font-size:13px;margin:2px 0 0;">Phòng 1 · Màn hình vô cực IMAX Laser 70mm</p>
            </div>
            <span style="color:#22c55e;font-size:13px;font-weight:700;">Còn ghế VIP</span>
          </div>
          <div style="display:flex;gap:16px;">
            <button style="background:#1b2138;color:#fff;border:1px solid #2e3858;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:800;">14:30</button>
            <button style="background:#e50914;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:16px;font-weight:800;box-shadow:0 4px 16px rgba(229,9,20,0.5);">18:30 (IMAX)</button>
            <button style="background:#1b2138;color:#fff;border:1px solid #2e3858;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:800;">21:15</button>
          </div>
        </div>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 07: Trạng thái rỗng khi ngày không có suất chiếu (UC03 Exception)
// =========================================================================
screens.push({
  file: "07_Trang_07_Rong_khong_co_suat_chieu_UC03.html",
  title: "Trang 07 - Trạng thái rỗng khi ngày không có suất chiếu (UC03 Exception)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Lịch chiếu")}
    <section style="padding:80px 80px 120px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:88px;height:88px;border-radius:50%;background:#191d30;display:flex;align-items:center;justify-content:center;font-size:40px;margin-bottom:24px;">
        📅
      </div>
      <h2 style="font-size:26px;font-weight:800;margin:0 0 12px;">Chưa có suất chiếu cho ngày đã chọn</h2>
      <p style="color:#94a3b8;max-width:540px;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Rạp NOVA Sala hiện chưa mở bán suất chiếu cho ngày này hoặc các suất chiếu đã kết thúc. Bạn có thể chọn ngày tiếp theo hoặc đổi cụm rạp khác.
      </p>
      <div style="display:flex;gap:14px;">
        <button style="background:#e50914;color:#fff;border:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:14px;">Xem suất chiếu Ngày mai (12/02)</button>
        <button style="background:#1b2136;color:#fff;border:1px solid #313b5c;padding:13px 24px;border-radius:8px;font-weight:600;font-size:14px;">Đổi rạp Landmark 81</button>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 08: Sơ đồ chọn ghế phòng chiếu ban đầu (UC04)
// =========================================================================
screens.push({
  file: "08_Trang_08_So_do_ghe_ban_dau_UC04.html",
  title: "Trang 08 - Sơ đồ chọn ghế phòng chiếu ban đầu (UC04)",
  html: `
  <main style="width:1440px;background:#080a13;">
    ${renderHeader(true, "Lịch chiếu")}
    <!-- Subheader with Screening Info -->
    <div style="padding:16px 60px;background:#101322;border-bottom:1px solid #1f253d;display:flex;justify-content:space-between;align-items:center;width:1440px;box-sizing:border-box;">
      <div>
        <h2 style="font-size:18px;font-weight:800;margin:0;">Dune: Hành Tinh Cát 2 · Suất 18:30 (IMAX Laser)</h2>
        <p style="color:#94a3b8;font-size:13px;margin:2px 0 0;">NOVA Sala Thủ Thiêm · Phòng chiếu 1 · 140 ghế</p>
      </div>
      <button style="background:#1b2138;color:#fff;border:1px solid #2f385a;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;">
        💡 Gợi ý cụm ghế liền nhau (UC09)
      </button>
    </div>

    ${renderSeatGrid([])}

    <!-- Bottom Action Bar (Unselected) -->
    <div style="padding:18px 60px;background:#101322;border-top:1px solid #1f253d;display:flex;justify-content:space-between;align-items:center;width:1440px;box-sizing:border-box;">
      <span style="color:#64748b;font-size:14px;">Vui lòng chọn ghế trên sơ đồ để bắt đầu giữ chỗ (Tối đa 10 ghế).</span>
      <button style="background:#283048;color:#64748b;border:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;cursor:not-allowed;">Chọn ghế để tiếp tục</button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 09: Bảng gợi ý cụm ghế liền nhau thông minh (UC09)
// =========================================================================
screens.push({
  file: "09_Trang_09_Goi_y_cum_ghe_UC09.html",
  title: "Trang 09 - Bảng gợi ý cụm ghế liền nhau thông minh (UC09)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#080a13;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(true)}
      ${renderSeatGrid([])}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:520px;background:#121524;padding:36px;border-radius:18px;border:2px solid #e50914;box-shadow:0 24px 64px rgba(229,9,20,0.35);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <span style="color:#e50914;font-size:12px;font-weight:800;letter-spacing:2px;">THUẬT TOÁN THÔNG MINH</span>
            <h2 style="font-size:22px;font-weight:800;margin:4px 0 0;">Gợi ý cụm ghế liền nhau (UC09)</h2>
          </div>
          <span style="cursor:pointer;color:#94a3b8;font-size:20px;">✕</span>
        </div>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.5;margin:0 0 20px;">Hệ thống tự động phát hiện cụm ghế trung tâm đẹp nhất phòng IMAX, đảm bảo không bỏ trống ghế đơn lẻ:</p>

        <div style="background:#1a1f33;border:2px solid #22c55e;padding:18px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <span style="color:#22c55e;font-size:11px;font-weight:800;letter-spacing:1px;">CẶP GHẾ VIP ĐẸP NHẤT</span>
            <div style="font-size:24px;font-weight:900;color:#fff;">F08 - F09</div>
            <p style="color:#94a3b8;font-size:12px;margin:2px 0 0;">Tầm nhìn chính diện màn hình 100%</p>
          </div>
          <span style="background:#0f2e1b;color:#22c55e;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:800;">280.000đ</span>
        </div>

        <button style="width:100%;background:#e50914;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:800;font-size:15px;">
          Áp dụng cặp ghế VIP (F08 - F09)
        </button>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 10: Sơ đồ ghế Đã chọn ghế VIP & Đồng hồ giữ ghế 05:00 (CR-01)
// =========================================================================
screens.push({
  file: "10_Trang_10_Giu_ghe_VIP_5_phut_CR01.html",
  title: "Trang 10 - Sơ đồ ghế Đã chọn ghế VIP & Đồng hồ giữ ghế 05:00 (CR-01)",
  html: `
  <main style="width:1440px;background:#080a13;">
    ${renderHeader(true, "Lịch chiếu")}
    <div style="padding:16px 60px;background:#101322;border-bottom:1px solid #1f253d;display:flex;justify-content:space-between;align-items:center;width:1440px;box-sizing:border-box;">
      <div>
        <h2 style="font-size:18px;font-weight:800;margin:0;">Dune: Hành Tinh Cát 2 · Suất 18:30 (IMAX)</h2>
        <p style="color:#94a3b8;font-size:13px;margin:2px 0 0;">NOVA Sala Thủ Thiêm · Phòng 1</p>
      </div>
      <!-- Countdown Timer 5:00 -->
      <div style="display:flex;align-items:center;gap:10px;background:#2d1419;border:1px solid #e50914;padding:8px 18px;border-radius:8px;color:#ff4d58;font-weight:800;box-shadow:0 0 16px rgba(229,9,20,0.3);">
        <span>⏱️</span>
        <span style="font-size:15px;letter-spacing:1px;">GIỮ GHẾ: 05:00</span>
      </div>
    </div>

    ${renderSeatGrid(["F08", "F09"], true)}

    <!-- Bottom Action Bar (Selected F08, F09) -->
    <div style="padding:18px 60px;background:#121626;border-top:2px solid #222944;display:flex;justify-content:space-between;align-items:center;width:1440px;box-sizing:border-box;">
      <div>
        <span style="color:#94a3b8;font-size:13px;">Đang giữ 2 ghế VIP: <strong style="color:#fff;">F08, F09</strong></span>
        <div style="font-size:24px;font-weight:900;color:#fff;">Tạm tính: 280.000đ</div>
      </div>
      <button style="background:#e50914;color:#fff;border:none;padding:15px 36px;border-radius:8px;font-weight:800;font-size:15px;box-shadow:0 4px 18px rgba(229,9,20,0.5);">
        Tiếp tục: Chọn bắp nước (Party Combo 69K) →
      </button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 11: Cảnh báo lỗi 409 Ghế vừa có người đặt trùng (BR01)
// =========================================================================
screens.push({
  file: "11_Trang_11_Loi_409_trung_ghe_BR01.html",
  title: "Trang 11 - Cảnh báo lỗi 409 Ghế vừa có người đặt trùng (BR01)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#080a13;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(true)}
      ${renderSeatGrid(["F08"])}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:480px;background:#1a1114;padding:36px;border-radius:18px;border:2px solid #ef4444;text-align:center;box-shadow:0 24px 64px rgba(239,68,68,0.4);">
        <div style="width:68px;height:68px;border-radius:50%;background:#381418;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
          ⚠️
        </div>
        <span style="color:#ef4444;font-size:12px;font-weight:800;letter-spacing:2px;">XUNG ĐỘT ĐẶT GHẾ (BR01 - HTTP 409)</span>
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin:6px 0 12px;">Ghế vừa có người đặt trước</h2>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Ghế <strong>F08</strong> vừa được một khách hàng khác hoàn tất giữ chỗ trước bạn vài giây. Vui lòng chọn vị trí ghế trống khác trên sơ đồ!
        </p>
        <button style="background:#ef4444;color:#fff;border:none;padding:13px 32px;border-radius:8px;font-weight:800;font-size:14px;">
          Quay lại sơ đồ chọn ghế khác
        </button>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 12: Chọn bắp nước Party Combo 69K & Đổi điểm C'MEMBER (UC05)
// =========================================================================
screens.push({
  file: "12_Trang_12_Chon_bap_nuoc_Combo_UC05.html",
  title: "Trang 12 - Chọn bắp nước Party Combo 69K & Đổi điểm C'MEMBER (UC05)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Bắp nước")}
    <section style="padding:40px 80px;display:flex;gap:40px;">
      <!-- Menu List -->
      <div style="flex:1;">
        <span style="color:#e50914;font-weight:800;font-size:12px;letter-spacing:2px;">COMBO ƯU ĐÃI</span>
        <h1 style="font-size:28px;font-weight:900;margin:4px 0 24px;">Thực Đơn Bắp Nước Rạp NOVA</h1>

        <div style="display:flex;flex-direction:column;gap:18px;">
          <!-- Item 1: Party Combo 69K -->
          <div style="background:#131626;border:2px solid #e50914;padding:22px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 8px 24px rgba(229,9,20,0.2);">
            <div style="display:flex;gap:20px;align-items:center;">
              <div style="width:90px;height:90px;background:#241d33;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:40px;">🍿</div>
              <div>
                <span style="background:#e50914;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:4px;">HOT DEAL 69K</span>
                <h3 style="font-size:18px;font-weight:800;margin:6px 0 4px;">Party Combo 69K</h3>
                <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">1 Bắp phô mai lớn 64oz + 2 Nước ngọt Coca-Cola 32oz</p>
                <div style="font-size:20px;font-weight:900;color:#22c55e;">69.000đ <small style="font-size:13px;text-decoration:line-through;color:#64748b;">120.000đ</small></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <button style="width:34px;height:34px;border-radius:50%;background:#1e2438;border:none;color:#fff;font-size:18px;font-weight:800;">-</button>
              <span style="font-size:16px;font-weight:800;color:#fff;">1</span>
              <button style="width:34px;height:34px;border-radius:50%;background:#e50914;border:none;color:#fff;font-size:18px;font-weight:800;">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Summary Card -->
      <div style="width:400px;background:#131626;border:1px solid #222944;border-radius:16px;padding:30px;height:fit-content;">
        <h3 style="font-size:18px;font-weight:800;margin:0 0 18px;">Tóm Tắt Đơn Đặt Vé</h3>
        <div style="display:flex;flex-direction:column;gap:12px;border-bottom:1px solid #242d4a;padding-bottom:18px;font-size:14px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#94a3b8;">Vé VIP x2 (F08, F09)</span>
            <strong style="color:#fff;">280.000đ</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#94a3b8;">Party Combo 69K x1</span>
            <strong style="color:#fff;">69.000đ</strong>
          </div>
          <!-- C'MEMBER Point Discount -->
          <div style="display:flex;justify-content:space-between;color:#fbbf24;">
            <span>Đổi 20.000 điểm C'MEMBER</span>
            <strong>-20.000đ</strong>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0;">
          <span style="font-size:16px;font-weight:700;">Tổng thanh toán:</span>
          <span style="font-size:26px;font-weight:900;color:#22c55e;">329.000đ</span>
        </div>

        <button style="width:100%;background:#e50914;color:#fff;border:none;padding:15px;border-radius:8px;font-weight:800;font-size:15px;box-shadow:0 4px 18px rgba(229,9,20,0.5);">
          Xác nhận & Sang thanh toán →
        </button>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 13: Xác nhận đơn hàng & Chọn cổng thanh toán (UC06)
// =========================================================================
screens.push({
  file: "13_Trang_13_Xac_nhan_don_hang_UC06.html",
  title: "Trang 13 - Xác nhận đơn hàng & Chọn cổng thanh toán (UC06)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Lịch chiếu")}
    <section style="padding:40px 80px;display:flex;gap:40px;">
      <div style="flex:1;">
        <span style="color:#e50914;font-weight:800;font-size:12px;letter-spacing:2px;">BƯỚC 3 / THANH TOÁN</span>
        <h1 style="font-size:28px;font-weight:900;margin:4px 0 24px;">Chọn Phương Thức Thanh Toán</h1>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <label style="display:flex;align-items:center;gap:16px;background:#181d32;border:2px solid #e50914;padding:18px 22px;border-radius:12px;cursor:pointer;">
            <input type="radio" name="pay" checked />
            <div>
              <strong style="font-size:16px;color:#fff;">Cổng thanh toán giả lập NOVA Sandbox (Dành cho Test Đồ Án)</strong>
              <p style="color:#94a3b8;font-size:12px;margin:2px 0 0;">Không trừ tiền thật, kiểm thử luồng Thành công / Hủy đơn tức thì</p>
            </div>
          </label>
          <label style="display:flex;align-items:center;gap:16px;background:#131626;border:1px solid #232a42;padding:18px 22px;border-radius:12px;cursor:pointer;">
            <input type="radio" name="pay" />
            <div>
              <strong style="font-size:16px;color:#fff;">Cổng VietQR (Chuyển khoản ngân hàng tức thì 24/7)</strong>
            </div>
          </label>
          <label style="display:flex;align-items:center;gap:16px;background:#131626;border:1px solid #232a42;padding:18px 22px;border-radius:12px;cursor:pointer;">
            <input type="radio" name="pay" />
            <div>
              <strong style="font-size:16px;color:#fff;">Ví điện tử MoMo / ZaloPay</strong>
            </div>
          </label>
        </div>
      </div>

      <div style="width:400px;background:#131626;border:1px solid #222944;border-radius:16px;padding:30px;height:fit-content;">
        <h3 style="font-size:18px;font-weight:800;margin:0 0 16px;">Xác Nhận Đơn Hàng</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 18px;">
          Suất chiếu: <strong>Dune 2 · 18:30 (Phòng 1 IMAX)</strong><br />
          Ghế: <strong>F08, F09 (VIP)</strong> · Combo: <strong>Party Combo 69K</strong>
        </p>
        <div style="font-size:28px;font-weight:900;color:#22c55e;margin-bottom:20px;">329.000đ</div>
        <button style="width:100%;background:#e50914;color:#fff;border:none;padding:15px;border-radius:8px;font-weight:800;font-size:15px;">
          Mở Cổng Thanh Toán Sandbox →
        </button>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 14: Giao diện Cổng thanh toán mô phỏng Payment Sandbox (UC06)
// =========================================================================
screens.push({
  file: "14_Trang_14_Cong_thanh_toan_Sandbox_UC06.html",
  title: "Trang 14 - Giao diện Cổng thanh toán mô phỏng Payment Sandbox (UC06)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#080a14;">
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:#0b0e1b;">
      <div style="width:540px;background:#13182b;padding:40px;border-radius:20px;border:2px solid #3b82f6;box-shadow:0 24px 64px rgba(59,130,246,0.35);text-align:center;">
        <div style="width:68px;height:68px;border-radius:50%;background:#1d294d;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
          💳
        </div>
        <span style="color:#60a5fa;font-size:12px;font-weight:800;letter-spacing:2px;">NOVA PAYMENT SANDBOX SIMULATOR</span>
        <h2 style="font-size:24px;font-weight:900;color:#fff;margin:6px 0 12px;">Mô Phỏng Cổng Thanh Toán</h2>
        <div style="background:#1b2138;padding:16px;border-radius:10px;margin:20px 0;text-align:left;font-size:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#94a3b8;">Mã giao dịch:</span>
            <code>NOVA-TX-9824-A7F</code>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#94a3b8;">Số tiền thanh toán:</span>
            <strong style="color:#22c55e;font-size:18px;">329.000 VND</strong>
          </div>
        </div>
        <div style="display:flex;gap:14px;">
          <button style="flex:1;background:#ef4444;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:700;font-size:14px;">Hủy giao dịch (Giả lập)</button>
          <button style="flex:1;background:#22c55e;color:#000;border:none;padding:14px;border-radius:8px;font-weight:900;font-size:14px;">Xác nhận Thành công →</button>
        </div>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 15: Thông báo Hết hạn 5 phút giữ ghế (BR04)
// =========================================================================
screens.push({
  file: "15_Trang_15_Het_han_5_phut_giu_ghe_BR04.html",
  title: "Trang 15 - Thông báo Hết hạn 5 phút giữ ghế & Tự động giải phóng ghế (BR04)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#080a13;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(true)}
      ${renderSeatGrid(["F08", "F09"])}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:480px;background:#18130e;padding:36px;border-radius:18px;border:2px solid #f59e0b;text-align:center;box-shadow:0 24px 64px rgba(245,158,11,0.35);">
        <div style="width:68px;height:68px;border-radius:50%;background:#382713;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
          ⏱️
        </div>
        <span style="color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:2px;">QUY TẮC BR04 · TIMEOUT 300S</span>
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin:6px 0 12px;">Hết hạn 5 phút giữ ghế</h2>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Thời gian giữ chỗ ghế <strong>F08, F09</strong> đã kết thúc. Hệ thống đã tự động giải phóng ghế để đảm bảo công bằng cho các khán giả khác.
        </p>
        <button style="background:#f59e0b;color:#000;border:none;padding:14px 32px;border-radius:8px;font-weight:900;font-size:14px;">
          Đặt lại suất chiếu này
        </button>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 16: Thông báo Khách hàng hủy giao dịch & Trả lại ghế trống
// =========================================================================
screens.push({
  file: "16_Trang_16_Huy_giao_dich_tra_ghe.html",
  title: "Trang 16 - Thông báo Khách hàng hủy giao dịch & Trả lại ghế trống",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#080a13;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${renderHeader(true)}
      ${renderSeatGrid([])}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:480px;background:#131626;padding:36px;border-radius:18px;border:1px solid #2f3856;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.8);">
        <div style="width:68px;height:68px;border-radius:50%;background:#1d2238;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
          ↩️
        </div>
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin:6px 0 12px;">Đã hủy giao dịch an toàn</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Bạn vừa xác nhận hủy thanh toán. Các ghế F08, F09 và Party Combo đã được trả lại giỏ hàng rạp chiếu.
        </p>
        <button style="background:#1e2438;color:#fff;border:1px solid #364166;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;">
          Quay lại sơ đồ ghế
        </button>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 17: Vé điện tử QR Code, Xác nhận Email & Tải lịch .ics (UC07, UC08, UC10)
// =========================================================================
screens.push({
  file: "17_Trang_17_Ve_dien_tu_QR_ics_UC07_UC08_UC10.html",
  title: "Trang 17 - Vé điện tử QR Code, Xác nhận Email & Tải lịch .ics (UC07, UC08, UC10)",
  html: `
  <main style="width:1440px;background:#0b0d17;">
    ${renderHeader(true, "Phim")}
    <section style="padding:40px 80px;display:flex;justify-content:center;align-items:center;">
      <div style="width:580px;background:#121628;border:2px solid #22c55e;border-radius:20px;padding:36px;text-align:center;box-shadow:0 20px 60px rgba(34,197,94,0.25);">
        <span style="background:#0f2e1b;color:#22c55e;font-size:12px;font-weight:800;padding:4px 14px;border-radius:20px;letter-spacing:1px;">
          ✓ THANH TOÁN THÀNH CÔNG · ĐÃ XUẤT VÉ ĐIỆN TỬ
        </span>
        <h1 style="font-size:28px;font-weight:900;margin:16px 0 6px;">Dune: Hành Tinh Cát 2</h1>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
          18:30 · Hôm nay (11/02/2026) · NOVA Sala Thủ Thiêm (Phòng 1 IMAX)
        </p>

        <!-- Real SVG QR Code representation -->
        <div style="background:#fff;padding:16px;border-radius:14px;width:190px;height:190px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <svg width="160" height="160" viewBox="0 0 100 100" fill="#000">
            <rect x="0" y="0" width="30" height="30" fill="#000"/>
            <rect x="5" y="5" width="20" height="20" fill="#fff"/>
            <rect x="10" y="10" width="10" height="10" fill="#000"/>
            <rect x="70" y="0" width="30" height="30" fill="#000"/>
            <rect x="75" y="5" width="20" height="20" fill="#fff"/>
            <rect x="80" y="10" width="10" height="10" fill="#000"/>
            <rect x="0" y="70" width="30" height="30" fill="#000"/>
            <rect x="5" y="75" width="20" height="20" fill="#fff"/>
            <rect x="10" y="80" width="10" height="10" fill="#000"/>
            <rect x="35" y="10" width="10" height="30" fill="#000"/>
            <rect x="50" y="20" width="15" height="15" fill="#000"/>
            <rect x="40" y="50" width="30" height="10" fill="#000"/>
            <rect x="50" y="70" width="20" height="20" fill="#000"/>
            <rect x="75" y="45" width="15" height="15" fill="#000"/>
          </svg>
        </div>

        <div style="background:#1b2138;padding:14px;border-radius:10px;margin-bottom:20px;font-size:13px;color:#cbd5e1;">
          Mã vé: <strong style="color:#fff;">NC-9824</strong> · Ghế: <strong style="color:#fff;">F08, F09 (VIP)</strong><br />
          Mã HMAC: <code>a7b8c9d0e1f2a3b4...</code> (Bảo mật 1 lần quét)
        </div>

        <div style="display:flex;gap:12px;justify-content:center;">
          <button style="background:#1f263e;color:#fff;border:1px solid #364166;padding:11px 20px;border-radius:8px;font-weight:700;font-size:13px;">📅 Tải lịch .ics</button>
          <button style="background:#1f263e;color:#fff;border:1px solid #364166;padding:11px 20px;border-radius:8px;font-weight:700;font-size:13px;">✉️ Gửi email lại</button>
          <button style="background:#e50914;color:#fff;border:none;padding:11px 24px;border-radius:8px;font-weight:800;font-size:13px;">Về trang chủ</button>
        </div>
      </div>
    </section>
    ${renderFooter()}
  </main>
  `
});

// =========================================================================
// TRANG 18: Cổng soát vé QR dành cho Nhân viên rạp (UC14)
// =========================================================================
screens.push({
  file: "18_Trang_18_Cong_soat_ve_QR_Nhan_vien_UC14.html",
  title: "Trang 18 - Cổng soát vé QR dành cho Nhân viên rạp (UC14)",
  html: `
  <main style="width:1440px;background:#090b14;min-height:960px;padding:40px 80px;">
    <!-- Staff Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:36px;border-bottom:1px solid #1e2438;padding-bottom:20px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-size:32px;">🛡️</span>
        <div>
          <span style="color:#3b82f6;font-size:12px;font-weight:800;letter-spacing:2px;">NOVA ADMISSION DESK · UC14</span>
          <h1 style="font-size:26px;font-weight:900;margin:2px 0 0;">Đúng suất. Đúng vé. Một lần vào rạp.</h1>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="background:#1b2238;color:#60a5fa;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;">Nhân viên: staff@nova.vn</span>
        <button style="background:#28314e;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:13px;">Đăng xuất</button>
      </div>
    </div>

    <!-- Stepper -->
    <div style="display:flex;gap:24px;margin-bottom:32px;font-size:13px;font-weight:700;">
      <span style="color:#22c55e;">01 · Chọn suất</span>
      <span style="color:#fff;border-bottom:2px solid #e50914;padding-bottom:4px;">02 · Kiểm tra QR</span>
      <span style="color:#64748b;">03 · Xác nhận vào rạp</span>
    </div>

    <div style="max-width:760px;margin:0 auto;background:#121626;border:1px solid #232b44;border-radius:16px;padding:36px;">
      <div style="display:flex;gap:20px;margin-bottom:24px;">
        <div style="flex:1;">
          <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Cụm rạp đang kiểm tra</label>
          <select style="width:100%;background:#1a2034;border:1px solid #2f3a5c;padding:12px;border-radius:8px;color:#fff;font-size:14px;"><option>NOVA Sala Thủ Thiêm</option></select>
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Suất chiếu kiểm tra</label>
          <select style="width:100%;background:#1a2034;border:1px solid #2f3a5c;padding:12px;border-radius:8px;color:#fff;font-size:14px;"><option>Dune 2 · 18:30 (Phòng 1 IMAX)</option></select>
        </div>
      </div>

      <!-- Mode Switch -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <button style="flex:1;background:#e50914;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:800;font-size:14px;">Nhập mã chuỗi 64 ký tự</button>
        <button style="flex:1;background:#1a2034;color:#94a3b8;border:none;padding:12px;border-radius:8px;font-weight:700;font-size:14px;">Quét Camera QR</button>
      </div>

      <label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Mã HMAC-SHA256 đọc từ vé điện tử</label>
      <input type="text" value="a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8" style="width:100%;background:#1b2034;border:1px solid #2f3a5c;padding:14px;border-radius:8px;color:#fff;font-size:13px;font-family:monospace;margin-bottom:20px;box-sizing:border-box;" />

      <button style="width:100%;background:#22c55e;color:#000;border:none;padding:15px;border-radius:8px;font-weight:900;font-size:15px;">
        Kiểm tra & Xác thực mã vé
      </button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 19: Kết quả Soát vé Hợp lệ & Xác nhận vào rạp (Màu Xanh)
// =========================================================================
screens.push({
  file: "19_Trang_19_Soat_ve_Hop_le_Mau_Xanh.html",
  title: "Trang 19 - Kết quả Soát vé Hợp lệ & Xác nhận vào rạp (Màu Xanh)",
  html: `
  <main style="width:1440px;background:#090b14;min-height:960px;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="width:580px;background:#0d1f16;border:3px solid #22c55e;border-radius:20px;padding:40px;text-align:center;box-shadow:0 24px 64px rgba(34,197,94,0.35);">
      <div style="width:72px;height:72px;border-radius:50%;background:#184229;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;">
        ✅
      </div>
      <span style="color:#22c55e;font-size:13px;font-weight:800;letter-spacing:2px;">KẾT QUẢ SOÁT VÉ</span>
      <h1 style="font-size:28px;font-weight:900;color:#fff;margin:6px 0 16px;">VÉ HỢP LỆ · CHO PHÉP VÀO RẠP</h1>

      <div style="background:#132d1e;padding:18px;border-radius:12px;margin-bottom:24px;text-align:left;font-size:14px;line-height:1.7;">
        <div>Phim: <strong style="color:#fff;">Dune: Hành Tinh Cát 2</strong></div>
        <div>Suất chiếu: <strong style="color:#fff;">18:30 Hôm nay · Phòng 1 (IMAX)</strong></div>
        <div>Ghế: <strong style="color:#22c55e;font-size:16px;">F08, F09 (VIP) · 2 Khách</strong></div>
        <div>Khách hàng: <strong>Lâm Thanh Phong (C'MEMBER GOLD)</strong></div>
      </div>

      <button style="width:100%;background:#22c55e;color:#000;border:none;padding:16px;border-radius:10px;font-weight:900;font-size:16px;">
        Xác nhận khách đã vào rạp (Đánh dấu Đã Dùng)
      </button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 20: Cảnh báo Vé sai suất chiếu hoặc sai ngày chiếu (Màu Vàng)
// =========================================================================
screens.push({
  file: "20_Trang_20_Canh_bao_Sai_suat_chieu_Mau_Vang.html",
  title: "Trang 20 - Cảnh báo Vé sai suất chiếu hoặc sai ngày chiếu (Màu Vàng)",
  html: `
  <main style="width:1440px;background:#090b14;min-height:960px;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="width:580px;background:#20180a;border:3px solid #eab308;border-radius:20px;padding:40px;text-align:center;box-shadow:0 24px 64px rgba(234,179,8,0.35);">
      <div style="width:72px;height:72px;border-radius:50%;background:#44330f;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;">
        ⚠️
      </div>
      <span style="color:#eab308;font-size:13px;font-weight:800;letter-spacing:2px;">CẢNH BÁO SAI SUẤT CHIẾU</span>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin:6px 0 16px;">Vé không thuộc suất chiếu này</h1>

      <div style="background:#2d230e;padding:18px;border-radius:12px;margin-bottom:24px;text-align:left;font-size:14px;line-height:1.7;">
        <div>Suất đang soát: <strong style="color:#ef4444;">18:30 Hôm nay (Phòng 1)</strong></div>
        <div>Suất ghi trên vé: <strong style="color:#eab308;font-size:16px;">21:15 Ngày mai (Phòng 2)</strong></div>
        <div>Thông báo cho khách: <em>Vui lòng quay lại đúng khung giờ ghi trên vé.</em></div>
      </div>

      <button style="width:100%;background:#eab308;color:#000;border:none;padding:16px;border-radius:10px;font-weight:900;font-size:16px;">
        Quay lại quét vé khác
      </button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 21: Cảnh báo chặn Vé đã sử dụng hoặc Không tìm thấy vé (Màu Đỏ)
// =========================================================================
screens.push({
  file: "21_Trang_21_Chan_ve_da_su_dung_Mau_Do.html",
  title: "Trang 21 - Cảnh báo chặn Vé đã sử dụng hoặc Không tìm thấy vé (Màu Đỏ)",
  html: `
  <main style="width:1440px;background:#090b14;min-height:960px;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="width:580px;background:#200c0f;border:3px solid #ef4444;border-radius:20px;padding:40px;text-align:center;box-shadow:0 24px 64px rgba(239,68,68,0.4);">
      <div style="width:72px;height:72px;border-radius:50%;background:#44141a;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;">
        ⛔
      </div>
      <span style="color:#ef4444;font-size:13px;font-weight:800;letter-spacing:2px;">TỪ CHỐI VÀO RẠP (HTTP 409)</span>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin:6px 0 16px;">Vé Đã Được Sử Dụng Trước Đó</h1>

      <div style="background:#2e1015;padding:18px;border-radius:12px;margin-bottom:24px;text-align:left;font-size:14px;line-height:1.7;">
        <div>Mã vé: <strong style="color:#ef4444;">NC-9824</strong></div>
        <div>Thời gian đã quét: <strong style="color:#fff;">18:12:45 (Cổng 1 Sala)</strong></div>
        <div>Cảnh báo nghi vấn: <em>Vé có thể đã bị chụp màn hình chia sẻ hoặc gian lận vé vào rạp!</em></div>
      </div>

      <button style="width:100%;background:#ef4444;color:#fff;border:none;padding:16px;border-radius:10px;font-weight:900;font-size:16px;">
        Từ chối vào rạp & Quét vé tiếp theo
      </button>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 22: Quản trị danh mục Phim (UC11 - Admin)
// =========================================================================
screens.push({
  file: "22_Trang_22_Admin_Quan_ly_phim_UC11.html",
  title: "Trang 22 - Quản trị danh mục Phim (UC11 - Admin)",
  html: `
  <main style="width:1440px;background:#0b0d17;min-height:960px;display:flex;">
    <!-- Admin Sidebar -->
    <aside style="width:280px;background:#101322;border-right:1px solid #1f253d;padding:28px 20px;flex-shrink:0;">
      <div style="font-weight:900;font-size:20px;color:#fff;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
        <span style="color:#e50914;">▲</span> NOVA ADMIN
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;">
        <div style="background:#e50914;color:#fff;padding:12px 16px;border-radius:8px;">🎬 1. Quản lý phim</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">🏢 2. Quản lý rạp</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">🛋️ 3. Quản lý phòng chiếu</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">🕒 4. Quản lý suất chiếu</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">🎟️ 5. Quản lý vé / đơn đặt</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">👥 6. Quản lý người dùng</div>
        <div style="color:#94a3b8;padding:12px 16px;border-radius:8px;">🎁 7. Quản lý khuyến mãi</div>
      </div>
    </aside>

    <!-- Admin Content -->
    <div style="flex:1;padding:36px 48px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <span style="color:#e50914;font-size:12px;font-weight:800;letter-spacing:2px;">HỆ THỐNG QUẢN TRỊ · UC11</span>
          <h1 style="font-size:28px;font-weight:900;margin:4px 0 0;">Danh Mục Phim Chiếu Rạp</h1>
        </div>
        <button style="background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:800;font-size:14px;">+ Thêm phim mới</button>
      </div>

      <!-- Data Table -->
      <table style="width:100%;border-collapse:collapse;background:#121524;border-radius:12px;overflow:hidden;border:1px solid #202740;font-size:14px;">
        <thead>
          <tr style="background:#171c30;color:#94a3b8;text-align:left;">
            <th style="padding:14px 20px;">Poster</th>
            <th style="padding:14px 20px;">Tên phim</th>
            <th style="padding:14px 20px;">Thời lượng</th>
            <th style="padding:14px 20px;">Định dạng</th>
            <th style="padding:14px 20px;">Trạng thái</th>
            <th style="padding:14px 20px;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top:1px solid #1c2238;">
            <td style="padding:14px 20px;"><div style="width:40px;height:56px;background:url('${imgDunePoster}') center/cover;border-radius:4px;"></div></td>
            <td style="padding:14px 20px;"><strong>Dune: Hành Tinh Cát 2</strong><br /><small style="color:#64748b;">T16 · Khoa học viễn tưởng</small></td>
            <td style="padding:14px 20px;">166 phút</td>
            <td style="padding:14px 20px;"><span style="color:#00d2ff;font-weight:700;">IMAX Laser</span></td>
            <td style="padding:14px 20px;"><span style="background:#0f2e1b;color:#22c55e;padding:4px 10px;border-radius:10px;font-size:12px;font-weight:700;">Đang chiếu</span></td>
            <td style="padding:14px 20px;"><button style="background:#1e2438;color:#fff;border:none;padding:6px 12px;border-radius:6px;margin-right:6px;">Sửa</button><button style="background:#2e1518;color:#ef4444;border:none;padding:6px 12px;border-radius:6px;">Xóa</button></td>
          </tr>
          <tr style="border-top:1px solid #1c2238;">
            <td style="padding:14px 20px;"><div style="width:40px;height:56px;background:url('${imgKongArt}') center/cover;border-radius:4px;"></div></td>
            <td style="padding:14px 20px;"><strong>Godzilla x Kong</strong><br /><small style="color:#64748b;">T13 · Hành động</small></td>
            <td style="padding:14px 20px;">115 phút</td>
            <td style="padding:14px 20px;"><span style="color:#fbbf24;font-weight:700;">3D IMAX</span></td>
            <td style="padding:14px 20px;"><span style="background:#0f2e1b;color:#22c55e;padding:4px 10px;border-radius:10px;font-size:12px;font-weight:700;">Đang chiếu</span></td>
            <td style="padding:14px 20px;"><button style="background:#1e2438;color:#fff;border:none;padding:6px 12px;border-radius:6px;margin-right:6px;">Sửa</button><button style="background:#2e1518;color:#ef4444;border:none;padding:6px 12px;border-radius:6px;">Xóa</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 23: Thiết lập Phòng chiếu & Ma trận sơ đồ ghế (UC12 - Admin)
// =========================================================================
screens.push({
  file: "23_Trang_23_Admin_Thiet_lap_phong_chieu_UC12.html",
  title: "Trang 23 - Thiết lập Phòng chiếu & Ma trận sơ đồ ghế (UC12 - Admin)",
  html: `
  <main style="width:1440px;background:#0b0d17;min-height:960px;display:flex;">
    <aside style="width:280px;background:#101322;border-right:1px solid #1f253d;padding:28px 20px;flex-shrink:0;">
      <div style="font-weight:900;font-size:20px;color:#fff;margin-bottom:24px;">▲ NOVA ADMIN</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;">
        <div style="color:#94a3b8;padding:12px 16px;">🎬 1. Quản lý phim</div>
        <div style="color:#94a3b8;padding:12px 16px;">🏢 2. Quản lý rạp</div>
        <div style="background:#e50914;color:#fff;padding:12px 16px;border-radius:8px;">🛋️ 3. Quản lý phòng chiếu</div>
        <div style="color:#94a3b8;padding:12px 16px;">🕒 4. Quản lý suất chiếu</div>
      </div>
    </aside>

    <div style="flex:1;padding:36px 48px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <span style="color:#e50914;font-size:12px;font-weight:800;letter-spacing:2px;">CẤU HÌNH PHÒNG · UC12</span>
          <h1 style="font-size:28px;font-weight:900;margin:4px 0 0;">Thiết Lập Phòng 1 (IMAX Laser) · NOVA Sala</h1>
        </div>
        <button style="background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:800;">Lưu cấu hình phòng</button>
      </div>

      <div style="background:#121524;border:1px solid #202740;border-radius:12px;padding:24px;margin-bottom:20px;">
        <div style="display:flex;gap:24px;margin-bottom:20px;">
          <div><label style="color:#94a3b8;font-size:13px;">Số hàng:</label> <strong style="color:#fff;">10 Hàng (A - K)</strong></div>
          <div><label style="color:#94a3b8;font-size:13px;">Số cột:</label> <strong style="color:#fff;">14 Cột (01 - 14)</strong></div>
          <div><label style="color:#94a3b8;font-size:13px;">Tổng ghế:</label> <strong style="color:#22c55e;">140 Ghế</strong></div>
          <div><label style="color:#94a3b8;font-size:13px;">Hàng VIP:</label> <strong style="color:#fbbf24;">Hàng E, F, G</strong></div>
          <div><label style="color:#94a3b8;font-size:13px;">Hàng Sweetbox:</label> <strong style="color:#ec4899;">Hàng K</strong></div>
        </div>
        ${renderSeatGrid([])}
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 24: Lập lịch chiếu phim & Kiểm tra giờ trống (UC13 - Admin)
// =========================================================================
screens.push({
  file: "24_Trang_24_Admin_Lap_lich_chieu_UC13.html",
  title: "Trang 24 - Lập lịch chiếu phim & Kiểm tra giờ trống (UC13 - Admin)",
  html: `
  <main style="width:1440px;background:#0b0d17;min-height:960px;display:flex;">
    <aside style="width:280px;background:#101322;border-right:1px solid #1f253d;padding:28px 20px;flex-shrink:0;">
      <div style="font-weight:900;font-size:20px;color:#fff;margin-bottom:24px;">▲ NOVA ADMIN</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;">
        <div style="color:#94a3b8;padding:12px 16px;">🎬 1. Quản lý phim</div>
        <div style="color:#94a3b8;padding:12px 16px;">🏢 2. Quản lý rạp</div>
        <div style="color:#94a3b8;padding:12px 16px;">🛋️ 3. Quản lý phòng chiếu</div>
        <div style="background:#e50914;color:#fff;padding:12px 16px;border-radius:8px;">🕒 4. Quản lý suất chiếu</div>
      </div>
    </aside>

    <div style="flex:1;padding:36px 48px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <span style="color:#e50914;font-size:12px;font-weight:800;letter-spacing:2px;">ĐIỀU HỢP LỊCH CHIẾU · UC13</span>
          <h1 style="font-size:28px;font-weight:900;margin:4px 0 0;">Lập Lịch Chiếu · Ngày 11/02/2026</h1>
        </div>
        <button style="background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:800;">+ Lập suất chiếu mới</button>
      </div>

      <!-- Timeline Schedule -->
      <div style="background:#121524;border:1px solid #202740;border-radius:12px;padding:24px;">
        <h3 style="font-size:16px;color:#fff;margin-bottom:16px;">Phòng 1 (IMAX Laser) · NOVA Sala</h3>
        <div style="display:flex;gap:16px;align-items:center;padding:14px;background:#181d32;border-radius:10px;margin-bottom:12px;">
          <span style="background:#00d2ff;color:#000;font-weight:800;font-size:12px;padding:3px 8px;border-radius:4px;">14:30 - 17:16</span>
          <strong>Dune: Hành Tinh Cát 2 (166p)</strong>
          <span style="color:#22c55e;font-size:12px;margin-left:auto;">Khoảng dọn phòng: 74 phút (Đạt chuẩn > 15p)</span>
        </div>
        <div style="display:flex;gap:16px;align-items:center;padding:14px;background:#181d32;border-radius:10px;margin-bottom:12px;border:1px solid #e50914;">
          <span style="background:#e50914;color:#fff;font-weight:800;font-size:12px;padding:3px 8px;border-radius:4px;">18:30 - 21:16</span>
          <strong>Dune: Hành Tinh Cát 2 (166p)</strong>
          <span style="color:#22c55e;font-size:12px;margin-left:auto;">Khoảng dọn phòng: 29 phút (Đạt chuẩn > 15p)</span>
        </div>
        <div style="display:flex;gap:16px;align-items:center;padding:14px;background:#181d32;border-radius:10px;">
          <span style="background:#00d2ff;color:#000;font-weight:800;font-size:12px;padding:3px 8px;border-radius:4px;">21:45 - 23:40</span>
          <strong>Godzilla x Kong (115p)</strong>
          <span style="color:#22c55e;font-size:12px;margin-left:auto;">Suất cuối ngày</span>
        </div>
      </div>
    </div>
  </main>
  `
});

// =========================================================================
// TRANG 25: Cảnh báo đỏ Xung đột lịch phòng dưới 15 phút dọn rạp (BR03 - Admin)
// =========================================================================
screens.push({
  file: "25_Trang_25_Admin_Xung_dot_lich_15_phut_BR03.html",
  title: "Trang 25 - Cảnh báo đỏ Xung đột lịch phòng dưới 15 phút dọn rạp (BR03 - Admin)",
  html: `
  <main style="position:relative;width:1440px;height:960px;overflow:hidden;background:#0b0d17;">
    <div style="filter:blur(10px) brightness(0.4);pointer-events:none;">
      ${screens[23].html}
    </div>
    <div style="position:absolute;top:0;left:0;width:1440px;height:960px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);">
      <div style="width:540px;background:#1a0f12;border:3px solid #ef4444;border-radius:20px;padding:40px;text-align:center;box-shadow:0 24px 64px rgba(239,68,68,0.45);">
        <div style="width:72px;height:72px;border-radius:50%;background:#44141a;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;">
          ⚠️
        </div>
        <span style="color:#ef4444;font-size:13px;font-weight:800;letter-spacing:2px;">XUNG ĐỘT QUY TẮC BR03 · ADMIN</span>
        <h1 style="font-size:24px;font-weight:900;color:#fff;margin:6px 0 16px;">Khoảng Nghỉ Dọn Phòng Dưới 15 Phút</h1>

        <div style="background:#2e1015;padding:18px;border-radius:12px;margin-bottom:24px;text-align:left;font-size:14px;line-height:1.7;">
          <div>Suất trước kết thúc: <strong style="color:#fff;">17:16 (Dune 2)</strong></div>
          <div>Suất mới dự kiến: <strong style="color:#ef4444;font-size:16px;">17:25 (Godzilla x Kong)</strong></div>
          <div>Khoảng nghỉ thực tế: <strong style="color:#ef4444;">9 phút (Không đủ 15 phút dọn rạp BR03!)</strong></div>
        </div>

        <div style="display:flex;gap:12px;">
          <button style="flex:1;background:#20283e;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:700;">Hủy suất này</button>
          <button style="flex:1;background:#ef4444;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:900;">Tự động dời (+15p → 17:35)</button>
        </div>
      </div>
    </div>
  </main>
  `
});

// Write all screens
for (const s of screens) {
  const fullHtml = wrapHtml(s.title, s.html);
  fs.writeFileSync(path.join(outDir, s.file), fullHtml, "utf8");
  fs.writeFileSync(path.join(rootOut, s.file), fullHtml, "utf8");
  console.log(`Saved: ${s.file}`);
}

console.log(`🎉 Successfully generated all ${screens.length} authentic, production-grade screens!`);
