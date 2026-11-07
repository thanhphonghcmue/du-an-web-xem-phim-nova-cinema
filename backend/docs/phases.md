# Kế hoạch triển khai backend

Nguồn: SUPER PROMPT MASTER BACKEND. Không gộp phase hoặc tự chuyển phase. Sau mỗi phase hoàn chỉnh: kiểm tra, ghi evidence, commit và push theo quyền đã cấp; dừng chờ người dùng yêu cầu phase tiếp theo.

| Phase | Kết quả                                                                                           | Phụ thuộc và kiểm chứng                                                            |
| ----- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0     | ADR, project NestJS/TypeScript strict, config bootstrap, unit/HTTP tests                          | Node/npm; không DB/Redis; `npm run check`, HTTP production                         |
| 1     | Prisma schema UUID/Decimal/timestamptz; initial migration + partial unique + exclusion; seed hash | Phase 0; PostgreSQL; validate/migrate/seed thật                                    |
| 2     | Prisma/Redis/BullMQ/config, validation, global response/error envelope, Swagger, health/security  | Phase 1; DB/Redis hoạt động; health và API DTO reject                              |
| 3     | auth/users/RBAC/tiers, rotating hashed refresh token                                              | Phase 2; auth/role/error/duplicate/rotation tests                                  |
| 4     | movies/cinemas/rooms/seats CRUD + pagination/filter                                               | Phase 3; foreign-key/role/validation tests                                         |
| 5     | create/update showtime + duration/15min, BR03                                                     | Phase 4; TC-02 conflict/boundary + concurrent create                               |
| 6     | pricing/discount, snapshot, hold/release/expiry, locks/outbox                                     | Phase 5; TC-01 real concurrent requests, timeout/cancel/foreign-room/future checks |
| 7     | gateway /seats + room join, capacity map/group sliding window                                     | Phase 6; namespace/events after commit + suggestion tests                          |
| 8     | signed Sandbox URL/webhook/status, payment idempotency/state machine                              | Phase 7; TC-04; TC-03 paid/sold/points/events; ticket event outbox                 |
| 9     | one QR per booking PAID, notification SMTP/retry, staff atomic check-in + optional ICS            | Phase 8; TC-05 + TC-03 ticket existence/duplicate completion                       |
| 10    | admin revenue aggregation/filter/index                                                            | Phase 9; only PAID/role/Decimal aggregate tests                                    |
| 11    | TC01–05 hoàn chỉnh, unit/service/guard/integration/e2e                                            | Phase 10; test DB/Redis riêng, không mock concurrency guarantees                   |
| 12    | Docker/Compose non-root + healthy dependencies/volumes, README/Swagger final                      | Phase 11; fresh install/migrate/seed/compose and acceptance checklist              |

## Trạng thái hiện tại

Phase0–10 đã triển khai và kiểm chứng. Phase10 thêm ADMIN revenue report theo ngày tạo booking, lọc cinema/movie, chỉ PAID và Decimal snapshot aggregation. `npm run check`:66 unit +192 HTTP/Socket.IO tests, typecheck/lint/build pass; `test:db`:22 PostgreSQL tests. Tổng280 tests; compiled production booking/payment→QR→SMTP→check-in→ADMIN report smoke pass. TC-01–TC-05 hoàn tất; Phase11–12 chưa triển khai. Evidence validation-phase-1.md đến validation-phase-10.md.

## Phase 2 đã triển khai

Database/Redis local và test có credentials, ports, volumes và BullMQ prefixes tách riêng. Test HTTP cưỡng bức dùng test DB/Redis. Health kiểm tra PostgreSQL SELECT 1, Redis PING và job probe được worker xử lý; 503 trả component state an toàn, còn liveness độc lập. Rate limiter Redis atomic Lua fail-closed khi storage lỗi. README có cài đặt/chạy/test commands. Auth/RBAC hiện có ở Phase 3; CRUD/booking tiếp tục ở phase sau.

## Phase 3 đã triển khai

API đăng ký/login/refresh/logout, GET/PATCH hồ sơ và GET membership đã chạy. Mandatory signing secrets được tạo riêng bằng `npm run auth:configure`; hash-only refresh sessions sử dụng schema hiện có, không cần migration mới. Concurrent registration có 1 winner; concurrent refresh 5 request có 1 winner; lỗi insert successor rollback revoke cũ. JWT access giữ thời hạn ngắn; logout chỉ revoke refresh được gửi lên, các phiên khác độc lập. Role lấy từ DB và profile không cho sửa role/tier/points.

## Phase 4 đã triển khai

Movies/Cinemas/Rooms/Seats có CRUD/pagination/filter và OpenAPI. GET public, mọi mutation ADMIN-only. Generate seats trên empty room, server Decimal multipliers, room.totalSeats derived, PostgreSQL row lock/transaction bảo vệ count và concurrent generate. Movie duration, room structural fields và seat layout bị khóa khi có showtimes tham chiếu; deletes không cascade lịch sử. Test thực concurrent duplicate room, seat coordinates, generation, capacity và in-flight showtime FK. Không cần migration/schema/dependency mới. Dừng và chờ `TIẾP TỤC PHASE 5`.

## Phase 5 đã triển khai

Showtime CRUD public reads/ADMIN writes. EndTime tính server từ locked movie duration+15 phút; service overlap check exclude self và GiST exclusion `[)` cùng bảo vệ schedule. Khóa movie IDs sorted → room IDs sorted → showtime, reload/retry snapshot đổi parents và bounded transaction conflicts. Price fixed2 Decimal strings, validation timezone/millisecond precision, filters movie/cinema/room/Vietnam day, stable pagination. Có booking bất kỳ trạng thái nào thì chặn sửa/xóa; no-op PATCH được giữ nguyên.

TC-02 qua API: 10:00–12:15 chặn12:00, cho phép12:15. Năm concurrent creates một201/bốn409; concurrent updates một200/một409, independent patches không mất dữ liệu, concurrent room moves retry đúng. Movie-duration và in-flight booking FK locks được kiểm tra qua actual PostgreSQL lock waits. Không cần migration/schema/dependency/env mới. Dừng và chờ `TIẾP TỤC PHASE 6`.

## Phase 6 đã triển khai

POST hold, GET own detail/list, POST owner cancel và3 combo catalog operations. Decimal BR05 snapshot, fixed DB-clock hold300000ms, 1–20 room-bound seats, optional per-user Idempotency-Key với hash body canonical. Redis owner-token10s mutex/all-or-none Lua; DB transaction + partial unique bảo vệ ngay khi bypass Redis. Cancel/expiry nguyên tử, giữ AVAILABLE history, PAID/SOLD không bị release. Outbox poll1s/lease30s, stable delayed job ID, real worker early-job reschedule/idempotent; lazy expiry và batch100 sweep mỗi5s/startup phục hồi lost jobs. Domain events durable chờ Phase7, chưa broadcast.

Migration thêm nullable snapshot/idempotency columns/CHECK/unique, giữ14 models và SQL constraints cũ. Không đổi dependencies/secrets/env. TC-01 gồm2 instances cùng giữ1 ghế, đúng1 success/1 conflict và1 active ownership; additional DB-bypass race, overlapping sets, repeated hold/cancel/expiry, queue failure/stale lease/lost job, SQL lock waits và rollback đều pass. Chưa làm payment/webhook/ticket/group/seat-map. Dừng và chờ `TIẾP TỤC PHASE 7`.

## Phase 7 đã triển khai

Public GET seat-map/capacity và group suggestion1–20; cùng snapshot REPEATABLE READ, DB-clock expiry/lazy cleanup, Decimal price. Sliding windows cùng row/cột liên tiếp, strict optional type, ưu tiên center rồi row/column, O(S logS+S+N). Gateway /seats cho public read-only, existing showtime validation, one room/socket, Origin/payload/Redis rate limits. Outbox committed events publish qua shared Redis Pub/Sub, fenced lease/retry/stable event IDs; client resync từ API khi reconnect/duplicate/out-of-order events. Không hứa exactly-once hoặc offline replay. Readiness thêm realtime.

16 HTTP/Socket.IO cases trên2 API instances +Redis/PG thật,11 unit group cases, thực tế kill/reconnect đúng owned subscribers, precommit/rollback isolation, publish/ack failure và stale lease. Production smoke mở Socket.IO client và nhận automatic hold/cancel/expiry events. Không migration/env/runtime dependency mới; dev socket.io-client4.8.4 được khóa cùng lockfile. Dừng và chờ `TIẾP TỤC PHASE 8`.

## Phase 8 đã triển khai

Ba payment APIs create-sandbox-url/webhook/owner status, cùng signed HTML Sandbox simulator; không thu tiền thật và không yêu cầu tài khoản cổng thanh toán ngoài. HMAC-SHA512 canonical JSON arrays, checkout.v1/webhook.v1 riêng miền, timing-safe verification, amount snapshot fixed2, transaction binding, timestamp window và return-origin allowlist. Một sandbox attempt được replay dưới booking lock, không gia hạn hold. SUCCESS commit PAID/SOLD/SUCCESS + Decimal points floor(final×0.10/1000) +seat_sold/ticket-request/expiry-cancel outbox. FAILED/CANCELLED trả ghế nguyên tử; terminal outcome trùng no-op, mâu thuẫn409; late success không hồi sinh booking/ownership. Redis/queue lỗi sau commit có durable retry.

28 integration cases dùng2 API instances, PostgreSQL/Redis/Socket.IO/BullMQ thật: concurrent duplicate/create/terminal callbacks, cancel/expiry/member lock races, rollback/precommit visibility và queue cancellation retry. Thêm9 signature/points unit cases +1 config case. Không schema/migration/dependency mới; secret bắt buộc riêng được cấu hình bằng payment:configure. TC-03 ticket existence hoàn thiện Phase9, hiện duy nhất durable booking.ticket.requested và chưa ack giả. Dừng và chờ `TIẾP TỤC PHASE 9`.

## Phase 9 đã triển khai

Consumer booking.ticket.requested chỉ tạo ETicket khi PAID và toàn bộ child seats SOLD; booking row lock +unique constraints giữ1 ticket/hash/QR và1 email request ngay khi concurrent/retry. QR PNG encode crypto.randomBytes32 hex, không PII; GET owner tickets/me, tickets/:id và optional private ICS. SMTP qua Nodemailer/BullMQ, DB outbox processedAt chỉ sau SMTP acceptance, lease/fencing/backoff/lost-queue recovery; không rollback payment/ticket khi SMTP lỗi. Stable Message-ID hỗ trợ dedup nhưng SMTP không exactly-once: accepted-before-DB-ack crash có thể gửi lại thư cùng QR. Check-in STAFF/ADMIN kiểm tra DB role/PAID/SOLD/configurable UTC window, conditional update false→true có1 winner khi6 scans qua2 instances.

27 integration cases với PG/Redis/BullMQ/SMTP thật và2 API instances;7 unit cases cho config/window boundaries. Compiled production verify automatic payment→one QR→actual MIME/PNG/ICS→owner APIs→concurrent staff check-in, cleanup owned fixtures. Mailpit localhost SMTP1025/inbox8025 có compose riêng và image pin digest. Không migration/schema/runtime dependency mới;3 dev deps để decode QR thật trong tests/smoke. Dừng và chờ `TIẾP TỤC PHASE 10`.

## Phase 10 đã triển khai

GET /api/v1/admin/reports/revenue chỉ ADMIN với current DB role. Required from/to strict real YYYY-MM-DD, inclusive Vietnam calendar days, áp dụng Booking.createdAt; optional UUID cinemaId/movieId AND. PAID-only, SUM bốn booking money snapshots thành Decimal fixed2 strings, COUNT bookings và SOLD BookingSeat rows (không đếm QR). Một parameterized SQL/materialized CTE statement giữ MVCC snapshot, không nhân money khi có nhiều seat/combo/payment. Unknown valid IDs trả0; validation400, anonymous401, CUSTOMER/STAFF403, internal errors masked500.

5 unit và19 integration cases mới gồm calendar/leap/boundaries năm0001–9999, current role, filter combinations, immutable history, no fan-out, exact cents,10.000 rows/tổng9999999999999900.00, precommit/rollback và Swagger. Kiểm tra existing composite booking index/seat index bằng catalog và transaction-local forced EXPLAIN; chứng minh eligibility, không benchmark production. Không migration/schema/index/dependency/env mới. Full280 tests và production smoke pass: real Sandbox payment/QR/SMTP/check-in rồi filtered ADMIN report đúng1 paid booking/2SOLD, các hold cancel/expire bị loại. Dừng và chờ `TIẾP TỤC PHASE 11`.

## Bản sửa full-stack sau audit (15/10/2026)

Theo yêu cầu kiểm tra/sửa và chạy web liên tục: kết nối frontend qua same-origin
Next BFF với API hiện có, giữ cookies HttpOnly, giá và QR từ backend. Sweetbox
resolve cặp cùng hàng/cột lẻ-chẵn nguyên tử, giới hạn20 sau resolve; ENDED không
nhận lịch mới hoặc hold mới. Không schema/migration mới. Bằng chứng và phần còn
thiếu: [báo cáo full-stack](../../docs/fullstack-verification.md). Không tự đánh
dấu hoàn thành các phase domain mở rộng trong master roadmap.

## Bản rà soát giao diện & API LAB04 (23/10/2026)

Theo yêu cầu chọn phần phù hợp trong prompt tham khảo và kiểm tra kết nối frontend:
đã bổ sung preview email chỉ chủ vé, xác minh QR chỉ đọc theo suất và bước xác nhận
check-in, lời nhắc `.ics`, sửa gợi ý nhóm để tuân thủ luật ghế lẻ. Bảo toàn schema,
DB/Redis/outbox và giữ chỗ 300 giây; không đánh dấu Phase11–12 đã triển khai.
Fixture cũ gây 27 lỗi HTTP đã sửa để tuân thủ luật ghế lẻ, không nới luật hoặc bỏ test.
Kết quả: 75 unit, 197 HTTP/Socket.IO/SMTP, 22 DB và 24 Playwright PASS; lint/typecheck,
build hai package và compiled production smoke PASS. Evidence và phạm vi còn lại:
[LAB04 booking audit](../../docs/design/lab04-booking-audit.md).

## Mở rộng lịch & độ dễ đọc (23/10/2026)

Theo yêu cầu tiếp tục: thêm public programme snapshot giới hạn 60 ngày để tải lịch
không chạm rate limit do nhiều trang; giữ pagination100, DB/RBAC/Decimal và booking
state machine. Seed additive 30 ngày, phòng và suất COMING_SOON theo ngày dự kiến;
frontend mở luồng đặt trước theo suất thực. Không đánh dấu Phase11–12 hoàn tất.
Evidence: [advance booking/readability](../../docs/design/advance-booking-readability.md).

## Bổ sung danh mục & giao diện sau LAB04 (23/10/2026)

Theo yêu cầu tiếp tục hoàn thiện trên backend hiện có: thêm unique tên phim, audit
log transaction cùng CRUD phim, endpoint nhật ký chỉ ADMIN và giới hạn sức chứa
phòng dưới room lock. Frontend có preview sơ đồ, tìm kiếm/phân trang và mở đúng
lịch rạp. Migration additive mới không thay booking/payment/QR. Không đánh dấu
Phase11–12 hoàn tất; xem [bằng chứng và phạm vi](../../docs/design/catalog-operations-readability.md).

## Mở lịch đủ phim và cả tháng sau (24/10/2026)

Theo yêu cầu kiểm tra thực tế: bổ sung lịch cho cả 24 phim đang mở bán/chiếu sớm,
40 phòng mỗi rạp mẫu, tối thiểu 4 giờ khác nhau/ngày trên 2 phòng, bao gồm tháng
sau. Seed additive có room lock, giữ lịch/đơn và dữ liệu admin; không migration.
Programme snapshot tối đa 60 ngày/20.000 suất, không cắt âm thầm. Các ca UI dùng
PostgreSQL test riêng xác nhận chọn đủ phim, ngày xa, giữ ghế/giá/QR thật và D11
bị bỏ lẻ. 75 unit + 207 HTTP/realtime/SMTP + 22 DB + 5 planner + 41 Playwright
PASS (350 ca), typecheck/lint/build và compiled smoke PASS. Không đánh dấu
Phase11–12 hoặc các nghiệp vụ LAB04 còn thiếu hoàn tất. Xem
[bằng chứng lịch đầy đủ](../../docs/design/full-calendar-booking.md).

## Bắt buộc backend thật và kiểm tra lưu dữ liệu (24/10/2026)

Theo yêu cầu đồng bộ frontend/NestJS: xóa kho RAM/standalone phía Next.js, giữ
PostgreSQL là nguồn tài khoản/đơn/ghế/QR; mất kết nối trả 503 rõ ràng. Không đổi
schema hoặc business state machine. ADMIN đọc tài khoản mới qua API hiện có,
frontend đồng bộ lại khi focus và theo chu kỳ. Compiled production smoke bổ sung
đăng ký thật và hai lần khởi động lại backend, xác nhận tài khoản, đơn PAID,
SOLD, cùng QR và trạng thái đã check-in vẫn tồn tại. Không dùng Docker, không
reset DB/.env và không đánh dấu Phase 11–12 hoàn tất. Xem
[bằng chứng server-only](../../docs/design/server-only-qa.md).

## Rà soát vé, quản trị và launcher (27/10/2026)

Theo yêu cầu sửa lỗi QR/soát vé và kiểm tra nghiệp vụ: đã tích hợp commit remote
`2abf704`, gỡ đường tự chuyển sang kho RAM theo cổng DB cố định. NestJS dùng
DATABASE_URL cấu hình và dừng khi hạ tầng không sẵn sàng. Voucher không hợp lệ
hoặc dưới ngưỡng trả 400, giao dịch không tạo booking/ghế; DTO chuẩn hóa và giới
hạn độ dài mã. Không đổi schema, Decimal pricing/state machine, HMAC, ownership
hoặc RBAC. Frontend mở ví vé thật, render SVG từ hash do backend cấp, dedup suất
và xuất đúng aggregate doanh thu. Không đánh dấu Phase 11–12 hoàn tất. Bằng
chứng: [rà soát nghiệp vụ](../../docs/design/business-flow-audit.md).

## Kiểm toán frontend / API — 28/10/2026

Bổ sung API public đọc số ghế theo lô tối đa50 UUID, truy vấn set-based/read-only và gzip cho GET danh mục/sơ đồ ghế. API đang có giữ nguyên payload/envelope và nghiệp vụ. Hai test PostgreSQL mới đối chiếu capacity với seat map cho overdue/PAID/mixed SOLD claims và xác nhận không chờ row lock/không ghi khi đọc. Không chuyển trạng thái Phase11–12.

Kiểm chứng lượt này:89 unit +222 HTTP/Socket.IO +22 PostgreSQL; typecheck/typed lint/build đạt. Frontend production82 bài và Node/RAM/planner53 bài, tổng468. Chi tiết timing, phương pháp và giới hạn ở [báo cáo kiểm toán](../../docs/qa/frontend-performance-audit.md).

Lượt native cùng ngày bổ sung các biên299/300/301s,14/15/16phút,4 tài khoản .vn (hội viên50000 điểm) và4 rạp. Seed không reset điểm đã chỉnh; sửa presale ID trùng trong RAM và đường dẫn monorepo/Prisma hoisted. Native PG17.10/Redis7.4.2, không dùng Docker; ma trận STLC/RTM và những mục tiêu hiệu năng chưa đạt tại [báo cáo native](../../docs/qa/backend-native-audit.md).

## Kiểm toán Fullstack bổ sung — 28/10/2026

Không đánh dấu hoàn thành Phase11–12. Bổ sung UC02 ACTIVE/LOCKED/INACTIVE (migration additive), Admin payment reconciliation/durable ticket recovery, exact conflict IDs, env compatibility sau chuyển frontend/ và responsive Admin. Kiểm chứng488 ca độc lập:89 backend unit,232 HTTP/Socket.IO,23 DB schema,60 Node/RAM/config/planner,84 browser production; các lần chạy lại không cộng trùng. Typecheck/lint/build đạt, native RAM/503-timeout smoke đạt. [Audit/RTM/TC-01…05 và giới hạn](../../docs/qa/fullstack-lab04-audit.md).

## SIT/E2E/Concurrency/Security native mở rộng

Giữ trạng thái Phase 11–12. Script `npm run qa:native` chạy hết 503 bài độc lập (89 unit + 242 native HTTP + 23 schema + 60 Node/RAM + 89 browser), lint/typecheck/build và hai smoke đều đạt. Ma trận có 69 kịch bản truy vết, ghi rõ khác biệt contract và giới hạn. Hai mươi users qua hai API instances tranh một ghế VIP cho kết quả 1 × 201/19 × 409.

Vá conflict IDs sau SQL rollback, tái xác thực giữ context, null member và state ID bị hoãn ở picker; bổ sung envelope message RAM, fixture GOLD với 50.000 điểm và cleanup test. Mục tiêu latency/payload/QR 50 ms chưa đạt; functional PASS không được coi là performance PASS. [Báo cáo và toàn bộ số đo](../../docs/qa/ultra-expanded-audit.md).

## Tối ưu catalogue/QR — 29/10/2026

Không thay đổi trạng thái Phase 11–12. Thêm snapshot Redis chia trang lossless, invalidation Admin, cache browser chỉ cho chunk bất biến và nén Brotli/gzip. Giữ đầy đủ API legacy và các kiểm tra ghế/giá/hạn/owner. QR PNG 1-bit được giải mã kiểm chứng; fulfillment được đánh thức sau commit, vẫn có outbox/poll phục hồi. Native `npm run qa:native` chạy hết 547 bài độc lập; lint/typecheck/build và hai smoke đạt. Phân biệt budget đường lịch mới/service QR với cache lạnh, catalogue đầy đủ và browser: [báo cáo/số đo](../../docs/qa/performance-optimization.md).

## Kiểm toán LAB04 native và bố cục — 29/10/2026 UTC

Giữ trạng thái Phase 11–12. Lỗi400 DTO có thêm `details.fieldErrors` an toàn,
không thay request/route/status/error/message cũ; frontend chỉ ánh xạ trường được
allowlist. RAM đồng bộ giới hạn đăng ký, vẫn là fallback không bền vững đã được
người dùng chọn. Launcher PostgreSQL chuẩn bị Prisma/migration/seed và build trước
readiness; smoke thực chỉ ghi database test riêng. Không Docker, không đổi schema,
Decimal, thời hạn300 giây, quyền sở hữu vé hoặc policy C'MEMBER.

Sửa snapshot cũ sau Admin mutation và phục hồi chunk429 bằng API legacy thật,
giữ deadline/quota. Các lần kiểm chứng đạt579 ca độc lập:115 backend unit,
248 HTTP/Socket.IO/SMTP,23 schema,87 Node/RAM/launcher và106 browser production;
lint/typecheck/build đạt. `qa:lab04`134 native +4 browser là tập con, không cộng trùng.
Mục tiêu mọi request30ms/toàn catalogue15KiB chưa đạt; Figma mới có bàn giao capture,
chưa import/tạo file. [Audit, lịch sử lỗi và số đo](../../docs/qa/lab04-native-figma-audit.md).

## Bổ sung ví vé/check-in theo từng ghế — 05/11/2026

Không đổi trạng thái Phase 11–12. Yêu cầu bổ sung dùng migration additive để mỗi
ghế SOLD của đơn mới có mã chữ/QR/check-in riêng; giữ nguyên vé nhóm cũ. Tái sử dụng
owner ticket/calendar/email và STAFF preview/check-in; thêm tìm kiếm/ngày/trạng
thái, QR phóng to và trang tra cứu công khai chỉ đọc.
[Báo cáo, contract và kết quả kiểm chứng](../../docs/qa/per-seat-ticket-wallet.md).

## Đồng bộ màn hình trạng thái đặt vé và soát vé — 06/11/2026

Không đổi trạng thái Phase11–12. Tái sử dụng endpoint/payload/chữ ký và schema hiện có; frontend có review2 cột, Sandbox QR, hủy/hết hạn và ví vé từng ghế theo ảnh. API STAFF bổ sung metadata tối thiểu không chứa QR token/PII trong lỗi để hiển thị đúng ba thẻ. Backend RAM thống nhất chặn USED trước sai suất.

Kiểm chứng615 ca độc lập qua các lượt:116 backend unit,254 HTTP/Socket.IO/SMTP,26 database,105 Node/RAM/config/planner,114 browser. Lượt browser đầy đủ111/114; sửa lỗi chờ kết quả hủy và class/hiển thị thẻ nổi, build lại và kiểm tra6 ca liên quan đạt6/6. Lint/typecheck/build và smoke RAM qua fullstack/BFF đạt. Không tuyên bố đạt budget30ms/15KiB hoặc pixel-perfect mọi thiết bị. [Báo cáo, contract, lịch sử và ảnh thực](../../docs/qa/cinema-status-design-2026-11-06.md).

## Khóa suất và Sandbox hết hạn — 07/11/2026

Bổ sung status suất qua migration additive, API ADMIN khóa/mở và release unpaid holds; JSON Sandbox dùng cùng chữ ký/state machine, cờ kiểm thử chỉ non-production. Giữ Phase11–12 như cũ. TC_FR07_05 và TC_FR08_04 được kiểm chứng native qua browser, cùng hồi quy QR từng ghế. [Báo cáo512 ca và budget chưa đạt](../../docs/qa/showtime-lock-expiry-2026-11-07.md).


## Bản vá FR08/FR12 — 07/11/2026

Bổ sung FAILED/failure_reason và metadata combo qua migration additive; giữ kiến trúc, lịch sử đơn cũ và QR riêng từng ghế. Alias REST ADMIN, modal quản trị combo, gợi ý theo số ghế và đồng bộ menu active; adapter RAM giữ contract tương ứng. Kiểm chứng và giới hạn hiệu năng tại [báo cáo RCA](../../docs/qa/failed-payment-combos-2026-11-07.md). Đây là đợt vá theo yêu cầu, không chuyển trạng thái Phase11–12.


## Bản vá FR09 — 07/11/2026

Mở rộng mã vé và alias chính xác, giữ token/QR cũ và check-in một lần trong transaction; thêm tra cứu một vé owner-only, camera/file fallback và seed demo tách biệt. Không thay trạng thái Phase11–12. [RCA/kiểm chứng](../../docs/qa/ticket-admission-fr09-2026-11-07.md).


## FR09 tự động soát và reset mẫu — 07/11/2026

Theo prompt mới: verify-ticket mặc định auto check-in, vẫn có autoCheckin=false để preview ở API và checkbox tùy chọn; reset chỉ demo V1/non-production, không sửa SOLD hoặc vé thật. [Đối chiếu và bằng chứng](../../docs/qa/fr09-auto-checkin-reset-2026-11-07.md). Không chuyển trạng thái Phase11–12.

## Hoàn thiện FR12 và Sandbox hết hạn — 07/11/2026

Chuẩn hóa ba mẫu combo bằng migration có điều kiện, sửa ưu tiên giữa nhiều gói đủ điều kiện, thêm banner/áp dụng nhanh và tab quản trị rõ ràng. PUT invalidation, no-store và status rõ giá trị giữ dữ liệu menu mới; Sandbox ép hạn rồi xác nhận bằng hai thao tác, vẫn JSON409/không QR và giữ CSS. [Báo cáo trước/sau, phạm vi kiểm chứng và test3 bước](../../docs/qa/combo-expiry-refinement-2026-11-07.md). Giữ nguyên trạng thái Phase11–12.

## Đối soát năm ca FR07/FR08/TC-12/TC-13 — 07/11/2026

Alias ADMIN và cập nhật mềm suất có transaction/release; form chỉ gửi trường đổi để giữ độ chính xác giờ. FAILED/CANCELLED có responseCode, modal và huy hiệu riêng. Lookup thêm tổng đơn/ghế đối chiếu, endpoint nhân viên được bảo vệ và không check-in; quyền QR từng ghế và owner-only giữ nguyên. [Tệp sửa, contract và kiểm chứng](../../docs/qa/five-cases-atomic-2026-11-07.md). Không thay trạng thái Phase11–12.


## Sửa kết nối Admin/Combo — 07/11/2026

Sửa description seed RAM, poster local bị HTML URL chặn và phân trang Admin RAM; bổ sung DELETE an toàn, file combo local có rollback khi lỗi ghi và gói Party Mặn119K. [RCA và kiểm chứng hai chế độ](../../docs/qa/admin-combo-connection-2026-11-07.md). Không chuyển trạng thái Phase11–12.
