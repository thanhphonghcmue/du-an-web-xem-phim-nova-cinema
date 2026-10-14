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

Chỉ Phase 0 được triển khai. Các phase 1–12 chưa bắt đầu. Không có acceptance pass cho PostgreSQL, Redis, BullMQ worker, authentication, booking/payment/ticket/check-in/report hoặc Docker. Điều kiện Phase 0 được ghi trong `validation-phase-0.md` sau khi chạy thực.

## Điều kiện đầu vào Phase 1

Lockfile Phase 0 cài thành công và TypeScript build được. Chọn PostgreSQL local/Compose hoặc dịch vụ được người dùng cấp; cần DATABASE_URL hợp lệ và quyền tạo schema/extension cho btree_gist. Không lấy credential từ chat hoặc hard-code. Database test tách dữ liệu development. PrismaClient chỉ được import sau khi schema và `prisma generate` chạy thành công.

Trong cloud hiện tại, `prisma --version` gặp 403 khi tải checksum `schema-engine.gz.sha256` từ `binaries.prisma.sh`. Network draft đã bổ sung domain, chưa chứng minh runtime đã cho phép. Phải kiểm tra lại engine với checksum verification bật trước migrate Phase 1. Không dùng `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` để né kiểm tra.
