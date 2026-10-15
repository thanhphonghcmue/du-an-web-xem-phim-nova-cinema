# NOVA Cinema Backend — Phase 3

Backend NestJS của NOVA CINEMA (INFINITY), triển khai tuần tự theo yêu cầu của bạn. **Phase 0–3 hoàn tất**: PostgreSQL/Prisma, Redis/BullMQ, validation, Swagger, health, đăng ký/đăng nhập, JWT, refresh rotation, hồ sơ, RBAC và C’MEMBER. Frontend Next.js ở root vẫn là Sandbox độc lập.

Kiến trúc: Controller → Service → Repository → Prisma. Quyết định nghiệp vụ/transaction/concurrency: [docs/architecture.md](docs/architecture.md). Kế hoạch các phase: [docs/phases.md](docs/phases.md). Evidence: [Phase 1](docs/validation-phase-1.md) · [Phase 2](docs/validation-phase-2.md) · [Phase 3](docs/validation-phase-3.md).

## Requirements

Node.js **24 LTS** theo `.nvmrc`, npm, Docker Engine/Desktop và Docker Compose v2. Dùng NestJS 11, TypeScript 5 strict, Prisma 6.19, PostgreSQL 17 và Redis 7.4. Database/Redis images được pin digest. Docker phải đang chạy; các container chỉ bind `127.0.0.1`. Phase 3 cần hai JWT signing secrets độc lập; payment/SMTP secrets dành cho phase sau.

Nếu đã có PostgreSQL/Redis riêng, điền connection settings vào `.env` thay vì ghi đè cấu hình bằng các helper local.

## Cài và chạy từ đầu

Từ root repository:

```bash
cd backend
npm ci
npm run db:configure
npm run infra:configure
npm run auth:configure
npm run infra:up:test
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:test
npm run check
npm run test:db
npm run start:dev
```

Trong cloud này thay `npm ci` bằng:

```bash
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
```

Expected result: PostgreSQL/Redis dev và test healthy, schema valid, client generated, migration deployed, seed thành công, TypeScript/lint/build không lỗi và các test pass. Backend HTTP mặc định cổng **4000**, Next.js mặc định cổng 3000.

`db:configure` tạo password random cho database development/test và demo accounts; `infra:configure` tạo password Redis khác cho development/test. Giá trị nằm trong `.env` và file riêng dưới `.runtime/`, đều ignored và có quyền 0600. Không in password/token hoặc URL có credential. Chạy lại giữ nguyên password; nếu `.env` đang có cấu hình khác, helper dừng và không ghi đè. Không xóa credential file khi volume còn tồn tại: service giữ password khởi tạo trong volume, không tự thay khi env đổi.

Database development `nova_development` ở port **55432**; database test `nova_test` ở port **55433**, với password riêng. Test runner yêu cầu tên test DB kết thúc `_test` và khác tên application DB, tránh hostname alias vô tình trỏ cùng dữ liệu. Test không truncate DB; chỉ xóa fixture do chính suite tạo.

Redis development chạy port **6380**, Redis test port **6381**, password và BullMQ prefix tách riêng. Redis dùng AOF, `maxmemory-policy noeviction` để Redis không âm thầm loại bỏ queue/lock keys. Test HTTP tự trỏ sang database và Redis test, dùng prefix ngẫu nhiên riêng cho mỗi lần chạy. Không kết nối test suite tới dev Redis.

Port có thể đổi từ lần cấu hình đầu, ví dụ trên bash:

```bash
DATABASE_PORT=55434 TEST_DATABASE_PORT=55435 npm run db:configure
```

Sau khi đã cấu hình, muốn đổi port cần sửa file tương ứng trong `.runtime/` và connection URLs trong `.env` cho khớp. Các lệnh luôn chạy từ `backend/`.

## Prisma schema và migration

[prisma/schema.prisma](prisma/schema.prisma) có **14 model**: 13 model theo yêu cầu và OutboxEvent theo quyết định Phase 0. IDs UUID tạo tại PostgreSQL; tất cả DateTime dùng timestamptz(3), lưu UTC; tiền Numeric(14,2), multiplier Decimal(4,2). DB timezone đã kiểm tra UTC. Decimal được truyền từ chuỗi và khi trả API sẽ serialize thành chuỗi, không cộng tiền bằng JS number.

Migration `20261014000100_initial` bao gồm enum, table, FK, unique/index và các SQL bổ sung:

- Partial unique `uq_active_showtime_seat` trên `(showtime_id,seat_id)` khi HOLDING/SOLD. Row AVAILABLE sau release được giữ và không chặn booking mới.
- GiST exclusion `showtimes_no_room_overlap`, extension `btree_gist`, time range `[startTime,endTime)`. Suất bắt đầu đúng lúc suất trước kết thúc được phép.
- Composite FKs đảm bảo BookingSeat thuộc đúng booking/showtime/room và ghế thuộc phòng đó; không chỉ kiểm tra ID tồn tại.
- CHECK cho tiền không âm/tổng booking nhất quán, thời gian, tọa độ ghế, multiplier BR05, quantity combo, trạng thái check-in và outbox lock.
- Unique bookingId/ticketHash cho một QR mỗi booking, unique transactionCode và refresh token hash; Restrict delete/update bảo vệ dữ liệu tham chiếu.

Migration bọc `BEGIN/COMMIT` để không áp dụng nửa chừng. Partial index/exclusion/CHECK là SQL thủ công vì Prisma schema không biểu diễn đầy đủ. Giữ chúng trong migration; không thay `migrate deploy` bằng `db push` hoặc reset để né lỗi. Model/schema drift đã kiểm tra: không khác biệt ở các phần Prisma biểu diễn được. Khi viết migration sau, phải kiểm tra các constraint SQL này tiếp tục tồn tại.

```bash
npm run db:migrate
npm run db:status
```

Chạy deploy lần hai trả `No pending migrations`, không xóa dữ liệu. Role migration cần quyền tạo `btree_gist`; role runtime ít quyền hơn sẽ chuẩn bị trong giai đoạn triển khai. Role Docker local là role development, không phải cấu hình database production.

## Seed và tài khoản demo

```bash
npm run db:seed
```

Seed trong một transaction, idempotent bằng ID ổn định/upsert, không reset password hoặc ghi đè dữ liệu tồn tại. Khi có lịch khác gây overlap, seed rollback; không xóa lịch để làm seed thành công. `NODE_ENV=production` từ chối demo seed.

| Tài khoản           | Role     | Tier    |
| ------------------- | -------- | ------- |
| admin@nova.local    | ADMIN    | DIAMOND |
| staff@nova.local    | STAFF    | GOLD    |
| customer@nova.local | CUSTOMER | SILVER  |

Password chung cho tài khoản demo là giá trị **SEED_DEMO_PASSWORD trong `.env` riêng của bạn**, do helper tạo hoặc tự đặt tối thiểu 12 ký tự. DB chỉ lưu Argon2id hash. Đổi env rồi chạy seed không reset password của account đã tồn tại. Đăng nhập bằng endpoint Phase 3 với password này.

Dữ liệu fresh seed: **6 phim, 2 rạp demo, 3 phòng, 480 ghế, 54 suất chiếu và Party Combo 69K**. Mỗi phòng A–H ×20 ghế; C–F VIP, H Sweetbox, các hàng còn lại STANDARD. Multiplier 1.00/1.20/1.50. Không tạo user giả GUEST, booking đã thanh toán, payment thành công hoặc ticket demo trong development seed.

Phim: Dune: Hành Tinh Cát 2, Godzilla x Kong: Đế Chế Mới, Mai, Kung Fu Panda 4, Quật Mộ Trùng Ma, Oppenheimer — 70mm Special Re-release. Suất tái chiếu và rạp/giá là dữ liệu đồ án. Mai dùng title art từ frontend, không phải poster chính thức. Poster URL trỏ frontend `FRONTEND_URL` mặc định cổng 3000; cần frontend chạy để xem ảnh. Không copy asset vào API chưa có static module.

Seed mặc định lấy ngày mai UTC, bắt đầu 03:00 UTC (=10:00 Việt Nam), tạo ba ngày. `SEED_BASE_DATE=YYYY-MM-DD` cho phép cố định mốc khi tạo lần đầu. endTime tính duration phim trong DB +15 phút cleaning; giữa suất có thêm 15 phút khoảng nghỉ. Chạy lại giữ ID/thời gian cũ, không tự dời lịch có thể đã được đặt; seed không là công cụ tự gia hạn lịch demo qua từng ngày.

## .env và PostgreSQL/Redis riêng

`.env.example` liệt kê đầy đủ biến. Với PostgreSQL/Redis đã được cấp, tự tạo `.env` từ example và điền `DATABASE_URL`, `TEST_DATABASE_URL`, `SEED_DEMO_PASSWORD` cùng `REDIS_*`/`TEST_REDIS_*`. Không chạy helper local nếu muốn giữ cấu hình riêng. Dùng hai database tên khác nhau, test name kết thúc `_test`; PostgreSQL 17 có gen_random_uuid và btree_gist. Prisma không tạo database/role cho dịch vụ đã được cấp. Rate limiter/health tests cần Redis test riêng. Có thể chạy `npm run auth:configure` để tạo JWT secrets mà không thay cấu hình database/Redis bên ngoài.

```bash
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:test
npm run test:db
```

TLS tuân theo cấu hình của dịch vụ PostgreSQL. Không tắt certificate/checksum verification. Prisma CLI/client chạy được với engine hiện có trong cloud Phase 1. Kiểm tra tải checksum mới trực tiếp từ `binaries.prisma.sh` vẫn gặp HTTP 403; vì vậy chưa xác nhận fresh download trên một máy cloud mới. Domain đã có trong network draft; cần áp dụng cấu hình và kiểm tra lại khi phải tải mới. Không bật biến bỏ qua checksum. `package.json#prisma` có cảnh báo deprecation cho Prisma 7; phiên bản 6.19 đang được khóa và seed command vẫn hỗ trợ, không phải lỗi migration.

## Phase 2: Prisma, Redis/BullMQ, API nền tảng

`PrismaModule` là module global, quản lý một PrismaClient dùng chung và đóng kết nối khi shutdown. `DatabaseRepository` cung cấp probe SQL `SELECT 1`; controller không truy cập Prisma. Redis client riêng dùng cho probes và limiter. BullMQ worker `infrastructure` được health probe kiểm tra bằng cách enqueue, xử lý và xác nhận job thật; queue `seat-expiration` chỉ được đăng ký cho phase nghiệp vụ sau, chưa có expiry behavior.

Global `ValidationPipe` bật transform, whitelist và từ chối trường thừa; nested DTO được validate. Body JSON lỗi/quá lớn trả lỗi chuẩn mà không lộ body. Thành công dùng `{success:true,data,message}`; lỗi dùng status, error code ổn định, timestamp, path và request ID. 500 luôn che thông báo nội bộ. `helmet`, CORS allowlist, request-ID và log status/duration được cấu hình khi khởi động.

Rate limiting dùng Lua atomic counter trên Redis với key SHA-256, shared giữa nhiều instance và fail-closed bằng HTTP 503 nếu Redis storage không sẵn sàng. `/api/v1/health/live` chỉ xác nhận tiến trình sống. `/api/v1/health` kiểm tra PostgreSQL, Redis và job worker; nếu dependency lỗi/timeout sẽ trả 503 cùng trạng thái an toàn cho từng thành phần. Hai health route bỏ qua throttling để probe không bị limiter chặn.

Swagger UI ở `http://localhost:4000/api/docs`, OpenAPI JSON ở `/api/docs-json`. Swagger mô tả các endpoint đã triển khai, cùng DTO/envelopes và Bearer authentication cho users APIs.

Khởi động tất cả service local và test:

```bash
npm run infra:configure
npm run auth:configure
npm run infra:up:test
npm run db:migrate:test
npm run check
npm run test:db
npm run start:dev
```

`infra:up` chạy các service development; `infra:up:test` chạy thêm PostgreSQL/Redis test tách biệt. `infra:down` dừng services nhưng giữ volumes. Các lệnh dùng chung project Compose `nova-cinema-phase1` để giữ nguyên database Phase 1.

HTTP probes khi backend đang chạy:

```bash
curl -i http://127.0.0.1:4000/api/v1/health/live
curl -i http://127.0.0.1:4000/api/v1/health
```

## Phase 3: Authentication, Users, RBAC và C’MEMBER

Chạy `npm run auth:configure` sau `db:configure` để tạo hai signing secrets random riêng biệt trong `.env` (0600), giữ nguyên giá trị đã có và không in secrets. App từ chối khởi động nếu secrets thiếu, quá ngắn hoặc trùng nhau. Không đưa `.env` vào Git/ZIP. E2E tự tạo secrets riêng mỗi lần chạy.

| Method | Endpoint                      | Quyền và kết quả                                                                       |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/api/v1/auth/register`       | Public; `{email,password,fullName,phone?}`; 201 safe profile, CUSTOMER/SILVER/0 points |
| POST   | `/api/v1/auth/login`          | Public; `{email,password}`; 200 access/refresh tokens, TTL và safe user profile        |
| POST   | `/api/v1/auth/refresh`        | Public; `{refreshToken}`; 200 token pair mới, token cũ bị revoke atomically            |
| POST   | `/api/v1/auth/logout`         | Public với refresh token hợp lệ; `{refreshToken}`; 200 `{revoked:true}`, idempotent    |
| GET    | `/api/v1/users/me`            | Bearer access token; safe profile                                                      |
| PATCH  | `/api/v1/users/me`            | Bearer access token; chỉ `fullName`, `phone`; `phone:null` để xóa                      |
| GET    | `/api/v1/users/me/membership` | Bearer access token; points/tier/discountRate                                          |

Email được trim/lowercase, duplicate trả `409 EMAIL_ALREADY_EXISTS` kể cả hai request đồng thời. Password 12–128 ký tự khi đăng ký, lưu Argon2id; login lỗi luôn `401 INVALID_CREDENTIALS`. Login/register giới hạn 5 request/IP/phút qua Redis; refresh giới hạn 30/phút. API responses có `Cache-Control: no-store`; log không chứa body/token/password.

JWT HS256 ràng buộc issuer, audience, token purpose, UUID subject/JTI và expiry. Mặc định access 15 phút, refresh 7 ngày; giới hạn access tối đa 1 giờ, refresh tối đa 90 ngày và dài hơn access. Chỉ SHA-256 hash của refresh JWT random-JTI được lưu DB; token plaintext chỉ gửi về client. Refresh consume và insert successor nằm cùng PostgreSQL transaction, row update conditional với database clock; trong 5 request đồng thời chỉ 1 request thành công. Lỗi insert successor rollback việc revoke token cũ.

Logout revoke refresh token được gửi lên; access token đã phát hành vẫn hợp lệ đến expiry, các phiên khác giữ độc lập. Không dùng khái niệm “logout mọi thiết bị” hay token-family revocation khi chưa có API cho chúng. Refresh token hết hạn/sai/replayed trả `401 INVALID_REFRESH_TOKEN`. Trường role/điểm/tier/email/password không được mass assign qua register/profile.

`JwtAuthGuard` và `RolesGuard` global: endpoint mặc định yêu cầu đăng nhập; chỉ endpoint có `@Public()` được bỏ qua. `@Roles(ADMIN, STAFF)` kiểm tra role hiện tại từ DB, không tin role claim trong JWT; `@CurrentUser()` cung cấp safe profile. GUEST không được phát token/đăng nhập. Không thêm endpoint ADMIN giả để demo RBAC; test harness riêng kiểm tra ma trận CUSTOMER/STAFF/ADMIN.

C’MEMBER rates: SILVER 0.05, GOLD 0.07, DIAMOND 0.10, tập trung trong `DiscountService` export từ UsersModule. Endpoint chỉ đọc tier/points được quản lý server; cộng điểm/transaction payment thuộc Phase 8. Không tự đặt ngưỡng thăng hạng khi đặc tả chưa có.

Đăng nhập demo bằng `customer@nova.local`, `staff@nova.local`, `admin@nova.local` và password riêng `SEED_DEMO_PASSWORD` trong `.env`. Trong Swagger, copy `data.accessToken` từ login vào Authorize; refresh/logout nhận refresh token trong JSON body. Frontend Sandbox chưa được nối vào API này.

## Tests và build

```bash
npm run check
npm run test:db
```

`check`: TypeScript (gồm seed/tests), typed lint (gồm prisma/scripts), **27 unit tests**, **30 HTTP e2e tests** trên PostgreSQL/Redis thật và Nest build. `test:db`: **22 tests trên PostgreSQL thật**, kiểm tra ownership concurrent, release/history, SOLD exclusivity, INSERT/UPDATE/concurrent showtime conflicts và boundary, room/showtime FKs, exact Decimal, unique payment/ticket và conditional check-in primitive, seed idempotence/hash/schedule.

Các test DB này chứng minh constraint/nền tảng, **không thay TC01–TC05 qua API** và không chứng minh payment/signature/seat timer/role/check-in window đã chạy. Các API đó sẽ được làm ở phase tương ứng.

## HTTP bootstrap

```bash
npm run build
npm run start:prod
```

```bash
curl -i http://127.0.0.1:4000/api/v1
```

HTTP 200 trả `{success:true,data:{phase:3,status:"running",health:"/api/v1/health",docs:"/api/docs"},message}`. API nghiệp vụ chưa có sẽ trả 404; frontend chưa gọi API này.

## Docker database and Redis lifecycle

```bash
npm run infra:up:test
npm run infra:down
```

`infra:down` dừng/xóa bốn container nhưng giữ volumes và dữ liệu. Không dùng `down -v` cho dữ liệu cần giữ. Compose hiện chạy PostgreSQL/Redis local; API Nest vẫn được chạy từ Node trên host. Docker hóa app/worker thuộc Phase 12.

## Cây mã nguồn mới của Phase 3

```text
backend/
  compose.infrastructure.yml
  compose.database.yml
  prisma/
    schema.prisma
    seed.ts
    migrations/
      migration_lock.toml
      20261014000100_initial/
        migration.sql
  scripts/
    configure-database.cjs
    configure-infrastructure.cjs
    configure-auth.cjs
    test-database-target.cjs
    migrate-test-database.cjs
  src/
    common/
    config/
    database/
    health/
    queues/
    redis/
    modules/
      auth/
      users/
  test/
    app.e2e-spec.ts
    auth.e2e-spec.ts
    jest-database.config.cjs
    schema.database-spec.ts
    setup-environment.cjs
  docs/
    validation-phase-1.md
    validation-phase-2.md
    validation-phase-3.md
```

Các bootstrap/config/test Phase 0 được giữ; package scripts, TS/lint include, `.env.example`, `.gitignore` và tài liệu đã cập nhật. Không có module API rỗng hoặc placeholder. Dừng sau Phase 3 và chờ **“TIẾP TỤC PHASE 4”**.
