# NOVA Cinema — Infinity Experience

Next.js 16 / React 19 / Tailwind 3 frontend, NestJS 11 API, PostgreSQL 17,
Prisma 6, Redis / BullMQ, Socket.IO và email SMTP. Luồng đặt vé dùng dữ liệu
backend, giữ ghế đúng 5 phút và thanh toán **Sandbox, không thu tiền thật**.

> 🤝 **Dành cho thành viên nhóm / Cộng tác viên:** Xem ngay [Tài liệu hướng dẫn cộng tác & luồng phát triển dự án](COLLABORATION_GUIDE.md) và [Bản đồ chức năng, tiến trình & giải thích code toàn diện](docs/BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md) để nắm rõ vai trò từng file, tiến trình từng trang, luồng đặt vé và các gợi ý mở rộng tính năng mới.

## ⚡ Chạy Nhanh Nhất Để Chấm Bài (KHÔNG CẦN DOCKER)

Hệ thống được tích hợp sẵn **Chế độ độc lập thông minh (Standalone Mode)**. Thầy cô và bạn bè chỉ cần tải code về và chạy đúng 1 lệnh duy nhất:

```bash
npm install
npm run dev
```

Mở trình duyệt tại: **`http://localhost:3000`**

Toàn bộ 100% chức năng rạp chiếu phim sẵn sàng hoạt động ngay lập tức (Mật khẩu chuẩn: `nova@12345`):
- 👑 **Quản trị viên (Admin):** Đăng nhập `admin@nova.local` (Mật khẩu: `nova@12345`) $\rightarrow$ Xem báo cáo doanh thu tài chính, biểu đồ, danh sách thành viên.
- 🎫 **Nhân viên soát vé (Staff):** Đăng nhập `staff@nova.local` (Mật khẩu: `nova@12345`) $\rightarrow$ Mở camera WebRTC quét mã QR hoặc chọn vé mẫu duyệt vào rạp.
- 👤 **Khách hàng (Customer):** Đăng nhập `customer@nova.local` (Mật khẩu: `nova@12345`) hoặc đăng ký mới $\rightarrow$ Xem lịch chiếu, chọn sơ đồ ghế 96 chỗ, giữ ghế 5 phút, thanh toán Sandbox 1 chạm, nhận vé QR điện tử.

---

## 🐳 Tùy chọn chạy kèm Docker & Backend NestJS (Môi trường Production)

Nếu muốn khởi động toàn bộ hạ tầng cơ sở dữ liệu vật lý (PostgreSQL 17, Redis 7.4, Mailpit):
Mở Docker Desktop trước. Trong terminal tại thư mục repository:

```bash
npm ci
npm run setup:local
npm run dev:full
```

`setup:local` cài backend, tạo cấu hình riêng, khởi động PostgreSQL/Redis/Mailpit,
chạy migrations, seed dữ liệu và build API. Cache Prisma được đặt trong `.runtime/cache`
(nếu bạn chưa cấu hình `XDG_CACHE_HOME`) để tránh phụ thuộc quyền ghi thư mục home. Lần đầu cần mạng để tải packages/images.
`dev:full` đợi health check API thành công rồi chạy frontend. Mở địa chỉ do Next.js
in trong terminal, mặc định cổng **3000**; backend cổng **4000**. Nhấn Ctrl+C để dừng
hai ứng dụng. Docker giữ dữ liệu cho lần chạy tiếp theo. Dừng container bằng các
lệnh `infra:down` / `mail:down` trong `backend/` khi cần; không xóa volumes.

Giao diện Discovery có các trang riêng `/phim`, `/sap-chieu`, `/uu-dai`, `/bap-nuoc`,
`/rap`, `/hoi-vien`, `/dang-nhap`, `/tai-khoan`, `/dat-ve`, `/quan-tri` và `/soat-ve`.
Các trang `/gioi-thieu`, `/ho-tro`, `/huong-dan`, `/chinh-sach`, `/lien-he` và
`/thanh-toan` nối đầy đủ các liên kết cuối trang. Trang chủ mở bằng ưu đãi NOVA
có thể đóng/ẩn trong ngày, sau đó là hero Inception với ảnh concept riêng.

Seed bổ sung chuẩn bị **24 phim (16 đang chiếu/tuyển chọn, 8 sắp tái chiếu), 16 món/combo**,
ít nhất **8 phòng mỗi rạp mẫu** và lịch **7 ngày theo giờ Việt Nam**. Lịch có buổi sáng,
chiều, tối và suất muộn; có bộ lọc phòng/buổi và thanh chọn rạp → phim → ngày → giờ/phòng.
Các ngày sắp chiếu là chương trình tái chiếu dự kiến tháng sau, không phải ngày phát hành chính thức.
Với máy đã setup trước đó, chạy trong `backend/`:

```bash
npm run db:seed:discovery
npm run db:seed:programme
```

Các lệnh chỉ thêm dữ liệu còn thiếu, không ghi đè nội dung admin hoặc dịch chuyển suất đã có.
Lệnh programme bổ sung lịch cho các phòng riêng do nó tạo, tránh chồng lịch, và có thể
chạy lại để bổ sung những ngày mới. Không chạy seed demo trong production.
Bắp nước chọn ở cửa hàng được giữ trong phiên trình duyệt và chuyển vào bước chọn ghế;
chỉ xác nhận đơn, giá và thời hạn qua backend. Xem [ghi chú Discovery](docs/design/discovery-upgrade.md)
và [đợt nâng cấp trang mở màn & lịch chiếu](docs/design/premiere-upgrade.md).

Bạn có thể **đăng ký tài khoản mới ngay trên giao diện**, mật khẩu 12–128 ký tự.
Tài khoản mới có vai trò CUSTOMER, hạng SILVER, 0 điểm. Không có mật khẩu mẫu
được công khai hoặc nút tự gán vai trò. Seed có admin@nova.local, staff@nova.local,
customer@nova.local; mật khẩu do script tạo riêng trong `backend/.env`, biến
`SEED_DEMO_PASSWORD`. Chỉ chủ máy đọc cấu hình này, không gửi hoặc commit file.
Seed bảo toàn mật khẩu tài khoản đã tồn tại.

Nếu chỉ chạy lại sau khi đã setup:

```bash
cd backend
npm run infra:up:test
npm run mail:up
cd ..
npm run dev:full
```

Nếu sửa backend, chạy `npm run build` trong `backend/` trước khi khởi động lại
`dev:full`, hoặc chạy `npm run start:dev` riêng tại đó. Nếu sửa frontend, Next.js
cập nhật tự động. Khi lịch đã cũ, chạy lại `db:seed:programme` trong `backend/` hoặc
tạo suất mới trong quản trị. Seed không di chuyển lịch đã tồn tại để bảo toàn lịch sử.

## Cách thử đặt vé

1. Đăng ký/đăng nhập, chọn rạp → phim → ngày có lịch → suất.
2. Chọn ghế hoặc xếp nhóm tối đa 20 ghế; thêm số lượng combo nếu muốn.
3. Bấm **Giữ ghế 5 phút**. Backend trả mã đơn, hạn giữ và tổng tiền chính thức.
4. Bấm **Thanh toán Sandbox**, chọn thành công/thất bại/hủy trên trang mô phỏng.
5. Quay lại ứng dụng. Website đọc trạng thái backend; vé QR xuất hiện trong tài
   khoản sau khi worker phát hành. Có tải PNG và lịch `.ics`.

Đóng popup không hủy đơn. Tải lại trang khôi phục đơn đang giữ; trong tài khoản
cũng có nút **Tiếp tục đơn**. Bấm **Hủy đơn & trả ghế** để hủy ngay. Hết hạn,
thanh toán thất bại hoặc hủy thanh toán sẽ trả ghế. Hai máy dùng cùng server
không thể giữ thành công cùng một ghế.

ADMIN có quản trị danh mục (phim/rạp/phòng/suất/combo), tạo sơ đồ cho phòng trống,
doanh thu, người dùng và health/outbox. STAFF/ADMIN có màn hình **Soát vé** nhập
mã đọc từ QR; backend kiểm tra khung giờ và chỉ chấp nhận một lần.

## Cấu hình và kiểm tra

Frontend dùng `BACKEND_API_URL` **ở server Next.js**, xem `.env.example`.
Không cần khai báo địa chỉ API bên trình duyệt. Cookie access/refresh là HttpOnly,
SameSite=Lax; khi phục vụ qua HTTPS cookie là Secure. Backend vẫn kiểm tra JWT,
quyền hiện tại trong DB, ownership và giá. Khi triển khai bên ngoài cần cấu hình
`PAYMENT_RETURN_ORIGINS` đúng origin frontend, PostgreSQL/Redis/SMTP và HTTPS;
không đặt wildcard cho return URL. Reverse proxy cần tắt buffering cho
`/api/seat-events/*`; mất luồng realtime thì UI đọc lại snapshot mỗi 5 giây.

```bash
npm run lint
npm run build
# Backend build + dedicated test PostgreSQL/Redis phải sẵn sàng trước npm test.
npm test
cd backend
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

Playwright dùng fixture PG/Redis/SMTP thật, không tái sử dụng preview cũ. Cổng test
mặc định 38173/38174; đổi `PLAYWRIGHT_PORT` / `FULLSTACK_API_PORT` nếu đang bận.
Cài Chromium với `npx playwright install chromium` nếu máy chưa có; có thể trỏ
`PLAYWRIGHT_CHROMIUM_PATH` đến binary. Các suite có state phải chạy **tuần tự** trên
cùng test DB. Không dùng DB thật cho test và không in tokens/QR/secrets trong log.

Giới hạn nghiệp vụ và bằng chứng kiểm tra: [báo cáo tích hợp](docs/fullstack-verification.md).
Kiến trúc, API và hạ tầng chi tiết: [backend/README.md](backend/README.md).
