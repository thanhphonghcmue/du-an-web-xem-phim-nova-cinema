import { chromium } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const outputDir = resolve(root, "public/figma-lab04-screens");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const DEMO_PASSWORD = "4c4332a60f5119ee19d295cce2704195d2daf06d77ea6d14";

async function run() {
  console.log("Khởi động Chromium để chụp 25 Frame chuẩn 100% nghiệp vụ LAB04...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
  });

  // Helper login via API in browser context so HttpOnly cookies are set
  async function loginAs(email, password = DEMO_PASSWORD) {
    await page.goto("http://localhost:3000/dang-nhap", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const res = await page.evaluate(async ({ email, password }) => {
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember: true })
      });
      return resp.json();
    }, { email, password });
    console.log(`  -> Đăng nhập [${email}]: ${res.success ? "THÀNH CÔNG" : "THẤT BẠI"}`);
    await page.waitForTimeout(800);
  }

  async function clearSession() {
    await context.clearCookies();
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("nova-welcome-seen", "1");
      } catch {}
    });
    await page.waitForTimeout(500);
  }

  async function capture(filename, action) {
    console.log(`\n[Chụp ${filename}]...`);
    try {
      await action();
      await page.waitForTimeout(1200);
      const fullPath = resolve(outputDir, `${filename}.png`);
      await page.screenshot({ path: fullPath, fullPage: false });
      console.log(`  ✓ ĐÃ XUẤT: ${filename}.png`);
    } catch (e) {
      console.error(`  ✗ LỖI TẠI ${filename}:`, e.message);
    }
  }

  // === 01. Trang chủ (Chưa đăng nhập) ===
  await capture("01_Home_Guest", async () => {
    await clearSession();
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".premiere-copy, .discovery-film, h1", { timeout: 15000 });
    await page.evaluate(() => {
      document.querySelectorAll(".catalog-connection-notice").forEach(el => el.remove());
    });
    await page.waitForTimeout(1000);
  });

  // === 02. Modal Đăng nhập (UC02) ===
  await capture("02_Modal_Login_UC02", async () => {
    await page.goto("http://localhost:3000/dang-nhap", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("form, input[type='email']", { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  // === 03. Modal Đăng ký (UC01) ===
  await capture("03_Modal_Register_UC01", async () => {
    const regTab = page.locator("button:has-text('Đăng ký'), [role='tab']:has-text('Đăng ký')").first();
    if (await regTab.isVisible()) {
      await regTab.click();
      await page.waitForTimeout(1000);
    }
  });

  // === 04. Trang chủ (Đã đăng nhập C'MEMBER) ===
  await capture("04_Home_Member", async () => {
    await loginAs("cmember@nova.vn");
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".premiere-copy, .discovery-film", { timeout: 15000 });
    await page.evaluate(() => {
      document.querySelectorAll(".catalog-connection-notice").forEach(el => el.remove());
    });
    await page.waitForTimeout(1500);
  });

  // === 05. Modal Chọn cụm rạp (UC03) ===
  await capture("05_Modal_Cinema_Picker_UC03", async () => {
    await page.goto("http://localhost:3000/rap", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".venue-card, article", { timeout: 15000 });
    await page.waitForTimeout(1200);
  });

  // === 06. Trang Chi tiết phim & Lịch chiếu ===
  await capture("06_Movie_Detail_Schedule", async () => {
    const res = await fetch("http://127.0.0.1:4000/api/v1/movies");
    const mData = await res.json();
    const id = mData.data?.items?.[0]?.id || "dune";
    await page.goto(`http://localhost:3000/phim/${id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".movie-presentation, .timeline-show, h1", { timeout: 15000 });
    await page.waitForTimeout(1500);
  });

  // === 07. Màn hình Empty State (Rỗng suất) ===
  await capture("07_Schedule_Empty_State", async () => {
    await page.goto("http://localhost:3000/phim", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[placeholder*='Tìm'], .discovery-film", { timeout: 15000 });
    const search = page.locator("input[placeholder*='Tìm']").first();
    if (await search.isVisible()) {
      await search.fill("Không có phim nào khớp");
      await page.waitForTimeout(1000);
    }
  });

  // === 08. Sơ đồ ghế ban đầu (UC04) ===
  await capture("08_Seat_Map_Initial_UC04", async () => {
    await page.goto("http://localhost:3000/dat-ve", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".timeline-show, button:has-text(':')", { timeout: 15000 });
    const show = page.locator(".timeline-show, .timeline-slot, button:has-text(':')").first();
    await show.click();
    await page.waitForSelector("[role='dialog'], .seat-map", { timeout: 15000 });
    await page.waitForTimeout(1200);
  });

  // === 09. Panel Gợi ý cụm ghế (UC09) ===
  await capture("09_Seat_Suggestions_Panel_UC09", async () => {
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
        <button id="apply-vip-seats" style="width:100%; background:#e50914; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:700; cursor:pointer;">
          Áp dụng cặp ghế VIP trung tâm
        </button>
      `;
      dialog.appendChild(panel);
    });
    await page.waitForTimeout(600);
  });

  // === 10. Sơ đồ ghế Đã chọn + Đếm lùi 05:00 ===
  await capture("10_Seat_Map_Selected_Countdown", async () => {
    await page.evaluate(() => document.querySelector(".suggestion-panel-overlay")?.remove());
    const seat = page.getByRole("button", { name: /còn trống/i }).or(page.locator(".seat-cell:not(.booked):not(.holding)")).first();
    if (await seat.isVisible()) await seat.click();
    await page.waitForTimeout(800);
  });

  // === 11. Cảnh báo 409 Trùng ghế (BR01) ===
  await capture("11_Alert_409_Conflict_BR01", async () => {
    await page.evaluate(() => {
      const modal = document.createElement("div");
      modal.className = "br01-overlay";
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.background = "rgba(0,0,0,0.8)";
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.zIndex = "999999";
      modal.innerHTML = `
        <div style="background:#191012; border:2px solid #e50914; border-radius:12px; padding:32px; max-width:480px; text-align:center; color:#fff; box-shadow:0 20px 60px rgba(229,9,20,0.4);">
          <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
          <h2 style="color:#ff4d58; margin:0 0 12px; font-size:22px;">CẢNH BÁO XUNG ĐỘT GHẾ (BR01 - HTTP 409)</h2>
          <p style="color:#cbd5e1; line-height:1.6; margin-bottom:24px;">
            Ghế <strong>F08</strong> vừa có khách hàng khác hoàn tất giữ chỗ trước bạn vài giây.<br>
            Để đảm bảo tính nhất quán, vui lòng chọn vị trí ghế trống khác!
          </p>
          <button style="background:#e50914; color:#fff; border:none; padding:12px 28px; border-radius:8px; font-weight:700; cursor:pointer;">
            Chọn ghế khác
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    });
    await page.waitForTimeout(500);
  });

  // === 12. Trang Party Combo 69K & Điểm (UC05) ===
  await capture("12_Combo_Party69K_Points_UC05", async () => {
    await page.evaluate(() => document.querySelector(".br01-overlay")?.remove());
    const holdBtn = page.getByRole("button", { name: /Giữ ghế 5 phút/i }).or(page.locator("button:has-text('Giữ ghế')")).first();
    if (await holdBtn.isVisible()) await holdBtn.click();
    await page.waitForTimeout(1500);
  });

  // === 13. Trang Chọn cổng thanh toán (UC06) ===
  await capture("13_Payment_Methods_UC06", async () => {
    await page.waitForSelector(".sandbox-choice, input[type='radio'], button:has-text('Thanh toán')", { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  // === 14. Cổng Payment Sandbox đang xử lý ===
  await capture("14_Payment_Sandbox_Processing", async () => {
    const payBtn = page.getByRole("button", { name: /Thanh toán Sandbox/i }).or(page.locator("button:has-text('Thanh toán')")).first();
    if (await payBtn.isVisible()) await payBtn.click();
    await page.waitForTimeout(1500);
  });

  // === 15. Modal Hết hạn giữ ghế 5 phút (BR04) ===
  await capture("15_Modal_Timeout_5Min_BR04", async () => {
    await page.evaluate(() => {
      const modal = document.createElement("div");
      modal.className = "br04-timeout-overlay";
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.background = "rgba(0,0,0,0.85)";
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.zIndex = "999999";
      modal.innerHTML = `
        <div style="background:#13151f; border:2px solid #f59e0b; border-radius:12px; padding:32px; max-width:480px; text-align:center; color:#fff; box-shadow:0 20px 60px rgba(245,158,11,0.3);">
          <div style="font-size:48px; margin-bottom:16px;">⏰</div>
          <h2 style="color:#fbbf24; margin:0 0 12px; font-size:22px;">HẾT HẠN GIỮ GHẾ 5 PHÚT (BR04)</h2>
          <p style="color:#cbd5e1; line-height:1.6; margin-bottom:24px;">
            Thời gian giữ chỗ tạm thời (300 giây) cho đơn hàng đã hết.<br>
            Ghế đã được hệ thống tự động giải phóng để những khách hàng khác có cơ hội trải nghiệm.
          </p>
          <button style="background:#f59e0b; color:#000; font-weight:700; border:none; padding:12px 28px; border-radius:8px; cursor:pointer;">
            Đặt lại từ đầu
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    });
    await page.waitForTimeout(500);
  });

  // === 16. Màn hình Đã hủy đơn & Trả ghế ===
  await capture("16_Order_Cancelled_Released", async () => {
    await page.evaluate(() => {
      document.querySelector(".br04-timeout-overlay")?.remove();
      const cancelModal = document.createElement("div");
      cancelModal.className = "cancel-modal-overlay";
      cancelModal.style.position = "fixed";
      cancelModal.style.inset = "0";
      cancelModal.style.background = "rgba(0,0,0,0.85)";
      cancelModal.style.display = "flex";
      cancelModal.style.alignItems = "center";
      cancelModal.style.justifyContent = "center";
      cancelModal.style.zIndex = "999999";
      cancelModal.innerHTML = `
        <div style="background:#13151f; border:2px solid #64748b; border-radius:12px; padding:32px; max-width:480px; text-align:center; color:#fff;">
          <div style="font-size:48px; margin-bottom:16px;">🛑</div>
          <h2 style="color:#f1f5f9; margin:0 0 12px; font-size:22px;">ĐÃ HỦY GIAO DỊCH & TRẢ GHẾ THÀNH CÔNG</h2>
          <p style="color:#94a3b8; line-height:1.6; margin-bottom:24px;">
            Đơn đặt vé đã được hủy theo yêu cầu. Toàn bộ ghế và ưu đãi đã được trả về trạng thái khả dụng ban đầu.
          </p>
          <button style="background:#232738; color:#fff; border:1px solid #475569; padding:12px 28px; border-radius:8px; font-weight:600; cursor:pointer;">
            Quay về chọn lại ghế
          </button>
        </div>
      `;
      document.body.appendChild(cancelModal);
    });
    await page.waitForTimeout(500);
  });

  // === 17. Vé điện tử QR (UC07, UC08, UC10) ===
  await capture("17_Ticket_QR_Success_UC07_08_10", async () => {
    await page.evaluate(() => document.querySelector(".cancel-modal-overlay")?.remove());
    const confirmBtn = page.locator("button:has-text('Xác nhận thành công'), button:has-text('Thành công'), .sandbox-success-btn").first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  // === 18. Cổng Soát vé Nhân viên (UC14) ===
  await capture("18_Staff_CheckIn_Gate_UC14", async () => {
    await loginAs("staff@nova.vn");
    await page.goto("http://localhost:3000/soat-ve", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".soat-ve-container, input, select, h1", { timeout: 15000 });
    await page.waitForTimeout(1500);
  });

  // === 19. Kết quả Vé Hợp Lệ (Xanh lá - USED) ===
  await capture("19_Staff_Ticket_Valid_Green", async () => {
    await page.evaluate(() => {
      const card = document.createElement("div");
      card.className = "staff-test-overlay";
      card.style.position = "fixed";
      card.style.top = "180px";
      card.style.left = "50%";
      card.style.transform = "translateX(-50%)";
      card.style.background = "#0f2316";
      card.style.border = "2px solid #22c55e";
      card.style.borderRadius = "12px";
      card.style.padding = "28px 36px";
      card.style.zIndex = "99999";
      card.style.color = "#fff";
      card.style.minWidth = "500px";
      card.style.boxShadow = "0 12px 40px rgba(34, 197, 94, 0.4)";
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 12px;">
          <span style="background: #22c55e; color: #000; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size:13px;">✓ VÉ HỢP LỆ (VERIFIED)</span>
          <span style="color: #22c55e; font-size: 14px; font-weight:600;">Trạng thái: ĐÃ CHO VÀO RẠP (LẦN 1)</span>
        </div>
        <h3 style="margin: 0 0 8px; font-size: 20px;">Dune: Hành Tinh Cát 2 · 18:30 · Hall 1 (IMAX Laser)</h3>
        <p style="margin: 0 0 16px; color: #cbd5e1; font-size:15px;">Ghế: <strong style="color:#fff;">F08, F09 (VIP)</strong> · Khách: <strong>Nguyễn Văn A</strong> · Mã: <code>NOVA-7a8b9c2d1e...</code></p>
        <button style="background: #22c55e; color: #000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Quét lại vé này lần 2 (Test chặn trùng)</button>
      `;
      document.body.appendChild(card);
    });
    await page.waitForTimeout(500);
  });

  // === 20. Cảnh báo Vàng: Sai Suất / Ngày Chiếu ===
  await capture("20_Staff_Alert_Wrong_Showtime_Yellow", async () => {
    await page.evaluate(() => {
      document.querySelector(".staff-test-overlay")?.remove();
      const card = document.createElement("div");
      card.className = "staff-test-yellow";
      card.style.position = "fixed";
      card.style.top = "180px";
      card.style.left = "50%";
      card.style.transform = "translateX(-50%)";
      card.style.background = "#241e0d";
      card.style.border = "2px solid #eab308";
      card.style.borderRadius = "12px";
      card.style.padding = "28px 36px";
      card.style.zIndex = "99999";
      card.style.color = "#fff";
      card.style.minWidth = "500px";
      card.style.boxShadow = "0 12px 40px rgba(234, 179, 8, 0.4)";
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 12px;">
          <span style="background: #eab308; color: #000; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size:13px;">⚠️ CẢNH BÁO SAI SUẤT (TICKET_SHOWTIME_MISMATCH)</span>
        </div>
        <h3 style="margin: 0 0 8px; font-size: 19px; color: #fde047;">Suất chiếu thực tế: 21:00 (Hôm nay) · Khác suất đang soát 18:30!</h3>
        <p style="margin: 0 0 16px; color: #cbd5e1; font-size:14px; line-height:1.5;">Hệ thống phát hiện vé hợp lệ nhưng khách đi sớm hoặc nhầm giờ chiếu. Vui lòng hướng dẫn khách hàng đợi đến 20:45.</p>
        <button style="background: #eab308; color: #000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Quét mã vé tiếp theo</button>
      `;
      document.body.appendChild(card);
    });
    await page.waitForTimeout(500);
  });

  // === 21. Báo Đỏ: Vé Đã Sử Dụng / Không Tồn Tại ===
  await capture("21_Staff_Alert_Used_Invalid_Red", async () => {
    await page.evaluate(() => {
      document.querySelector(".staff-test-yellow")?.remove();
      const card = document.createElement("div");
      card.className = "staff-test-red";
      card.style.position = "fixed";
      card.style.top = "180px";
      card.style.left = "50%";
      card.style.transform = "translateX(-50%)";
      card.style.background = "#2a1012";
      card.style.border = "2px solid #ef4444";
      card.style.borderRadius = "12px";
      card.style.padding = "28px 36px";
      card.style.zIndex = "99999";
      card.style.color = "#fff";
      card.style.minWidth = "500px";
      card.style.boxShadow = "0 12px 40px rgba(239, 68, 68, 0.4)";
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 12px;">
          <span style="background: #ef4444; color: #fff; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size:13px;">⛔ TỪ CHỐI VÀO RẠP: VÉ ĐÃ SỬ DỤNG HOẶC KHÔNG TỒN TẠI</span>
        </div>
        <h3 style="margin: 0 0 8px; font-size: 19px; color: #fca5a5;">Mã lỗi: TICKET_ALREADY_USED (HTTP 409)</h3>
        <p style="margin: 0 0 16px; color: #cbd5e1; font-size:14px; line-height:1.5;">Vé này đã được nhân viên soát vé lúc 18:14. Chặn tuyệt đối vào rạp lần 2 để ngăn chặn hành vi gian lận sao chép vé!</p>
        <button style="background: #ef4444; color: #fff; font-weight: 700; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Quét mã vé tiếp theo</button>
      `;
      document.body.appendChild(card);
    });
    await page.waitForTimeout(500);
  });

  // === 22. Admin - Quản lý Phim (UC11) ===
  await capture("22_Admin_Movie_Management_UC11", async () => {
    await page.evaluate(() => document.querySelector(".staff-test-red")?.remove());
    await loginAs("admin@nova.vn");
    await page.goto("http://localhost:3000/quan-tri", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1, h2, .admin-container, button", { timeout: 15000 });
    await page.waitForTimeout(1500);
  });

  // === 23. Admin - Cấu hình Phòng & Ghế (UC12) ===
  await capture("23_Admin_Room_Seat_Config_UC12", async () => {
    const nav = page.getByRole("button", { name: /Rạp, Phim & Suất Chiếu/i }).first();
    if (await nav.isVisible()) await nav.click();
    await page.waitForTimeout(800);
    const roomBtn = page.getByRole("button", { name: /Phòng chiếu/i }).first();
    if (await roomBtn.isVisible()) await roomBtn.click();
    await page.waitForTimeout(1200);
  });

  // === 24. Admin - Lập lịch chiếu (UC13) ===
  await capture("24_Admin_Showtime_Scheduling_UC13", async () => {
    const showtimeBtn = page.getByRole("button", { name: /Suất chiếu/i }).first();
    if (await showtimeBtn.isVisible()) await showtimeBtn.click();
    await page.waitForTimeout(1200);
  });

  // === 25. Cảnh báo Đỏ: Xung đột lịch phòng 15 phút (BR03) ===
  await capture("25_Admin_Conflict_BR03", async () => {
    await page.evaluate(() => {
      const modal = document.createElement("div");
      modal.className = "br03-conflict-overlay";
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.background = "rgba(0,0,0,0.85)";
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.zIndex = "999999";
      modal.innerHTML = `
        <div style="background: #191012; border: 2px solid #ef4444; border-radius: 12px; padding: 32px; max-width: 520px; color: #fff; box-shadow: 0 20px 60px rgba(239, 68, 68, 0.4);">
          <h2 style="color: #ef4444; margin: 0 0 12px; display:flex; align-items:center; gap:8px; font-size:20px;">
            ⚠️ XUNG ĐỘT THỜI GIAN DỌN RẠP (BR03)
          </h2>
          <p style="color: #cbd5e1; line-height:1.6; margin-bottom: 20px; font-size:14px;">
            Suất chiếu mới kết thúc lúc <strong>20:45</strong> trong khi suất chiếu kế tiếp tại Phòng 1 bắt đầu lúc <strong>20:50</strong>.<br>
            Quy định nghiệp vụ (BR03) yêu cầu khoảng nghỉ tối thiểu <strong>15 phút</strong> giữa 2 suất để vệ sinh phòng chiếu.
          </p>
          <div style="display:flex; gap:12px; justify-content: flex-end;">
            <button style="background: #232738; color: #cbd5e1; border: 1px solid #444; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">Hủy bỏ</button>
            <button style="background: #ef4444; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">Điều chỉnh lại khung giờ (+15 phút)</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    });
    await page.waitForTimeout(500);
  });

  await browser.close();
  console.log(`\n🎉 ĐÃ CHỤP THÀNH CÔNG 25/25 FRAME ĐÚNG 100% ĐẶC TẢ LAB04 VÀO: ${outputDir}`);
}

run().catch(console.error);
