# 🎬 NOVA CINEMA (INFINITY) — HỆ THỐNG ĐẶT VÉ XEM PHIM TRỰC TUYẾN

**BÁO CÁO ĐỒ ÁN MÔN HỌC: NHẬP MÔN KỸ NGHỆ PHẦN MỀM (LAB04)**  
**TRƯỜNG ĐẠI HỌC SƯ PHẠM THÀNH PHỐ HỒ CHÍ MINH — KHOA CÔNG NGHỆ THÔNG TIN**

<p align="center">
  <a href="https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema"><img src="https://img.shields.io/badge/GitHub-Repository%20Official-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" /></a>
  <a href="https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/Download-ZIP%20Source%20Code-brightgreen?style=for-the-badge&logo=curseforge&logoColor=white" alt="Download ZIP" /></a>
  <a href="https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/milestones"><img src="https://img.shields.io/badge/Milestones-100%25%20Completed-blue?style=for-the-badge&logo=github" alt="Milestones" /></a>
  <a href="https://www.figma.com/design/YNhIlce7yMKDYuOaONH56S/Web-xem-phim-nova-cinema?node-id=0-1"><img src="https://img.shields.io/badge/Figma-25%20Screens%20UI%2FUX-purple?style=for-the-badge&logo=figma&logoColor=white" alt="Figma UI" /></a>
  <img src="https://img.shields.io/badge/Unit%20Tests-123%2F123%20PASS-success?style=for-the-badge&logo=node.js&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Next.js-16%20App%20Router-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11%20API-red?style=for-the-badge&logo=nestjs" alt="NestJS" />
</p>

---

## 🔑 BẢNG TÀI KHOẢN ĐĂNG NHẬP NGHIỆM THU (DÀNH CHO THẦY CÔ & GIẢNG VIÊN)

> 💡 **Tất cả tài khoản dưới đây đã được khởi tạo sẵn trong cơ sở dữ liệu Supabase Cloud & Local RAM.**  
> Thầy/Cô chỉ cần chọn tài khoản theo vai trò mong muốn và nhập mật khẩu chung: **`nova@12345`**

| Vai trò Actor | Email đăng nhập | Mật khẩu chung | Trang kiểm tra nghiệp vụ | Nghiệp vụ chính cần nghiệm thu |
| :--- | :--- | :---: | :---: | :--- |
| 👑 **Quản trị viên (Admin)** | **`admin@nova.vn`** | **`nova@12345`** | `/quan-tri` hoặc `/admin` | • **Lập lịch chiếu chống xung đột 15 phút (BR03)**<br>• Quản lý 24 phim, phòng chiếu, loại ghế<br>• Xem thống kê doanh thu bán vé trực tiếp |
| 🛡️ **Nhân viên soát vé (Staff)** | **`staff@nova.vn`** | **`nova@12345`** | `/soat-ve` hoặc `/staff` | • **Soát vé thông minh bằng Camera QR (BR05)**<br>• Xác thực tính hợp lệ của vé điện tử<br>• Cảnh báo vé giả, sai suất chiếu hoặc vé đã dùng |
| 🍿 **Khách hàng / VIP C'MEMBER** | **`cmember@nova.vn`** *(hoặc `customer@nova.vn`)* | **`nova@12345`** | `/dat-ve` hoặc `/booking` | • **Thuật toán chống đặt ghế trống kẹp giữa (CR-01)**<br>• Khóa ghế đôi Sweetbox, đếm ngược 300 giây<br>• Áp dụng mã Voucher, tích điểm C'MEMBER |

*(Ngoài ra Thầy/Cô cũng có thể bấm nút **"Đăng ký thành viên"** ngay trên giao diện web để tạo tài khoản mới độc lập).*

---

## ⚡ HƯỚNG DẪN NHANH DÀNH CHO NGƯỜI CHƯA BIẾT GÌ VỀ CODE

> 💡 **Bạn không cần biết lập trình, không cần cài Database hay Docker phức tạp!**  
> Dự án đã được đóng gói sẵn chế độ tự động chạy ngầm (In-Memory RAM Engine). Bạn chỉ cần thực hiện đúng **4 bước siêu đơn giản** dưới đây để mở trang web lên trải nghiệm:

### 📥 Bước 1: Cài đặt Node.js (Nếu máy tính chưa có)
- Tải bộ cài đặt Node.js chính thức: 👉 **[Tải Node.js LTS tại nodejs.org](https://nodejs.org/)** *(chọn bản **LTS - Recommended for Most Users**)*.
- Mở file vừa tải về, bấm **Next** liên tục đến khi hoàn tất cài đặt.

### 📦 Bước 2: Tải mã nguồn dự án về máy tính
- **Cách 1 (Nhanh nhất):** Bấm trực tiếp vào liên kết 👉 **[TẢI FILE ZIP DỰ ÁN TẠI ĐÂY](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/archive/refs/heads/main.zip)**.  
  *(Sau khi tải về, hãy nhấp chuột phải chọn **Extract All... (Giải nén)** vào một thư mục trên máy tính)*.
- **Cách 2 (Nếu dùng Git):** Mở cửa sổ Terminal / PowerShell và gõ lệnh:
  ```bash
  git clone https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema.git
  cd du-an-web-xem-phim-nova-cinema
  ```

### 🚀 Bước 3: Mở Terminal và Khởi chạy đúng 2 câu lệnh
1. Mở thư mục dự án vừa giải nén.
2. Nhấp chuột phải vào khoảng trống trong thư mục, chọn **"Open in Terminal"** (hoặc mở ứng dụng **PowerShell / Command Prompt** rồi điều hướng vào thư mục dự án).
3. Gõ lần lượt **2 lệnh** sau:

```powershell
npm install
npm run dev
```

*(Lệnh `npm install` sẽ tự động tải các thư viện cần thiết. Lệnh `npm run dev` sẽ tự động bật cả máy chủ Giao diện và API cùng lúc).*

### 🌐 Bước 4: Mở trình duyệt trải nghiệm
Khi màn hình hiển thị dòng chữ:
```text
[NOVA] Frontend và API đã sẵn sàng: http://localhost:3000
```
Hãy mở trình duyệt (Google Chrome, Microsoft Edge, Cốc Cốc...) và truy cập ngay vào địa chỉ:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 🧭 CÁC TRANG CHỨC NĂNG CHÍNH ĐỂ NGHIỆM THU

| Chức năng cần kiểm tra | Đường dẫn trực tiếp | Mô tả trải nghiệm |
| :--- | :--- | :--- |
| 🎬 **Trang chủ & Danh sách phim** | [http://localhost:3000](http://localhost:3000) | Xem danh mục 24 phim bom tấn, lọc theo thể loại, độ tuổi, trailer. |
| 💺 **Chọn ghế & Chống ghế lẻ (CR-01)** | [http://localhost:3000/dat-ve](http://localhost:3000/dat-ve) | Trực tiếp thử chọn 2 ghế cách nhau 1 ô trống (B14 & B16) để thấy hệ thống lập tức báo đỏ và cảnh báo không cho để trống ghế đơn lẻ! |
| 🎫 **Ví vé điện tử QR Code** | [http://localhost:3000/tai-khoan](http://localhost:3000/tai-khoan) | Xem vé điện tử đã mua kèm mã QR Vector sắc nét, nút xuất lịch `.ics`. |
| 📷 **Cổng soát vé điện tử (Staff)** | [http://localhost:3000/soat-ve](http://localhost:3000/soat-ve) | Bật camera quét QR hoặc nhập mã vé để đối chiếu thông tin và check-in. |
| ⚙️ **Bảng điều khiển Quản trị (Admin)** | [http://localhost:3000/quan-tri](http://localhost:3000/quan-tri) | Thêm phim mới, thiết lập phòng chiếu, lập lịch chiếu chống xung đột 15 phút. |
| 🕶️ **Trải nghiệm Màn chiếu Cong 3D** | [http://localhost:3000/xem-truoc](http://localhost:3000/xem-truoc) | Công nghệ đồ họa Three.js mô phỏng phòng chiếu không gian vòm IMAX. |

---

### ❓ CÂU HỎI THƯỜNG GẶP (FAQ) & KHẮC PHỤC SỰ CỐ
- **Làm sao để tắt máy chủ khi dùng xong?**  
  👉 Quay lại cửa sổ Terminal / PowerShell và nhấn tổ hợp phím **`Ctrl + C`**.
- **Bị báo lỗi `Port 3000 is already in use` hoặc cổng 4000 bị bận?**  
  👉 Do một phiên bản web cũ đang chạy ngầm. Hãy đóng toàn bộ cửa sổ Terminal cũ hoặc khởi động lại máy tính, sau đó chạy lại `npm run dev`.
- **Dữ liệu có bị mất khi tắt máy không?**  
  👉 Khi chạy chế độ mặc định tiện lợi (In-Memory RAM), dữ liệu đặt vé sẽ reset về trạng thái ban đầu sạch sẽ sau mỗi lần restart máy chủ, đảm bảo không sợ lỗi dữ liệu rác.

---

## 👨‍🏫 THÔNG TIN HỌC PHẦN & GIẢNG VIÊN HƯỚNG DẪN
- **Môn học:** Nhập môn Kỹ nghệ Phần mềm (Software Engineering Basics) — LAB04
- **Khoa:** Công nghệ Thông tin — Trường Đại học Sư phạm TP. Hồ Chí Minh (HCMUE)
- **Giảng viên hướng dẫn:** **ThS. Lê Thanh Thoại**
- **Nhóm sinh viên thực hiện:** Nhóm 03 — Lớp 50.01.SPTIN.B
- **Thành viên tiêu biểu:** **Lâm Thanh Phong** (MSSV: 50.01.103.057)

---

## 📐 1. TỔNG QUAN HỆ THỐNG NOVA CINEMA (INFINITY)

Hệ thống **NOVA CINEMA** được thiết kế đáp ứng đầy đủ tiêu chuẩn phần mềm rạp chiếu phim thương mại hiện đại:
- **Tốc độ phản hồi cực nhanh:** Áp dụng kiến trúc Next.js App Router (SSR) kết hợp bộ nhớ đệm phân tán.
- **Tính toàn vẹn dữ liệu ghế ngồi:** Đảm bảo không bao giờ xảy ra tình trạng 2 khách hàng đặt trùng 1 ghế trong cùng một thời điểm.
- **Giao diện chuẩn Cinematic:** Phong cách thiết kế Glassmorphism tối màu, lấy cảm hứng từ các rạp chiếu phim IMAX cao cấp.

---

## 👥 2. SƠ ĐỒ PHÂN QUYỀN TÁC NHÂN (ACTORS)

```
                     ┌───────────────────┐
                     │    Khách hàng     │
                     │  (Vãng lai/Guest) │
                     └─────────┬─────────┘
                               │ (Đăng ký / Đăng nhập)
                               ▼
                     ┌───────────────────┐             ┌─────────────────┐
                     │    Khách hàng     │────────────►│  Hội viên VIP   │
                     │   (Customer)      │ (Nâng hạng) │   (C'MEMBER)    │
                     └─────────┬─────────┘             └─────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ┌───────────┐         ┌───────────┐         ┌───────────────────┐
   │   Admin   │         │ Nhân viên │         │  Payment Sandbox  │
   │ (Quản trị)│         │  (Staff)  │         │ (Cổng thanh toán) │
   └───────────┘         └───────────┘         └───────────────────┘
```

1. **Khách hàng (Customer):** Tra cứu 24 phim, xem lịch chiếu theo ngày, chọn ghế ngồi, chọn bắp nước, thanh toán trực tuyến, nhận vé QR và tải lịch `.ics`.
2. **Hội viên C'MEMBER (Customer Member):** Kế thừa toàn bộ quyền hạn của Khách hàng, đồng thời được tích lũy điểm thưởng theo từng hạng thẻ (Silver, Gold, Diamond), tự động nhận chiết khấu giá vé và ưu đãi combo.
3. **Nhân viên rạp (Cinema Staff):** Đăng nhập cổng soát vé nội bộ, sử dụng camera quét mã QR trên vé khách hàng để kiểm tra tính hợp lệ và ghi nhận check-in đúng 1 lần duy nhất.
4. **Quản trị viên (Admin):** Quản lý danh mục phim, sơ đồ phòng chiếu, thiết lập lịch chiếu phim chống xung đột khung giờ (15 phút đệm dọn phòng), thống kê doanh thu và quản lý người dùng.
5. **Cổng thanh toán giả lập (Payment Sandbox):** Tiếp nhận thông số đơn hàng, xử lý thanh toán mô phỏng an toàn và phản hồi trạng thái giao dịch (Thành công, Thất bại, Hủy, Quá hạn).

---

## 📑 3. DANH MỤC 14 CA SỬ DỤNG (USE CASES UC01 — UC14)

| Mã UC | Tên Ca sử dụng | Tác nhân chính | Tác nhân phụ | Mục tiêu nghiệp vụ chuẩn hóa |
| :---: | :--- | :--- | :---: | :--- |
| **UC01** | Đăng ký tài khoản | Khách hàng | — | Đăng ký tài khoản với định dạng email chuẩn và mật khẩu bảo mật. |
| **UC02** | Đăng nhập hệ thống | Khách hàng, C'MEMBER, Staff, Admin | — | Xác thực bảo mật, phân quyền theo vai trò và cấp phiên HttpOnly. |
| **UC03** | Tra cứu phim & lịch chiếu | Khách hàng | — | Lọc danh mục 24 phim theo thể loại, độ tuổi, định dạng phòng và ngày chiếu. |
| **UC04** | Chọn & Giữ ghế | Khách hàng, C'MEMBER | — | Chọn ghế trên sơ đồ trực quan, kích hoạt khóa ghế tạm thời 300 giây. |
| **UC05** | Tạo đơn & Tính tiền | Khách hàng, C'MEMBER | — | Tổng hợp giá vé, bắp nước combo, giảm giá thẻ C'MEMBER và voucher. |
| **UC06** | Thanh toán đơn hàng | Khách hàng, C'MEMBER | Payment Sandbox | Xử lý thanh toán an toàn, xác nhận trạng thái đơn hàng PAID và đổi ghế thành SOLD. |
| **UC07** | Nhận vé điện tử QR | Khách hàng | — | Phát hành vé điện tử mã QR Vector SVG có chữ ký bảo mật chống làm giả. |
| **UC08** | Nhận email xác nhận | Khách hàng | — | Tự động gửi email thông báo chi tiết đơn hàng và đính kèm vé. |
| **UC09** | Gợi ý cụm ghế liền kề | Khách hàng | — | Thuật toán tự động đề xuất dải ghế liền kề tối ưu cho nhóm khán giả (≤ 20 ghế). |
| **UC10** | Xuất lịch `.ics` | Khách hàng | — | Tạo tệp tin lịch điện tử đồng bộ thời gian chiếu vào Google/Apple Calendar. |
| **UC11** | Quản lý phim | Admin | — | Thêm, sửa, đổi trạng thái chiếu (Đang chiếu, Sắp chiếu, Ngừng chiếu). |
| **UC12** | Quản lý phòng chiếu | Admin | — | Cấu hình hàng, cột, loại ghế (Thường, VIP, Sweetbox đôi) và sức chứa. |
| **UC13** | Quản lý lịch chiếu | Admin | — | Lập lịch chiếu tự động kiểm tra chống trùng lặp giờ và đảm bảo 15 phút đệm dọn phòng. |
| **UC14** | Xác thực & Soát vé QR | Nhân viên rạp | Khách hàng | Quét mã QR đối chiếu suất chiếu, ghi nhận trạng thái ĐÃ SỬ DỤNG 1 lần duy nhất. |

---

## ⚖️ 4. NĂM QUY TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES)

- **CR-01 / BR01 — Chống Đặt Trùng Ghế (Concurrency Protection):** Một ghế tại một suất chiếu chỉ thuộc về duy nhất 1 phiên giao dịch tại 1 thời điểm. Áp dụng Mutex Concurrency để chỉ chấp thuận giao dịch đầu tiên khi có tranh chấp đồng thời.
- **BR02 — Khóa Ghế Tạm Thời 300 Giây (Holding Deadline):** Ngay khi chọn ghế, hệ thống đếm ngược 5:00 phút. Trạng thái ghế là `HOLDING` để khách hàng yên tâm thực hiện các bước tiếp theo.
- **BR03 — Chống Xung Đột Suất Chiếu (15-Minute Buffer):** Trong cùng một phòng chiếu, giờ bắt đầu của suất chiếu sau phải cách giờ kết thúc của suất chiếu trước tối thiểu 15 phút để phục vụ dọn vệ sinh và bảo dưỡng kỹ thuật.
- **BR04 — Tự Động Hoàn Trả Ghế (Auto Seat Rollback):** Bất kỳ khi nào đơn hàng bị hủy, hết hạn 300 giây hoặc thanh toán thất bại, hệ thống lập tức hoàn trả ghế về trạng thái `AVAILABLE` cho người khác đặt.
- **BR05 — Giới Hạn Đơn Hàng & Thẻ Thành Viên:** Mỗi đơn đặt tối đa 20 ghế. Điểm tích lũy và voucher chỉ áp dụng trên giá trị vé hợp lệ.

---

## 🔄 5. MÔ HÌNH HÓA QUY TRÌNH NGHIỆP VỤ (BPMN 3 LANE)

```
  [ LANE 1: KHÁCH HÀNG ]
     (Start) ──► [Chọn Phim & Suất] ──► [Chọn Ghế] ──► [Xác Nhận Đơn] ──► [Thực Hiện Thanh Toán] ──────────┐
                                             ▲                                                             │
  ───────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼─────
  [ LANE 2: NOVA CINEMA ]                    │                                                             │
     [Nhận Yêu Cầu Ghế] ──► <Ghế Khả Dụng?> ─┘(Báo lỗi)                                                    │
                                 │ (Hợp lệ)                                                                │
                                 ▼                                                                         │
                         [Khóa Ghế 5 Phút] ──► [Tạo Đơn Hàng] ──► [Gửi Yêu Cầu Thanh Toán]                 │
                                                                           │                               │
  ─────────────────────────────────────────────────────────────────────────┼───────────────────────────────┼─────
  [ LANE 3: PAYMENT SANDBOX ]                                              │                               ▼
                                                                           └───────────────► [Xử Lý Giao Dịch Mô Phỏng]
                                                                                                   │
  ─────────────────────────────────────────────────────────────────────────────────────────────────┼─────
  [ KẾT QUẢ PHẢN HỒI ]                                                                            ▼
  • NẾU THÀNH CÔNG: Cập nhật CSDL ──► Đổi trạng thái Ghế: ĐÃ BÁN (SOLD) ──► [Phát Hành Vé Điện Tử QR]
  • NẾU THẤT BẠI / TIMEOUT: Kích hoạt BR04 ──► Hủy Đơn Hàng ──► [Tự Động Trả Ghế Về Trạng Thái Trống]
```

---

## 🏛 6. CÔNG NGHỆ & KIẾN TRÚC KỸ THUẬT

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v3 (Cinematic Glassmorphism), Three.js & GSAP 3.15 (Mô phỏng 3D màn cong IMAX).
- **Backend:** NestJS 11, TypeScript 5 Strict, Clean Architecture (Controller → Service → Repository), Server-Sent Events (SSE) cập nhật ghế real-time.
- **Cơ sở dữ liệu:** PostgreSQL 17 (Prisma ORM 6.19) kết hợp bộ nhớ đệm phân tán Redis 7.4 và cơ chế RAM Fallback tiện lợi cho môi trường đồ án.
- **Bảo mật:** Mật khẩu băm chuẩn Argon2id, JWT Token đóng gói trong cookie HttpOnly SameSite=Lax.

---

## 🧪 7. BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

Dự án trang bị bộ kiểm thử tự động toàn diện kiểm tra nghiêm ngặt 100% tính đúng đắn của logic:

```powershell
npm run test:unit
```

- **Kết quả kiểm thử:** Toàn bộ **123/123 tests đạt 100% PASS** (Bao gồm kiểm thử thuật toán chống ghế lẻ, kiểm thử tính tiền vé, kiểm thử tranh chấp ghế đồng thời, kiểm thử xung đột lịch chiếu, kiểm thử mã xác thực vé QR).

---

## 🔗 TỔNG HỢP TOÀN BỘ LIÊN KẾT GITHUB DỰ ÁN

| Danh mục | Liên kết chính thức trên GitHub |
| :--- | :--- |
| 📂 **Mã nguồn Repository** | [thanhphonghcmue/du-an-web-xem-phim-nova-cinema](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema) |
| ⬇️ **Tải trực tiếp ZIP** | [du-an-web-xem-phim-nova-cinema/archive/refs/heads/main.zip](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/archive/refs/heads/main.zip) |
| 🎯 **Tiến độ Milestones (100%)** | [du-an-web-xem-phim-nova-cinema/milestones](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/milestones) |
| 📜 **Lịch sử Commit** | [du-an-web-xem-phim-nova-cinema/commits/main](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/commits/main) |
| 🎨 **Bản vẽ thiết kế Figma** | [Figma: Web-xem-phim-nova-cinema (25 Màn hình)](https://www.figma.com/design/YNhIlce7yMKDYuOaONH56S/Web-xem-phim-nova-cinema?node-id=0-1) |
| 📑 **Tài liệu Nhận diện Thương hiệu** | [docs/brand-identity.html](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/blob/main/docs/brand-identity.html) |

---

<p align="center">
  <b>Bản quyền Đồ án thuộc về Tập thể Nhóm 03 — Lớp 50.01.SPTIN.B — Khoa Công nghệ Thông tin, HCMUE</b><br>
  <i>Thành phố Hồ Chí Minh, Năm học 2025 – 2026</i>
</p>
