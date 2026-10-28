# NOVA: giao diện dễ đọc và quản trị danh mục thực

Ngày 23/10/2026. Nối tiếp bản mở lịch 30 ngày; prompt đính kèm được dùng làm tài
liệu tham khảo. Giữ PostgreSQL, Redis, cổng 3000/4000, chữ ký Sandbox, outbox,
QR và nghiệp vụ giữ ghế 300 giây đang chạy. Không thay dữ liệu thật bằng bộ nhớ.

## Thay đổi giao diện

- Trang chủ thêm ba thẻ ảnh dẫn đến phim, bắp nước và rạp. Thống kê lấy từ programme
  API hiện tại, không điền số mẫu. Hội viên có mức ưu đãi nổi bật; thẻ rạp có số phòng
  và số ngày có lịch thật.
- Chữ Plus Jakarta Sans / Space Grotesk hỗ trợ tiếng Việt, tiêu đề 28–49px, nội dung
  chính 14–16px, màu chữ sáng và giãn dòng rõ hơn. Cập nhật hội viên, rạp, sự kiện,
  mobile banner, footer, hỗ trợ, hướng dẫn, thanh toán và quản trị.
- Trang rạp dẫn đến `/dat-ve?cinema=<UUID>`; lịch và đặt nhanh cùng chọn đúng rạp.
  Định dạng phòng hiển thị tên dễ đọc thay cho enum kỹ thuật.
- Đăng ký thêm số điện thoại tùy chọn, kiểm tra 10 chữ số trong giao diện, gửi xuống
  API thật. Các tài khoản điền sẵn chỉ hiện trong chế độ standalone; không dùng mật
  khẩu demo của bộ nhớ cho tài khoản PostgreSQL.

## Bổ sung backend

### UC11: tên phim và nhật ký quản trị

Migration `20261023190000_catalog_audit` thêm unique expression index tên phim:
NFC, chuẩn hóa khoảng trắng, chữ thường. Service chuẩn hóa dữ liệu trước lưu;
DB index phân xử cả hai yêu cầu tạo trùng đồng thời và các ghi trực tiếp qua Prisma.
Trùng trả HTTP409 `MOVIE_TITLE_EXISTS` với thông báo tiếng Việt.

Thêm `audit_logs`; tạo/sửa/xóa phim và nhật ký commit trong cùng transaction.
Nếu ghi nhật ký lỗi, thay đổi phim được rollback. PATCH không đổi dữ liệu không ghi
thừa. Lưu actor UUID do phiên xác thực cung cấp, thời gian, tiêu đề và before/after
của các trường phim. Không lưu token hoặc mật khẩu. Không gắn FK tới phim/người
thực hiện để xóa danh mục không xóa lịch sử.

`GET /api/v1/admin/audit-logs` chỉ ADMIN theo role hiện tại trong DB; hỗ trợ page,
limit<=100, action, entityType=MOVIE và entityId. Không có API sửa/xóa nhật ký.
Giao diện có tab nhật ký, lọc thao tác, phân trang và mở chi tiết thay đổi.

Migration dừng nếu dữ liệu đã có tên phim trùng; không tự sửa tên hoặc xóa phim.
Trong môi trường này đã áp dụng thành công ở DB development và test.

### UC12: sức chứa và sơ đồ

API generate kiểm tra <= 15 hàng, <= 24 cột, <= 300 ghế, hàng VIP/Sweetbox hợp lệ và
số cột chẵn khi có Sweetbox. API thêm/sửa từng ghế kiểm tra tổng ghế/số hàng dưới
room row lock; hai yêu cầu thêm ghế ở mốc 299 không thể cùng vượt lên 301.
Phòng có lịch chiếu vẫn khóa thay đổi cấu trúc. Không thay sơ đồ hoặc lịch sử cũ.

Giao diện xem sơ đồ phòng đã lưu qua API; phòng trống có preview, số hàng/cột,
phân loại từng hàng, cảnh báo sức chứa và nút lưu. Giá STANDARD/VIP/Sweetbox vẫn
được backend tính bằng Decimal, không nhận giá do người dùng nhập.

Danh mục quản trị tải 25 mục mỗi trang, tìm tên phim/rạp/phòng trên server; không
gom hàng nghìn suất thành hàng chục request. Nhật ký cũng được phân trang.

## Kiểm chứng

| Kiểm tra                                                             | Kết quả                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Backend typecheck, lint, build                                       | PASS                                                                      |
| Unit                                                                 | 75/75 PASS                                                                |
| HTTP / Socket.IO / SMTP                                              | 207/207 PASS                                                              |
| PostgreSQL constraints / seed                                        | 22/22 PASS                                                                |
| Planner lịch                                                         | 2/2 PASS                                                                  |
| Frontend lint / production build                                     | PASS                                                                      |
| Playwright full stack sau hợp nhất GitHub                            | 30/30 PASS, không skip                                                    |
| Compiled API booking/payment/realtime/QR/SMTP/check-in/revenue smoke | PASS; cleanup owned fixtures PASS                                         |
| Production frontend + BFF + NestJS                                   | HTTP200, mode=backend,24 phim/48 phòng,không lỗi JavaScript               |
| Desktop1440 / mobile390                                              | Không tràn ngang ở các trang đã kiểm tra; thẻ hội viên không cắt nội dung |
| Read-only programme verifier                                         | 48 phòng/4.814 suất,30 ngày,0 overlap                                     |

Tổng **336 ca tự động đạt**, không cộng các lần chạy lại hoặc smoke vào số này.
Standalone được kiểm tra riêng bằng 8 nhóm kịch bản legacy và một lượt trình duyệt
đăng nhập/chọn ghế/giữ ghế/mở phương thức mô phỏng; không lỗi JavaScript, không
ảnh chuyển khoản bên ngoài. Kết quả demo không dùng để chứng minh backend thật.

Test mới đã tìm ra lỗi giữ rạp cũ khi Next giữ component qua điều hướng. Hook
`useQuerySelection` lấy query mới làm lựa chọn hiện hành mà vẫn cho đổi thủ công;
đã kiểm tra đường dẫn từ từng thẻ rạp sang cả lịch và đặt nhanh. Kiểm tra trực quan
cũng sửa chiều cao cố định của thẻ hội viên khi tăng cỡ chữ.

Ảnh từ bản production kết nối DB development thật. Khi chụp từng section dài,
ẩn header sticky/skip-link chỉ trong công cụ chụp để tránh lớp nổi đè ảnh; giao diện
thực không bị thay đổi bởi thao tác chụp.

- [Khám phá desktop](screenshots/catalog/journey-desktop.jpg)
- [Khám phá mobile](screenshots/catalog/journey-mobile.jpg)
- [Hội viên mobile](screenshots/catalog/membership-mobile.jpg)
- [Rạp & số phòng thực](screenshots/catalog/venues-desktop.jpg)
- [Sơ đồ quản trị](screenshots/catalog/room-admin-desktop.jpg)
- [Footer](screenshots/catalog/footer-desktop.jpg)
- [Hỗ trợ](screenshots/catalog/support-desktop.jpg)

Các test mới kiểm tra cạnh tranh tên phim, Unicode, tên trùng khi sửa, quyền truy
cập nhật ký, no-op, rollback khi audit lỗi, sức chứa đồng thời và giới hạn 15 hàng.
Fixture test cũ được đặt tên phim duy nhất để tuân thủ ràng buộc mới; không nới
assertion hoặc bỏ test. Fixture trình duyệt có thêm 28 phim ENDED để thử phân trang
quản trị; không làm loãng danh sách phim công khai.

`npm run dev:full` sau bàn giao đã khởi động lại API4000 và frontend3000 bằng
webpack. Seed bổ sung0 suất,0 xung đột; runtime xác nhận mode=backend và programme
HTTP200. Bản xem trước đang dùng backend thật.

## Hợp nhất cập nhật GitHub

Đã tích hợp cập nhật `06a2289` về webpack dev server và sửa luồng standalone.
Các lựa chọn mô phỏng và đổi điểm của bản bộ nhớ được giữ trong `DatVeDemo.jsx`;
`DatVeBackend.jsx` giữ luồng PostgreSQL đã kiểm chứng. Dispatcher chọn theo runtime
API, không chuyển sang demo khi máy chủ lỗi. Alias tiếng Anh dùng chung dispatcher.
Bản demo không tạo mã chuyển khoản đến số tài khoản minh họa hoặc gửi mã đơn sang
website QR bên ngoài; các tab có nhãn mô phỏng rõ ràng. `dev:full` dùng webpack như
cấu hình dev mới để tránh khác biệt công cụ giữa các cách khởi động.

## Phạm vi

Đây là phần bổ sung cụ thể vào backend đang có, không đánh dấu hoàn tất mọi mục
trong prompt LAB04 hoặc Phase11–12 của roadmap. Chưa có dispute/hoàn tiền thực,
khóa tài khoản, trình sửa từng vị trí/bảo trì ghế, hoặc tách nhóm sang hai hàng.
Nhật ký hiện bao phủ CRUD phim; các danh mục khác chưa ghi vào nhật ký này.
Không có cam kết không thể xuất hiện lỗi ngoài các kịch bản đã kiểm tra.
