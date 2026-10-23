# 🚀 HƯỚNG DẪN CỘNG TÁC & PHÁT TRIỂN DỰ ÁN NOVA CINEMA
> **Tài liệu bàn giao quy trình, chuẩn mực mã nguồn và bộ công cụ dành cho thành viên nhóm phát triển.**

---

## 🔗 1. THÔNG TIN REPOSITORY & CÁCH THAM GIA

- **Link Repository GitHub:** [https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema)
- **Quyền truy cập:** Nhóm phát triển (Collaborators).

### 👥 Các bước để thành viên mới tham gia code & push:
1. **Chủ dự án (Owner) cấp quyền:**
   - Truy cập: `https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/settings/access`
   - Bấm **Add people** -> Nhập username GitHub hoặc email của bạn bè -> Bấm **Add... to this repository**.
2. **Thành viên chấp nhận lời mời:**
   - Mở email thông báo từ GitHub hoặc truy cập trực tiếp:  
     👉 [https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/invitations](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/invitations)
   - Bấm **Accept invitation**.
3. **Clone mã nguồn về máy:**
   ```bash
   git clone https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema.git
   cd "du-an-web-xem-phim-nova-cinema"
   ```

---

## 🛠️ 2. YÊU CẦU MÔI TRƯỜNG & KHỞI ĐỘNG (SETUP GUIDE)

### 📌 Yêu cầu phần mềm:
- **Node.js:** Phiên bản `>= 20.x` (khuyến nghị Node 22.x hoặc 24.x).
- **Trình duyệt:** Chrome, Edge, Firefox bản mới nhất.
- *(Tùy chọn)* **Docker Desktop:** Nếu muốn chạy database PostgreSQL 17 và Redis thật ở backend.

---

### ⚡ Chế độ 1: Chạy Siêu Tốc (Offline / In-Memory Mode - Không cần Docker)
Hệ thống đã được tích hợp cơ chế tự phục hồi (**Resilient Fallback**) và bộ nhớ tạm (**In-Memory Rate Limiting**). Bạn có thể phát triển giao diện và nghiệp vụ ngay lập tức mà không cần cài đặt cơ sở dữ liệu:

```bash
# 1. Cài đặt toàn bộ thư viện
npm ci

# 2. Khởi chạy máy chủ giao diện Next.js
npm run dev
```
🌐 Mở trình duyệt tại: **`http://localhost:3000`**

---

### 🏢 Chế độ 2: Chạy Đầy Đủ Fullstack (Backend NestJS + Frontend Next.js)
Dành cho khi muốn kiểm thử luồng database PostgreSQL thật, Redis Outbox Relay, và Mailpit SMTP:

```bash
# Bật Docker Desktop trước, sau đó chạy:
npm run setup:local

# Khởi động đồng thời cả Backend (port 4000) và Frontend (port 3000):
npm run dev:full
```

---

## 🔄 3. QUY TẮC PHỐI HỢP GIT & LUỒNG LÀM VIỆC (GIT WORKFLOW)

Để tránh xung đột code (conflict) và giữ lịch sử git luôn chuyên nghiệp:

### 🌿 3.1. Quy ước đặt tên nhánh (Branch Convention)
- **Nhánh chính (`main`):** Nhánh chạy ổn định, luôn sẵn sàng nộp bài hoặc triển khai production.
- **Nhánh tính năng mới:** `feature/ten-tinh-nang` (Ví dụ: `feature/filter-by-city`, `feature/fb-store`)
- **Nhánh sửa lỗi:** `fix/ten-loi` (Ví dụ: `fix/seat-timer-bug`, `fix/momo-qr-render`)
- **Nhánh tài liệu:** `docs/cap-nhat-bao-cao`

```bash
# Tạo và chuyển sang nhánh mới trước khi làm việc:
git checkout -b feature/filter-by-city
```

### ✍️ 3.2. Quy ước thông điệp Commit (Conventional Commits)
Sử dụng tiền tố chuẩn quốc tế:
- `feat: ...` -> Thêm tính năng mới (ví dụ: `feat: add city filter dropdown in navbar`)
- `fix: ...` -> Khắc phục lỗi (ví dụ: `fix: prevent orphan seat on edge columns`)
- `docs: ...` -> Cập nhật tài liệu / README (ví dụ: `docs: update collaboration instructions`)
- `style: ...` -> Chỉnh sửa CSS / Giao diện không đổi logic (ví dụ: `style: refine neon glow for imax badge`)
- `refactor: ...` -> Tái cấu trúc mã nguồn (ví dụ: `refactor: simplify points calculation in client`)
- `test: ...` -> Bổ sung ca kiểm thử (ví dụ: `test: add 5 test cases for points redemption`)

### 🚫 3.3. Các điều cấm kỵ (Hard Rules)
- ❌ **TUYỆT ĐỐI KHÔNG `git push --force`** lên nhánh `main`.
- ❌ Không commit file cấu hình chứa mật khẩu nhạy cảm (`.env`, `*.pem`, `*.key`).
- ❌ Không commit thư mục rác: `node_modules/`, `.next/`, `dist/`, `.runtime/`.

---

## 🚦 4. BỘ CÔNG CỤ RÀNG BUỘC CHẤT LƯỢNG (QUALITY GATES)

Trước khi thực hiện `git push`, **bắt buộc** phải chạy và vượt qua 3 lệnh kiểm tra chất lượng sau:

```bash
# Bước 1: Kiểm tra lỗi cú pháp và chuẩn viết code (ESLint)
npm run lint

# Bước 2: Kiểm tra biên dịch sản phẩm (Next.js Production Build)
npm run build

# Bước 3: Chạy bộ kiểm thử tự động các nghiệp vụ rạp phim
node scripts/test-enhancements.mjs
```

> ⚠️ **Quy tắc vàng:** Chỉ push code khi cả 3 lệnh trên đều trả về kết quả **PASS (Exit code 0)** và **0 errors**.

---

## 🎬 5. CÁC NGHIỆP VỤ RẠP PHIM CỐT LÕI (BẮT BUỘC NẮM RÕ)

Khi bạn bè tham gia code mở rộng các tính năng đặt vé, cần đặc biệt lưu ý **5 quy tắc nghiệp vụ rạp phim đã được cài đặt sẵn**:

1. **Quy tắc chặn ghế trống đơn lẻ (Orphan Seat Rule):**
   - Không cho phép người dùng chọn ghế sao cho để lại đúng **1 ghế trống lẻ loi** ở đầu dãy, cuối dãy hoặc giữa 2 người khác.
   - Hàm kiểm tra: `checkClientOrphanSeats()` tại `src/components/SeatBooking.jsx`.
2. **Quy tắc ghế đôi Sweetbox:**
   - Ghế đôi luôn nằm ở hàng cuối và bắt buộc phải chọn hoặc bỏ theo **cặp 2 ghế liền kề** cùng lúc (không được đặt 1 nửa ghế đôi).
3. **Cảnh báo độ tuổi kiểm duyệt (Age Rating Compliance):**
   - Phim `T18` (18+), `T16` (16+), `T13` (13+) bắt buộc hiển thị thẻ cảnh báo và mở Modal cam kết xuất trình CCCD/VNeID trước khi chuyển sang thanh toán.
4. **Hệ thống Điểm tích lũy C-Member:**
   - Tỷ lệ: `1 điểm = 1.000 VNĐ`.
   - Giảm trừ trực tiếp vào giá trị đơn hàng, mã QR VietQR / MoMo / VNPAY tự động cập nhật số tiền sau khi trừ điểm. Tổng đơn không được âm.
5. **Bảo mật phiên đăng nhập:**
   - Token xác thực lưu trong HttpOnly Cookies (`nova_access`, `nova_refresh`), không lưu vào `localStorage` để chống tấn công XSS. Mọi giao dịch giữ chỗ đều gửi kèm `Idempotency-Key` chống duplicate order.

---

## 🗺️ 6. DANH SÁCH HẠNG MỤC MỞ RỘNG (ROADMAP DÀNH CHO TEAM)

Các thành viên có thể chọn một trong các hạng mục sau để mở rộng dự án:

- [ ] **Task 1: Bộ lọc Rạp theo Tỉnh / Thành phố:**
  - Bổ sung chọn Tỉnh/Thành phố (Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng...) tại Header và trang chọn suất chiếu.
- [ ] **Task 2: Quy trình Hủy vé & Đổi suất chiếu tự động:**
  - Cho phép người dùng bấm "Hủy vé" nếu suất chiếu còn cách thời gian bắt đầu `> 120 phút`.
  - Tự động hoàn lại 100% tiền dưới dạng điểm thành viên hoặc mã Voucher hoàn tiền.
- [ ] **Task 3: Cửa hàng Bắp Nước độc lập (Standalone F&B Store):**
  - Thêm tab "Bắp & Nước" trên Navbar cho khách vào mua combo mang về mà không cần mua vé xem phim.
- [ ] **Task 4: Thẻ vé điện tử trên di động (Mobile Wallet Pass):**
  - Bổ sung nút "Thêm vào Apple Wallet" / "Lưu thẻ di động" sau khi thanh toán thành công để dễ dàng mở mã QR tại quầy soát vé.

---

## 📞 7. LIÊN HỆ & HỖ TRỢ TRONG QUÁ TRÌNH PHÁT TRIỂN

- **Repository Issue Tracker:** Mở issue tại [GitHub Issues](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/issues) để báo cáo lỗi hoặc thảo luận tính năng mới.
- **Trạng thái hệ thống:** Khi gặp bất kỳ sự cố kết nối, chạy `npm run lint` và `node scripts/test-enhancements.mjs` để định vị nguyên nhân.
