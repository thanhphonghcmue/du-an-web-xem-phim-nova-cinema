# Rà soát giao diện & kết nối LAB04 — 23/10/2026

Tiếp nối [Premiere](premiere-upgrade.md), chọn phần phù hợp trong prompt người dùng
đính kèm để nâng cấp trải nghiệm hiện có. Không coi prompt tham khảo là bằng chứng
rằng những chức năng nó liệt kê đã tồn tại.

## Thay đổi

- Cảnh báo ghế lẻ được tính từ lựa chọn và snapshot hiện tại, thay vì giữ chuỗi cảnh báo
  có thể lỗi thời sau realtime/poll. Viền vàng chỉ đúng ghế bị cô lập; có thông báo
  trợ năng và khóa nút giữ chỗ. Backend vẫn từ chối `ORPHAN_SEAT_DETECTED` (400).
- Gợi ý nhóm loại bỏ dải tạo ghế lẻ ở cả hai đầu, giữ tiêu chí khoảng cách trung tâm,
  không vượt ghế SOLD/HOLDING, không tách Sweetbox. Thêm chọn thường/VIP/Sweetbox
  trên UI; loại ghế được gửi tới API thật. Không âm thầm tách nhóm khi thiếu dải phù hợp.
- Quầy soát vé chọn rạp/ngày/suất, kiểm tra QR trước và xác nhận vào rạp sau.
  `POST /api/v1/staff/verify` chỉ đọc; `POST /api/v1/staff/check-in` kiểm tra lại dưới
  các khóa hiện có, nhận thêm `showtimeId` tùy chọn để giữ tương thích client cũ.
  Sai suất, mã không tồn tại, vé đã dùng và ngoài khung giờ có trạng thái riêng.
  Thời điểm soát do DB cung cấp. Mã QR được che trong ảnh kiểm tra.
- Lịch của quầy lấy API với `date` để có cả suất đã bắt đầu; không tái dùng riêng
  danh mục upcoming của trang bán vé. Có tải lại định kỳ và thông báo khi mất kết nối.
- Bỏ helper ghép ID đơn thành hash QR giả và việc STAFF gọi báo cáo ADMIN. Chỉ nhận
  mã QR thực. Camera chỉ mở theo thao tác, dừng khi đổi ngữ cảnh/đóng; trình duyệt
  thiếu BarcodeDetector có hướng dẫn nhập mã.
- `GET /api/v1/tickets/:id/confirmation` chỉ chủ vé được đọc, kể cả ADMIN khác chủ
  nhận 404. Bản xem trước dùng cùng template NOVA với email SMTP thực; QR nhúng
  trong iframe sandbox có CSP chặn script/nguồn ngoài. Không gửi thư hoặc tự ghi
  nhận gửi thành công khi bấm xem. Trạng thái QUEUED/RETRYING/SMTP_ACCEPTED/UNKNOWN
  lấy từ outbox hiện có; SMTP_ACCEPTED không khẳng định đã tới inbox người nhận.
- `.ics` bổ sung địa chỉ rạp và VALARM trước 30 phút; giữ UTC, UID, escaping, folding
  75 byte và thời gian kết thúc phim không gồm thời gian dọn phòng.

## Bảo toàn và phần chưa triển khai

Giữ Next/Nest, PostgreSQL/Prisma, Redis/BullMQ, SMTP, port 3000/4000 và dữ liệu hiện có.
Không chuyển sang SQLite/JSON hoặc thêm nút đăng nhập quyền cao với mật khẩu công khai.
Không thêm migration/dependency, không thay luật ghế lẻ, deadline 300 giây, Decimal,
quyền sở hữu QR, RBAC, chống giữ trùng, kiểm tra lịch phòng hoặc chữ ký thanh toán.

Các mục phù hợp về danh mục 24 phim/16 món, lịch 7 ngày, thanh đặt vé 4 bước, ưu đãi,
QR/ICS, đăng ký/đăng nhập và Admin đã có từ các đợt trước. Phạm vi này không triển khai
chuyển hạ tầng không Docker, DISPUTE_PENDING/hoàn tiền/đối soát, nút tua thời gian giữ
chỗ, hộp thư thay SMTP, tài khoản LOCKED mới hoặc trình chỉnh sửa ghế bảo trì. Không
thêm nút giả hoặc tự đổi trạng thái trên frontend cho những phần chưa có domain API.
Thanh toán giữ ba kết quả Sandbox hiện có; timeout thật được worker và kiểm thử xác nhận.

## Kiểm chứng

27 lỗi HTTP cũ đã được tái hiện trước sửa. Chúng đến từ fixture chọn ghế gây ghế lẻ:
fixture vé giữ 2/3 ghế, ca đồng thời chọn ghế số 2 đơn độc, ca overflow đi vào validator
khác trước khi kiểm tra Decimal và ca expiry chọn lại ghế số 2 đơn độc. Đã sửa fixture
thành 2/4 ghế, hai đầu hàng và tập ghế hợp lệ tương ứng. Giữ các assertion nghiệp vụ,
không bỏ/skip test hoặc nới luật giữ chỗ. Bổ sung kiểm tra ghế lẻ riêng ở UI/API.

| Kiểm tra                             | Kết quả                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Backend typecheck, typed lint, build | PASS                                                                              |
| Backend unit                         | 75/75 PASS; gồm 256 cấu hình ghế × 8 số lượng cho gợi ý                           |
| Backend HTTP/Socket.IO/SMTP          | 197/197 PASS                                                                      |
| PostgreSQL/schema/seed               | 22/22 PASS                                                                        |
| Smoke API bản build                  | PASS: booking → payment → realtime → QR → SMTP → check-in → revenue; cleanup PASS |
| Frontend production → BFF → API      | PASS: 8 trang HTTP200, health200, 24 phim/16 món/16 phòng; không lỗi JavaScript   |
| Frontend lint, production build      | PASS                                                                              |
| Playwright                           | 24/24 PASS; lịch đã bắt đầu, camera fallback và mobile                            |

Kiểm tra HTTP bổ sung xác nhận: preview QR không đánh dấu đã dùng, mismatch không
check-in, QR chỉ dùng một lần, CUSTOMER/khách không truy cập quầy, nonowner không
đọc email, đọc preview không gửi thư, lỗi SMTP có RETRYING và retry thật thành công.
Test dùng PostgreSQL/Redis riêng và SMTP fixture loopback, không gửi thư ra ngoài.

## Cách demo

Với hạ tầng và cấu hình đã setup, chạy `npm run dev:full` tại root, mở cổng 3000.
Hướng dẫn setup đầy đủ vẫn ở [README](../../README.md).

1. Đăng ký hoặc dùng tài khoản của bạn, chọn suất. Bấm ghế số 2 của hàng trống để
   thấy cảnh báo ghế số 1; chọn thêm ghế số 1 hoặc đổi vị trí để cảnh báo hết.
2. Chọn loại ghế và số người, bấm Xếp ghế. Chọn combo, giữ chỗ và đọc giá backend.
3. Thanh toán Sandbox thành công, mở vé trong tài khoản, bấm Xem email xác nhận.
   Có thể tải QR và `.ics`; email tự gửi theo queue, preview không gửi lại.
4. Đăng nhập STAFF/ADMIN, mở `/soat-ve`, chọn đúng ngày/suất và nhập mã đọc từ QR.
   Kiểm tra vé chưa làm vé USED; bấm Xác nhận soát vé mới ghi nhận. Kiểm tra lại
   sẽ báo đã dùng, đổi suất trước xác nhận sẽ báo sai suất, mã không tồn tại bị từ chối.

Đây là bằng chứng các tình huống đã chạy, không phải cam kết hệ thống không thể có lỗi
trên mọi thiết bị, mọi tải hoặc mọi cấu hình triển khai. Camera vật lý chưa kiểm chứng;
nhánh trình duyệt thiếu hỗ trợ và quy trình nhập mã được kiểm tra tự động.

## Ảnh kiểm tra

- [Cảnh báo và viền đúng ghế lẻ](screenshots/booking-audit/orphan-seat-warning.jpg)
- [Email xác nhận từ vé thực](screenshots/booking-audit/owner-confirmation-email.jpg)
- [Kiểm tra vé trước xác nhận vào rạp](screenshots/booking-audit/staff-valid-preview.jpg)
- [Quầy soát vé mobile](screenshots/booking-audit/staff-mobile.jpg)

Ảnh lấy từ fixture test riêng đã cleanup, QR/hash được che; không dùng tài khoản
hoặc mã vé của khách thật. Có thể tạo lại khi chạy test với `NOVA_CAPTURE_DIR`
trỏ tới thư mục ảnh mong muốn; mặc định kiểm thử không ghi ảnh vào repository.

## Hợp nhất cập nhật GitHub cùng thời điểm

Hợp nhất nhánh đã có cập nhật tên file tiếng Việt, hướng dẫn VS Code, Next 16.4.2 và
module demo standalone. Các file tiếng Việt là nguồn chức năng duy nhất; tên tiếng Anh
re-export để mọi trang dùng cùng luật ghế, đặt vé, email và soát vé. Giữ module demo
nhưng chọn chế độ cho cả phiên: development không có BACKEND_API_URL, hoặc chỉ định
NOVA_STANDALONE=true. Khi đã cấu hình backend (bao gồm dev:full/tests), lỗi upstream
trả 503; không âm thầm giữ ghế/đăng nhập trong kho khác. Production dùng backend.
Trang demo có nhãn bộ nhớ tạm; các kết quả kiểm thử ở trên là chế độ backend thật.

Sau hợp nhất: frontend lint/build Next16.4.2 và Playwright 24/24 PASS. Probe production
với upstream không hoạt động (kể cả đặt NOVA_STANDALONE=true) xác nhận mode backend,
health/login 503 và không cấp cookie. Probe development standalone xác nhận nhãn demo,
sai mật khẩu 401/đúng mật khẩu 200, health không giả PostgreSQL UP, endpoint chưa hỗ trợ
trả 501. Probe 8 trang production kết nối API thật vẫn HTTP200, health200, không lỗi JS.
