# Vé theo từng ghế, ví vé và soát vé — 05/11/2026

## Hợp đồng và dữ liệu

Nguồn chạy thực là `frontend/src/` và NestJS trong `backend/src/`. Giữ các route
`/api/v1/tickets/me`, `/tickets/:id`, `/tickets/:id/calendar`, `/staff/verify`,
`/staff/check-in` và payload `ticketHash`, `showtimeId` hiện có. Những đường dẫn API
trong prompt là mô tả chức năng; không đổi endpoint đang được website sử dụng.
Mã ngắn được chấp nhận thêm ở trường `ticketHash`; mismatch vẫn trả 409 theo
contract cũ. Không thêm route ghi trạng thái PAID từ frontend.

- Đơn mới có N ghế SOLD nhận N bản ghi `e_tickets`, N mã chữ 8 ký tự và N token
  QR ngẫu nhiên 256-bit. Sweetbox hai ghế vật lý nhận hai vé. Code bỏ I/O/0/1 để
  dễ đọc; unique index phân xử va chạm, dịch vụ retry toàn transaction có giới hạn.
- `booking_seat_id` unique và FK kép `(booking_id, booking_seat_id)` ngăn vé trỏ
  sang ghế thuộc đơn khác. `Booking.tickets` thay quan hệ một vé/đơn.
- Phát tất cả vé thiếu và email outbox cho từng vé trong cùng transaction sau khi
  khóa booking và kiểm tra PAID/SOLD. Lỗi vé/email thứ hai rollback toàn lô;
  replay webhook/worker không tạo thêm vé.
- Vé nhóm đã phát trước migration giữ ID, PNG, hash và lịch sử check-in. Migration
  chỉ cấp thêm mã chữ cho vé cũ. Không phát thêm vé con cạnh QR nhóm cũ vì sẽ tạo
  hai quyền vào rạp cho cùng ghế. Ngoại lệ legacy được ghi rõ trên card.
- QR mới chứa `${CORS_ORIGINS[0]}/ve#<token>`; cấu hình origin frontend thực ở vị
  trí đầu tiên. Fragment không nằm trong HTTP request URL/referrer. QR cũ chứa
  hash vẫn quét được. Đổi domain cần cập nhật cấu hình và cân nhắc link đã phát.
- `amount` tiếp tục là tổng tiền **đơn** để giữ response cũ. UI ghi rõ tổng đơn
  N ghế; đây không phải tiền riêng của mỗi vé. Combo/ưu đãi dùng snapshot server.

## Giao diện và nghiệp vụ

- Màn hình trả về sau thanh toán hiển thị đủ QR từng ghế; ví vé hiển thị code
  lớn, sao chép, ngày đặt/ngày xem, phòng/ghế/loại ghế, combo, tổng đơn và ICS.
- Tìm tức thì theo code/phim/rạp/ngày, hỗ trợ tiếng Việt không dấu; chọn ngày xem
  hoặc ngày đặt, khoảng ngày, trạng thái và sắp xếp. Backend cũng nhận `search`,
  `status`, `date`, `dateFrom`, `dateTo`, `dateBasis`, `sort` có validation.
- QR phóng to trong dialog có focus/Escape. Vé tải PNG dùng tên file theo code
  riêng, tránh hai ghế tải cùng một tên.
- `/ve` chỉ đọc qua `POST /api/v1/tickets/lookup`: phim/rạp/phòng/giờ/ghế/trạng
  thái/mã chữ. Không trả tên, số điện thoại, email, mã đơn, token/PNG hay quyền
  check-in; mã chữ không dùng được để dò vé công khai.
- Nhân viên dùng camera/jsQR hoặc nhập code (có thể thêm tiền tố NV-), Enter để
  kiểm tra. Preview hiện khách hàng/điện thoại và chi tiết lượt xem. Sai suất
  báo cảnh báo, không tự chuyển suất để bỏ qua kiểm tra. Dữ liệu thiếu thành
  thông báo có thể xử lý, không crash khi `.map()`.
- Check-in giữ kiểm tra STAFF/ADMIN, đồng hồ DB, PAID/SOLD và conditional update
  chống dùng lại. Check-in ghế A1 không đổi trạng thái vé A2 cùng đơn.
- Giữ popup thanh toán/thông báo hết hạn mới từ nhóm. Đồng bộ sơ đồ bỏ lựa chọn
  bị người khác giữ, hiện popup xung đột; không nhận nhầm ghế của đơn PAID là
  xung đột. Tổng tiền và tên ghế trong popup đọc đúng DTO/snapshot server.

## Tự kiểm chứng Native

Chỉ dùng PostgreSQL test riêng và Redis test riêng; không Docker, không ghi
fixture/migrate vào database ứng dụng. Cấu hình `TEST_DATABASE_URL` và các biến
`TEST_REDIS_*` theo `backend/.env.example`, rồi chạy từ thư mục repository:

```sh
npm ci
npm run prisma:generate --workspace backend
npm run db:migrate:test --workspace backend
npm run test:backend
npm run test:db
npm run test:unit
npm run lint
npm run build:frontend
NOVA_QA_PRODUCTION=1 npm test
```

Trên PowerShell dùng `$env:NOVA_QA_PRODUCTION='1'; npm test` cho lệnh cuối.
`npm run dev:full` vẫn là lệnh chạy cả hai đầu. Khi dùng PostgreSQL, launcher
áp dụng migration/seed trước readiness; nên sao lưu dữ liệu trước khi nâng cấp.
RAM tự fallback vẫn theo lựa chọn của người dùng, chỉ tồn tại trong phiên chạy;
không dùng PASS RAM để chứng minh tính bền vững SQL.

## Ma trận bằng chứng

| Phạm vi                   | Ca kiểm tra                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Phát vé theo ghế          | Hai ghế → hai code/hash/QR; hai worker đồng thời; callback lặp; lỗi outbox thứ hai rollback cả lô                                |
| SQL constraints/migration | Unique code/seat, FK chéo đơn bị chặn; chạy nguyên migration trên bảng vé cũ, giữ nguyên QR/ID/USED                              |
| Owner/API                 | Chủ vé đọc được, người khác 404; tìm kiếm code/rạp; lọc ngày Việt Nam; ngày đặt khác ngày xem; range sai 400                     |
| Công khai                 | Tra token chỉ đọc; không lộ PII/token/đơn; code ngắn 400; anonymous không check-in được                                          |
| UC14                      | Hợp lệ/đã dùng/sai suất/không tồn tại; hai API instances cùng check-in chỉ một thành công; vé thứ hai không bị dùng theo         |
| Browser                   | Chọn hai ghế → giữ → popup xác nhận → Sandbox thật → hai card QR → tìm/lọc/phóng to → ICS → tra công khai → staff dùng từng code |
| Hồi quy                   | Auth, holds/expiry/cancel, payment signatures/pricing, catalog/admin/report, camera cleanup và layout mobile                     |

## Kết quả xác minh trên bản đã ghép main

| Bộ kiểm chứng                                | Kết quả                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend unit                                 | 116 đạt                                                                                     |
| Native HTTP/Socket.IO/SMTP                   | 254 đạt                                                                                     |
| Database constraints và migration            | 26 đạt                                                                                      |
| Node/RAM/planner/config                      | 97 đạt                                                                                      |
| Chromium production                          | 107 ca riêng biệt đạt qua các lượt dưới đây                                                 |
| Typecheck, lint hai workspace, build hai đầu | Đạt                                                                                         |
| Native compiled smoke                        | Đạt; khởi động tiến trình mới vẫn giữ PAID/SOLD/QR/check-in trong SQL; hai vé có code riêng |
| RAM fallback smoke                           | Đạt; 24 món, đăng nhập qua BFF, xung đột ghế, giữ ghế, Sandbox ký thật và QR                |

Tổng **600 ca riêng biệt**, không cộng trùng các lần chạy lại hoặc cộng hai smoke
vào số này. Backend checks chạy tuần tự với database test riêng; không dùng RAM
để xác nhận tính bền vững SQL. Không chạy Docker hoặc migrate database ứng dụng.

Lịch sử browser được giữ rõ: lượt đầu 98/107; 9 ca sau vá/đồng bộ thao tác đều đạt.
Lượt hồi quy tiếp theo 106/107, còn ca đo số lần format giờ chạy trùng lúc snapshot
danh mục đang hydrate. Bổ sung chờ API ngày và snapshot thật hoàn tất, giữ nguyên
assertion gõ 64 ký tự không format lại option; ca này đạt **3/3 lần lặp**. Không
bỏ qua test, tăng quota, sửa giá hoặc tạo vé giả để đạt kết quả.

Các lỗi thực được sửa gồm: chỉ hiện vé đầu tiên của đơn, tự bỏ qua cảnh báo sai
suất, dữ liệu vé thiếu gây crash, highlight ghế bị giữ còn tồn tại, popup xung đột
nhận nhầm ghế PAID của chính khách, popup thanh toán tràn ở 320px và phòng mới
không có trong cache lịch công khai. Các kiểm thử cũ được cập nhật theo popup
xác nhận và chính sách cho chọn ghế lẻ vừa được nhóm merge vào main.

Đây là kết quả chức năng, không phải cam kết mọi API dưới 30ms hoặc toàn lịch
dưới 15KiB. Lượt đo browser/BFF cho programme đầy đủ có p95 khoảng 167ms và payload
nén khoảng 307KiB; các budget đó **chưa đạt**. Quyền camera bị từ chối được mô
phỏng có kiểm soát; QR PNG/SVG được giải mã bằng jsQR, chưa kiểm tra phần cứng
camera thực của máy khách. Những con số ở báo cáo trước là lịch sử, không cộng
thành bằng chứng cho phiên bản per-seat.
