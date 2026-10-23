# NOVA — chữ dễ đọc & đặt vé trước nhiều ngày

Tiếp nối [LAB04 audit](lab04-booking-audit.md), theo yêu cầu mở rộng phòng/suất/ngày
và sửa chữ chìm ngày 23/10/2026.

## Giao diện

`src/clarity.css` tăng độ sáng chữ phụ, cỡ chữ, độ đậm và khoảng dòng; tiêu đề dùng
Space Grotesk, nội dung Plus Jakarta Sans. Cả hai font được phục vụ cục bộ, có bộ ký tự
Việt. Tên phim, phòng, giá và số ghế dùng các mức chữ khác nhau, không dùng chữ mờ 9px
cho thông tin lịch quan trọng. Viền focus rõ; nút Admin không xuống dòng, header chuyển
menu thích hợp khi có nhiều nút quản trị.

Lịch hiển thị bảy ngày một nhóm, có trước/sau, tháng bên cạnh ngày và ô chọn ngày xa.
Nhóm cuối vẫn hiển thị đủ tối đa bảy ngày có lịch. Bộ lọc phòng chỉ liệt kê phòng thực
sự có suất của phim trong ngày; đổi phim xóa bộ lọc phòng/buổi cũ. Không tạo ngày/suất
giả khi API chưa có dữ liệu. Những phim sắp chiếu có suất thực có nhãn mở bán và nút
Đặt trước; những phim chưa có suất giữ nhắc lịch `.ics`. Thanh đặt vé và chi tiết phim
cũng cho đặt trước nếu có lịch.

## Dữ liệu và cách khởi động

Seed `advance-programme.cjs` bổ sung 16 phòng có ID ổn định mỗi rạp, giữ nguyên phòng
và lịch cũ. Kết quả hiện tại: **24 phòng/rạp, 48 phòng tổng, 4.814 suất trong DB**.
Đã thêm **4.288 suất**. Số đang mở sẽ giảm theo thời gian; không coi toàn bộ lịch sử
trong DB là suất còn bán.

Mỗi phim trong 16 phim đang chiếu có bốn khung giờ sáng/chiều/tối/muộn trên hai phòng,
hôm nay nếu còn giờ hợp lệ và 30 ngày tiếp theo. 8 phim COMING_SOON có bốn suất/ngày
trên hai phòng mỗi rạp trong bảy ngày kể từ ngày tái chiếu dự kiến. Ngày đó không phải
thông báo phát hành chính thức của tác phẩm. Không mở suất trước ngày dự kiến hoặc
trong 20 phút tới. endTime = thời lượng phim + 15 phút dọn phòng.

Seed khóa phòng, kiểm tra giao cắt, bỏ qua xung đột thay vì dời lịch hoặc sửa đơn.
Không sửa suất đã có, giá/admin edits, mật khẩu, sơ đồ phòng không trống hoặc booking.
Chạy lại thêm **0** suất; verifier kiểm tra **0** khoảng lịch chồng nhau. Không seed demo
trong production. Đặc tính đủ lịch được kiểm chứng trên catalog mẫu, không tự ghi đè
những lịch/movies quản trị viên đã thay đổi để ép đủ số lượng.

`npm run dev:full` tự chuẩn bị seed Discovery + programme trước khi chạy API/Next;
lịch không bị cũ chỉ vì máy setup từ tuần trước. Có thể tắt bước này bằng
`NOVA_REFRESH_PROGRAMME=false`. Khi chạy chế độ này, frontend luôn dùng API đã cấu hình.
Không có việc đổi sang kho demo khi mất kết nối.

Với máy đã setup, để cập nhật và kiểm tra riêng:

```bash
npm --prefix backend run db:seed:programme
npm --prefix backend run db:verify:programme
npm run dev:full
```

## Tải lịch lớn qua API

Đã tái hiện 429 khi client phải gọi hàng chục trang để lấy lịch. Không tăng hoặc tắt
rate limit để che lỗi. Thêm public `GET /api/v1/showtimes/programme?days=60`:

- Snapshot REPEATABLE READ gồm movies/cinemas/rooms/active combos/future showtimes;
  cùng mốc DB asOf và until, giá fixed2 Decimal strings.
- days là số nguyên 1–60; tối đa 10.000 suất, 1.000 phim/rạp/combo và 2.000 phòng.
  Nếu vượt ngưỡng trả 422, không âm thầm cắt bớt rồi báo đầy đủ.
- Không có user, booking, vé, token hoặc dữ liệu cá nhân; không thay API mutation.
- Frontend xác định mode, rồi tải một snapshot; chế độ standalone tiếp tục dùng bộ
  demo tách biệt hiện có. Staff vẫn tải theo ngày để có cả suất vừa bắt đầu.
- Những trang quản trị dùng pagination giữ giới hạn 100; apiList tải tối đa bốn trang
  song song, giữ thứ tự và không trả thành công khi một trang thất bại.

## Kiểm chứng

| Kiểm tra                               | Kết quả                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Backend unit                           | 75/75 PASS                                                                 |
| Backend HTTP/Socket.IO/SMTP            | 199/199 PASS                                                               |
| PostgreSQL/schema/seed                 | 22/22 PASS                                                                 |
| Planner Node tests                     | 2/2 PASS; đủ 30 ngày × 16 phim × hai phòng/bốn buổi và ranh giới tháng/năm |
| Read-only verifier trên DB development | PASS; 48 phòng, 4.814 suất, đủ độ phủ lịch và 0 overlap                    |
| Seed chạy lại                          | 0 suất thêm, 0 xung đột                                                    |
| Frontend lint/production build         | PASS                                                                       |
| Playwright                             | 27/27 PASS, không skip                                                     |

HTTP mới kiểm tra hơn 100 suất thật trả đủ trong một snapshot, giá chính xác, loại
ENDED/lịch ngoài cửa sổ, query invalid bị từ chối và giới hạn pagination cũ vẫn bật.
Fixture trình duyệt có 120 suất trong 30 ngày, hai phòng và một phim COMING_SOON có
suất ngày xa. Kiểm tra mới đặt/hủy vé ngày thứ 30; đặt trước → giữ ghế → Sandbox → QR;
font tối thiểu và tương phản 4.5:1 ở nhãn lịch chính; mobile/admin header không tràn.
Các ca cạnh tranh ghế, Sweetbox, nhóm, hết hạn, QR/SMTP/check-in, quyền và backend lỗi
vẫn được giữ. Không dùng mock thành công để chứng minh giữ ghế/thanh toán.

Ảnh desktop/mobile được chụp từ API development thật; không có lỗi JavaScript trong
lượt kiểm tra trực quan. Phần kiểm tra không phải bảo đảm không thể có lỗi trên mọi tải.

- [Lịch tháng trên desktop](screenshots/advance/schedule-month-desktop.jpg)
- [Lịch trên điện thoại](screenshots/advance/schedule-mobile.jpg)
- [Phim mở bán trước](screenshots/advance/presale-desktop.jpg)
- [Chữ mới trên trang chủ](screenshots/advance/home-typography.jpg)

Lượt đặt trước từ trang sắp chiếu phát hiện popup ưu đãi tự mở khi quay lại Sandbox.
Đã loại lần tự mở trên URL có tham số booking, giữ nút mở ưu đãi thủ công và lần vào
trang chủ thông thường. Test đặt trước xác nhận không có popup cản truy cập vé sau PAID.

Tổng các suite tự động trên là **325 ca đạt** (75 unit + 199 HTTP/tích hợp + 22 DB +
2 planner + 27 trình duyệt), không cộng số lần chạy lại. Lint/typecheck/build cả hai
package đạt. Smoke API bản build được chạy tuần tự sau Playwright để không dùng
chung outbox test giữa hai tiến trình.

Production probe sau build: programme API HTTP200, 24 phim/48 phòng, 30 ngày của phim
đã chọn và bốn suất ở ngày xa nhất; không lỗi JavaScript. Số đang mở tại probe là 4.783
(thay đổi theo giờ); tổng DB vẫn 4.814. Compiled booking/payment/realtime/QR/SMTP/
check-in/revenue smoke và cleanup PASS. Startup dev:full tự seed lại thêm 0 suất và
khởi động thành công; preview hiện dùng backend thật.
