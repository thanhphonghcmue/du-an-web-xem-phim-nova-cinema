# Kiểm toán backend native và cấu trúc thư mục — 28/10/2026

Đã tải commit `8f1b044` của `feat/nova-discovery-ui`, giữ thay đổi logo/nhận diện và cách chia `frontend/`, `backend/`, `docs/`. Hai prompt QA được đối chiếu với code: giữ nghiệp vụ đã tốt, sửa đường dẫn và lỗi có bằng chứng, không chuyển database hoặc viết lại kiến trúc.

## 1. Phân tích yêu cầu

Phạm vi: UC01–UC14 theo `docs/ARCHITECTURE.md`, FR/BR theo LAB03/LAB04, chạy native, bảo toàn request/response hiện có. `docs/requirements/RTM.md` và các báo cáo cũ là lịch sử; kết quả lượt này ghi riêng dưới đây.

Những phần đã có và được giữ:

- PostgreSQL/Prisma + Redis: một PrismaService mỗi Nest application, pool/timeout hữu hạn; không tạo client mỗi request. Không dùng globalThis để chia sẻ nhầm DB giữa các test application.
- Giữ ghế bằng transaction + partial unique active-claim index, Redis lease có owner và lock order; một người thắng201, người còn lại409. Không thay bằng mô hình `seats.showtime_id` không tồn tại trong schema.
- Lazy expiry khi SELECT: overdue HOLDING được chiếu thành AVAILABLE, không chạy UPDATE/sweep đồng bộ ở GET. PAID/SOLD được bảo vệ. Worker/outbox tiếp tục xử lý bền vững khi chạy PostgreSQL.
- Giá tiền Decimal, loại ghế, combo và chiết khấu tính ở server. Client không gửi tổng tiền để server tin theo. Sweetbox giữ nguyên cặp, tối đa20 ghế và20 mỗi combo.
- Payment ký HMAC, kiểm tra owner/amount/deadline, idempotency và state machine. PAID/SOLD và ticket-request outbox commit cùng transaction; mã QR/PNG/email được hoàn tất sau commit với retry.
- Email dùng durable outbox/BullMQ. Không thay cơ chế này bằng Promise fire-and-forget dễ mất email sau crash. SMTP lỗi không rollback đơn đã PAID.
- Kiểm tra lịch theo duration +15 phút, khóa/ràng buộc SQL bảo vệ race; chặn thay đổi cấu trúc/hard-delete dữ liệu đã có lịch sử booking.
- RBAC, HttpOnly cookie BFF, refresh rotation, owner-only ticket, QR opaque hash và soát vé một lần.

Các điểm cần hiểu đúng khi lấy yêu cầu từ prompt:

- C’MEMBER hiện giảm theo hạng **SILVER5%, GOLD7%, DIAMOND10%**, cộng điểm một lần sau SUCCESS. **Chưa có API đổi điểm thành tiền hoặc tỷ lệ quy đổi được duyệt**. Không tự thêm field hoặc trừ giá trong frontend. Hội viên seed có50.000 điểm không đồng nghĩa đã hỗ trợ đổi điểm.
- Số lượng combo0 nghĩa là bỏ item khỏi `comboItems`; gửi item có quantity0 bị400 theo hợp đồng hiện tại. Khoảng1–10 trong prompt nằm trong giới hạn1–20 đang dùng, giữ nguyên20 để không phá UI/test hiện có.
- QR không được tạo bằng localStorage hoặc gán PAID ở browser. Không ép render PNG/email vào transaction dưới10ms rồi đánh đổi tính bền vững.
- Mốc30/50ms và transaction10ms là mục tiêu cần đo, không phải bảo đảm cho mọi API/máy. Programme nhiều nghìn suất là phản hồi lớn, ghi riêng trong bảng hiệu năng.
- Tài liệu có sẵn nhắc các lựa chọn hạ tầng cũ; **các lệnh cài/chạy/seed/kiểm thử của lượt này không gọi Docker/Compose**. Không xóa cấu hình cũ còn có thể được người khác dùng.

## 2. Thiết kế kiểm thử và RTM

| Mã TC    | UC / BR   | API / thành phần                            | Kỹ thuật / bằng chứng                                                                                                                     |
| -------- | --------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TC-BE-01 | UC01      | POST auth/register                          | EP/BVA mật khẩu, email, trùng và race; `auth.e2e-spec.ts`                                                                                 |
| TC-BE-02 | UC02      | auth/login, refresh, logout; users/me       | Token rotation/owner/RBAC, cookie private; auth + browser suites                                                                          |
| TC-BE-03 | UC03      | movies, cinemas, rooms, showtimes/programme | Pagination/filter/horizon, tìm kiếm injection, không nạp toàn bộ ghế; `catalog.e2e-spec.ts`                                               |
| TC-BE-04 | UC03/BR01 | showtimes/capacities; :id/seats             | Đối chiếu số đếm, bounded batch, không chờ row write lock; `seats-realtime.e2e-spec.ts`                                                   |
| TC-BE-05 | UC04/BR01 | bookings/hold                               | Hai request cạnh tranh, một201/một409, active-claim unique; `booking-concurrency.e2e-spec.ts`                                             |
| TC-BE-06 | UC04/BR02 | hold, payment webhook                       | **299/300/301 giây**, transaction PostgreSQL thật với clock service được điều khiển; `payments.e2e-spec.ts`; RAM có clock fixture độc lập |
| TC-BE-07 | UC04/BR04 | bookings/:id/cancel; seat map               | Hủy/quá hạn trả ghế; hold cũ không giải phóng claim của chủ mới; booking/RAM suites                                                       |
| TC-BE-08 | UC05      | bookings/hold, PricingService               | Giá Thường/VIP/Sweetbox, Party69K, server Decimal, từ chối field tổng tiền lạ                                                             |
| TC-BE-09 | UC05      | comboItems                                  | EP/BVA quantity0/âm/1/20/21/phân số/null/ID lặp; DTO và booking suites                                                                    |
| TC-BE-10 | UC05/UC06 | users/me; webhook                           | Hạng ưu đãi và tích điểm chỉ một lần, overflow rollback; **đổi điểm thành tiền chưa có API**                                              |
| TC-BE-11 | UC06      | create-sandbox-url; webhook; status         | Decision table: signed/owner/deadline/amount, SUCCESS/FAILED/CANCELLED, duplicate/conflicting callbacks                                   |
| TC-BE-12 | UC06/BR04 | Booking/Payment/BookingSeat/outbox          | State transition: chỉ HOLDING→PAID/SOLD; không EXPIRED→PAID hoặc SOLD→AVAILABLE                                                           |
| TC-BE-13 | UC07      | tickets/me, tickets/:id                     | QR thật, decode PNG đúng opaque hash, unique một vé/booking, private owner; `tickets.e2e-spec.ts`                                         |
| TC-BE-14 | UC08      | FulfillmentRelay, email outbox, SMTP        | SMTP loopback thật, lỗi/retry, không rollback PAID, ack SMTP không có nghĩa inbox đã nhận                                                 |
| TC-BE-15 | UC09      | :id/group-seat-suggestion                   | Nhóm1–20, liền hàng, tránh sold/holding, Sweetbox chẵn; group-seats + realtime suites                                                     |
| TC-BE-16 | UC10      | tickets/:id/calendar                        | ICS UTC/escaping/owner, không lộ QR hoặc dữ liệu riêng                                                                                    |
| TC-BE-17 | UC11      | movies CRUD                                 | Quyền ADMIN, tên phim Unicode/case/whitespace, duration locked khi đã có lịch                                                             |
| TC-BE-18 | UC12      | rooms/seats/generate                        | Sức chứa/sơ đồ/loại ghế, chặn sửa cấu trúc và xóa khi có tham chiếu; catalog + browser admin                                              |
| TC-BE-19 | UC13/BR03 | showtimes CRUD                              | **14/15/16 phút** dọn phòng, overlap shapes, concurrent create/update và FK locks                                                         |
| TC-BE-20 | UC14      | staff/verify; staff/check-in                | Bảng quyết định4 tình huống, read-only preview và concurrent conditional consume; tickets + browser staff                                 |

Bảng quyết định soát vé:

| QR / suất / trạng thái                          | Kết quả                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vé hợp lệ, đúng suất, trong cửa soát, chưa dùng | verify200 chưa consume; check-in200 đánh dấu đã dùng                                                  |
| Hash đúng định dạng nhưng không tìm thấy        | 404, không cập nhật vé                                                                                |
| Vé không khớp suất/ngày được chọn               | 409, không consume; ngày trong UI xác định danh sách showtime, server kiểm tra UUID suất và thời gian |
| Vé đã dùng / quét đồng thời                     | 409 cho lần sau; chỉ một request check-in thành công                                                  |

State transition đã kiểm tra: AVAILABLE→HOLDING→SOLD khi PAID; HOLDING→AVAILABLE khi hủy/FAILED/CANCELLED/EXPIRED. Payment ở giây299 được chấp nhận; đúng300 và301 bị từ chối, ghế được giải phóng. Khoảng thời gian giữ là nửa mở `[createdAt, expiredAt)`.

## 3. Môi trường native và test data

- PostgreSQL **17.10**, Redis **7.4.2**, Node24; chạy bằng process native, không container. PostgreSQL loopback55434, Redis loopback6382. Database development/test khác tên, test có hậu tố `_test`; Redis test DB/prefix riêng. SMTP dùng fixture loopback tự sở hữu.
- PostgreSQL cần **UTF8** và LC_CTYPE Unicode xử lý chữ Việt (lượt này `C.utf8`). Chỉ UTF8 với LC_CTYPE=`C` chưa đủ cho lower-case tên phim tiếng Việt. Seed có preflight để dừng sớm nếu cấu hình không đáp ứng; không tự đổi collation/xóa DB đang có.
- Native PostgreSQL seed tạo **24 phim, 4 rạp, 160 phòng, 14.011 suất, 24 món/combo** tại thời điểm đo. Số lượng suất phụ thuộc ngày chạy; lưu evidence tại `measurements/native-seed.json`.
- Có4 tài khoản `.vn` theo prompt: customer, cmember, staff, admin. Hội viên khởi tạo50.000 điểm. Giữ các tài khoản `.local` hiện có. Password lấy từ cấu hình development riêng.
- Đã chạy lại base seed sau khi sửa điểm một hội viên mẫu; seed giữ nguyên điểm đã chỉnh, không reset người dùng hiện có.
- Backend RAM vẫn tự được chọn ở startup khi PostgreSQL chưa cấu hình/lỗi theo lựa chọn trước của người dùng. Có dữ liệu/hold/payment/QR thực trong process; reset sau restart, không được gọi là dữ liệu SQL bền vững.

## 4. Thực thi kiểm thử

**468 bài đạt**, gồm89 backend unit,222 HTTP/Socket.IO,22 PostgreSQL,53 Node/RAM/planner và82 browser production. Typecheck, typed lint, frontend lint và build cả2 workspace đạt. Chạy lại12 bài browser sau sửa cleanup fixture cũng đạt; không tính lặp vào tổng468. Hai smoke riêng xác nhận fallback RAM→hold→signed Sandbox→QR và backend unavailable503/timeout khoảng7,6 giây.

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

Ảnh responsive và mã đo ở [báo cáo frontend](frontend-performance-audit.md).

Các test PostgreSQL/HTTP/browser/benchmark chạy tuần tự khi dùng chung TEST_DATABASE/outbox. Node/RAM tests dùng process riêng. Không đổi rate limit, không bỏ test hoặc sửa assertion để biến lỗi thành PASS.

## 5. Bug log và sửa chữa

| Bug     | Mức độ | File/vị trí                                 | Nguyên nhân                                                                        | Kết quả                                                                                           |
| ------- | ------ | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| BE-N01  | High   | `backend/standalone-server.cjs`, presale    | Hai giờ trong cùng phòng/ngày/side dùng cùng ID, Map làm mất một suất              | Thêm slot vào ID; test toàn bộ quan hệ/dedup của seed bắt lỗi này và đã sửa                       |
| MONO-01 | High   | root package scripts, test fixture          | Hai frontend cùng tồn tại; lệnh root/test đọc source cũ                            | Khởi chạy/build/lint/test dùng `frontend/`; giữ root copy tương thích, không xóa code/ảnh đang có |
| MONO-02 | High   | frontend route aliases                      | Các trang truyền initialView nhưng CinemaExperience bỏ qua, vào sai màn hình       | Redirect6 route về luồng canonical, giữ query/hash và quyền truy cập; test browser riêng          |
| MONO-03 | Medium | `backend/scripts/migrate-test-database.cjs` | Prisma CLI hardcode backend/node_modules, npm workspace hoist làm mất đường dẫn đó | `require.resolve` theo Node resolution                                                            |
| MONO-04 | Medium | Node/QR tests, script smoke                 | Import source/ảnh ở root và PNG decoder hardcode backend/node_modules              | Test đúng frontend đang chạy; resolve dependency qua package backend                              |
| ENV-01  | Medium | Native seed preflight                       | SQL_ASCII không normalize Unicode; UTF8 với C locale không fold chữ Việt           | Kiểm tra UTF8/Unicode locale trước seed; hướng dẫn native rõ ràng                                 |
| QA-01   | Medium | payment outbox retry test                   | Giả định1 flush xử lý hết backlog dù relay giới hạn20 event                        | Chờ bounded cho đúng event của booking được thử, giữ nguyên production batch/retry                |
| RUN-01  | Medium | setup-local/dev-fullstack                   | Setup gọi Compose, launcher probe cứng55432 thay vì URL cấu hình                   | Setup/seed native; probe host/port của DATABASE_URL, giữ fallback được yêu cầu                    |

Các sửa frontend từ lượt trước được chuyển đúng vào frontend: memo ngày/Map catalogue, gzip không đổi JSON, SSE production Node transport, capacity batch thật, vùng bấm32px, summary/timer/payment không chồng lấn. Chi tiết và ảnh ở [báo cáo frontend](frontend-performance-audit.md).

## 6. Hướng dẫn chạy và sign-off

Từ thư mục gốc trên Windows PowerShell, với Node24:

```powershell
npm install
npm run seed
npm run dev
```

Mở `http://localhost:3000`. Fresh clone chưa có DATABASE_URL dùng backend RAM native; seed thông báo rõ chế độ này. Nếu máy có `.env` cũ và muốn chủ động chạy RAM, đặt `$env:NOVA_BACKEND_MODE="memory"` trước hai lệnh cuối. Root launcher chạy frontend/ và API4000 cùng nhau; `dev:frontend`/`dev:backend` dành cho chạy riêng.

Với PostgreSQL/Redis native đã cài, tạo database UTF8/Unicode và `backend/.env` từ ví dụ, điền URL/Redis/SEED_DEMO_PASSWORD riêng rồi chạy `npm run setup:local`. Helper tạo khóa auth/Sandbox còn thiếu, generate Prisma, migrate/seed additive và build backend. Database lỗi không được báo thành seed SQL thành công. Không cần đổi sang SQLite/WAL vì dự án đang dùng PostgreSQL.

Kiểm tra lại:

```bash
npm run test:unit
npm run test:backend
npm run test:db
npm run lint
npm run build
# Cần TEST_DATABASE_URL/Redis test riêng đã migrate:
NOVA_QA_PRODUCTION=1 npm test
node scripts/check-fullstack-startup.cjs
```

PowerShell dùng `$env:NOVA_QA_PRODUCTION="1"; npm test`. Các lệnh test/build tự generate Prisma/build backend khi cần; frontend production cần được build trước. Mật khẩu, `.env`, runtime fixtures và QR capability không được commit. Sign-off chỉ áp dụng cho các tình huống đã chạy; không suy ra bảo đảm zero-error hoặc30ms trên mọi máy/mạng.
