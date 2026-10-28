# NOVA: từ bản nghiên cứu đến giao diện đặt vé

Ngày 23/10/2026. Dựa trên `41bd6d9`, bao gồm lịch 30 ngày của `4d0d68c` và bản quản
trị/API đã có. Theo yêu cầu mới nhất: phát triển để người dùng kéo về chạy trên máy;
không triển khai host hoặc mở tunnel công khai.

## Thay đổi

- Font nội dung **Be Vietnam Pro**, tiêu đề **Space Grotesk**, tự phục vụ font từ
  package Fontsource, gồm latin và tiếng Việt, không gọi Google Fonts lúc sử dụng.
  Nền xanh đen, bề mặt rõ hơn, chữ/giá/nút được phân cấp. CSS mới áp dụng trên toàn
  bộ trang khách hàng, tài khoản, quản trị và soát vé.
- **Radix Dialog** cho lựa chọn có tìm kiếm: tên rạp đầy đủ, địa chỉ, số phòng;
  chọn phim có poster; chọn giờ có phòng, giá từ API và số ghế. Mobile hiển thị
  bảng chọn phía dưới, có tìm kiếm, xử lý bàn phím, Escape và trả focus về nút mở.
- **React DayPicker 9** và locale Việt: lịch tháng, chọn ngày xa, dấu ngày hiện tại,
  chỉ cho chọn ngày thật sự có suất của phim/rạp. Ngày được lưu bằng calendar key,
  không chuyển qua UTC làm lệch ngày. Suất vẫn hiển thị theo Asia/Ho_Chi_Minh.
- Thanh đặt nhanh và lịch chia sẻ lựa chọn rạp/phim/ngày; tóm tắt lựa chọn có tên
  phim, rạp, ngày, giờ/phòng. Có lọc định dạng phòng và giờ kết thúc phim (không
  tính 15 phút vệ sinh vào giờ kết thúc dành cho khách).
- Thêm đường dẫn **`/phim/<id>`**, poster/backdrop, nội dung, trailer, rạp có lịch
  thật và nút mở đúng phim/rạp trong `/dat-ve`. Đường dẫn mở trực tiếp và reload được.
- Trang chủ giảm danh mục nổi bật còn 6 phim, menu đầy đủ ở trang bắp nước; banner
  có lời giới thiệu theo phim, màn hình chờ dùng concept NOVA thay ảnh Dune cũ.
- Sơ đồ ghế có phóng to/thu nhỏ/toàn cảnh; trạng thái chọn có aria-pressed.
  Đăng nhập sau khi chọn suất sẽ tiếp tục đúng bước chọn ghế.
- Danh sách phim có lọc suất hôm nay; rạp có lọc thành phố; hỗ trợ có tìm câu hỏi;
  liên hệ có nội dung riêng dẫn đến đơn, câu hỏi và lịch từng rạp. Không tạo form
  gửi yêu cầu khi chưa có backend tiếp nhận.
- Lịch sử vé có lọc tất cả/đang giữ/chưa soát/đã sử dụng và phần xem đơn đã hủy/hết
  hạn. Bảng tiền, QR, email và các trang nội dung được tăng độ dễ đọc.

## Bảo toàn nghiệp vụ

Giữ PostgreSQL/Redis, BFF/cookies, role, thời hạn 300 giây, orphan-seat, Sweetbox,
Decimal, HMAC Sandbox, QR, email outbox và check-in một lần. Không migration hoặc
API backend mới. Không tự tích hợp ngân hàng, không dùng bộ nhớ thay backend.
Các thao tác mua vé vẫn nhận giá, ghế và trạng thái từ API thật.

Bộ Radix/DayPicker chỉ thay phần chọn trên giao diện. Test cũ được cập nhật cách
thao tác tương ứng (mở dialog, chọn UUID/date thực), giữ các kiểm tra quyền,
booking, thanh toán, QR và tính nhất quán. Test mới bổ sung tìm rạp, đồng bộ hai
bộ chọn, trang phim/reload/đúng rạp, lịch Việt và focus mobile, hỗ trợ/liên hệ,
đăng nhập tiếp tục suất và zoom ghế.

## Nguồn mở

| Thành phần                    | Nguồn                                     | Giấy phép                              |
| ----------------------------- | ----------------------------------------- | -------------------------------------- |
| Be Vietnam Pro qua Fontsource | https://github.com/bettergui/BeVietnamPro | OFL, kèm bản sao trong public/licenses |
| Radix Dialog                  | https://github.com/radix-ui/primitives    | MIT                                    |
| React DayPicker               | https://github.com/gpbl/react-day-picker  | MIT                                    |
| date-fns/locale của DayPicker | https://github.com/date-fns/date-fns      | MIT                                    |
| Motion, Lucide                | Các package đã có trong dự án             | MIT, ISC                               |

Không đưa các thư viện bảng/carousel/quản lý form mới vào chỉ để tăng số dependency.
Các phiên bản đã cài được khóa trong package-lock.json.

## Kiểm chứng

| Kiểm tra                            | Kết quả                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Backend typecheck / lint / build    | PASS                                                                       |
| Unit                                | 75/75 PASS                                                                 |
| API / Socket.IO / SMTP              | 207/207 PASS                                                               |
| PostgreSQL constraints / seed       | 22/22 PASS                                                                 |
| Planner lịch                        | 2/2 PASS                                                                   |
| Frontend lint / production build    | PASS, gồm `/phim/[id]`                                                     |
| Playwright full stack               | 35/35 PASS, không skip                                                     |
| Compiled backend smoke              | PASS: giữ ghế → Sandbox → realtime → QR → SMTP → check-in → doanh thu      |
| Smoke cleanup                       | PASS: chỉ dọn process, fixture và Redis namespace thuộc smoke              |
| Read-only programme verifier        | PASS: 48 phòng, 5.012 suất đã lưu, 30 ngày tới, không trùng phòng/giờ      |
| Next.js BFF → NestJS đang chạy      | HTTP 200, `mode=backend`, programme gồm 24 phim / 48 phòng / 4.977 suất mở |
| Kiểm tra trình duyệt ở mobile 390px | 12 trang khách hàng không tràn ngang; không lỗi JavaScript                 |

Tổng **341 ca tự động đạt**, không cộng smoke hoặc các lần chạy lại. Bộ Playwright
giữ các kiểm tra quyền ADMIN, cạnh tranh ghế, Sweetbox, giá nhóm/combo, session,
phát hành QR một lần và soát vé một lần. Các ca giao diện mới kiểm tra cả dữ liệu
UUID thật và điều hướng trực tiếp, không thay API bằng response giả.

Test phát hiện thao tác chọn lại ngày đang chọn không đóng lịch vì DayPicker bỏ
chọn ngày; lịch giờ dùng `required` để giữ ngày hợp lệ và đóng bảng. Hai bài test
điền input ngày cũ đã chuyển sang bấm ngày trong lịch; kiểm tra độ tương phản
4.5:1, bộ lọc phòng/buổi và không tràn mobile vẫn giữ nguyên.

Khi kiểm tra cuối đã sang ngày 24/10 theo giờ Việt Nam, lịch development cũ thiếu
ngày cuối cửa sổ 30 ngày. Khởi động `dev:full` đã chạy seed bổ sung sẵn có: thêm
70 suất ở nhóm phòng cũ và 128 suất ở nhóm phòng mở rộng, không có xung đột. Số
5.012 là toàn bộ bản ghi lịch còn lưu, không đồng nghĩa tất cả đang mở bán. Verifier
đã chạy lại thành công; không xóa suất hoặc đơn cũ để làm kiểm thử đạt.

Ảnh chụp từ frontend cổng 3000 kết nối backend development cổng 4000 thật, sau
khi programme đã tải. Khi chụp riêng section dài, công cụ chụp ẩn header sticky và
skip-link để lớp nổi không che ảnh; mã giao diện thực giữ nguyên.

- [Trang chủ desktop](screenshots/refresh/home-desktop.jpg)
- [Lịch chiếu desktop](screenshots/refresh/schedule-desktop.jpg)
- [Chọn rạp có tìm kiếm](screenshots/refresh/cinema-picker.jpg)
- [Lịch tháng tiếng Việt](screenshots/refresh/calendar-vietnamese.jpg)
- [Trang chi tiết phim](screenshots/refresh/movie-desktop.jpg)
- [Đặt nhanh trên mobile](screenshots/refresh/booking-mobile.jpg)
- [Lịch chiếu trên mobile](screenshots/refresh/schedule-mobile.jpg)
- [Liên hệ và chọn rạp](screenshots/refresh/contact-desktop.jpg)

## Chạy trên máy

Với backend đã được setup theo README và các migration của `41bd6d9` đã áp dụng:

```bash
npm ci
npm --prefix backend run build
npm run dev:full
```

Mở `http://localhost:3000`. Hướng dẫn lần đầu có PostgreSQL/Redis và tạo cấu hình
riêng nằm trong README gốc. Không commit hoặc tải `.env` lên GitHub.

Các nghiệp vụ còn thiếu của LAB04 trong báo cáo trước vẫn chưa được tuyên bố hoàn
tất bởi bản giao diện này: dispute/hoàn tiền, khóa tài khoản, bảo trì từng ghế,
tách nhóm hai hàng và audit các danh mục khác ngoài phim.
