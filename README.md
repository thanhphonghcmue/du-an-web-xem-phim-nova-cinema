# 🎬 NOVA CINEMA (INFINITY EXPERIENCE) - WEBSITE ĐẶT VÉ XEM PHIM TRỰC TUYẾN
**Báo cáo Đồ án Học phần: Nhập môn Kỹ nghệ Phần mềm (LAB03 - LAB04)**  
**Trường Đại học Sư phạm TP. Hồ Chí Minh (HCMUE) — Khoa Công nghệ Thông tin**

---

### 👨‍🏫 GIẢNG VIÊN HƯỚNG DẪN
- **ThS. Lê Thanh Thoại**

### 👥 DANH SÁCH THÀNH VIÊN THỰC HIỆN — NHÓM 03 (LỚP: 2611COMP104405)
| STT | Họ và Tên | Mã số Sinh viên | Vai trò & Trách nhiệm chính |
| :---: | :--- | :---: | :--- |
| 1 | **Lâm Thanh Phong** | `50.01.103.057` | **Nhóm trưởng & Fullstack Lead** (Quản lý dự án, Kiến trúc kỹ thuật, Triển khai Core Flow) |
| 2 | **Phạm Ngọc Mỹ Huyền** | `50.01.103.028` | **BA Lead** (Thu thập & Đặc tả yêu cầu phần mềm, Thiết kế quy tắc nghiệp vụ BR) |
| 3 | **Nguyễn Bình Phương Mi** | `50.01.103.039` | **Survey Lead** (Khảo sát người dùng, Nghiên cứu thị trường & UX Benchmark) |
| 4 | **Thạch Võ Diễm Ngọc** | `50.01.103.050` | **Modeling Lead** (Mô hình hóa hệ thống UML, Sơ đồ Use Case, Activity & Class Diagram) |
| 5 | **Phùng Thị Mỹ Quyên** | `50.01.103.063` | **QA Lead** (Đảm bảo chất lượng, Kịch bản kiểm thử Test Cases & Kiểm định luồng) |

---

## 📌 TÀI LIỆU CỐT LÕI CỦA DỰ ÁN
> 📚 **Dành cho Giảng viên & Hội đồng đánh giá:**
> - [📘 Hướng dẫn Cộng tác & Quy trình Phát triển (COLLABORATION_GUIDE.md)](COLLABORATION_GUIDE.md)
> - [🗺️ Bản đồ Chức năng, Tiến trình & Giải thích Code Toàn diện (BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md)](docs/BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md)
> - [📊 Báo cáo Rà soát Luồng Nghiệp vụ & Vé Điện tử (business-flow-audit.md)](docs/design/business-flow-audit.md)
> - [🍿 Báo cáo Thiết kế Cửa hàng Bắp Nước & Nhiếp ảnh Thực phẩm (photography-refresh.md)](docs/design/photography-refresh.md)

---

## 🚀 1. MÔ TẢ DỰ ÁN & TÍNH NĂNG CỐT LÕI

**NOVA CINEMA (Infinity Experience)** là nền tảng đặt vé xem phim trực tuyến hiện đại, ứng dụng ngôn ngữ thiết kế **Cinematic Glassmorphism Dark UI** sang trọng. Hệ thống được nghiên cứu và xây dựng nhằm giải quyết bài toán cốt lõi trong nghiệp vụ rạp chiếu: **xung đột đặt trùng ghế thời gian thực (concurrency race condition)**, tối ưu tốc độ đặt vé dưới 30 giây và mang lại trải nghiệm số hóa toàn diện từ chọn suất đến soát vé tại rạp.

### 🌟 Các Tính năng Trọng tâm (Chuẩn 13 FRs & Business Rules BR01 - BR05):
1. **Quick Booking Dock Bar (Đặt vé nhanh dưới 30 giây)**:
   - Thanh công cụ dock thông minh gắn liền trải nghiệm trang chủ: chọn Cụm rạp → Bộ phim → Ngày chiếu → Giờ chiếu trực quan.
   - Tìm kiếm, lọc nhanh theo độ tuổi (P, K, T13, T16, T18), định dạng phòng (IMAX Laser, VIP Studio, Dolby Atmos).
2. **Khóa ghế tạm thời 5 phút (CR-01 & BR02)**:
   - Đồng hồ đếm ngược `05:00` phút thời gian thực hiển thị nổi bật khi người dùng chọn ghế.
   - Trạng thái ghế chuyển ngay sang `HOLDING`, đồng bộ tức thời đến toàn bộ người dùng khác qua Server-Sent Events (SSE) và Socket.IO.
3. **Chống Đặt Trùng Ghế (Race Condition Handling - BR01 / TC-01)**:
   - Ứng dụng khóa bi quan (Pessimistic Locking) và phân tán Redis Lock. Khi nhiều khách hàng cùng ấn giữ một ghế ở cùng một mili-giây, hệ thống đảm bảo duy nhất **1 giao dịch thành công**, các giao dịch còn lại nhận thông báo lỗi lịch sự kèm hướng dẫn chọn ghế khác.
4. **Tự Động Hoàn Trả Ghế Hết Hạn (BR04)**:
   - Khi hết thời gian giữ ghế 5 phút hoặc thanh toán bị hủy/thất bại, tiến trình ngầm tự động giải phóng ghế về trạng thái sẵn sàng (`AVAILABLE`) ngay lập tức mà không cần nhân viên can thiệp.
5. **Thuật Toán Gợi Ý Cụm Ghế Liền Kề (G3-FR11)**:
   - Tự động quét sơ đồ phòng và đề xuất các dải ghế tối ưu từ 2 đến 20 ghế cho nhóm bạn bè, gia đình, đảm bảo không để lại ghế trống đơn lẻ vi phạm quy tắc rạp.
6. **Thực Đơn Bắp Nước Food Studio & Giỏ Hàng Trực Tiếp**:
   - Menu 24 sản phẩm và combo bắp nước đa vị (Caramel, Cheese, Denver Mix...) với hình ảnh thực tế chất lượng cao.
   - Giỏ hàng trực tiếp (Live Cart) hỗ trợ tăng giảm số lượng tức thì, đồng bộ vào đơn đặt vé.
7. **Ưu Đãi Hội Viên C'MEMBER & Mã Giảm Giá Đa Tầng (BR05)**:
   - Tự động tính giá vé theo loại ghế (Standard, VIP, Sweetbox đôi).
   - Tích điểm hội viên C'MEMBER và áp dụng chính sách giảm giá theo hạng thẻ (Silver, Gold, Diamond).
   - Hệ thống voucher xác thực nghiêm ngặt (`NOVA20`, `CINEMA10`, `U22`, `CHAOBANMOI`, `VIP50`) với kiểm tra điều kiện đơn hàng tối thiểu.
8. **Cổng Thanh Toán Sandbox & Vé Điện Tử E-Ticket QR Code (TC-05)**:
   - Mô phỏng cổng thanh toán Sandbox an toàn có chữ ký mật mã, kiểm tra tính toàn vẹn (integrity) và thời hạn đơn hàng.
   - Sau khi thanh toán thành công, hệ thống phát hành Vé Điện Tử chứa mã **QR Code Vector SVG** chuẩn xác thực hash bí mật 64-hex (không dùng order code thô), có thể lưu vào ví vé tài khoản hoặc quét tại quầy.
9. **Cổng Soát Vé Nhân Viên (Staff Admission Scanner)**:
   - Giao diện chuyên dụng dành cho nhân viên rạp (`/soat-ve`): quét mã QR hoặc nhập mã vé, kiểm tra phòng chiếu, giờ chiếu và chỉ chấp nhận soát vé **duy nhất 1 lần** (ngăn chặn tái sử dụng vé).
10. **Cổng Quản Trị Hệ Thống (Admin Portal & Revenue Reports)**:
    - Bảng điều khiển quản trị toàn diện (`/quan-tri`): quản lý danh mục phim, rạp chiếu, phòng chiếu, sơ đồ bố trí ghế ngồi, suất chiếu và tài khoản người dùng.
    - Xuất báo cáo doanh thu chuẩn CSV, thống kê theo từng rạp, từng phim và khoảng thời gian tùy chọn.
11. **Trải Nghiệm Đồ Họa 3D & Nhận Diện Thương Hiệu Tự Hào Dân Tộc**:
    - Mô phỏng màn hình cong 3D sống động (Three.js WebGL) tại trang Xem trước (`/xem-truoc`).
    - Logo thương hiệu độc quyền lồng ghép chữ **NV — VN**: Nhìn xuôi đọc thành **VN (Việt Nam)** thể hiện *Ước khát vọng vươn mình của dân tộc*, nhìn tổng thể thể hiện **NV (NOVA Cinema)** trên nền phối màu Platinum Bạch Kim và Vàng Hoàng Kim sang trọng.

---

## 📋 2. MA TRẬN YÊU CẦU CHỨC NĂNG (13 FRs) & QUY TẮC NGHIỆP VỤ (BR01 - BR05)

### Bảng 13 Yêu cầu Chức năng (Functional Requirements):
| Mã FR | Tên Chức năng | Mô tả chi tiết | Thành phần đảm nhiệm |
| :--- | :--- | :--- | :--- |
| **FR01** | Quản lý Tài khoản & Đăng nhập | Đăng ký, đăng nhập với cookie HttpOnly, mã hóa mật khẩu argon2, phân quyền Khách hàng/Nhân viên/Quản trị viên. Hỗ trợ bật/tắt ẩn hiện mật khẩu. | `AuthModule`, `LoginPage`, `Header` |
| **FR02** | Xem Danh mục Phim & Lịch chiếu | Khám phá 24 bộ phim (Đang chiếu, Tuyển chọn, Sắp chiếu), xem trailer 4K, thời lượng, giới hạn độ tuổi, nội dung tóm tắt. | `CinemaHero`, `LichChieuPhim`, `CatalogProvider` |
| **FR03** | Đặt vé Nhanh (Quick Booking Bar) | Dock chọn nhanh Cụm rạp → Phim → Ngày chiếu → Suất chiếu trong thời gian dưới 30 giây. | `DatVeNhanh`, `QuickChoice` |
| **FR04** | Chọn Ghế Thời Gian Thực | Xem sơ đồ ghế trực quan (Standard, VIP, Sweetbox đôi), cập nhật trạng thái trống/đang giữ/đã bán tức thời. | `BookingConsole`, `SoDoGhe` |
| **FR05** | Giữ Ghế Tạm Thời 5 Phút | Khóa ghế tạm thời trong 300 giây, bảo vệ ghế khỏi khách hàng khác trong lúc tiến hành thanh toán. | `HoldCountdown`, `SeatBookingService` |
| **FR06** | Đặt Bắp Nước & Combo | Chọn 24 món bắp rang bơ, nước ngọt, trà hoa quả, đồ ăn kèm với giỏ hàng tương tác trực tiếp. | `FoodStore`, `BapNuocCombo`, `foodCart` |
| **FR07** | Áp dụng Voucher & Khuyến mãi | Nhập mã giảm giá, kiểm tra điều kiện áp dụng, tự động trừ tiền vé/combo theo tỷ lệ phần trăm hoặc số tiền cố định. | `coupons.ts`, `BookingConsole` |
| **FR08** | Thanh toán Đơn hàng Sandbox | Xác nhận tổng tiền, chuyển hướng cổng thanh toán Sandbox kiểm tra tính hợp lệ và thời hạn giao dịch. | `PaymentsModule`, `sandbox-page.ts` |
| **FR09** | Phát hành Vé Điện Tử (E-Ticket) | Sinh mã QR Code SVG an toàn mã hóa admission hash sau khi đơn hàng chuyển trạng thái `PAID`. | `ETicketQr`, `LichSuVeKhachHang`, `ticketQr.js` |
| **FR10** | Quản lý Vé Cá Nhân (Ví Vé) | Xem lịch sử mua vé, thông tin suất chiếu, mã đặt vé, phòng chiếu và xuất trình mã QR vào rạp. | `LichSuVeKhachHang`, `/tai-khoan` |
| **FR11** | Gợi ý Cụm Ghế Liền Kề | Thuật toán thông minh tự động tìm kiếm và khoanh vùng dãy ghế trống liền kề cho nhóm đông người ($\le 20$ ghế). | `group-seats.ts`, `BookingConsole` |
| **FR12** | Soát Vé Nhân Viên (Staff Validation)| Nhân viên rạp quét hoặc nhập mã vé, kiểm tra tính hợp lệ và ghi nhận vào rạp 1 lần duy nhất. | `SoatVeNhanVien`, `TicketsService` |
| **FR13** | Quản trị Hệ thống & Thống kê | Quản lý CRUD phim, rạp, phòng chiếu, lịch chiếu, người dùng và xuất báo cáo doanh thu tài chính dạng CSV. | `QuanTriHeThong`, `revenueCsv.js` |

### Bảng Quy tắc Nghiệp vụ Cốt lõi (Business Rules):
- **BR01 (Quy tắc Chống Trùng Ghế)**: Một ghế trong cùng một suất chiếu không thể được giữ hoặc mua bởi hai khách hàng khác nhau tại cùng một thời điểm. Mọi tranh chấp được giải quyết theo thứ tự ưu tiên giao dịch mili-giây đầu tiên.
- **BR02 (Thời Hạn Giữ Ghế Tối Đa)**: Thời gian giữ ghế tạm thời cho mỗi giao dịch là chính xác `300 giây (05:00 phút)`. Khách hàng không hoàn tất thanh toán trước khi đồng hồ về `00:00` sẽ bị mất quyền giữ ghế.
- **BR03 (Quy Tắc Không Chồng Suất Chiếu)**: Không được phép tạo hai suất chiếu có khung giờ trùng lặp trên cùng một phòng chiếu. Mỗi suất chiếu phải có khoảng cách dọn dẹp phòng tối thiểu 15 - 20 phút trước suất tiếp theo.
- **BR04 (Thu Hồi Ghế Tự Động)**: Khi đơn hàng giữ ghế bị quá hạn hoặc nhận tín hiệu thanh toán thất bại, hệ thống tự động hoàn trả toàn bộ số ghế trong đơn về trạng thái `AVAILABLE`.
- **BR05 (Giới Hạn Số Ghế Mỗi Đơn & Ưu Đãi Hội Viên)**: Mỗi khách hàng chỉ được đặt tối đa 20 ghế cho một đơn hàng (bao gồm cả 2 vị trí của ghế đôi Sweetbox). Giảm giá hội viên C'MEMBER và voucher khuyến mãi chỉ được tính trên giá vé đủ điều kiện, không giảm âm giá trị đơn hàng.

---

## 🛠 3. CÔNG NGHỆ SỬ DỤNG (FULLSTACK TECH STACK)

```
                            KIẾN TRÚC HỆ THỐNG NOVA CINEMA
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           TRÌNH DUYỆT KHÁCH HÀNG                       │
  │     Next.js 16 (App Router) + React 19 + Tailwind CSS v3 + Three.js     │
  └──────────────────┬─────────────────────────────────┬───────────────────┘
                     │ HTTP REST API / SSR             │ SSE / WebSockets
                     ▼                                 ▼
  ┌─────────────────────────────────────┐   ┌──────────────────────────────┐
  │   Next.js BFF (Backend For Frontend)│   │  SSE Stream: /api/seat-events│
  │   Cookie HttpOnly, Proxy Upstream   │   │  Real-time Seat Updates      │
  └──────────────────┬──────────────────┘   └──────────────┬───────────────┘
                     │ JSON Payload                        │ Socket.IO Client
                     ▼                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                        NESTJS 11 BACKEND API ENGINE                     │
  │       Clean Architecture - Controllers, Services, Repositories         │
  ├─────────────────────────────────────┬──────────────────────────────────┤
  │   • Movies & Showtimes Module       │   • Bookings & Concurrency Module│
  │   • Auth & C'MEMBER Tier Module     │   • Payment Sandbox Engine       │
  │   • Real-time Seat Gateway          │   • Tickets & Staff Scanner      │
  └──────────────────┬──────────────────┴──────────────────┬───────────────┘
                     │ Prisma ORM                          │ ioredis / BullMQ
                     ▼                                     ▼
  ┌─────────────────────────────────────┐   ┌──────────────────────────────┐
  │         POSTGRESQL 17 DATABASE      │   │          REDIS 7 CACHE       │
  │  ACID Transactions, Row Locks, Schemas  │ Distributed Locks, Seat Expiry│
  └─────────────────────────────────────┘   └──────────────────────────────┘
```

- **Frontend Tier**:
  - **Framework**: Next.js 16.4 (App Router), React 19.
  - **Styling**: Tailwind CSS v3, Glassmorphism Dark Theme, Custom Font *Plus Jakarta Sans* & *Space Grotesk*.
  - **Animations & 3D**: Framer Motion, GSAP 3.15, Three.js, React Three Fiber.
  - **Icons & QR**: Lucide React, `qrcode.react` (SVG rendering).
  - **Real-time Client**: Native Browser `EventSource` (SSE) & `socket.io-client`.

- **Backend API Tier**:
  - **Platform**: NestJS 11 / Node.js 22+ (TypeScript).
  - **Architecture**: Clean Architecture, Repository Pattern, Dependency Injection.
  - **Security**: Argon2 Password Hashing, JWT (Access & Refresh Tokens với HttpOnly Cookie), Helmet, Rate Limiter.
  - **Concurrency Engine**: Redis Distributed Locking & Database Transaction Isolation.

- **Cơ sở dữ liệu & Bộ nhớ đệm**:
  - **Database chính**: PostgreSQL 17, quản lý schema và migrations qua **Prisma ORM 6.19**.
  - **Caching & Message Queue**: Redis 7, BullMQ quản lý hàng đợi và tác vụ nền.

---

## 🗂 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```
du-an-web-xem-phim-nova-cinema/
├── content/                    # Dữ liệu danh mục gốc (cinema.json, programme-calendar.cjs)
├── docs/                       # Tài liệu thiết kế, phân tích BA, báo cáo kiểm thử LAB
│   ├── BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md
│   └── design/                 # Báo cáo chi tiết nghiệp vụ, soát vé, QR code, food studio
├── public/                     # Tài nguyên tĩnh: poster phim, ảnh món ăn, favicon.svg
├── scripts/                    # Bộ kịch bản tự động hóa kiểm thử & dev launcher
│   ├── dev-fullstack.cjs       # Trình khởi chạy đồng bộ fullstack thông minh
│   ├── ticket-qr.test.mjs      # Kiểm thử tính toàn vẹn của mã QR vé
│   ├── food-cart.test.mjs      # Kiểm thử giỏ hàng bắp nước & SSR guard
│   └── memory-contract.test.cjs# Kiểm thử hợp đồng API backend
├── src/                        # MÃ NGUỒN FRONTEND (Next.js)
│   ├── api/                    # API client, chuẩn hóa thông điệp lỗi tiếng Việt, request key
│   ├── app/                    # Next.js App Router (Trang chủ, Đặt vé, Bắp nước, Tài khoản...)
│   │   ├── api/v1/[...path]/   # BFF Proxy chuyển tiếp an toàn sang Backend
│   │   ├── api/seat-events/    # Kênh phát SSE cập nhật ghế thời gian thực
│   │   └── xem-truoc/          # Trải nghiệm màn hình cong 3D
│   ├── components/             # Thư viện UI Components
│   │   ├── BookingConsole.jsx  # Bàn điều khiển đặt vé chuyên nghiệp
│   │   ├── CinemaHero.jsx      # Banner nổi bật phim bom tấn
│   │   ├── DatVeNhanh.jsx      # Thanh dock đặt vé 30 giây
│   │   ├── ETicketQr.jsx       # Component hiển thị mã QR vé điện tử
│   │   ├── FoodStore.jsx       # Cửa hàng bắp nước thực đơn 24 món
│   │   ├── NovaLogo.jsx        # Logo thương hiệu NV - VN vươn mình dân tộc
│   │   ├── QuanTriHeThong.jsx  # Màn hình quản trị toàn diện
│   │   └── SoatVeNhanVien.jsx  # Giao diện quét vé dành cho nhân viên
│   └── three/                  # Đồ họa Three.js màn hình chiếu rạp
├── backend/                    # MÃ NGUỒN BACKEND (NestJS)
│   ├── prisma/                 # Schema cơ sở dữ liệu Prisma & Migrations
│   ├── scripts/                # Scripts cấu hình DB, seed dữ liệu lịch chiếu 30 ngày
│   └── src/                    # Modules NestJS: auth, bookings, cinemas, movies, payments...
└── package.json                # Dependencies toàn cục & scripts thực thi
```

---

## ⚙️ 5. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY DỰ ÁN

Hệ thống được thiết kế tối ưu với kịch bản khởi chạy fullstack tích hợp sẵn, giúp việc kiểm tra và chấm bài diễn ra mượt mà nhất mà **không cần cài đặt phần mềm Docker phức tạp**.

### 1. Yêu cầu Tiên quyết
- **Node.js**: Phiên bản `>= 18.x` (khuyến nghị phiên bản LTS mới nhất `Node.js 22.x` hoặc `20.x`).
- **NPM**: Đi kèm sẵn theo Node.js.
- **Hệ điều hành**: Tương thích hoàn toàn trên Windows, macOS và Linux.

### 2. Cài đặt Dependencies
Mở cửa sổ dòng lệnh (Terminal / Command Prompt / PowerShell) tại thư mục gốc của dự án:

```bash
# Cài đặt toàn bộ thư viện cần thiết cho cả dự án
npm install
```

### 3. Khởi Chạy Hệ Thống Fullstack (Chỉ 1 Lệnh Duy Nhất)
Khởi động đồng thời cả máy chủ Backend (Port 4000) và ứng dụng Frontend (Port 3000):

```bash
npm run dev:full
```

Hệ thống sẽ tự động thực hiện quy trình khởi động khép kín:
1. Chuẩn bị và nạp danh mục **24 phim**, **4 cụm rạp**, **128 phòng chiếu** và hơn **13.440 suất chiếu liên tục 30 ngày**.
2. Khởi chạy máy chủ Backend API tại: **`http://127.0.0.1:4000/api/v1`**.
3. Khởi chạy ứng dụng Next.js Frontend tại: **`http://localhost:3000`**.

### 4. Trải Nghiệm Ứng Dụng Trên Trình Duyệt
Mở trình duyệt web (Chrome, Edge, Firefox, Safari) và truy cập:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 6. KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG (TESTING & QA)

Dự án tuân thủ quy trình kiểm định chất lượng phần mềm nghiêm ngặt với các bộ kiểm thử tự động (Unit Tests, Contract Tests, Linter):

```bash
# 1. Kiểm tra cú pháp và quy chuẩn mã nguồn (ESLint)
npm run lint

# 2. Chạy toàn bộ 35 bài kiểm thử đơn vị & hợp đồng dữ liệu:
node --test scripts/food-cart.test.mjs \
            scripts/ticket-qr.test.mjs \
            scripts/unique-records.test.mjs \
            scripts/catalog-index.test.mjs \
            scripts/menu-photography.test.mjs \
            scripts/memory-contract.test.cjs
```

**Kết quả kiểm thử đạt 100% PASS**:
- `ticket-qr.test.mjs`: Xác thực thuật toán mã hóa vé điện tử, bảo mật mã hash và chống giả mạo QR.
- `memory-contract.test.cjs`: Kiểm thử xử lý tranh chấp giữ ghế đồng thời (concurrency), thời hạn giữ ghế 5 phút, tính toán tiền vé và giảm giá voucher.
- `food-cart.test.mjs`: Kiểm thử giỏ hàng bắp nước, kiểm soát số lượng tối đa 20 và bảo vệ render SSR.
- `catalog-index.test.mjs`: Xác thực cấu trúc lập chỉ mục phim, rạp và suất chiếu theo múi giờ `Asia/Ho_Chi_Minh`.

---

## 📄 7. KẾT LUẬN & ĐÁNH GIÁ ĐỒ ÁN

Đồ án **NOVA CINEMA (INFINITY)** đã hoàn thành xuất sắc toàn bộ các mục tiêu đặt ra của học phần **Nhập môn Kỹ nghệ Phần mềm**:
- Xây dựng thành công ứng dụng web Fullstack hiện đại, thẩm mỹ cao, tốc độ phản hồi dưới 1 giây.
- Giải quyết triệt để vấn đề xung đột đặt vé (Race Condition) trong môi trường phân tán.
- Tuân thủ chặt chẽ tài liệu đặc tả yêu cầu phần mềm (SRS), mô hình hóa UML và ma trận kiểm thử chất lượng QA.

---
*Bản quyền Đồ án thuộc về **Nhóm 03 — Lớp 2611COMP104405 — Khoa Công nghệ Thông tin, HCMUE**.*
