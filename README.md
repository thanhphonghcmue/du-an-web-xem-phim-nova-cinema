# NOVA Cinema — Infinity Experience

Next.js 16 / React 19 / Tailwind 3 frontend, NestJS 11 API, PostgreSQL 17,
Prisma 6, Redis / BullMQ, Socket.IO và email SMTP. Luồng đặt vé dùng dữ liệu
backend, giữ ghế đúng 5 phút và thanh toán **Sandbox, không thu tiền thật**.

> 🤝 **Dành cho thành viên nhóm / Cộng tác viên:** Xem ngay [Tài liệu hướng dẫn cộng tác & luồng phát triển dự án](COLLABORATION_GUIDE.md) để biết cách tham gia GitHub, clone code, chạy thử nghiệm không cần Docker, quy ước Git và các ràng buộc nghiệp vụ rạp chiếu phim.

## Chạy trên máy của bạn

Cài Node.js theo `.nvmrc` (24.19.0) và Docker Desktop có Docker Compose v2.
Mở Docker trước. Trong terminal tại thư mục repository:

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
cập nhật tự động. Seed mặc định tạo lịch từ ngày mai; khi lịch đã cũ, tạo suất mới
trong trang quản trị. Seed không di chuyển lịch đã tồn tại để bảo toàn lịch sử.

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
