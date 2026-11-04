import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(root, "frontend/public/figma-screens-native");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log("Fetching http://localhost:3000/figma-export...");
  const res = await fetch("http://localhost:3000/figma-export");
  const fullHtml = await res.text();

  // Screen names definition
  const screenNames = [
    "Trang 01 - Trang chủ NOVA Cinema (Khách vãng lai)",
    "Trang 02 - Hộp thoại Đăng nhập tài khoản (UC02)",
    "Trang 03 - Hộp thoại Đăng ký hội viên mới (UC01)",
    "Trang 04 - Trang chủ Đã đăng nhập (Hội viên C'MEMBER)",
    "Trang 05 - Hộp thoại Chọn cụm rạp theo khu vực (UC03)",
    "Trang 06 - Chi tiết phim & Lịch chiếu theo ngày (UC03)",
    "Trang 07 - Trạng thái rỗng khi ngày không có suất chiếu (UC03 Exception)",
    "Trang 08 - Sơ đồ chọn ghế phòng chiếu ban đầu (UC04)",
    "Trang 09 - Bảng gợi ý cụm ghế liền nhau thông minh (UC09)",
    "Trang 10 - Sơ đồ ghế Đã chọn ghế VIP & Đồng hồ giữ ghế 05:00 (CR-01)",
    "Trang 11 - Cảnh báo lỗi 409 Ghế vừa có người đặt trùng (BR01)",
    "Trang 12 - Chọn bắp nước Party Combo 69K & Đổi điểm C'MEMBER (UC05)",
    "Trang 13 - Xác nhận đơn hàng & Chọn cổng thanh toán (UC06)",
    "Trang 14 - Giao diện Cổng thanh toán mô phỏng Payment Sandbox (UC06)",
    "Trang 15 - Thông báo Hết hạn 5 phút giữ ghế & Tự động giải phóng ghế (BR04)",
    "Trang 16 - Thông báo Khách hàng hủy giao dịch & Trả lại ghế trống",
    "Trang 17 - Vé điện tử QR Code, Xác nhận Email & Tải lịch .ics (UC07, UC08, UC10)",
    "Trang 18 - Cổng soát vé QR dành cho Nhân viên rạp (UC14)",
    "Trang 19 - Kết quả Soát vé Hợp lệ & Xác nhận vào rạp (Màu Xanh)",
    "Trang 20 - Cảnh báo Vé sai suất chiếu hoặc sai ngày chiếu (Màu Vàng)",
    "Trang 21 - Cảnh báo chặn Vé đã sử dụng hoặc Không tìm thấy vé (Màu Đỏ)",
    "Trang 22 - Quản trị danh mục Phim (UC11 - Admin)",
    "Trang 23 - Thiết lập Phòng chiếu & Ma trận sơ đồ ghế (UC12 - Admin)",
    "Trang 24 - Lập lịch chiếu phim & Kiểm tra giờ trống (UC13 - Admin)",
    "Trang 25 - Cảnh báo đỏ Xung đột lịch phòng dưới 15 phút dọn rạp (BR03 - Admin)",
  ];

  const cleanNames = [
    "01_Trang_01_Trang_chu_NOVA_Cinema.html",
    "02_Trang_02_Dang_nhap_UC02.html",
    "03_Trang_03_Dang_ky_UC01.html",
    "04_Trang_04_Trang_chu_CMEMBER.html",
    "05_Trang_05_Chon_cum_rap_UC03.html",
    "06_Trang_06_Chi_tiet_phim_Lich_chieu_UC03.html",
    "07_Trang_07_Rong_khong_co_suat_chieu_UC03.html",
    "08_Trang_08_So_do_ghe_ban_dau_UC04.html",
    "09_Trang_09_Goi_y_cum_ghe_UC09.html",
    "10_Trang_10_Giu_ghe_VIP_5_phut_CR01.html",
    "11_Trang_11_Loi_409_trung_ghe_BR01.html",
    "12_Trang_12_Chon_bap_nuoc_Combo_UC05.html",
    "13_Trang_13_Xac_nhan_don_hang_UC06.html",
    "14_Trang_14_Cong_thanh_toan_Sandbox_UC06.html",
    "15_Trang_15_Het_han_5_phut_giu_ghe_BR04.html",
    "16_Trang_16_Huy_giao_dich_tra_ghe.html",
    "17_Trang_17_Ve_dien_tu_QR_ics_UC07_UC08_UC10.html",
    "18_Trang_18_Cong_soat_ve_QR_Nhan_vien_UC14.html",
    "19_Trang_19_Soat_ve_Hop_le_Mau_Xanh.html",
    "20_Trang_20_Canh_bao_Sai_suat_chieu_Mau_Vang.html",
    "21_Trang_21_Chan_ve_da_su_dung_Mau_Do.html",
    "22_Trang_22_Admin_Quan_ly_phim_UC11.html",
    "23_Trang_23_Admin_Thiet_lap_phong_chieu_UC12.html",
    "24_Trang_24_Admin_Lap_lich_chieu_UC13.html",
    "25_Trang_25_Admin_Xung_dot_lich_15_phut_BR03.html",
  ];

  // Regex to split by section data-figma-frame-name
  const regex = /<section data-figma-frame-name="([^"]+)"[\s\S]*?<\/section>/g;
  
  let match;
  let index = 0;
  while ((match = regex.exec(fullHtml)) !== null && index < 25) {
    const rawName = match[1];
    const frameContent = match[0];
    const fileName = cleanNames[index];

    const htmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1440, initial-scale=1.0">
  <title>${rawName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #06080e; color: #f8fafc; min-height: 960px; width: 1440px; margin: 0 auto; overflow: hidden; }
    button { cursor: pointer; transition: all 0.2s; }
    button:hover { opacity: 0.9; transform: translateY(-1px); }
  </style>
</head>
<body>
  ${frameContent}
</body>
</html>`;

    fs.writeFileSync(path.join(outDir, fileName), htmlDoc, "utf8");
    console.log(`Saved [${index + 1}/25]: ${fileName}`);
    index++;
  }

  // Also copy to root public directory
  const rootOut = path.resolve(root, "public/figma-screens-native");
  if (!fs.existsSync(rootOut)) fs.mkdirSync(rootOut, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    fs.copyFileSync(path.join(outDir, f), path.join(rootOut, f));
  }

  console.log(`🎉 Generated ${index - 1} native HTML files in public/figma-screens-native!`);
}

run().catch(console.error);
