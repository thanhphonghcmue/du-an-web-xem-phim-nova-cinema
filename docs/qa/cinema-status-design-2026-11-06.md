# Đồng bộ giao diện đặt vé và soát vé theo ảnh — 06/11/2026

Phạm vi: ảnh trang 11, 13–17 và 19–21 cùng yêu cầu trong tệp người dùng gửi. Sửa trực tiếp website đang chạy; không tạo bản thiết kế Figma hay luồng thanh toán giả ở LocalStorage. Source chạy là `frontend/src/`; thư mục `src/` gốc tiếp tục được giữ để tương thích theo cấu trúc hiện có.

## Đối chiếu và bản vá

| Màn hình        | Phần sửa                                                                                                 | Nguồn dữ liệu / hành vi                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 — Trùng ghế  | Modal đỏ có focus, Escape, mã ghế thực; làm mới sơ đồ khi xác nhận                                       | HTTP409 `SEAT_UNAVAILABLE`, `details.seatIds` đối chiếu snapshot. Request giữ ghế vẫn nguyên tử, không giữ một phần                                      |
| Sơ đồ ghế       | Mã hàng/cột trên từng ghế, xanh dương Thường, cam VIP, dấu × ghế SOLD; định dạng màn chiếu từ phòng thật | Không thêm ghế A–J giả; số hàng/cột, giá và trạng thái do API trả về                                                                                     |
| 13 — Xác nhận   | Hai cột, thẻ phương thức dọc, radio và badge TESTING, tổng đỏ, thời hạn xanh                             | Mã phòng/tên rạp/phim/giờ, tiền vé/combo/discount/finalAmount và hạng được lấy từ catalogue + snapshot đơn. Sửa hiển thị `7.000000000000001%` thành `7%` |
| 14 — Gateway    | Modal cyan và QR giao dịch ngay trên website, đồng hồ server, thành công/hủy/thất bại                    | Tái sử dụng URL có chữ ký và endpoint Sandbox cũ. POST không tự replay. Sau POST phải đọc lại đơn của chủ sở hữu, không suy ra PAID từ HTTP200           |
| 15 — Timeout    | Modal cam có đúng mã ghế; đặt lại tại chính sơ đồ đang xem                                               | Chỉ báo giải phóng sau trạng thái EXPIRED từ backend. Giữ nguyên deadline 300 giây và lazy/background expiry                                             |
| 16 — Hủy        | Modal đỏ với mã đơn thật, trang chủ hoặc đặt lại                                                         | Chỉ hiện sau CANCELLED thật. Đặt lại cần giữ ghế mới; không tái sử dụng đơn đã hủy                                                                       |
| 17 — Ví vé      | QR trái/thông tin phải, viền xanh, lịch .ics, mã vé riêng, tìm kiếm và QR phóng to                       | Đơn vừa thanh toán được đưa lên trước banner YOUR NOVA SPACE theo `?ve=bookingId`, không nhân đôi thẻ. Một ghế một vé/QR; giữ vé nhóm cũ                 |
| 19 — Hợp lệ     | Thẻ xanh phía trên banner NOVA STAFF, kiểm tra rồi mới xác nhận                                          | Tên phim, giờ, phòng, ghế, khách/hạng, mã đơn/vé từ STAFF API. Xác nhận thật mới hiện USED                                                               |
| 20 — Sai suất   | Thẻ vàng có cả giờ trên vé và suất nhân viên đang chọn                                                   | Không tự đổi suất để bỏ qua cảnh báo; hướng dẫn tại sảnh không ghi giả một check-in                                                                      |
| 21 — Đã sử dụng | Thẻ đỏ409, giờ check-in và số phút thực                                                                  | Không có giờ mẫu/hardcode. Backend RAM và PostgreSQL đều ưu tiên chặn vé đã dùng. Nút quét tiếp xóa mã cũ, khởi động lại camera khi đang dùng camera     |

Modal lồng nhau được quản lý theo thứ tự: chỉ modal trên cùng xử lý Escape/Tab. Đóng review/gateway không đóng sơ đồ hoặc trả ghế ngoài ý muốn. Lỗi kết nối giữ cổng đang thao tác, có thông báo và mở lại nút; không tự cấp vé.

## Hợp đồng API được giữ

Không đổi tên endpoint, request DTO, chữ ký, giá tiền hoặc database schema:

- `POST /api/v1/bookings/hold`, `GET /bookings/:id`, `POST /bookings/:id/cancel`.
- `POST /api/v1/payments/create-sandbox-url`, `POST /payments/sandbox/complete`.
- `GET /api/v1/tickets/me`, `GET /tickets/:id/calendar` và confirmation/email cũ.
- `POST /api/v1/staff/verify`, `POST /staff/check-in`.

Gateway HTML cũ vẫn dùng được. Client bổ sung khả năng nhận HTML của endpoint cũ nhưng không chèn/chạy HTML đó. UI chỉ nhận kết quả từ owner booking API. Bổ sung trường `membershipTier` trên vé và metadata tối thiểu trong lỗi STAFF (phim/phòng/giờ/mã đơn/mã vé); không trả QR token, email hoặc số điện thoại trong các lỗi này. Public lookup vẫn giữ allowlist không PII.

Các tên `/api/orders/...` trong prompt là ví dụ; không tạo thêm một hệ API song song. `CANCELLED` tiếp tục là trạng thái hủy hiện có. Backend tiếp tục xác thực chữ ký Sandbox theo cơ chế hiện tại; QR vé là token ngẫu nhiên do server cấp, vì vậy UI gọi đúng là “mã xác thực”, không giả nhãn HMAC-SHA256. VietQR/MoMo/VNPAY vẫn được ghi rõ là lựa chọn mô phỏng dùng Sandbox. Không thêm tuyên bố SSL256 hoặc miễn phí hủy trước60 phút khi backend chưa có chính sách đó.

## Kiểm chứng

Các test chỉ dùng database PostgreSQL/Redis test riêng và SMTP cục bộ. Không Docker, không gửi email ra ngoài, không sửa `.env` hay dữ liệu ứng dụng.

- Backend check: **116 unit +254 HTTP/Socket.IO/SMTP**, typecheck, typed lint và build đạt.
- Database/schema/migration: **26 đạt**.
- Root Node/RAM/config/planner: **105 đạt** (gồm kiểm tra signed checkout mới và lỗi soát vé RAM).
- Frontend lint/build đạt; 29 route được build.
- Browser: **114 ca độc lập đã được xác minh qua các lượt chạy**. Lượt đầy đủ111/114; sau sửa, chạy lại6 ca liên quan và đạt6/6 (không cộng trùng các ca chạy lại).
- Smoke `npm run dev:full` tự dùng RAM: **đạt** trên bản sao riêng; đăng nhập HttpOnly, giữ ghế cạnh tranh, Sandbox có chữ ký và QR SVG.
- Tổng **615 ca độc lập**:116 +254 +26 +105 +114; smoke không cộng vào số này.

`tests/cinema-status.spec.mjs` bổ sung:

1. Tóm tắt đơn khớp API; Escape chỉ đóng lớp trên; không kéo dài hạn giữ ghế.
2. Gateway/QR/nút vừa375/768/1440px; hủy giải phóng và giữ lại đúng ghế ngay.
3. Ngắt POST thanh toán: không tự có PAID/QR, nút mở lại và có thể hủy thật.
4. Hết hạn bằng deadline PostgreSQL thật: tên ghế không thành `undefinedundefined`, quay về cùng suất và giữ mới.
5. Snapshot chậm với hai khách: POST trả409 thật, modal đúng mã ghế, bỏ chọn ghế lỗi và tải lại trạng thái thực.

Golden path trong `tests/booking.spec.mjs` tiếp tục kiểm tra hai QR khác nhau, tìm vé, lịch .ics, email, public lookup, sai suất, USED và từng ghế check-in độc lập. Các test cũ được đổi từ chờ navigation/form HTML sang chờ trạng thái UI sau phản hồi backend; không hạ điều kiện nghiệp vụ để hợp thức hóa giao diện.

Lệnh kiểm chứng:

```bash
npm run lint
npm run test:unit
npm run test:backend
npm run test:db
npm run build:frontend
npx playwright test
node scripts/check-fullstack-startup.cjs
```

Cần cấu hình `TEST_DATABASE_URL` và Redis test theo tài liệu backend trước khi chạy các bộ integration. Thư mục ảnh `docs/qa/screenshots/status-2026-11-06/` được chụp từ website với fixture cục bộ, được xóa khi kết thúc test. Không phải hình dựng minh họa. Đây là kiểm chứng chức năng và responsive, không phải cam kết mọi request dưới30ms hay pixel-perfect trên mọi thiết bị.

## Lịch sử kiểm tra và giới hạn đo

Lượt đầy đủ114 browser case đạt111, ba ca cần sửa: hai test hủy đọc trạng thái ngay sau click thay vì đợi POST hoàn tất (luồng mới không còn navigation để chờ ngầm), và một ca Admin phát hiện selector/CSS `.history-list` bị trùng với vị trí thẻ vé nổi mới. Đã tách class của vị trí thẻ nổi, cập nhật chờ kết quả xác nhận và bổ sung kiểm tra thẻ soát vé thực sự nằm trong viewport. Ảnh chụp cũng giúp phát hiện scroll anchoring có thể che thông báo; bản vá chờ layout, chuyển focus vào thẻ và cuộn đến thẻ. Lượt cuối build lại frontend và kiểm tra6 ca đạt6/6: hai nhánh hủy/thất bại, hành trình hai ghế đầy đủ với ba thẻ trong viewport, camera/ngày soát vé, Admin mua vé/báo cáo và review/Escape giữ đúng đơn.

Đo trong lượt browser đầy đủ (môi trường kiểm thử, không phải SLA sản phẩm):

| BFF GET                 | p95 ms | Bytes truyền |
| ----------------------- | -----: | -----------: |
| Movies                  |  673.1 |         2851 |
| Cinemas                 |  576.3 |          778 |
| Programme legacy đầy đủ |  618.7 |       311494 |
| Một sơ đồ ghế           |  339.1 |         1837 |

Mục tiêu mọi API dưới30ms/toàn bộ lịch dưới15KiB **chưa đạt**. Không đổi API, bỏ lịch hoặc giả dữ liệu để làm đẹp số đo. Cập nhật local choice click→DOM đo p50=108ms, p95=120.3ms; số này không phải INP hay độ trễ mạng. Kiểm tra chức năng đạt không được coi là đạt các budget hiệu năng này.

## Ảnh đối chiếu từ website

[11 — Xung đột](screenshots/status-2026-11-06/11-seat-conflict.jpg) · [13 — Xác nhận](screenshots/status-2026-11-06/13-order-review.jpg) · [14 — Sandbox](screenshots/status-2026-11-06/14-sandbox-gateway.jpg) · [15 — Hết hạn](screenshots/status-2026-11-06/15-expired.jpg) · [16 — Hủy](screenshots/status-2026-11-06/16-cancelled.jpg) · [17 — Vé điện tử](screenshots/status-2026-11-06/17-electronic-ticket.jpg) · [19 — Vé hợp lệ](screenshots/status-2026-11-06/19-valid-ticket.jpg) · [20 — Sai suất](screenshots/status-2026-11-06/20-wrong-showtime.jpg) · [21 — Vé đã dùng](screenshots/status-2026-11-06/21-used-ticket.jpg).
