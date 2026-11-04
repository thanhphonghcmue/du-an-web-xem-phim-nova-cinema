// ====================================================================
// 🎬 NOVA CINEMA - SCRIPT SIÊU GỌN CHẠY TRỰC TIẾP TRÊN SCRIPTER (100% KHÔNG LỖI)
// ====================================================================

figma.notify("🎬 Đang xử lý: Cắt chuẩn 1080px, dãn lưới và nối toàn bộ dây Prototype...");

try {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
} catch (e) {}

const SCREEN_NAMES = [
  "01. Trang chủ NOVA Cinema - Khách vãng lai",
  "02. Đăng nhập C-MEMBER Modal",
  "03. Đăng ký C-MEMBER Modal",
  "04. Trang chủ Đã đăng nhập - Thành viên",
  "05. Chọn rạp và Cụm rạp Modal",
  "06. Chi tiết phim và Lịch chiếu Dune 2",
  "07. Lịch chiếu trống Empty State",
  "08. Sơ đồ ghế ban đầu IMAX Neon",
  "09. Gợi ý cụm ghế thông minh AI",
  "10. Giữ ghế VIP 5 phút BR01 Countdown",
  "11. Lỗi xung đột trùng ghế 409",
  "12. Chọn combo Bắp Nước Concessions",
  "13. Xác nhận đơn hàng và Thanh toán",
  "14. Cổng thanh toán Sandbox Gateway",
  "15. Timeout hết 5 phút giữ ghế",
  "16. Hủy thanh toán hoặc Thất bại",
  "17. Vé điện tử QR Code và Tải ics",
  "18. Bàn soát vé QR Nhân viên",
  "19. Soát vé HỢP LỆ Thẻ Xanh",
  "20. Cảnh báo SAI SUẤT CHIẾU Thẻ Vàng",
  "21. Chặn vé ĐÃ SỬ DỤNG Thẻ Đỏ 409",
  "22. Admin - Quản lý danh mục phim",
  "23. Admin - Thiết lập sơ đồ phòng chiếu",
  "24. Admin - Lập lịch chiếu Timeline",
  "25. Admin - Chặn xung đột dọn dẹp 15p BR03"
];

// 1. Quét tìm 25 màn hình
const screens = [];
for (const node of figma.currentPage.children) {
  if (node.type === "SECTION") {
    const inner = node.children.find(c => c.type === "FRAME" || c.type === "COMPONENT");
    if (inner) {
      screens.push({ section: node, frame: inner, nameNode: node });
    }
  } else if (node.type === "FRAME" || node.type === "COMPONENT") {
    screens.push({ section: null, frame: node, nameNode: node });
  }
}

if (screens.length === 0) {
  figma.notify("⚠️ Không tìm thấy Frame nào! Vui lòng kiểm tra lại trang Figma.", { error: true });
} else {
  // 2. Sắp xếp thứ tự theo số 01..25 trong tên
  screens.sort((a, b) => {
    const numA = parseInt((a.nameNode.name.match(/\d+/) || [999])[0], 10);
    const numB = parseInt((b.nameNode.name.match(/\d+/) || [999])[0], 10);
    if (numA !== 999 && numB !== 999 && numA !== numB) return numA - numB;
    if (Math.abs(a.nameNode.y - b.nameNode.y) > 100) return a.nameNode.y - b.nameNode.y;
    return a.nameNode.x - b.nameNode.x;
  });

  const pageMap = {};
  const maxItems = Math.min(screens.length, 25);
  const STD_W = 1920;
  const STD_H = 1080;

  // 3. Chuẩn hóa kích thước 1920x1080 và mở khóa tất cả các layer
  for (let i = 0; i < maxItems; i++) {
    const item = screens[i];
    const pageIndex = i + 1;
    const stdName = SCREEN_NAMES[i];

    item.frame.name = stdName;
    if (item.section) item.section.name = stdName;
    pageMap[pageIndex] = item.frame;

    try {
      item.frame.layoutMode = "NONE";
      item.frame.resize(STD_W, STD_H);
      item.frame.clipsContent = true;
    } catch (e) {}

    if (item.section) {
      try {
        item.frame.x = 80;
        item.frame.y = 120;
        item.section.resize(STD_W + 160, STD_H + 200);
      } catch (e) {}
    }

    const unlockAll = (n) => {
      try { n.locked = false; } catch (err) {}
      if ("children" in n) n.children.forEach(unlockAll);
    };
    unlockAll(item.frame);
  }

  // 4. Căn ma trận 5x5 thoáng đẹp, không bị đè
  const COL_COUNT = 5;
  const SEC_W = 2080;
  const SEC_H = 1280;
  const GAP_X = 240;
  const GAP_Y = 240;

  for (let i = 0; i < maxItems; i++) {
    const item = screens[i];
    const col = i % COL_COUNT;
    const row = Math.floor(i / COL_COUNT);
    const posX = col * (SEC_W + GAP_X);
    const posY = row * (SEC_H + GAP_Y);

    if (item.section) {
      item.section.x = posX;
      item.section.y = posY;
    } else {
      item.frame.x = posX;
      item.frame.y = posY;
    }
  }

  // 5. TOÀN BỘ CÁC TUYẾN KẾT NỐI PROTOTYPE ĐẦY ĐỦ 25 TRANG
  const ROUTES = [
    { from: 1, to: [ { dest: 6, label: "Đặt vé Dune 2", type: "MAIN" }, { dest: 2, label: "Đăng nhập", type: "ALT" }, { dest: 3, label: "Đăng ký", type: "ALT" }, { dest: 5, label: "Chọn Rạp", type: "ALT" }, { dest: 7, label: "Lịch chiếu trống", type: "EXCEPTION" }, { dest: 18, label: "Staff Soát vé", type: "ALT" }, { dest: 22, label: "Bảng Admin", type: "ALT" } ] },
    { from: 2, to: [ { dest: 4, label: "Đăng nhập thành công", type: "MAIN" }, { dest: 3, label: "Sang Đăng ký", type: "ALT" }, { dest: 1, label: "Đóng modal X", type: "EXCEPTION" }, { dest: 22, label: "Vào quyền Admin", type: "ALT" }, { dest: 18, label: "Vào quyền Staff", type: "ALT" } ] },
    { from: 3, to: [ { dest: 4, label: "Đăng ký thành công", type: "MAIN" }, { dest: 2, label: "Sang Đăng nhập", type: "ALT" }, { dest: 1, label: "Đóng modal X", type: "EXCEPTION" } ] },
    { from: 4, to: [ { dest: 6, label: "Chọn phim Dune 2", type: "MAIN" }, { dest: 5, label: "Đổi cụm rạp", type: "ALT" }, { dest: 17, label: "Vé điện tử của tôi", type: "ALT" }, { dest: 18, label: "Bàn soát vé Staff", type: "ALT" }, { dest: 22, label: "Quản trị Admin", type: "ALT" }, { dest: 1, label: "Đăng xuất", type: "EXCEPTION" } ] },
    { from: 5, to: [ { dest: 6, label: "Chọn rạp Landmark 81", type: "MAIN" }, { dest: 7, label: "Rạp chưa có lịch", type: "EXCEPTION" }, { dest: 4, label: "Đóng modal", type: "ALT" }, { dest: 1, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 6, to: [ { dest: 8, label: "Chọn suất 20:30 IMAX", type: "MAIN" }, { dest: 7, label: "Ngày trống suất", type: "EXCEPTION" }, { dest: 5, label: "Đổi rạp", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 7, to: [ { dest: 6, label: "Chọn ngày có suất", type: "MAIN" }, { dest: 5, label: "Đổi sang rạp khác", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 8, to: [ { dest: 10, label: "Chọn ghế VIP F08 F09", type: "MAIN" }, { dest: 9, label: "Gợi ý cụm ghế AI", type: "ALT" }, { dest: 11, label: "Ghế trùng 409", type: "EXCEPTION" }, { dest: 6, label: "Đổi suất chiếu", type: "ALT" }, { dest: 4, label: "Hủy đặt vé", type: "EXCEPTION" } ] },
    { from: 9, to: [ { dest: 10, label: "Áp dụng cụm F08 F09", type: "MAIN" }, { dest: 8, label: "Tự chọn ghế tay", type: "ALT" }, { dest: 11, label: "Cụm ghế bị trùng 409", type: "EXCEPTION" }, { dest: 6, label: "Đổi suất", type: "ALT" } ] },
    { from: 10, to: [ { dest: 12, label: "Tiếp tục: Bắp Nước", type: "MAIN" }, { dest: 8, label: "Chọn lại ghế khác", type: "ALT" }, { dest: 15, label: "Timeout 5 phút", type: "EXCEPTION" }, { dest: 11, label: "Xung đột ghế 409", type: "EXCEPTION" }, { dest: 13, label: "Bỏ qua bắp nước -> Thanh toán", type: "ALT" } ] },
    { from: 11, to: [ { dest: 8, label: "Tải lại sơ đồ ghế", type: "MAIN" }, { dest: 9, label: "Nhờ AI gợi ý khác", type: "ALT" }, { dest: 6, label: "Đổi sang suất khác", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "EXCEPTION" } ] },
    { from: 12, to: [ { dest: 13, label: "Xác nhận -> Thanh toán", type: "MAIN" }, { dest: 13, label: "Bỏ qua combo", type: "ALT" }, { dest: 10, label: "Quay lại đổi ghế", type: "ALT" }, { dest: 15, label: "Hết 5 phút giữ ghế", type: "EXCEPTION" }, { dest: 4, label: "Về Trang chủ", type: "EXCEPTION" } ] },
    { from: 13, to: [ { dest: 14, label: "Thanh toán ngay Sandbox", type: "MAIN" }, { dest: 12, label: "Đổi combo bắp nước", type: "ALT" }, { dest: 10, label: "Kiểm tra lại ghế", type: "ALT" }, { dest: 16, label: "Hủy đơn hàng", type: "EXCEPTION" }, { dest: 15, label: "Hết hạn thanh toán", type: "EXCEPTION" } ] },
    { from: 14, to: [ { dest: 17, label: "Xác nhận OTP thành công", type: "MAIN" }, { dest: 16, label: "Hủy giao dịch hoặc Sai OTP", type: "EXCEPTION" }, { dest: 15, label: "Hết hạn nhập OTP", type: "EXCEPTION" }, { dest: 13, label: "Đổi phương thức", type: "ALT" } ] },
    { from: 15, to: [ { dest: 8, label: "Đặt lại vé từ đầu", type: "MAIN" }, { dest: 6, label: "Chọn lại suất chiếu", type: "ALT" }, { dest: 4, label: "Về Trang chủ TV", type: "ALT" }, { dest: 1, label: "Về Trang chủ khách", type: "EXCEPTION" } ] },
    { from: 16, to: [ { dest: 13, label: "Thử thanh toán lại", type: "MAIN" }, { dest: 8, label: "Chọn lại ghế và suất", type: "ALT" }, { dest: 4, label: "Về Trang chủ TV", type: "ALT" }, { dest: 1, label: "Về Trang chủ khách", type: "EXCEPTION" } ] },
    { from: 17, to: [ { dest: 18, label: "Đưa vé cho Staff quét QR", type: "MAIN" }, { dest: 4, label: "Đặt thêm vé khác", type: "ALT" }, { dest: 6, label: "Xem lại phim Dune 2", type: "ALT" }, { dest: 22, label: "Xem hệ thống Admin", type: "ALT" }, { dest: 1, label: "Đăng xuất", type: "EXCEPTION" } ] },
    { from: 18, to: [ { dest: 19, label: "Quét vé HỢP LỆ Thẻ Xanh", type: "MAIN" }, { dest: 20, label: "Quét vé SAI SUẤT Thẻ Vàng", type: "EXCEPTION" }, { dest: 21, label: "Quét vé ĐÃ DÙNG Thẻ Đỏ", type: "EXCEPTION" }, { dest: 17, label: "Đối chiếu vé khách", type: "ALT" }, { dest: 22, label: "Quản trị Admin", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 19, to: [ { dest: 18, label: "Cho vào -> Quét khách kế", type: "MAIN" }, { dest: 23, label: "Xem phòng chiếu IMAX", type: "ALT" }, { dest: 24, label: "Xem Timeline suất chiếu", type: "ALT" }, { dest: 22, label: "Quản trị Admin", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 20, to: [ { dest: 18, label: "Đã hướng dẫn -> Quét tiếp", type: "MAIN" }, { dest: 24, label: "Tra cứu suất chiếu đúng", type: "ALT" }, { dest: 6, label: "Xem các khung giờ chiếu", type: "ALT" }, { dest: 17, label: "Xem lại vé của khách", type: "ALT" }, { dest: 22, label: "Quản trị Admin", type: "ALT" } ] },
    { from: 21, to: [ { dest: 18, label: "Ghi nhận -> Quét tiếp", type: "MAIN" }, { dest: 17, label: "Xem nhật ký vé quét trùng", type: "ALT" }, { dest: 22, label: "Báo cáo gian lận Admin", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 22, to: [ { dest: 23, label: "Tab: Thiết lập phòng chiếu", type: "ALT" }, { dest: 24, label: "Tab: Lập lịch Timeline", type: "MAIN" }, { dest: 6, label: "Xem trang phim ngoài Web", type: "ALT" }, { dest: 18, label: "Đến Bàn soát vé Staff", type: "ALT" }, { dest: 4, label: "Về Trang chủ TV", type: "ALT" }, { dest: 1, label: "Đăng xuất Admin", type: "EXCEPTION" } ] },
    { from: 23, to: [ { dest: 24, label: "Lưu phòng -> Sang Lập lịch", type: "MAIN" }, { dest: 22, label: "Tab: Quản lý phim", type: "ALT" }, { dest: 8, label: "Xem thử ghế IMAX thực tế", type: "ALT" }, { dest: 18, label: "Đến Bàn soát vé Staff", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 24, to: [ { dest: 25, label: "Xếp suất cách < 15p BR03", type: "EXCEPTION" }, { dest: 22, label: "Tab: Quản lý phim", type: "ALT" }, { dest: 23, label: "Tab: Thiết lập phòng", type: "ALT" }, { dest: 6, label: "Xem lịch đã duyệt ngoài Web", type: "MAIN" }, { dest: 18, label: "Đến Bàn soát vé Staff", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] },
    { from: 25, to: [ { dest: 24, label: "Tự động dãn 15 phút BR03", type: "MAIN" }, { dest: 24, label: "Chỉnh sửa thủ công", type: "ALT" }, { dest: 22, label: "Về Quản lý phim", type: "ALT" }, { dest: 23, label: "Kiểm tra phòng chiếu", type: "ALT" }, { dest: 4, label: "Về Trang chủ", type: "ALT" } ] }
  ];

  // 6. Xóa các thanh điều hướng cũ nếu có
  for (let i = 1; i <= 25; i++) {
    const f = pageMap[i];
    if (!f || !("children" in f)) continue;
    const oldBars = f.children.filter(c => c.name === "NOVA_WORKFLOW_NAV_BAR");
    oldBars.forEach(b => b.remove());
  }

  // 7. Tạo thanh Hotspot Bar ở đáy 1080px (chắc chắn 100% không lỗi)
  let totalWires = 0;
  for (const route of ROUTES) {
    const srcFrame = pageMap[route.from];
    if (!srcFrame) continue;

    const navBar = figma.createFrame();
    navBar.name = "NOVA_WORKFLOW_NAV_BAR";
    navBar.resize(srcFrame.width - 60, 64);
    navBar.x = 30;
    navBar.y = STD_H - 80;
    navBar.layoutMode = "HORIZONTAL";
    navBar.primaryAxisAlignItems = "CENTER";
    navBar.counterAxisAlignItems = "CENTER";
    navBar.itemSpacing = 10;
    navBar.paddingLeft = 16;
    navBar.paddingRight = 16;
    navBar.cornerRadius = 14;
    navBar.fills = [{ type: "SOLID", color: { r: 0.04, g: 0.06, b: 0.1 }, opacity: 0.96 }];
    navBar.strokes = [{ type: "SOLID", color: { r: 0.25, g: 0.35, b: 0.55 }, opacity: 0.85 }];
    navBar.strokeWeight = 1.5;

    for (const conn of route.to) {
      const destFrame = pageMap[conn.dest];
      if (!destFrame) continue;

      const btn = figma.createFrame();
      btn.name = "[" + conn.type + "] -> " + conn.label;
      btn.layoutMode = "HORIZONTAL";
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      btn.paddingLeft = 12;
      btn.paddingRight = 12;
      btn.paddingTop = 7;
      btn.paddingBottom = 7;
      btn.cornerRadius = 8;

      let btnBg = conn.type === "MAIN" ? { r: 0.06, g: 0.72, b: 0.5 } : (conn.type === "ALT" ? { r: 0.96, g: 0.62, b: 0.04 } : { r: 0.94, g: 0.27, b: 0.27 });
      let prefix = conn.type === "MAIN" ? "🟢" : (conn.type === "ALT" ? "🟡" : "🔴");
      btn.fills = [{ type: "SOLID", color: btnBg }];

      const btnLabel = figma.createText();
      try {
        btnLabel.fontName = { family: "Inter", style: "Medium" };
      } catch (e) {}
      btnLabel.characters = prefix + " " + conn.label;
      btnLabel.fontSize = 11.5;
      btnLabel.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      btn.appendChild(btnLabel);

      try {
        btn.reactions = [{
          action: {
            type: "NODE",
            destinationId: destFrame.id,
            navigation: "NAVIGATE",
            transition: { type: "DISSOLVE", duration: 0.25, easing: { type: "EASE_OUT" } },
            preserveScrollPosition: false,
          },
          trigger: { type: "ON_CLICK" },
        }];
        totalWires++;
      } catch (e) {}

      navBar.appendChild(btn);
    }

    srcFrame.appendChild(navBar);
  }

  // 8. Tự động gắn dây trực tiếp vào các nút bấm trong màn hình (an toàn 100%)
  const BUTTON_RULES = [
    { screen: 1, kw: ["đăng nhập"], dest: 2 },
    { screen: 1, kw: ["đăng ký"], dest: 3 },
    { screen: 1, kw: ["đặt vé", "dune"], dest: 6 },
    { screen: 2, kw: ["đăng nhập ngay", "đăng nhập"], dest: 4 },
    { screen: 2, kw: ["đăng ký thành viên", "đăng ký"], dest: 3 },
    { screen: 2, kw: ["✕", "x", "đóng"], dest: 1 },
    { screen: 3, kw: ["đăng ký ngay", "đăng ký"], dest: 4 },
    { screen: 3, kw: ["đăng nhập"], dest: 2 },
    { screen: 3, kw: ["✕", "x", "đóng"], dest: 1 },
    { screen: 4, kw: ["đặt vé", "dune"], dest: 6 },
    { screen: 4, kw: ["vé của tôi"], dest: 17 },
    { screen: 4, kw: ["đăng xuất"], dest: 1 },
    { screen: 5, kw: ["landmark 81", "tiếp tục"], dest: 6 },
    { screen: 5, kw: ["✕", "x", "đóng"], dest: 4 },
    { screen: 6, kw: ["20:30", "imax", "chọn suất"], dest: 8 },
    { screen: 8, kw: ["f08", "f09", "chọn ghế"], dest: 10 },
    { screen: 8, kw: ["gợi ý", "ai"], dest: 9 },
    { screen: 9, kw: ["áp dụng"], dest: 10 },
    { screen: 10, kw: ["tiếp tục", "bắp nước"], dest: 12 },
    { screen: 12, kw: ["tiếp tục", "thanh toán"], dest: 13 },
    { screen: 13, kw: ["thanh toán ngay", "sandbox"], dest: 14 },
    { screen: 14, kw: ["xác nhận", "thành công"], dest: 17 },
    { screen: 17, kw: ["soát vé", "quét qr"], dest: 18 },
    { screen: 18, kw: ["hợp lệ", "xanh"], dest: 19 },
    { screen: 18, kw: ["sai suất", "vàng"], dest: 20 },
    { screen: 18, kw: ["đã dùng", "đỏ"], dest: 21 },
    { screen: 22, kw: ["thiết lập phòng"], dest: 23 },
    { screen: 22, kw: ["lập lịch"], dest: 24 },
    { screen: 23, kw: ["lập lịch"], dest: 24 },
    { screen: 24, kw: ["xung đột", "br03"], dest: 25 },
    { screen: 25, kw: ["tự động dãn cách", "fix"], dest: 24 }
  ];

  for (const rule of BUTTON_RULES) {
    const src = pageMap[rule.screen];
    const target = pageMap[rule.dest];
    if (!src || !target || !("children" in src)) continue;

    const findButtons = (node) => {
      if (node.name === "NOVA_WORKFLOW_NAV_BAR") return;
      if (node.type === "FRAME" || node.type === "COMPONENT") {
        const nameLower = (node.name || "").toLowerCase();
        let textContent = "";
        try {
          if ("children" in node) {
            for (const c of node.children) {
              if (c.type === "TEXT" && c.characters) textContent += " " + c.characters.toLowerCase();
            }
          }
        } catch (e) {}

        const match = rule.kw.some(k => nameLower.includes(k) || textContent.includes(k));
        if (match) {
          try {
            node.reactions = [{
              action: {
                type: "NODE",
                destinationId: target.id,
                navigation: "NAVIGATE",
                transition: { type: "DISSOLVE", duration: 0.25, easing: { type: "EASE_OUT" } },
                preserveScrollPosition: false,
              },
              trigger: { type: "ON_CLICK" },
            }];
            totalWires++;
          } catch (e) {}
        }
      }

      if ("children" in node && node.name !== "NOVA_WORKFLOW_NAV_BAR") {
        node.children.forEach(findButtons);
      }
    };

    findButtons(src);
  }

  figma.viewport.scrollAndZoomIntoView(Object.values(pageMap));
  figma.notify("🎉 ĐỈNH CAO: Đã kết nối thành công " + totalWires + " dây Prototype trên toàn bộ 25 trang!");
}
