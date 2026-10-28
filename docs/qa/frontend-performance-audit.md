# Kiểm toán frontend và kết nối thật — 28/10/2026

Baseline GitHub: `8f1b044` trên `feat/nova-discovery-ui`, đã fast-forward trước khi sửa. Giữ bản sửa SSR giỏ bắp nước, ảnh dự phòng của hero và các thay đổi từ remote. Không ghi đè nhánh hay thay API thanh toán thành mô phỏng trong trình duyệt.

## Phương pháp và dữ liệu

- `next build --webpack` + `next start`, Chromium hệ thống, viewport 1440×1000, hoạt ảnh bình thường. Số đo không lấy từ thời gian biên dịch `next dev`.
- NestJS thật, PostgreSQL/Redis test riêng, SMTP fixture loopback; fixture sở hữu dữ liệu có prefix riêng và tự dọn sau khi dừng. Bộ kiểm thử DB, HTTP, trình duyệt và benchmark chạy tuần tự khi dùng chung test DB/outbox.
- `scripts/networkBenchmark.js`: 7 mẫu mỗi API đọc qua browser/BFF, 5 mẫu HTTP native; giữ cả mẫu đầu có thể lạnh. TTFB qua browser = từ lúc gọi fetch đến nhận headers; last-byte = đọc xong ArrayBuffer, trước parse JSON. Native HTTP ghi số byte nén thực tế; browser ghi Resource Timing encoded/decoded/transfer riêng. KB trong bảng là KiB (1024 byte).
- Thanh toán đo từ Playwright bắt đầu click tới response body hoàn tất, gồm thời gian actionability/scroll của automation. QR-ready gồm cả khoảng poll 250 ms và thời điểm worker nhận outbox, không phải riêng tốc độ tạo QR.
- `scripts/lib/uiFreezeObserver.js`: PerformanceObserver longtask >50 ms và rAF; cửa sổ khởi động tách khỏi 5 lượt mở/chọn rạp + 3 giây quan sát. Có giới hạn bộ đệm, dọn observer/rAF và bỏ khoảng tab bị ẩn. Chỉ bật trong benchmark, không cài vòng đo nền cho mọi khách hàng.
- FPS là nhịp callback rAF trên Chromium headless của máy này, không phải GPU-presented frames hay cam kết 60 FPS trên mọi máy. Tốc độ mạng chính là loopback; bài CDP 40 ms/10 Mbps là **mô phỏng**, không phải đo Internet thực tế.
- Dữ liệu công khai trong `measurements/` chỉ chứa timing, kích thước, status và kết quả tổng hợp; không có token, mật khẩu, mã QR, URL Sandbox có chữ ký hoặc PII.

## Lỗi đã sửa

1. Trang chủ tạo một Intl formatter mới cho từng suất chiếu mỗi lần render phần hành trình. Trước sửa có long task 388 ms khi chọn rạp. Dùng formatter Vietnam dùng chung + `useMemo`; ghép lịch/rạp bằng Map/Set thay vòng lặp `showtimes × rooms × cinemas`.
2. Bundle ban đầu tải cả soát vé, quản trị, đăng nhập, ví vé và đặt ghế. Chuyển các module chỉ dùng khi mở sang `next/dynamic`, ở cả App và PortalPage.
3. API JSON công khai chưa nén ở cả native và BFF. Native dùng middleware Gzip/Brotli có điều kiện; BFF chuyển tiếp bytes JSON không parse/stringify lần nữa và gzip bất đồng bộ. Không nén token đăng nhập hoặc SSE; giữ nguyên payload/envelope, no-store, timeout và cookie HttpOnly. Kiểm tra cả gzip, identity và JSON giải nén.
4. Production webpack làm kênh Socket.IO của SSE không gửi resync, giao diện chỉ còn polling. Giữ `socket.io-client` thành Node server external, mở stream bằng comment ngay, giới hạn connect/ack 5 giây và dọn socket/heartbeat khi đóng. Chạy lại Sweetbox với xác nhận đồng bộ trực tiếp trên production đã đạt.
5. Bộ chọn rạp có cột khu vực từ dữ liệu thật, cột rạp/địa chỉ/số phòng/định dạng riêng; mobile chuyển vùng thành thanh cuộn. Không tạo các cụm rạp giả để đủ ví dụ trong prompt. Giữ search, bàn phím, focus, optimistic selection và UUID.
6. Thanh ngày thêm Hôm nay/Ngày mai theo múi giờ Việt Nam, viền chọn rõ hơn, empty state có nút ngày kế tiếp. Thẻ suất hiển thị số ghế còn/tổng từ backend và thời điểm snapshot trong tooltip.
7. Thêm `GET /showtimes/capacities?ids=...` (1–50 UUID duy nhất mỗi lô), một truy vấn SQL set-based cho cả lô; không gọi N sơ đồ ghế. Client chỉ nạp các suất trong bộ lọc hiện tại, làm mới sau hold/cancel, khi trở lại tab và mỗi 30 giây; hủy request cũ, không chồng polling. Khi lỗi không bịa số ghế. Adapter RAM cùng hỗ trợ endpoint mới.
8. Thanh tóm tắt đặt vé ghim dưới modal: phim/rạp/suất/ngày, số ghế, tạm tính, tổng từ server sau hold, timer riêng và một nút thao tác chính. Sửa cả trường hợp clock chồng lên tổng ở 320 px. Combo có nút +/−, cập nhật tạm tính ngay. Ghế có vùng bấm tối thiểu 32×32 px kể cả zoom 70%; vẫn kéo ngang xem đủ hàng.
9. Sandbox native tham chiếu ảnh nền tương đối về backend không phục vụ ảnh đó. Dùng nền gradient trang thanh toán để không phát sinh request ảnh 404; không sửa chữ ký, state machine hoặc quy tắc thanh toán.

## Nghiệp vụ và hợp đồng API

- Endpoint capacity mới chỉ trả số đếm, showtimeId và asOf; không lộ ID ghế, owner, đơn hay QR. Lấy số ghế vật lý thật; không tin `room.totalSeats` nếu thiếu sơ đồ.
- Snapshot là read-only: hold quá hạn được chiếu thành trống; PAID/SOLD và booking chứa claim SOLD vẫn được bảo vệ. Hai bài PostgreSQL mới so sánh với seat map cho expired/PAID/mixed claims và đọc khi một writer giữ row lock, không đổi status/updatedAt.
- DB race một ghế/một winner, hold 300 giây theo server, hủy/expiry release, Sweetbox theo cặp, nhóm 20 ghế, chống ghế lẻ, lịch duration +15 phút, payment signed/idempotent, QR thật và staff single-use tiếp tục dùng nghiệp vụ hiện có.
- PrismaModule `@Global` cung cấp một PrismaService mỗi application, với pool/timeout đã giới hạn. Không đổi thành globalThis client dùng chung DB giữa các test application. Schema dùng `rooms.cinema_id`, `showtimes(room_id,start_time)`/movie-time, active `booking_seats(showtime_id,seat_id,status)`, `bookings(status,expired_at)` và ticketHash unique. Những cột `seats.showtime_id/hold_expire_at` trong ví dụ prompt không tồn tại ở mô hình này; không thêm index sai bảng.
- C’MEMBER có chiết khấu theo hạng và cộng điểm khi thanh toán thành công. **API hiện chưa có nghiệp vụ đổi điểm thành tiền**: không tự trừ điểm/giá trong frontend. Tạm tính trước hold ghi rõ chưa áp dụng ưu đãi; tổng sau hold luôn lấy từ server.
- Giữ tự chuyển sang backend RAM theo lựa chọn của người dùng. RAM có nghiệp vụ HTTP thực trong một process, dữ liệu mất khi restart; không được báo là PostgreSQL hoặc dữ liệu bền vững. Khi backend lỗi, không đưa đơn/QR giả vào luồng mua vé thật.

## Số đo trước/sau

Hai lượt đo từ cùng baseline `8f1b044` và bản sửa, cùng Native PostgreSQL17.10/Redis7.4.2, browser/viewport và snapshot **32 phim hoạt động, 7 rạp, 103 phòng, 6.612 suất, 25 combo** của fixture + seed test. Đây là dataset benchmark, khác catalogue development4 rạp/14.011 suất. Đã xác nhận cleanup sau SIGTERM để mỗi lượt không tích thêm dữ liệu. JSON giữ toàn bộ mẫu, không chọn riêng các mẫu nhanh.

| API qua browser/BFF     | n trước/sau | TTFB p50 trước → sau (ms) | Last-byte p50 trước → sau (ms) | Last-byte p95 trước → sau (ms) |
| ----------------------- | ----------: | ------------------------: | -----------------------------: | -----------------------------: |
| UC03 movies             |         7/7 |               21.3 → 21.6 |                    26.9 → 23.1 |                    63.4 → 41.6 |
| UC03 cinemas            |         7/7 |               22.9 → 17.4 |                    23.2 → 18.1 |                    64.3 → 32.7 |
| UC03 programme          |         7/7 |             249.5 → 200.6 |                  270.7 → 217.7 |                  322.3 → 294.3 |
| UC04 seat map           |         8/8 |               28.4 → 23.4 |                    36.0 → 24.0 |                    59.4 → 45.3 |
| UC04 hold               |         5/5 |               42.8 → 37.3 |                    48.8 → 42.7 |                    51.9 → 44.3 |
| UC04 cancel             |         5/5 |               29.6 → 27.0 |                    30.6 → 27.6 |                    55.0 → 55.5 |
| UC05 hold + Party combo |         1/1 |               37.5 → 37.8 |                    37.8 → 38.2 |                    37.8 → 38.2 |
| UC06 create Sandbox     |         1/1 |               33.4 → 28.0 |                    34.0 → 28.4 |                    34.0 → 28.4 |
| UC07 QR poll            |         3/3 |               25.4 → 18.0 |                    25.8 → 23.6 |                    37.7 → 24.1 |
| UC14 verify             |         5/5 |               25.0 → 22.6 |                    25.3 → 22.9 |                    34.2 → 24.3 |
| UC14 check-in           |         1/1 |               36.7 → 35.8 |                    37.1 → 36.2 |                    37.1 → 36.2 |

`n=1` là một lượt nghiệp vụ, không đủ để suy ra phân vị tải thật. Poll QR còn trả trạng thái chờ trước khi vé được phát hành. HTTP4xx trong ma trận staff là kết quả nghiệp vụ mong đợi.

| Payload qua BFF | Trước, wire KiB | Sau, wire KiB | Định dạng sau |
| --------------- | --------------: | ------------: | ------------- |
| UC03 movies     |           21.86 |          3.06 | gzip          |
| UC03 cinemas    |            1.66 |          0.70 | gzip          |
| UC03 programme  |         2154.57 |        279.43 | gzip          |
| UC04 seat map   |            8.85 |          1.97 | gzip          |

Danh mục phim/rạp đạt mục tiêu wire<10KiB; sơ đồ ghế đạt<15KiB. Programme vẫn là snapshot lịch đầy đủ hàng nghìn suất, lớn hơn10KiB; không cắt bỏ suất/ID hoặc trường của API hiện có để làm đẹp số liệu.

| HTTP trực tiếp Nest (không qua browser/BFF) | Last-byte p50 trước → sau (ms) | Wire trước → sau (KiB) | Encoding sau |
| ------------------------------------------- | -----------------------------: | ---------------------: | ------------ |
| UC03 movies                                 |                  10.13 → 10.55 |           21.86 → 2.77 | br           |
| UC03 cinemas                                |                   6.82 → 11.10 |            1.66 → 0.71 | br           |
| UC03 programme                              |                182.54 → 188.74 |       2154.57 → 188.44 | br           |
| UC04 seat map                               |                  10.21 → 14.43 |            8.85 → 1.76 | br           |

Native middleware thương lượng Gzip/Brotli theo Accept-Encoding; BFF dùng gzip cấp4. Không gộp wire body với decoded body hoặc transfer bytes gồm headers.

| UI, cùng5 lượt chọn rạp                  |  Trước |    Sau |
| ---------------------------------------- | -----: | -----: |
| rAF FPS                                  |  34.02 |  47.88 |
| Long tasks >50ms                         |     11 |      7 |
| Tổng thời gian long tasks (ms)           |   2292 |    418 |
| Long task lớn nhất (ms)                  |    388 |     77 |
| Mở/chọn/đóng picker, automation p50 (ms) | 751.34 | 371.93 |

CDP mô phỏng40ms latency/10Mbps: last-byte p50 sau sửa là UC03 movies **48.8ms**, UC03 cinemas **48.7ms**, UC04 seat map **47.6ms**. Không gọi đây là kết quả WAN thực.

Kiểm chứng giá: vé90.000 + Party69.000 − chiết khấu7.950 = **151.050đ** theo server; cộng **15 điểm** một lần. Hold **300 giây**. QR-ready trước/sau **594.74/585.31ms**, gồm worker/poll. Sau sửa **0 runtime/console error**, **0 HTTP lỗi ngoài dự kiến** trong benchmark; trước sửa có2 request ảnh Sandbox404.

**Giới hạn đo:** Chưa đạt60FPS hoặc xóa hết long task>50ms trên Chromium headless của máy này: còn7 long tasks, lớn nhất77ms. Programme p95 vẫn vượt50ms; một số mutation cũng có mẫu vượt50ms. Login Argon2 cần thời gian tính hash, không hạ độ mạnh bảo mật để ép dưới30ms. Dữ liệu đo không đủ để cam kết zero-error/30ms cho toàn bộ hệ thống hoặc mọi máy/mạng.

## Kiểm chứng

**468 bài đạt**:89 backend unit +222 HTTP/Socket.IO +22 PostgreSQL +53 Node/RAM/planner +82 browser production. Typecheck, typed lint, frontend lint và build2 workspace đạt. Sau sửa lifecycle của fixture, chạy lại12 bài browser (alias routes và frontend audit) đạt; dừng cả2 fixture đo bằng SIGTERM và xác nhận không còn movie thuộc lượt chạy.

Hai smoke độc lập đạt: tự fallback RAM→đặt vé→Sandbox→QR thật; backend unavailable trả503, request bị treo được giải phóng khoảng7,6 giây. Ảnh [rạp desktop](screenshots/cinema-regions-desktop.jpg), [rạp320px](screenshots/cinema-regions-mobile.jpg), [summary](screenshots/booking-dock-mobile.jpg), [thanh toán320px](screenshots/payment-mobile.jpg).

## Chạy lại

```bash
npm --prefix backend run check
npm --prefix backend run test:db
node --test scripts/*.test.mjs scripts/memory-contract.test.cjs backend/scripts/advance-programme.test.cjs
npm run lint
npm run build
NOVA_QA_PRODUCTION=1 NOVA_QA_CAPTURE_DIR=docs/qa/screenshots npm test
```

Chạy benchmark sau khi bộ kiểm thử đã dừng, không dùng đồng thời cùng fixture DB:

```bash
NOVA_QA_PRODUCTION=1 node scripts/fullstack-test-server.cjs
# Terminal khác, khi fixture đã sẵn sàng:
node scripts/networkBenchmark.js --label after
# Sau đo: Ctrl+C terminal fixture để dọn đúng dữ liệu của lượt chạy.
```

Trên Windows PowerShell đặt `$env:NOVA_QA_PRODUCTION="1"` trước lệnh tương ứng. Cần hạ tầng test và backend `.env` đã cấu hình theo README; không trỏ các bài ghi dữ liệu vào DB người dùng. Muốn đo baseline phải checkout baseline ở workspace riêng và build lại; chạy `--label before` trên code mới chỉ đổi tên nhãn, không tái tạo code cũ.
