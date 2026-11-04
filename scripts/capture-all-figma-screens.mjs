import { chromium } from "@playwright/test";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const outputDir = resolve(root, "public/figma-screens");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

async function run() {
  console.log("Khởi động trình duyệt tự động chụp toàn bộ giao diện & nghiệp vụ...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2, // Độ phân giải 2x siêu nét cho Figma
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
  });

  const screens = [];

  async function capture(id, path, options = {}) {
    console.log(`\n📸 [Chụp ${id}] ${options.title || path}...`);
    try {
      if (path) {
        await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(options.wait || 2000);
      }
      if (options.action) {
        await options.action(page);
        await page.waitForTimeout(options.afterWait || 1500);
      }
      const filename = `${id}.png`;
      const fullPath = resolve(outputDir, filename);
      await page.screenshot({ path: fullPath, fullPage: options.fullPage ?? true });
      screens.push({
        id,
        filename,
        title: options.title || id,
        path: path || "(Modal / Popup)",
        category: options.category || "Trang chính",
        flow: options.flow || "Chung",
        description: options.description || ""
      });
      console.log(`  ✓ Thành công: ${filename}`);
    } catch (err) {
      console.error(`  ✗ Lỗi tại ${id}:`, err.message);
    }
  }

  // === 1. CÁC TRANG CÔNG KHAI (PUBLIC PAGES) ===
  await capture("01_trang_chu", "/", {
    title: "Trang chủ NOVA Cinema",
    category: "Public",
    flow: "Khám phá",
    description: "Banner bom tấn, Đặt vé nhanh, danh mục phim, bắp nước, hội viên"
  });

  await capture("02_danh_muc_phim", "/phim", {
    title: "Danh mục tất cả phim",
    category: "Public",
    flow: "Khám phá",
    description: "Bộ lọc phim đang chiếu, thể loại, độ tuổi và tìm kiếm"
  });

  // Get real movie ID
  let movieId = "dune";
  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/movies");
    const mData = await res.json();
    movieId = mData.data?.items?.[0]?.id || "dune";
  } catch {}

  await capture("03_chi_tiet_phim", `/phim/${movieId}`, {
    title: "Chi tiết phim & Trailer",
    category: "Public",
    flow: "Khám phá",
    description: "Nội dung, đạo diễn, diễn viên, trailer 4K và suất chiếu theo ngày"
  });

  await capture("04_phim_sap_chieu", "/sap-chieu", {
    title: "Phim sắp chiếu theo tuần",
    category: "Public",
    flow: "Khám phá",
    description: "Phân loại theo tuần 1-4, nút đặt trước và tải nhắc lịch .ics"
  });

  await capture("05_cum_rap_nova", "/rap", {
    title: "Hệ thống 4 cụm rạp NOVA",
    category: "Public",
    flow: "Khám phá",
    description: "Landmark 81, Riverside Đà Nẵng, Sala, West Lake Hà Nội"
  });

  await capture("06_uu_dai_su_kien", "/uu-dai", {
    title: "Ưu đãi & Khuyến mãi",
    category: "Public",
    flow: "Khám phá",
    description: "Đặc quyền thành viên, ưu đãi thẻ ngân hàng, combo giá sốc"
  });

  await capture("07_bap_nuoc_combo", "/bap-nuoc", {
    title: "Menu Bắp Nước 24 món",
    category: "Public",
    flow: "F&B Combo",
    description: "Party Combo 69K, Combo Lễ Hội, bắp phô mai, caramel, nước ngọt"
  });

  await capture("08_hoi_vien_cmember", "/hoi-vien", {
    title: "Chính sách C'MEMBER",
    category: "Public",
    flow: "Hội viên",
    description: "Hạng Silver (5%), Gold (7%), Diamond (10%), tích luỹ điểm thưởng"
  });

  // === 2. XÁC THỰC (AUTHENTICATION FLOW) ===
  await capture("09_modal_dang_nhap", "/dang-nhap", {
    title: "Giao diện Đăng nhập",
    category: "Auth",
    flow: "Xác thực",
    fullPage: false,
    description: "Nhập Email, mật khẩu, nút hiện mật khẩu, Ghi nhớ đăng nhập"
  });

  await capture("10_modal_dang_ky", "/dang-nhap", {
    title: "Giao diện Đăng ký",
    category: "Auth",
    flow: "Xác thực",
    fullPage: false,
    action: async (p) => {
      const regBtn = p.getByRole("tab", { name: /Đăng ký/i }).or(p.locator("button:has-text('Đăng ký')")).first();
      if (await regBtn.isVisible()) await regBtn.click();
    },
    description: "Form đăng ký Họ tên, Email, Số điện thoại, Mật khẩu"
  });

  // === 3. NGHIỆP VỤ ĐẶT VÉ & THANH TOÁN (BOOKING & PAYMENT FLOW) ===
  // Login as Customer
  console.log("\n🔑 Đăng nhập tài khoản Customer để thực hiện flow đặt vé...");
  await page.request.post("http://127.0.0.1:4000/api/v1/auth/login", {
    data: { email: "customer@nova.local", password: "nova@12345" }
  });

  await capture("11_dat_ve_chon_lich", "/dat-ve", {
    title: "Trang Đặt vé - Chọn Suất chiếu",
    category: "Booking",
    flow: "Đặt vé",
    description: "Chọn cụm rạp, chọn phim, chọn ngày và bảng timeline suất chiếu"
  });

  // Open Seat Map Modal
  await capture("12_modal_chon_ghe", "/dat-ve", {
    title: "Modal Sơ đồ ghế xem phim",
    category: "Booking",
    flow: "Đặt vé",
    fullPage: false,
    action: async (p) => {
      const slot = p.locator(".timeline-show, .timeline-slot, button:has-text(':')").first();
      if (await slot.isVisible()) await slot.click();
    },
    description: "Sơ đồ phòng chiếu: Ghế thường, VIP, Sweetbox đôi, màn hình chiếu"
  });

  // Hold a seat and move to Payment Step
  await capture("13_modal_thanh_toan_giu_ghe", null, {
    title: "Modal Thanh toán & Giữ ghế 5 phút",
    category: "Booking",
    flow: "Thanh toán",
    fullPage: false,
    action: async (p) => {
      // Click an available seat button
      const seat = p.getByRole("button", { name: /còn trống/i }).or(p.locator(".seat-cell:not(.booked):not(.holding)")).first();
      if (await seat.isVisible()) {
        await seat.click();
        await p.waitForTimeout(500);
      }
      const holdBtn = p.getByRole("button", { name: /Giữ ghế 5 phút/i }).or(p.locator("button:has-text('Giữ ghế')")).first();
      if (await holdBtn.isVisible()) {
        await holdBtn.click();
      }
    },
    description: "Đếm ngược giữ ghế 300s, chọn combo bắp nước, chọn cổng VNPay/MoMo/Visa"
  });

  // Sandbox gateway screen
  await capture("14_cong_thanh_toan_sandbox", null, {
    title: "Cổng Thanh toán Sandbox",
    category: "Payment",
    flow: "Thanh toán",
    fullPage: false,
    action: async (p) => {
      const payBtn = p.getByRole("button", { name: /Thanh toán Sandbox/i }).or(p.locator("button:has-text('Thanh toán')")).first();
      if (await payBtn.isVisible()) {
        await payBtn.click();
      }
    },
    description: "Màn hình giả lập thanh toán ngân hàng Sandbox bảo mật"
  });

  // Confirm payment in Sandbox to get Paid Ticket QR
  await capture("15_ve_dien_tu_qr", null, {
    title: "Vé điện tử & Mã QR thành công",
    category: "Booking",
    flow: "Vé điện tử",
    fullPage: false,
    action: async (p) => {
      const confirmBtn = p.locator("button:has-text('Xác nhận thành công'), button:has-text('Thành công'), .sandbox-success-btn").first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    },
    description: "Vé điện tử có mã QR 64 ký tự, mã đơn NOVA-..., ghế và thông tin phòng chiếu"
  });

  // Customer Account
  await capture("16_tai_khoan_ve_cua_toi", "/tai-khoan", {
    title: "Tài khoản khách hàng & Lịch sử vé",
    category: "Account",
    flow: "Hội viên",
    description: "Hồ sơ hội viên, hạng C'MEMBER, đơn hàng đang giữ và ví vé điện tử"
  });

  // === 4. NGHIỆP VỤ SOÁT VÉ NHÂN VIÊN (STAFF ADMISSION FLOW) ===
  console.log("\n🔑 Đăng nhập tài khoản Nhân viên để chụp bàn soát vé...");
  await page.request.post("http://127.0.0.1:4000/api/v1/auth/login", {
    data: { email: "staff@nova.local", password: "nova@12345" }
  });

  await capture("17_ban_soat_ve_nhan_vien", "/soat-ve", {
    title: "Bàn làm việc Soát vé Nhân viên",
    category: "Staff",
    flow: "Soát vé",
    description: "Quét Camera QR trực tiếp, nhập mã vé NOVA-..., chọn suất chiếu"
  });

  await capture("18_soat_ve_da_quet_thanh_cong", "/soat-ve", {
    title: "Chi tiết vé đã kiểm tra & Nút Cho vào rạp",
    category: "Staff",
    flow: "Soát vé",
    action: async (p) => {
      const codeInput = p.locator("input[placeholder*='NOVA'], input[placeholder*='QR'], input[name='ticketCode']").first();
      if (await codeInput.isVisible()) {
        await codeInput.fill("NOVA-demo-ticket-customer-001");
      }
    },
    description: "Đối chiếu tên phim, rạp, phòng chiếu, giờ chiếu và nút xác nhận vào rạp"
  });

  // === 5. NGHIỆP VỤ QUẢN TRỊ ADMIN (ADMIN DASHBOARD FLOW) ===
  console.log("\n🔑 Đăng nhập tài khoản Admin để chụp trang quản trị...");
  await page.request.post("http://127.0.0.1:4000/api/v1/auth/login", {
    data: { email: "admin@nova.local", password: "nova@12345" }
  });

  await capture("19_quan_tri_admin_tong_quan", "/quan-tri", {
    title: "Bảng quản trị Admin - Doanh thu & Thống kê",
    category: "Admin",
    flow: "Quản trị",
    description: "Biểu đồ doanh thu rạp, số vé đã bán, đối soát hoá đơn và kiểm toán"
  });

  await capture("20_quan_tri_rap_suat_chieu", "/quan-tri", {
    title: "Quản trị Danh mục Phim, Rạp & Phòng",
    category: "Admin",
    flow: "Quản trị",
    action: async (p) => {
      const tab = p.getByRole("button", { name: /Rạp, Phim & Suất Chiếu/i }).first();
      if (await tab.isVisible()) await tab.click();
    },
    description: "Thêm/sửa phim, cụm rạp, cấu hình phòng chiếu và xếp lịch suất chiếu"
  });

  // === 6. CÁC TRANG CHÍNH SÁCH & HỖ TRỢ ===
  await capture("21_gioi_thieu_rap", "/gioi-thieu", {
    title: "Giới thiệu NOVA Cinema",
    category: "Policy",
    flow: "Thông tin",
    description: "Tầm nhìn điện ảnh, công nghệ chiếu IMAX Laser, âm thanh Dolby Atmos"
  });

  await capture("22_huong_dan_dat_ve", "/huong-dan", {
    title: "Hướng dẫn Đặt vé & Quy chế",
    category: "Policy",
    flow: "Thông tin",
    description: "Các bước đặt vé online, quy định độ tuổi xem phim và nhận vé tại rạp"
  });

  await capture("23_chinh_sach_bao_mat", "/chinh-sach", {
    title: "Chính sách Bảo mật & Điều khoản",
    category: "Policy",
    flow: "Thông tin",
    description: "Điều khoản sử dụng dịch vụ và bảo vệ dữ liệu khách hàng"
  });

  await capture("24_thong_tin_thanh_toan", "/thanh-toan", {
    title: "Quy định & Kênh Thanh toán",
    category: "Policy",
    flow: "Thông tin",
    description: "Quy chuẩn thanh toán thẻ quốc tế, thẻ nội địa, ví điện tử"
  });

  await capture("25_lien_he_ho_tro", "/lien-he", {
    title: "Liên hệ & Trung tâm hỗ trợ",
    category: "Policy",
    flow: "Thông tin",
    description: "Địa chỉ các rạp, hotline chăm sóc khách hàng, form gửi phản hồi"
  });

  await browser.close();

  // Create an HTML gallery page for previewing & copying all screens
  const htmlGallery = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOVA Cinema - Toàn bộ Ảnh Giao Diện & Nghiệp Vụ Xuất Figma</title>
  <style>
    :root {
      --bg: #090a0f;
      --card: #13151f;
      --border: #232738;
      --text: #f0f2f5;
      --muted: #8b92a5;
      --primary: #e50914;
      --accent: #00d2ff;
    }
    body {
      margin: 0;
      padding: 30px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .header h1 {
      margin: 0 0 10px;
      font-size: 28px;
      color: #fff;
    }
    .header p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }
    .figma-link-box {
      margin-top: 15px;
      padding: 12px 18px;
      background: rgba(229, 9, 20, 0.1);
      border: 1px solid var(--primary);
      border-radius: 8px;
      display: inline-block;
    }
    .figma-link-box a {
      color: #ff4d58;
      font-weight: 600;
      text-decoration: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 25px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
    }
    .card-img-wrap {
      background: #000;
      position: relative;
      height: 260px;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }
    .card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.3s;
    }
    .card-img-wrap:hover img {
      transform: scale(1.03);
    }
    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(0, 210, 255, 0.15);
      color: var(--accent);
      margin-bottom: 10px;
    }
    .card h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .card p {
      margin: 0 0 15px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      flex: 1;
    }
    .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
      border: none;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 NOVA Cinema - Danh Sách Toàn Bộ Ảnh Giao Diện Cho Figma</h1>
    <p>Đã chụp đầy đủ ${screens.length} màn hình & trạng thái nghiệp vụ (Khám phá, Đặt vé, Giữ ghế, Thanh toán, Vé QR, Soát vé, Quản trị). Độ phân giải 2x sắc nét chuẩn bị sẵn để đưa vào Figma.</p>
    <div class="figma-link-box">
      File Figma đích: <a href="https://www.figma.com/design/YNhIlce7yMKDYuOaONH56S/Web-xem-phim-nova-cinema-?node-id=0-1&p=f&t=bjhe21S9MULxWGSn-0" target="_blank" rel="noreferrer">Mở File Figma Của Bạn ↗</a>
    </div>
  </div>

  <div class="grid">
    ${screens.map((s, index) => `
      <div class="card">
        <div class="card-img-wrap">
          <a href="${s.filename}" target="_blank">
            <img src="${s.filename}" alt="${s.title}" loading="lazy">
          </a>
        </div>
        <div class="card-body">
          <span class="badge">${s.category} · Flow: ${s.flow}</span>
          <h3>#${index + 1}. ${s.title}</h3>
          <p>${s.description} <br><small style="color: #666">Đường dẫn: <code>${s.path}</code></small></p>
          <div class="actions">
            <a class="btn btn-primary" href="${s.filename}" target="_blank">Xem ảnh gốc (2x)</a>
            <a class="btn btn-secondary" href="${s.filename}" download>Tải về</a>
          </div>
        </div>
      </div>
    `).join("")}
  </div>
</body>
</html>`;

  writeFileSync(resolve(outputDir, "index.html"), htmlGallery, "utf8");
  console.log(`\n🎉 Hoàn thành xuất file Gallery HTML: ${resolve(outputDir, "index.html")}`);
}

run().catch(console.error);
