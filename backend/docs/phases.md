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

Phase0–8 đã triển khai và kiểm chứng. Phase8 thêm Sandbox checkout chạy được, HMAC-SHA512 URL/webhook riêng miền, owner-only status, payment idempotency/state machine và PAID/SOLD/points/outbox nguyên tử. `npm run check`:54 unit +146 HTTP/WebSocket tests, typecheck/lint/build pass; `test:db`:22 PostgreSQL tests. Tổng222 tests; compiled production HTTP/WebSocket/payment/outbox/worker smoke pass. Evidence validation-phase-1.md đến validation-phase-8.md. TC-01/TC-02/TC-04 hoàn tất; TC-03 hoàn tất phần payment/points/events, còn ticket consumer ở Phase9. Phase9–12 và TC-05 chưa triển khai.

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
