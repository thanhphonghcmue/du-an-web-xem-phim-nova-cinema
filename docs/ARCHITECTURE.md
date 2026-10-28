# 🏗️ TÀI LIỆU KIẾN TRÚC HỆ THỐNG & ĐẶC TẢ USE CASE (ARCHITECTURE SPECIFICATION)
## DỰ ÁN: WEBSITE ĐẶT VÉ XEM PHIM TRỰC TUYẾN NOVA CINEMA (INFINITY)
**Trường Đại học Sư phạm TP. Hồ Chí Minh (HCMUE) — Khoa Công nghệ Thông tin**  
**Nhóm 03 — Lớp: 50.01.SPTIN.B | GVHD: ThS. Lê Thanh Thoại**

---

## 🏛️ 1. MÔ HÌNH KIẾN TRÚC TỔNG THỂ (CLEAN ARCHITECTURE 3 TẦNG)

Hệ thống **NOVA CINEMA (INFINITY)** được thiết kế theo mô hình Monorepo phân tách rõ ràng trách nhiệm giữa Frontend, Backend API và Tầng Dữ liệu:

```mermaid
graph TB
    subgraph PRESENTATION["1. TẦNG GIAO DIỆN & TRÌNH BÀY (FRONTEND - Next.js App Router)"]
        UI_CUSTOMER["Phân hệ Khách hàng (Customer UI)\n- Tra cứu phim, Suất chiếu\n- Sơ đồ ghế cong IMAX\n- Thanh toán Sandbox & Vé QR"]
        UI_STAFF["Phân hệ Nhân viên Rạp (Staff Console)\n- Camera WebRTC quét mã QR\n- Đối soát vé nguyên tử 1 lần"]
        UI_ADMIN["Phân hệ Quản trị (Admin Portal)\n- Quản lý phim, phòng, lịch chiếu\n- Giám sát doanh thu & Xuất CSV"]
    end

    subgraph APPLICATION["2. TẦNG NGHIỆP VỤ & ỨNG DỤNG (BACKEND API - NestJS / Express)"]
        AUTH_MOD["Module Xác thực (Auth & RBAC)\nJWT, Phiên đăng nhập, C'MEMBER"]
        CATALOG_MOD["Module Phim & Lịch Chiếu (Catalog)\nChống trùng lịch BR03"]
        LOCK_ENGINE["Khóa Ghế Real-time (CR-01 / BR01)\nRedis Lock & Pessimistic DB Lock"]
        ORDER_MOD["Module Đơn hàng & Giá (Pricing)\nCombo 69K, Chiết khấu hội viên"]
        GATEWAY["Socket.IO Gateway\nBroadcast trạng thái ghế tức thời"]
    end

    subgraph DATA_TIER["3. TẦNG DỮ LIỆU & BỘ NHỚ ĐỆM (DATA PERSISTENCE & CACHE)"]
        POSTGRES["PostgreSQL Relational DB\nPrisma ORM, ACID Transactions"]
        REDIS["Redis Distributed Cache\nDistributed Lock, Key Expiration"]
    end

    PRESENTATION -->|REST API / HTTPS| APPLICATION
    PRESENTATION <-->|WebSocket Events| GATEWAY
    APPLICATION --> POSTGRES
    APPLICATION --> REDIS
```

---

## 📁 2. BẢNG CẤU TRÚC THƯ MỤC MONOREPO MỤC TIÊU (VỚI CHÚ THÍCH TIẾNG VIỆT)

```
nova-cinema/
├── frontend/                            👉 [FRONTEND] TOÀN BỘ GIAO DIỆN CLIENT & ADMIN (Next.js)
│   ├── src/
│   │   ├── app/                         👉 [ĐỊNH TUYẾN TRANG - APP ROUTER]
│   │   │   ├── (customer)/              👉 [PHÂN HỆ KHÁCH HÀNG] Dành cho người xem phim
│   │   │   │   ├── page.tsx             👉 Trang chủ (Hero Banner, Thanh đặt vé nhanh 30s)
│   │   │   │   ├── movies/              👉 Trang danh sách & Chi tiết từng bộ phim
│   │   │   │   ├── booking/             👉 Trang đặt vé (Sơ đồ ghế Real-time, Khóa ghế 5 phút CR-01)
│   │   │   │   ├── checkout/            👉 Trang thanh toán Sandbox (Party Combo 69K, Chiết khấu C'MEMBER)
│   │   │   │   └── tickets/             👉 Trang hiển thị Vé điện tử chứa mã QR Code duy nhất
│   │   │   ├── staff/                   👉 [PHÂN HỆ NHÂN VIÊN RẠP] Trang Camera quét mã QR Code để soát vé
│   │   │   └── admin/                   👉 [PHÂN HỆ QUẢN TRỊ VIÊN] Trang quản lý Phim, Lịch chiếu (BR03), Doanh thu
│   │   ├── components/                  👉 [LINH KIỆN GIAO DIỆN DÙNG LẠI - REUSABLE UI]
│   │   │   ├── booking/                 👉 Linh kiện Sơ đồ ghế cong IMAX, Thuật toán chọn cụm nhóm (<=20 ghế)
│   │   │   ├── cinematic/               👉 Linh kiện hiệu ứng Kính mờ (Glassmorphic), Hạt bụi Three.js 3D
│   │   │   └── shared/                  👉 Header, Footer, Modal, Button
│   │   └── services/                    👉 [KẾT NỐI API] Hàm gọi Backend API & Client WebSocket (Socket.io)
│   ├── public/                          👉 Chứa tài nguyên tĩnh (Poster phim, Logo, Banner)
│   └── package.json
│
├── backend/                             👉 [BACKEND] TOÀN BỘ API & XỬ LÝ NGHIỆP VỤ (NestJS/Express)
│   ├── src/
│   │   ├── modules/                     👉 [PHÂN HỆ NGHIỆP VỤ CR-01 & BR01 - BR05]
│   │   │   ├── auth/                    👉 Đăng ký, Đăng nhập, Phân quyền RBAC, Tích điểm C'MEMBER (G3-FR01)
│   │   │   ├── movies/                  👉 Quản lý Danh mục Phim & Nhãn tuổi (G3-FR02)
│   │   │   ├── showtimes/               👉 Quản lý Lịch chiếu & Thuật toán chống trùng lịch (BR03 / TC-02)
│   │   │   ├── seats/                   👉 Khóa ghế tạm 5 phút real-time (CR-01 / BR02 / Redis Lock / BullMQ)
│   │   │   ├── payments/                👉 Pricing Engine, Party Combo 69K & Cổng Sandbox (BR05 / G3-FR08)
│   │   │   └── tickets/                 👉 Sinh mã QR Code duy nhất & API Check-in cho Staff (G3-FR09 / TC-05)
│   │   └── gateways/                    👉 [WEBSOCKET] Server Socket.io phát tín hiệu đổi màu ghế real-time
│   ├── prisma/                          👉 [DATABASE] File schema.prisma và các Migration SQL
│   └── package.json
│
├── docs/                                👉 [TÀI LIỆU DỰ ÁN] Toàn bộ tài liệu kỹ thuật và báo cáo học phần
│   ├── LAB03_REQUIREMENTS.md            👉 Báo cáo tiến độ thu thập yêu cầu LAB03 & Ma trận truy vết
│   ├── ARCHITECTURE.md                  👉 Sơ đồ kiến trúc Clean Architecture & Đặc tả 14 Use Case
│   ├── AGENTS.md                        👉 Hướng dẫn cộng tác kỹ thuật và quy tắc lập trình
│   ├── COLLABORATION_GUIDE.md           👉 Hướng dẫn làm việc nhóm Git Workflow
│   └── 00_DOC_DAU_TIEN_HUONG_DAN...md   👉 Hướng dẫn xem mã nguồn theo chức năng Tiếng Việt
│
└── README.md                            👉 FILE BÁO CÁO HƯỚNG DẪN DUY NHẤT Ở GỐC (Chuẩn học thuật HCMUE)
```

---

## 👥 3. PHÂN TÍCH 5 TÁC NHÂN (ACTORS) VÀ 14 USE CASES (UC01 - UC14)

### 3.1. Danh Sách 5 Tác Nhân:
1. **Khách hàng (Customer)**: Người dùng vãng lai truy cập website để tra cứu phim, chọn suất chiếu, chọn ghế, mua bắp nước và đặt vé trực tuyến.
2. **Hội viên C'MEMBER**: Khách hàng đã đăng ký tài khoản thành viên, được hưởng chính sách tích lũy điểm thưởng và chiết khấu giá vé theo bậc (Silver / Gold / Diamond).
3. **Nhân viên rạp (Staff)**: Sử dụng thiết bị có camera để quét mã QR vé xem phim, kiểm tra tính hợp lệ và cho phép khách hàng vào rạp.
4. **Quản trị viên (Admin)**: Quản lý toàn diện dữ liệu hệ thống (phim, phòng chiếu, ma trận ghế, lịch chiếu) và giám sát doanh thu.
5. **Cổng thanh toán Sandbox (Payment Sandbox)**: Hệ thống ngân hàng giả lập, chịu trách nhiệm xử lý giao dịch tài chính mô phỏng và gửi tín hiệu xác nhận thanh toán.

### 3.2. Bảng Ma Trận 14 Use Cases:
| Mã UC | Tên Ca Sử Dụng | Tác Nhân Thực Hiện | Phân Công Nhóm |
| :---: | :--- | :--- | :--- |
| **UC01** | Đăng ký tài khoản | Khách hàng | Phạm Ngọc Mỹ Huyền |
| **UC02** | Đăng nhập hệ thống | Khách hàng, C'MEMBER, Staff, Admin | Lâm Thanh Phong & Nguyễn Bình Phương Mi |
| **UC03** | Tra cứu phim và lịch chiếu | Khách hàng | Phạm Ngọc Mỹ Huyền |
| **UC04** | Chọn ghế & giữ chỗ tạm thời (5 phút) | Khách hàng, C'MEMBER | Phạm Ngọc Mỹ Huyền |
| **UC05** | Tạo đơn hàng & áp dụng quyền lợi hội viên | C'MEMBER | Lâm Thanh Phong |
| **UC06** | Thanh toán đơn hàng qua Sandbox | C'MEMBER, Payment Sandbox | Lâm Thanh Phong & Thạch Võ Diễm Ngọc |
| **UC07** | Nhận và xem vé điện tử mã QR | Khách hàng, C'MEMBER | Phạm Ngọc Mỹ Huyền |
| **UC08** | Nhận email xác nhận đặt vé | Khách hàng | Phạm Ngọc Mỹ Huyền |
| **UC09** | Tự động gợi ý dải ghế liền kề | Khách hàng, C'MEMBER | Phạm Ngọc Mỹ Huyền |
| **UC10** | Xuất lịch chiếu cá nhân (.ics) | Khách hàng | Phạm Ngọc Mỹ Huyền |
| **UC11** | Quản lý danh mục phim | Quản trị viên (Admin) | Phùng Thị Mỹ Quyên |
| **UC12** | Quản lý phòng chiếu & sơ đồ ghế | Quản trị viên (Admin) | Phùng Thị Mỹ Quyên |
| **UC13** | Quản lý lịch chiếu phim (BR03) | Quản trị viên (Admin) | Phùng Thị Mỹ Quyên |
| **UC14** | Xác thực & Soát vé mã QR | Nhân viên rạp (Staff) | Nguyễn Bình Phương Mi |

---

## ⚡ 4. CẤU HÌNH IMPORT ALIAS ĐỂ ĐẢM BẢO ĐƯỜNG DẪN KHÔNG BỊ GÃY

Để hỗ trợ đầy đủ các đường dẫn import tuyệt đối (`@/components/...`, `@/services/...`, `@modules/...`), dự án thiết lập cấu hình chuẩn tại:

### Frontend (`jsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/services/*": ["./src/services/*", "./src/api/*"],
      "@/app/*": ["./src/app/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### Backend (`backend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"],
      "@database/*": ["src/database/*"],
      "@realtime/*": ["src/realtime/*"]
    }
  }
}
```
