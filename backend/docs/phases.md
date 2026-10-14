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

Phase 0 và Phase 1 đã triển khai và kiểm chứng. Phase 1 có 14 model, migration partial unique/exclusion/composite FK/check constraints, client generated và seed idempotent. PostgreSQL development và test riêng chạy healthy; schema validate/deploy/seed/check và 22 tests PostgreSQL thật pass. Evidence ở `validation-phase-1.md`. Các phase 2–12 chưa bắt đầu; TC01–TC05 qua API chưa được đánh dấu hoàn thành.

## Điều kiện đầu vào Phase 2

Dùng lockfile và Prisma 6.19 đã pin. `npm run db:up:test`, `npm run prisma:generate`, `npm run db:migrate` đảm bảo DB/client sẵn sàng. Credential nằm trong ignored `.env`/`.runtime/database.env`, không đưa vào source hoặc output. Prisma engine hiện có chạy bình thường trong runtime Phase 1; tải checksum mới trực tiếp vẫn trả 403, không tắt checksum. Kiểm tra network settings khi cần fresh download. Chuẩn bị Redis và hạ tầng Nest theo phạm vi Phase 2, giữ nguyên migration SQL constraints. Dừng sau mỗi phase như người dùng yêu cầu.
