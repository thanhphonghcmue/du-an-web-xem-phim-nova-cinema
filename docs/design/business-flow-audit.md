# Rà soát nghiệp vụ, QR và màn soát vé — 27/10/2026

Tiếp tục yêu cầu kiểm tra Đặt vé, Tài khoản, Quản trị và ảnh lỗi React key/thanh
toán. Giờ hiển thị và khoảng ngày báo cáo dùng `Asia/Ho_Chi_Minh`.

## Lỗi đã xác định và cách sửa

### Backend RAM được bật lại ở đường chạy dev

Đã lấy commit mới `2abf704` từ GitHub bằng fast-forward, bảo toàn lịch sử remote.
Commit đó kiểm tra cứng cổng 55432 rồi tự chạy `backend/standalone-server.cjs`
nếu không thấy DB hoặc seed lỗi. Server này dùng Map cho tài khoản/đơn/vé,
ghép phim gốc với phim Discovery có cùng ID, sinh lịch từ danh mục lặp và trả
một số số liệu quản trị mẫu. Nó có thể được chọn dù DATABASE_URL đang cấu hình
một PostgreSQL khác; frontend vẫn thấy cổng 4000 và tưởng đó là NestJS.

Đã gỡ đường chuyển kho và server RAM. `dev:full` chạy NestJS với DATABASE_URL
đã cấu hình, đợi readiness thật; seed/DB lỗi thì dừng. Không dò một cổng cố định
để suy luận DB, không thay `.env` hoặc reset dữ liệu. Tài khoản và vé từng chỉ
tồn tại trong tiến trình RAM không thể được coi là bản ghi PostgreSQL; bản này
không tự tạo vé thay thế cho chúng.

### Nút xem vé đóng modal nhưng không mở ví vé

Đã tái hiện bằng kiểm thử: sau thanh toán, bấm **Xem vé trong tài khoản** vẫn ở
`/`, trong khi cần mở ví vé. Kiểm thử cũ có thêm thao tác mở tài
khoản thủ công nên không phát hiện lỗi điều hướng này.

Nút hiện đọc lại đơn từ API, chỉ nhận PAID do server xác nhận, cập nhật State và
mở `/tai-khoan?ve=<UUID đơn>#ve-cua-toi`. Header/mobile **Vé của tôi** cũng đến
phần vé. Hàm
`handleMockPaymentSuccess` xử lý kết quả Sandbox đã lưu; không tự gán PAID hoặc
lưu vé có hiệu lực trong LocalStorage. Biểu mẫu Sandbox có chữ ký vẫn do NestJS
xác minh, giữ ownership, số tiền, thời hạn và idempotency.

Ví vé tải vé và danh sách đơn độc lập: lỗi tải đơn không che QR đã tải được từ
API vé. Có nút Làm mới vé, polling singleflight và chặn response cũ sau khi đổi
tài khoản/unmount. PAID chưa có ETicket hiện trạng thái đang phát hành, không
thông báo QR sẵn sàng trước khi có dữ liệu.

Kiểm tra bổ sung khung nhìn đã phát hiện QR được render nhưng nằm dưới màn hình
do nội dung tải bất đồng bộ. Ví vé nay chờ QR của đúng đơn được yêu cầu, tự cuộn
đến QR một lần khi dữ liệu sẵn sàng, không nhảy lại mỗi chu kỳ polling. Assert
`toBeInViewport({ ratio: 1 })` PASS trên desktop và màn 390×844, kể cả tải lại.

### QR SVG có kiểm tra định danh

Thêm `qrcode.react@4.2.0`, component `ETicketQr` dùng `QRCodeSVG`. Kiểm tra UUID
vé/đơn, mã `NOVA-…` và ticketHash 64 hex trước khi render. Thiếu dữ liệu hiện
placeholder; dữ liệu sai hiện hướng dẫn làm mới, không crash. QR encode **hash
vé do backend cấp**, đúng dữ liệu STAFF API kiểm tra, không encode orderCode
thay cho định danh vào rạp. PNG từ backend vẫn dùng cho email/tải xuống khi hợp
lệ; PNG trống không làm mất SVG nếu hash vé thật đã có.

Playwright chụp riêng SVG vào bộ nhớ, decode bằng jsQR và đối chiếu với hash từ
API thật. Không ghi hash/QR, cookie hoặc mật khẩu vào báo cáo hoặc ảnh bàn giao.

### Suất chiếu trùng ID và layout thanh toán

`SoatVeNhanVien` lọc bỏ ID trống và deduplicate theo ID trước khi map `<option>`.
Key giữ UUID của suất; không dùng index để che lỗi dữ liệu. Định dạng giờ vẫn
`toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", … })`. Một ca cố ý
lặp các bản ghi GET thật ở lớp phản hồi trình duyệt xác nhận option duy nhất,
chọn đúng UUID và không có React key warning.

Cụm chọn VietQR (Napas), MoMo, VNPAY, Sandbox dùng lưới 2/4 cột theo bề rộng
card, nhãn không bị bẻ từ. Nút chính có container `w-full max-w-full`, min-width
0; trang Sandbox có cùng ràng buộc cho form/button. Các lựa chọn này là giao
diện **mô phỏng qua Sandbox**, chưa tích hợp ngân hàng/ví thật. Đổi lựa chọn cập
nhật trạng thái hiển thị; giao dịch vẫn được xác nhận qua API Sandbox có chữ ký.

Kiểm tra card ở 320/390/820/1440px và trang Sandbox ở 320/390/650/1440px: button
nằm trong card, nội dung không tràn ngang. Ảnh bàn giao chỉ chụp vùng thanh toán,
không có mã đơn, dữ liệu cá nhân hoặc QR:

- [Card chọn cổng trên màn 320px](screenshots/business-audit/payment-card-320.jpg)
- [Các nút Sandbox trên màn 320px](screenshots/business-audit/sandbox-320.jpg)

### Giữ ghế trên HTTP LAN, voucher và lỗi API

Khóa idempotency trước đây tạo bằng `crypto.randomUUID()` ngoài try/catch;
trình duyệt thiếu API này có thể ném lỗi và để nút ở trạng thái bận. Nay tạo khóa
trong try/finally, dùng getRandomValues để tạo UUID v4 khi cần, không dùng
Math.random. Nếu cả hai API không khả dụng thì báo lỗi, không gửi booking và
không khóa nút vĩnh viễn. Luồng thiếu randomUUID vẫn giữ/hủy ghế qua API thật.

Voucher sai hoặc chưa đạt mức tối thiểu trước đây âm thầm giảm 0đ. Backend nay
trả 400 `COUPON_INVALID`/`COUPON_MINIMUM_NOT_MET`, không tạo booking/ghế đang giữ.
Ngưỡng tính sau ưu đãi hội viên, tiền Decimal; DTO trim/uppercase, dài 1–32 ký tự.
Test kiểm tra dưới/đúng ngưỡng, làm tròn cents, giới hạn mức giảm, rollback và
thử lại cùng request key sau thất bại. Sau thành công, cùng body/key trả cùng
đơn/hạn; thay voucher với key đã dùng vẫn 409.

Frontend giữ nguyên status/code/details của lỗi; các lỗi quyền, lịch trùng,
dữ liệu có tham chiếu và hết phiên có hướng dẫn tiếng Việt. Lỗi 500 hiện thông
báo dễ đọc, không lộ thông báo driver hoặc biến lỗi thành thành công.

### Báo cáo quản trị và CSV

CSV cũ đọc `totalRevenue` trong khi API trả `netRevenue`, nên có thể xuất 0.
Nó cũng ghép 10 đơn mới nhất toàn hệ thống vào mục được gọi là chi tiết trong kỳ.
CSV mới chỉ xuất aggregate của khoảng ngày thực sự đã nhận, giữ chuỗi Decimal,
không ép tiền qua Number. Danh sách 10 đơn gần nhất được ghi rõ là độc lập với
khoảng ngày báo cáo. Report vẫn tính đơn PAID theo ngày tạo đơn ở Việt Nam.

Khoảng nhập và khoảng kết quả được phân biệt; không xuất khi chưa áp dụng ngày
mới hoặc đang tải. Response cũ không ghi đè yêu cầu mới; sửa khoảng ngày lỗi
rồi tải thành công sẽ xóa lỗi. Khi chưa tải được số liệu, giao diện hiển thị
“—” thay vì doanh thu 0 giả. Test tải CSV thật đối chiếu API và thử sửa ngày sai.

## Kiểm thử

| Bộ kiểm thử | Kết quả cuối |
| --- | --- |
| Backend unit | 86 PASS |
| Backend HTTP/Socket.IO/SMTP | 213 PASS |
| PostgreSQL integration | 22 PASS |
| Programme planner | 4 PASS |
| Playwright | 53 PASS |
| QR/CSV/thông báo lỗi — Node test | 11 PASS |
| **Tổng ca riêng biệt** | **389 PASS** |

Frontend lint/build, backend typecheck/lint/build PASS. Lượt full Playwright có
51 PASS và hai ca dùng fixture/điều hướng cũ: fixture lỗi 503 thiếu mã lỗi BFF,
và ca đặt sau 15 ngày vẫn bấm mở popup tài khoản thêm lần nữa sau khi nút xem vé
đã dẫn tới ví vé. Đã sửa fixture đúng `BACKEND_UNAVAILABLE`, thay thao tác dư
bằng assertion URL ví vé, chạy lại **cả hai PASS**. Không bỏ assertion QR,
phân quyền hoặc trạng thái nghiệp vụ. Các lượt chạy mục tiêu/rerun không được
cộng thêm vào con số 389.

Sau sửa vị trí QR, đã chạy lại bốn luồng bị ảnh hưởng: mua vé thường, ADMIN mua
vé/CSV, phim sắp chiếu và phim thứ 20 sau 15 ngày, **4 PASS**. Lint/build frontend
cũng chạy lại PASS. Các assertion URL kiểm tra cả UUID đơn yêu cầu và điểm neo
ví vé; không mở popup tài khoản dư để làm QR xuất hiện.

Tám ca trình duyệt mới kiểm tra crypto/HTTP LAN, mã giảm giá không đủ điều kiện,
card thanh toán nhiều kích thước, tất cả đích công khai và trang riêng khi chưa
đăng nhập trên desktop/mobile, ID suất trùng, cùng luồng ADMIN tạo rạp/phòng/ghế/
suất → chặn lịch trùng/xóa rạp có phòng → mua vé → đọc QR → tải CSV đúng API.
Kiểm tra riêng tài khoản khác không đọc được đơn/QR của ADMIN.

Compiled production smoke và hai script mạng/startup PASS, được ghi nhận riêng,
không đếm như thêm các ca unit/e2e. Sau kiểm thử, có thể chạy đồng thời hai đầu
bằng `npm run dev:full` với PostgreSQL/Redis/SMTP đã cấu hình.

Các suite dùng cùng test outbox được chạy tuần tự; PostgreSQL test khác DB
development, Redis/SMTP fixture riêng. Các luồng mua vé dương tính dùng API/DB
thật. Fault injection chỉ dành cho tình huống lỗi như ID lặp, mạng bị ngắt,
trình duyệt thiếu API; không dùng nó để giả thanh toán thành công.

Compiled production smoke tiếp tục kiểm tra đăng ký, đơn PAID/SOLD, QR/email,
check-in và báo cáo; dừng/chạy hai tiến trình backend mới để xác nhận dữ liệu
và QR vẫn nguyên vẹn. Hai kiểm tra mạng riêng xác nhận BFF trả 503 khi upstream
ngắt và launcher dừng khi PostgreSQL cấu hình không khả dụng, kể cả khi có biến
demo cũ. Không chạy Docker hoặc thay `.env`.

Verifier development ngày 27/10: 24 phim/rạp, 40 phòng/rạp, tổng 80 phòng và
8.324 suất trong DB, ít nhất 4 giờ/ngày trên 2 phòng/phim, 8 phim đặt trước,
đến 30/11 (34 ngày tới), 0 lịch phòng chồng nhau. Tổng suất đang mở thay đổi
theo thời điểm, không cộng suất đã qua vào lựa chọn có thể đặt.

## Headroom và phạm vi

Đã clone và đọc [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)
tại commit `17d38e5` (v0.42.0), trong thư mục tham khảo riêng. Đây là lớp nén
context cho lời gọi LLM/proxy/MCP, không phải thư viện sửa Next/Nest/QR. Không
chạy `wrap`, sửa cấu hình agent hoặc đưa proxy vào luồng thanh toán. Việc clone
repo không thay đổi bộ đếm token của phiên chat đang mở; không báo số token tiết
kiệm khi chưa có traffic và phép đo.

Không mở rộng schema hoặc đánh dấu Phase 11–12/LAB04 còn thiếu là đã hoàn tất.
Thanh toán vẫn Sandbox, camera phụ thuộc hỗ trợ BarcodeDetector; nhập mã QR
vẫn hoạt động. Độ bền được kiểm tra qua restart ứng dụng, không phải kiểm thử
phục hồi khi mất ổ đĩa. Các kết quả kiểm thử không phải cam kết không bao giờ
có lỗi ở mọi môi trường.
