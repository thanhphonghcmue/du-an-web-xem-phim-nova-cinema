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

Phase0–5 đã triển khai và kiểm chứng. Phase5 thêm5 showtime operations, BR03 duration+15min, chống overlap, lọc ngày và bảo vệ booking history. `npm run check`: 27 unit, 73 HTTP e2e (21 showtime +22 catalog +19 auth +11 infrastructure), typecheck/lint/build pass; `test:db`: 22 PostgreSQL tests pass. Tổng122 tests và compiled production HTTP smoke pass. Evidence ở `validation-phase-1.md` đến `validation-phase-5.md`. **TC-02 business API hoàn tất**; Phase6–12 và TC-01/03/04/05 business APIs chưa hoàn tất.

## Phase 2 đã triển khai

Database/Redis local và test có credentials, ports, volumes và BullMQ prefixes tách riêng. Test HTTP cưỡng bức dùng test DB/Redis. Health kiểm tra PostgreSQL SELECT 1, Redis PING và job probe được worker xử lý; 503 trả component state an toàn, còn liveness độc lập. Rate limiter Redis atomic Lua fail-closed khi storage lỗi. README có cài đặt/chạy/test commands. Auth/RBAC hiện có ở Phase 3; CRUD/booking tiếp tục ở phase sau.

## Phase 3 đã triển khai

API đăng ký/login/refresh/logout, GET/PATCH hồ sơ và GET membership đã chạy. Mandatory signing secrets được tạo riêng bằng `npm run auth:configure`; hash-only refresh sessions sử dụng schema hiện có, không cần migration mới. Concurrent registration có 1 winner; concurrent refresh 5 request có 1 winner; lỗi insert successor rollback revoke cũ. JWT access giữ thời hạn ngắn; logout chỉ revoke refresh được gửi lên, các phiên khác độc lập. Role lấy từ DB và profile không cho sửa role/tier/points.

## Phase 4 đã triển khai

Movies/Cinemas/Rooms/Seats có CRUD/pagination/filter và OpenAPI. GET public, mọi mutation ADMIN-only. Generate seats trên empty room, server Decimal multipliers, room.totalSeats derived, PostgreSQL row lock/transaction bảo vệ count và concurrent generate. Movie duration, room structural fields và seat layout bị khóa khi có showtimes tham chiếu; deletes không cascade lịch sử. Test thực concurrent duplicate room, seat coordinates, generation, capacity và in-flight showtime FK. Không cần migration/schema/dependency mới. Dừng và chờ `TIẾP TỤC PHASE 5`.

## Phase 5 đã triển khai

Showtime CRUD public reads/ADMIN writes. EndTime tính server từ locked movie duration+15 phút; service overlap check exclude self và GiST exclusion `[)` cùng bảo vệ schedule. Khóa movie IDs sorted → room IDs sorted → showtime, reload/retry snapshot đổi parents và bounded transaction conflicts. Price fixed2 Decimal strings, validation timezone/millisecond precision, filters movie/cinema/room/Vietnam day, stable pagination. Có booking bất kỳ trạng thái nào thì chặn sửa/xóa; no-op PATCH được giữ nguyên.

TC-02 qua API: 10:00–12:15 chặn12:00, cho phép12:15. Năm concurrent creates một201/bốn409; concurrent updates một200/một409, independent patches không mất dữ liệu, concurrent room moves retry đúng. Movie-duration và in-flight booking FK locks được kiểm tra qua actual PostgreSQL lock waits. Không cần migration/schema/dependency/env mới. Dừng và chờ `TIẾP TỤC PHASE 6`.
