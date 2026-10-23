# NOVA — mở màn & lịch chiếu

Đợt tiếp nối Discovery ngày 23/10/2026. Tham khảo ảnh Cinestar về cách đặt vé nhanh
và ưu đãi khi vào trang; artwork, thương hiệu và chương trình dùng phiên bản NOVA riêng.

## Trải nghiệm

- Trang chủ ưu tiên Inception, ảnh concept thành phố gập khổ rộng, màu xanh/đỏ/vàng,
  trailer, chi tiết phim, đặt vé và các chỉ số lấy từ catalog API.
- Popup đầu phiên có ảnh combo riêng, nút đóng, Escape, bẫy focus, khôi phục focus,
  liên kết bắp nước/đặt vé và tùy chọn ẩn trong ngày theo múi giờ Việt Nam.
  Mỗi phiên trình duyệt tự mở một lần; nút “Ưu đãi mở màn” luôn cho mở lại.
- Thanh đặt vé có bốn select phụ thuộc: rạp → phim → ngày → giờ/phòng.
  Giờ, phòng, UUID và chỗ còn lại lấy từ backend; giữ ghế vẫn xác nhận lại trên server.
- Lịch chiếu lọc phòng, sáng (<12h), chiều (12–17h), tối (17–21h), muộn (từ 21h).
  Mỗi suất ghi giờ, phòng và giá thực từ API.
- Footer có đích thật cho tiêu đề, liên kết hỗ trợ và từng phương thức thanh toán.
  Sáu trang mới: `/gioi-thieu`, `/ho-tro`, `/huong-dan`, `/chinh-sach`, `/lien-he`,
  `/thanh-toan`. FAQ mở nội dung; phương thức thanh toán đồng bộ query URL khi điều hướng.
  Visa/Mastercard/MoMo/ZaloPay là hướng dẫn về phạm vi tích hợp; chỉ Sandbox đang hoạt động.

## Dữ liệu lịch

`backend/scripts/seed-programme.cjs` chạy sau seed cơ bản và Discovery; đã thêm vào
`setup:local`. Chỉ tác động hai rạp mẫu có ID cố định, bổ sung tới ít nhất 8 phòng/rạp.
Mỗi phòng mới có 160 ghế (thường, VIP, Sweetbox), lịch hôm nay và 6 ngày tiếp theo,
bắt đầu từ 09:00–09:30, suất cuối bắt đầu không quá 22:45. Khoảng cách gồm thời lượng
phim và 15 phút dọn phòng; giờ làm tròn lên 15 phút. Không mở suất bắt đầu trong 20 phút tới.
Phim sắp chiếu không được đưa vào lịch bán vé.

Seed dùng ID ổn định, khóa hàng phòng khi xếp lịch, kiểm tra khoảng thời gian đã có,
không sửa/xóa suất hoặc đơn, không đổi sơ đồ phòng có sẵn. Không chạy trong production.
Lần chạy trên development hiện tại thêm **462 suất**, tổng **526 suất / 16 phòng / 2 rạp**.
Chạy lại thêm **0** suất; truy vấn tự nối toàn bộ showtimes theo phòng tìm **0 khoảng chồng**.
Tổng suất sẽ khác theo ngày chạy và dữ liệu đã có.

## Kiểm chứng

Frontend lint và production build được chạy với các trang mới. Playwright bổ sung fixture
phòng thứ hai với bốn suất 09:00/13:00/18:00/22:00 trong PostgreSQL riêng cho test.
Các ca đặt vé cũ vẫn kiểm tra Sweetbox, nhóm, giữ ghế cạnh tranh, Sandbox, QR, quyền và
khôi phục đơn; ca mới kiểm tra popup, điều hướng footer/phương thức và lọc phòng/buổi.
Kết quả thực thi: **22/22 Playwright PASS**, không skip; frontend lint và production
build PASS; backend lint PASS. Seed chạy hai lần trên development xác nhận bổ sung
lần đầu và không tạo trùng lần sau. Kiểm tra trực quan desktop 1440px, mobile 390px
và màn hình thấp 390×600 được lưu trong `screenshots/premiere/`.

Không thay service đặt vé, thời hạn giữ ghế, xử lý tiền, luật ghế lẻ hoặc xác thực.
Giới hạn 27 ca fixture HTTP backend cũ được ghi trong [Discovery](discovery-upgrade.md);
không coi kết quả suite đó là toàn bộ PASS.

## Ảnh kiểm tra

- [Trang chủ desktop](screenshots/premiere/home-desktop.jpg)
- [Ưu đãi mở màn desktop](screenshots/premiere/welcome-desktop.jpg)
- [Lịch chiếu & phòng](screenshots/premiere/schedule-desktop.jpg)
- [Footer điều hướng](screenshots/premiere/footer-desktop.jpg)
- [Hướng dẫn thanh toán](screenshots/premiere/payment-guide-desktop.jpg)
- [Ưu đãi mobile](screenshots/premiere/welcome-mobile.jpg)
- [Trang chủ mobile](screenshots/premiere/home-mobile.jpg)
- [Popup ở màn hình thấp](screenshots/premiere/welcome-small-mobile.jpg)

Không có lỗi JavaScript hoặc tràn ngang trong lượt kiểm tra trực quan trên trang chủ,
đặt vé, hướng dẫn thanh toán và hỗ trợ. Mỗi rạp mẫu hiển thị đủ 8 phòng trong bộ lọc.

Bản rà soát tiếp theo đã sửa fixture 27 ca HTTP cũ và bổ sung kiểm tra mới.
Xem kết quả hiện tại trong [LAB04 booking audit](lab04-booking-audit.md); các bảng trên
là bằng chứng lịch sử tại thời điểm từng đợt, không phải trạng thái kiểm thử mới nhất.
