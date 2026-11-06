# Khởi động và phục hồi kết nối frontend–backend — 06/11/2026

Ảnh báo `Máy chủ chưa phản hồi trong 8 giây` là lỗi deadline của request, không
đủ để khẳng định riêng PostgreSQL bị hỏng. Người dùng xác nhận chạy đúng
`npm run dev` / `npm run dev:full` trên Windows. Kiểm tra dưới đây dùng Node 24,
Next production/dev, PostgreSQL và Redis native; không dùng Docker và không ghi
test vào database ứng dụng.

## Những điểm đã sửa

| Điểm nghẽn                                                       | Thay đổi và kiểm chứng                                                                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chỉ dò PostgreSQL rồi chạy Nest khi Redis chưa hoạt động         | Dò cả hai cổng trước seed/build. Redis không sẵn sàng chọn RAM dự phòng đã được người dùng chấp thuận, không chờ frontend gọi API rồi lỗi.                                              |
| Nest thoát do Redis/auth/cấu hình sau bước dò cổng               | Backend chưa được coi là hoạt động cho tới khi health OK. Nếu khởi động thất bại, dừng đúng tiến trình do launcher tạo rồi khởi động RAM; frontend chỉ mở sau readiness.                |
| Frontend cũ vẫn chiếm cổng, lệnh mới chạy một phần rồi dừng      | Kiểm tra cả cổng API/web trước seed. Báo tên/cổng rõ, không kết nối nhầm tiến trình hoặc tự giết dịch vụ khác.                                                                          |
| API Next dev còn biên dịch ở lần gọi đầu                         | Launcher gọi health qua BFF để làm nóng route trước thông báo sẵn sàng. Đọc manifest được phục hồi một lần khi request đầu timeout, vẫn trong deadline catalogue 25 giây.               |
| Một lỗi catalogue xuất hiện cả banner và toast                   | Giữ banner có nút thử lại; bỏ toast trùng cho thao tác tải catalogue. Không giấu lỗi thật và không thay bằng lịch giả.                                                                  |
| Mất kết nối chỉ hiện thông báo chung                             | BFF giữ status 503/code cũ, bổ sung hướng dẫn chạy fullstack từ root. Không đổi request/response model nghiệp vụ.                                                                       |
| Nhánh code nhóm mới có giờ/tên/ghế ví dụ trong thông báo soát vé | Giữ màu đỏ/vàng/xanh, email mới và dữ liệu thật. Không gán tên khách, ghế, thời gian hay HTTP status bịa khi dữ liệu thiếu. Giữ cảnh báo sai suất; không tự chuyển suất để bỏ kiểm tra. |
| Nút hướng dẫn tại cửa dùng alert “đã ghi nhận”                   | Thay bằng hướng dẫn inline, không khóa trình duyệt hoặc tuyên bố đã lưu nghiệp vụ. Chỉ nút check-in qua API mới đổi USED.                                                               |

Test thao tác chuột còn phát hiện toast lỗi nằm dưới backdrop hộp đăng nhập
(z-index 250 so với 1700), khiến nút đóng không bấm được. Đã đưa toast lên 2000,
giữ thời hạn tự ẩn và thông báo lỗi trong form.

Chỉ fallback RAM **ở startup**, không tự thay SQL đang phục vụ bằng một kho RAM
trống giữa phiên. RAM là dữ liệu theo phiên, reset khi khởi động lại. QR từng ghế,
PAID/SOLD, giá tính tại backend, quyền sở hữu vé và check-in nguyên tử vẫn giữ.
Các lệnh ghi vẫn có deadline 8 giây; không tự thanh toán lại khi timeout.

## Tái hiện lỗi và kiểm chứng

- Test orchestration loopback: native OK, native thoát lúc khởi động, Redis đóng,
  explicit memory với cấu hình SQL placeholder, web cũ chiếm cổng. Đây là test
  launcher, không được tính là bằng chứng SQL.
- Test browser cố ý giữ response manifest đầu 8,5 giây: request đầu quá hạn,
  request thứ hai lấy dữ liệu API thật thành công, không banner/toast trùng.
- Test browser 503: không có suất bịa, lỗi vẫn hiện; nút thử lại phục hồi lịch từ
  API thật. Không tăng rate limit hoặc chuyển request ghi thành thành công giả.
- Smoke Next dev/BFF với upstream không hoạt động và upstream không gửi header:
  HTTP 503, trả quyền điều khiển trong khoảng 7,5 giây, không crash browser.
- Native HTTP/SMTP/Socket.IO, schema/migration và browser hồi quy được chạy riêng
  trên database test/Redis test. Không cộng các lần chạy lại vào số ca riêng biệt.

## Kết quả xác minh

| Phạm vi                                    | Kết quả                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Backend unit                               | 116 đạt                                                                          |
| Native HTTP/Socket.IO/SMTP                 | 254 đạt                                                                          |
| Database/schema/migration                  | 26 đạt                                                                           |
| Node/RAM/config/planner, gồm 5 ca launcher | 102 đạt                                                                          |
| Chromium production                        | 109 ca riêng biệt được xác minh                                                  |
| Typecheck, lint và build hai đầu           | Đạt                                                                              |
| Native compiled smoke                      | Đạt: khởi động lại tiến trình vẫn giữ PAID/SOLD, QR và check-in trong PostgreSQL |
| RAM fullstack/dev smoke                    | Đạt: 24 món, đăng nhập, tranh ghế, Sandbox và QR qua BFF thật                    |
| Upstream không phản hồi                    | 503 sau khoảng 7.535ms; UI không crash, không sinh thành công giả                |

Tổng **607 ca riêng biệt**, không cộng smoke hay lần chạy lại. Lượt browser toàn
bộ đạt 108/109: ca cũ còn đòi toast cho lỗi catalogue, trong khi bản sửa dùng một
banner. Khi cập nhật ca này để kiểm tra cả lỗi đăng nhập, thao tác chuột phát hiện
toast thực sự bị backdrop che; đã sửa CSS và chạy lại. Ca mới cùng hai ca phục hồi
kết nối đều đạt (3/3). Không bỏ test hoặc nới assertion để che lỗi.

Đo BFF trong lượt hồi quy: p95 phim khoảng 325ms, rạp 23ms, lịch đầy đủ 555ms,
sơ đồ ghế 51ms. Đây là môi trường test loopback, không phải SLA trên Windows.
Budget mọi API dưới 30ms hoặc toàn lịch dưới 15KiB **chưa đạt**; payload lịch
legacy đầy đủ khoảng 304KiB sau nén. Bản vá tập trung vào readiness, phục hồi,
loại lỗi giả lúc biên dịch và lỗi UI chặn thao tác; không tuyên bố mọi tình huống
mạng đều hết lỗi.

## Chạy trên Windows sau khi lấy đúng nhánh mới

Đóng các terminal NOVA cũ bằng Ctrl+C, rồi mở PowerShell tại thư mục repository:

```powershell
npm ci
npm run dev:full
```

Đợi dòng `[NOVA] Frontend và API đã sẵn sàng: http://localhost:3000`, rồi tải lại
tab web. Nếu báo cổng bận, dừng đúng phiên NOVA cũ hoặc chọn hai cổng còn trống bằng
`NOVA_API_PORT`/`NOVA_WEB_PORT`; không chạy thêm nhiều bản cùng lúc. Nếu có cấu hình
PostgreSQL/Redis, dùng nguyên cấu hình hợp lệ của máy, không sao chép secrets của
môi trường test. Khi launcher báo RAM, dữ liệu SQL cũ không bị xóa nhưng không nằm
trong kho demo RAM.

Chưa có log hoặc quyền điều khiển máy Windows của người dùng; đây là các lỗi đã
tái hiện và vá trong code, không phải xác nhận đã sửa cấu hình trực tiếp trên máy đó.

## Bàn giao

Đã push code đã kiểm chứng lên **remote main** tại `e79fcf7`. Nhánh chính chứa
cả QR từng ghế và các sửa lỗi kết nối trên, đã ghép thay đổi của nhóm đến `987a318`.
Các thông báo chặn push main ngày 05/11 trong báo cáo trước là lịch sử; lần bàn
giao này push main thành công, không force-push. Cập nhật code giữ nguyên
`backend/.env` của máy, rồi chạy lại `npm run dev:full`.
