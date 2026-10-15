# Phase 3 validation evidence

Ngày kiểm tra: **15/10/2026**, giờ Việt Nam. Node.js 24.19.0, NestJS 11, Prisma 6.19, PostgreSQL 17.11 và Redis 7.4. Existing lockfile/dependencies và schema Phase 1 được giữ. Phase 3 chỉ triển khai Authentication, Users, RBAC và membership; không làm Phase 4.

| Check                                  | Result                                 |
| -------------------------------------- | -------------------------------------- |
| Strict TypeScript typecheck            | Pass                                   |
| Typed ESLint, no warnings              | Pass                                   |
| Unit tests                             | 27 passed                              |
| HTTP e2e                               | 30 passed: 19 auth + 11 infrastructure |
| PostgreSQL constraints/seed regression | 22 passed                              |
| Nest production build                  | Pass                                   |

Compiled production smoke cũng đã chạy trên cổng riêng 4110 với PostgreSQL/Redis test: health, register, login, Bearer profile, logout, revoked refresh và Swagger đều pass. Script gửi SIGTERM để dừng chính process nó tạo và cleanup test user/session; không dừng listener có sẵn. `auth:configure` chạy lại giữ nguyên bytes `.env` và quyền file 0600.

## Auth acceptance evidence

- Register trim/lowercase email, hash Argon2id đã verify native, CUSTOMER/SILVER/0 points; không trả password hash. Hai registrations đồng thời cùng normalized email: đúng một 201 và một 409; không tạo trùng user.
- Email/password/name sai và register role/points injection bị 400; password minimum12/max128. Email không tồn tại và password sai trả cùng credentials error.
- Login trả TTL/token pair; refreshToken DB chỉ là SHA-256 digest, không token plaintext. Responses `no-store`, user profile không có hash/password/refresh token.
- Global auth guard chặn unannotated endpoints và anonymous `/users/me`; role harness kiểm tra CUSTOMER/STAFF/ADMIN. JWT role giả không nâng quyền; thay đổi role trong DB có hiệu lực ngay. GUEST/deleted users không authenticate.
- JWT ký sai secret/HS384, sai audience, sai purpose, hết hạn, thiếu expiry hoặc subject sai đều 401; refresh token không dùng làm access token.
- PATCH profile trim tên/sửa số điện thoại/clear bằng null; null name hoặc role/tier/points/email/password assignment bị 400, dữ liệu quyền vẫn giữ nguyên. Membership trả đúng rate cả ba tier từ DB.
- Refresh revoke cũ và tạo successor; reuse cũ 401, successor dùng được. **Năm requests refresh đồng thời trên PostgreSQL thật: đúng một 200, bốn 401, chỉ một successor row.** Không mock database/transaction/guard trong kiểm tra concurrency này.
- Failure injection duy nhất cho successor insert: HTTP500 che chi tiết, old row vẫn chưa revoke và retry refresh thành công. Đây là kiểm tra rollback trên transaction PostgreSQL thật.
- DB-expired token, hash không khớp, refresh JWT hết hạn hoặc không có row đều 401. Logout idempotent hai lần; token đã logout không refresh được, phiên khác còn dùng được.
- Login limiter chạy Redis thật: 5 attempts đầu 401, attempt6 trả429 và Retry-After. OpenAPI có đủ 7 operations với schema envelopes và bearer security trên user endpoints.

HTTP suites dùng dedicated `nova_test` và Redis test riêng; mỗi suite dùng BullMQ prefix unique và JWT secrets ephemeral, không sửa demo accounts hoặc truncate dev data. Cleanup chỉ users/refresh rows của prefix test và Redis keys thuộc suite. Seed/constraint regression dùng các fixtures riêng như Phase 1.

## Reproduce

Từ `backend/`, sau `npm ci` và cấu hình database/Redis local:

```bash
npm run auth:configure
npm run infra:up:test
npm run db:migrate
npm run db:migrate:test
npm run check
npm run test:db
```

## Scope

Logout chỉ revoke refresh session được gửi; access token đã phát vẫn có hiệu lực đến expiry. Không claim logout mọi thiết bị, token-family revocation, frontend integration hoặc auto tier-upgrade khi chưa triển khai/chưa có đặc tả thresholds. Tier/points hiện chỉ đọc; reward/payment thuộc Phase 8. JWT signing secrets private không được đưa vào Git/source artifacts. Không bypass Prisma TLS/checksum; fresh engine download limitation từ Phase 2 vẫn được giữ trong README.
