# NOVA Cinema — Infinity Experience

Next.js 16 / React 19 / Tailwind 3 frontend, NestJS 11 API, PostgreSQL 17,
Prisma 6, Redis / BullMQ, Socket.IO và email SMTP. Luồng đặt vé dùng dữ liệu
backend, giữ ghế đúng 5 phút và thanh toán **Sandbox, không thu tiền thật**.

> 🤝 **Dành cho thành viên nhóm / Cộng tác viên:** Xem ngay [Tài liệu hướng dẫn cộng tác & luồng phát triển dự án](COLLABORATION_GUIDE.md) và [Bản đồ chức năng, tiến trình & giải thích code toàn diện](docs/BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md) để nắm rõ vai trò từng file, tiến trình từng trang, luồng đặt vé và các gợi ý mở rộng tính năng mới.

## Chạy frontend và backend thật

NOVA chỉ dùng NestJS và PostgreSQL để lưu tài khoản, đơn, ghế và QR. Không còn
chế độ demo/RAM hoặc tự chuyển nguồn dữ liệu khi API lỗi. `npm run dev` chỉ chạy
frontend; nếu backend chưa chạy, giao diện báo lỗi kết nối và không tạo dữ liệu giả.

Máy đã có PostgreSQL, Redis và cấu hình riêng `backend/.env`:

```bash
npm ci
npm --prefix backend ci
npm --prefix backend run build
npm run dev:full
```

Mở `http://localhost:3000`; backend cổng 4000. `dev:full` đợi readiness của NestJS,
PostgreSQL/Redis và worker trước khi chạy frontend. Ctrl+C dừng hai ứng dụng;
dữ liệu vẫn nằm trong PostgreSQL. Nếu backend ở địa chỉ khác, cấu hình
`BACKEND_API_URL` phía server Next.js. Mặc định là `http://127.0.0.1:4000/api/v1`.
Các biến cũ từng bật kho RAM không còn tác dụng.

Lần đầu cài trực tiếp, cần **Node.js 24, PostgreSQL 17, Redis 7 và SMTP** đang hoạt
động. Tạo `backend/.env` theo `backend/.env.example`, điền kết nối dev/test riêng,
mật khẩu tài khoản khởi tạo và SMTP của bạn, rồi chạy từ thư mục dự án:

```bash
npm ci
npm --prefix backend ci
npm --prefix backend run auth:configure
npm --prefix backend run payment:configure
npm --prefix backend run prisma:generate
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
npm --prefix backend run build
npm run dev:full
```

Không chạy helper hạ tầng Compose khi dùng PostgreSQL/Redis cài trực tiếp.
`setup:local` là lựa chọn riêng cho Compose, không phải bước bắt buộc. Không gửi
hoặc commit `.env`; không xóa cấu hình/DB để cập nhật giao diện. Seed bổ sung chỉ
thêm bản ghi còn thiếu, giữ mật khẩu, đơn và lịch đã có.

Xem [kiểm chứng server-only và đồng bộ dữ liệu](docs/design/server-only-qa.md).

Giao diện Discovery có các trang riêng `/phim`, `/sap-chieu`, `/uu-dai`, `/bap-nuoc`,
`/rap`, `/hoi-vien`, `/dang-nhap`, `/tai-khoan`, `/dat-ve`, `/quan-tri` và `/soat-ve`.
Các trang `/gioi-thieu`, `/ho-tro`, `/huong-dan`, `/chinh-sach`, `/lien-he` và
`/thanh-toan` nối đầy đủ các liên kết cuối trang. Trang chủ mở bằng ưu đãi NOVA
có thể đóng/ẩn trong ngày, sau đó là hero Inception với ảnh concept riêng.

Seed bổ sung chuẩn bị **24 phim (16 đang chiếu/tuyển chọn, 8 sắp tái chiếu), 16 món/combo**,
**40 phòng mỗi rạp mẫu**, lịch **ít nhất 30 ngày tới, phủ hết tháng sau theo giờ Việt Nam**. Lịch có buổi sáng,
chiều, tối và suất muộn; có bộ lọc phòng/buổi và thanh chọn rạp → phim → ngày → giờ/phòng.
Các ngày sắp chiếu là chương trình tái chiếu dự kiến tháng sau, không phải ngày phát hành chính thức.
Với máy đã setup trước đó, chạy trong `backend/`:

```bash
npm run db:seed:discovery
npm run db:seed:programme
```

Các lệnh chỉ thêm dữ liệu còn thiếu, không ghi đè nội dung admin hoặc dịch chuyển suất đã có.
Lệnh programme bổ sung lịch cho các phòng riêng do nó tạo, tránh chồng lịch, và có thể
chạy lại để bổ sung những ngày mới. `dev:full` tự chuẩn bị lịch này khi khởi động
(có thể tắt bằng `NOVA_REFRESH_PROGRAMME=false`). Không chạy seed demo trong production.
Phim sắp chiếu có lịch thật được **đặt vé trước**, giữ ghế và thanh toán Sandbox như
vé thường. Phim chưa mở bán vẫn có nhắc lịch. Lịch có bộ chọn ngày xa, nhóm bảy ngày
và tên phòng thực; xem [mở rộng lịch & chữ dễ đọc](docs/design/advance-booking-readability.md).

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

Trong tài khoản, mỗi vé có nút **Xem email xác nhận** để đọc bản xem trước từ backend
và trạng thái gửi thật của outbox. `.ics` có địa chỉ rạp và nhắc trước 30 phút.
Quầy `/soat-ve` chọn ngày/suất, **Kiểm tra vé** trước rồi **Xác nhận soát vé**;
quét/kiểm tra chưa làm mất hiệu lực vé. Camera cần trình duyệt hỗ trợ BarcodeDetector;
nhập mã QR vẫn dùng được. Xem [báo cáo rà soát LAB04](docs/design/lab04-booking-audit.md).

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
node scripts/check-backend-only.cjs
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

### Bản cập nhật giao diện & quản trị danh mục (23/10/2026)

Chữ và bố cục phần dưới được làm lại, trang rạp dẫn đúng lịch rạp, quản trị có tìm
kiếm/phân trang, nhật ký thay đổi phim và preview sơ đồ phòng. Backend bổ sung kiểm
tra trùng tên phim và sức chứa 300 ghế. Xem [phạm vi và bằng chứng](docs/design/catalog-operations-readability.md).

Nếu đã cài môi trường trước bản này, dừng `dev:full`, cập nhật backend rồi chạy:

```bash
npm --prefix backend run prisma:generate
npm --prefix backend run db:migrate
npm --prefix backend run build
npm run dev:full
```

Cần cập nhật DB test bằng `npm --prefix backend run db:migrate:test` trước khi
chạy các bộ kiểm thử. Không chạy reset database để cập nhật bản này.

### Bản giao diện theo nghiên cứu (23/10/2026)

Be Vietnam Pro + Space Grotesk, chọn rạp có tìm kiếm, lịch tháng tiếng Việt, chọn
phim/giờ bằng bảng trực quan và trang chi tiết phim có link riêng. Thanh đặt nhanh
đồng bộ với lịch; có tóm tắt lựa chọn, zoom ghế và đăng nhập tiếp tục suất đang chọn.
Xem [phạm vi, nguồn mở và bằng chứng](docs/design/booking-refresh.md).

Sau khi kéo nhánh `feat/nova-discovery-ui`, chạy `npm ci` ở thư mục gốc để cài các
package mới. Nếu backend đã setup, chạy `npm --prefix backend run build` rồi
`npm run dev:full`, mở `http://localhost:3000`. Backend và dữ liệu cũ được dùng tiếp.

### Lịch đầy đủ 24 phim và cả tháng sau (24/10/2026)

Trang chủ/danh mục và bộ chọn rạp mẫu nay có đủ 24 phim; không còn cắt 6 phim.
Mỗi rạp mẫu có 40 phòng, mỗi phim ít nhất 4 giờ/ngày trên 2 phòng, mở đến ngày cuối
tháng sau và tối thiểu 30 ngày tới. Phim COMING_SOON có suất chiếu sớm theo lịch
thực, vẫn đặt ghế/thanh toán Sandbox/nhận QR qua backend. Lịch có chấm ngày mở bán.
Kho demo trước đây đã được loại bỏ; chỉ còn lịch và giao dịch từ NestJS/PostgreSQL.

Sau khi cập nhật, build backend rồi chạy `npm run dev:full` để bổ sung lịch còn thiếu.
Nếu dùng PostgreSQL/Redis cài trực tiếp thì giữ cấu hình kết nối hiện tại, không cần
chạy các lệnh Compose hoặc `setup:local`. Xem [kiểm chứng lịch đầy đủ](docs/design/full-calendar-booking.md).
