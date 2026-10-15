# NOVA Cinema Backend — Phase 8

Backend NestJS của NOVA CINEMA (INFINITY), triển khai tuần tự theo yêu cầu của bạn. **Phase 0–8 hoàn tất**: nền tảng/auth/catalog/showtimes, booking hold/cancel/expiry, seat-map/group suggestion/realtime và Sandbox payment HMAC-SHA512 với PAID/SOLD/points/outbox nguyên tử. Frontend Next.js ở root vẫn là Sandbox độc lập.

Kiến trúc: Controller → Service → Repository → Prisma. Quyết định nghiệp vụ/transaction/concurrency: [docs/architecture.md](docs/architecture.md). Kế hoạch các phase: [docs/phases.md](docs/phases.md). Evidence: [Phase 1](docs/validation-phase-1.md) · [Phase 2](docs/validation-phase-2.md) · [Phase 3](docs/validation-phase-3.md) · [Phase 4](docs/validation-phase-4.md) · [Phase 5](docs/validation-phase-5.md) · [Phase 6](docs/validation-phase-6.md) · [Phase 7](docs/validation-phase-7.md) · [Phase 8](docs/validation-phase-8.md).

## Requirements

Node.js **24 LTS** theo `.nvmrc`, npm, Docker Engine/Desktop và Docker Compose v2. Dùng NestJS 11, TypeScript 5 strict, Prisma 6.19, PostgreSQL 17 và Redis 7.4. Database/Redis images được pin digest. Docker phải đang chạy; các container chỉ bind `127.0.0.1`. Runtime cần hai JWT signing secrets và PAYMENT_SANDBOX_SECRET độc lập; SMTP dành cho Phase9.

Nếu đã có PostgreSQL/Redis riêng, điền connection settings vào `.env` thay vì ghi đè cấu hình bằng các helper local.

## Cài và chạy từ đầu

Từ root repository:

```bash
cd backend
npm ci
npm run db:configure
npm run infra:configure
npm run auth:configure
npm run payment:configure
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

`PrismaModule` là module global, quản lý một PrismaClient dùng chung và đóng kết nối khi shutdown. `DatabaseRepository` cung cấp probe SQL `SELECT 1`; controller không truy cập Prisma. Redis client riêng dùng cho probes và limiter. BullMQ worker `infrastructure` được health probe kiểm tra bằng cách enqueue, xử lý và xác nhận job thật; queue `seat-expiration` được đăng ký từ Phase2 và có worker nghiệp vụ từ Phase6.

Global `ValidationPipe` bật transform, whitelist và từ chối trường thừa; nested DTO được validate. Body JSON lỗi/quá lớn trả lỗi chuẩn mà không lộ body. Thành công dùng `{success:true,data,message}`; lỗi dùng status, error code ổn định, timestamp, path và request ID. 500 luôn che thông báo nội bộ. `helmet`, CORS allowlist, request-ID và log status/duration được cấu hình khi khởi động.

Rate limiting dùng Lua atomic counter trên Redis với key SHA-256, shared giữa nhiều instance và fail-closed bằng HTTP 503 nếu Redis storage không sẵn sàng. `/api/v1/health/live` chỉ xác nhận tiến trình sống. `/api/v1/health` kiểm tra PostgreSQL, Redis và job worker; nếu dependency lỗi/timeout sẽ trả 503 cùng trạng thái an toàn cho từng thành phần. Hai health route bỏ qua throttling để probe không bị limiter chặn.

Swagger UI ở `http://localhost:4000/api/docs`, OpenAPI JSON ở `/api/docs-json`. Swagger mô tả các endpoint đã triển khai, cùng DTO/envelopes và Bearer authentication cho users APIs.

Khởi động tất cả service local và test:

```bash
npm run infra:configure
npm run auth:configure
npm run payment:configure
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

C’MEMBER rates: SILVER 0.05, GOLD 0.07, DIAMOND 0.10, tập trung trong `DiscountService` export từ UsersModule. Endpoint chỉ đọc tier/points được quản lý server; payment success cộng điểm một lần theo conversion trong phần Phase8 bên dưới. Không tự đặt ngưỡng thăng hạng khi đặc tả chưa có.

Đăng nhập demo bằng `customer@nova.local`, `staff@nova.local`, `admin@nova.local` và password riêng `SEED_DEMO_PASSWORD` trong `.env`. Trong Swagger, copy `data.accessToken` từ login vào Authorize; refresh/logout nhận refresh token trong JSON body. Frontend Sandbox chưa được nối vào API này.

## Phase 4: Movies, Cinemas, Rooms và Seats

**22 operations mới** theo Controller → Service → Repository → Prisma. GET danh mục và ghế vật lý là public để GUEST/CUSTOMER/STAFF đều có thể xem; mọi POST/PATCH/DELETE chỉ ADMIN, kiểm tra bằng global JWT/role guards. STAFF có quyền đọc, không được thay danh mục. Các DTO từ chối trường thừa, null trên trường bắt buộc, UUID/enum sai và pagination ngoài giới hạn.

| Resource | Endpoints                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Movies   | `GET/POST /api/v1/movies`, `GET/PATCH/DELETE /api/v1/movies/:id`                                                          |
| Cinemas  | `GET/POST /api/v1/cinemas`, `GET/PATCH/DELETE /api/v1/cinemas/:id`                                                        |
| Rooms    | `GET/POST /api/v1/rooms`, `GET/PATCH/DELETE /api/v1/rooms/:id`, `GET /api/v1/cinemas/:cinemaId/rooms`                     |
| Seats    | `GET/POST /api/v1/rooms/:roomId/seats`, `POST /api/v1/rooms/:roomId/seats/generate`, `GET/PATCH/DELETE /api/v1/seats/:id` |

List responses nằm trong `data.items` và `data.meta = {page,limit,total,totalPages}`. Mặc định page1/limit20, limit tối đa100; page tối đa1.000.000. Item query và count dùng chung snapshot REPEATABLE READ, sort có UUID tie-breaker để thứ tự ổn định. Các filters kết hợp với nhau:

- Movies: `status`, `ageRating`, `keyword` (title, không phân biệt hoa thường).
- Cinemas: `city` (exact, không phân biệt hoa thường), `keyword` (name/address).
- Rooms: `cinemaId`, `roomType`, `keyword` (name); nested cinema route nhận `roomType`, `keyword` và pagination.
- Seats theo room: `seatRow`, `seatType` và pagination; sort row/column/UUID. Đây là **ghế vật lý**, chưa có status ghế theo suất chiếu.

Movie create nhận title, description, durationMinutes (integer1–600), releaseDate (ISO timestamp có Z/offset), ageRating, status tùy chọn (COMING_SOON mặc định), posterUrl/trailerUrl HTTP(S) nullable. Ngày được trả UTC; PATCH URL=null để xóa link. Thời lượng phim đã có showtime tham chiếu không được thay đổi, kể cả suất đã qua; có thể sửa metadata/status hoặc giữ nguyên duration. DELETE phim đang có showtime trả409; dùng status ENDED khi muốn ngừng hiển thị trong danh sách NOW_SHOWING.

Room create nhận `{cinemaId,name,roomType}` và bắt đầu `totalSeats:0`; tên phòng unique trong cùng cinema. `totalSeats` luôn được tính từ số seat rows thật, không cho client truyền. Phòng có showtime không được chuyển cinema hoặc đổi roomType; vẫn có thể đổi name. Xóa cinema còn phòng, room còn showtimes/seats, hoặc movie còn showtimes đều409, không cascade xóa lịch sử. Dữ liệu thiếu404; duplicate name/seat coordinate409. FK vẫn bảo vệ các race xảy ra sau precheck.

Ví dụ sinh ma trận ghế bằng ADMIN trong Swagger:

```json
{
  "rows": ["A", "B", "C", "D", "E", "F", "G", "H"],
  "columns": 20,
  "vipRows": ["C", "D", "E", "F"],
  "sweetboxRows": ["H"]
}
```

Chỉ sinh cho phòng rỗng, chưa có showtime; lần thứ hai409 và giữ nguyên IDs. Row labels được trim/uppercase, unique, gồm1–8 chữ A–Z; tối đa26 hàng và50 cột (1300 ghế). VIP/Sweetbox rows phải nằm trong rows và không chồng nhau; các hàng còn lại STANDARD. Server tự lưu multiplier Decimal1.00/1.20/1.50 và trả string có2 chữ số, không nhận priceModifier từ client.

Single-seat create/PATCH nhận seatRow/seatColumn/seatType; không nhận roomId để di chuyển ghế, status hoặc giá frontend. Sinh/thêm/xóa ghế và cập nhật sức chứa cùng transaction, khóa room bằng PostgreSQL FOR UPDATE. Hai generate đồng thời có đúng một winner; thêm/xóa ghế đồng thời không mất count. Khi room đã có bất kỳ showtime nào, API đóng băng toàn bộ layout (generate/create/PATCH/DELETE409), bảo vệ ghế/snapshot của các phase sau. Không tự thay ID hoặc tái sinh layout đang dùng.

Chạy thử sau khi setup theo đầu README:

```bash
npm run check
npm run test:db
npm run start:dev
```

Swagger `/api/docs`: login `admin@nova.local` với password riêng SEED_DEMO_PASSWORD trong `.env`, dùng data.accessToken tại Authorize rồi thao tác catalog. Public list có thể gọi trực tiếp:

```bash
curl 'http://127.0.0.1:4000/api/v1/movies?status=NOW_SHOWING&page=1&limit=6'
```

Phase4 không cần migration/dependency/env mới. Schema14 models và SQL constraints Phase1 được giữ nguyên. Showtimes/BR03/TC-02 thuộc Phase5; realtime seat status và hold thuộc các phase sau. Frontend Sandbox vẫn độc lập.

## Phase 5: Showtimes — BR03, TC-02

| Method | Endpoint                | Quyền                                   |
| ------ | ----------------------- | --------------------------------------- |
| GET    | `/api/v1/showtimes`     | Public; pagination và filters           |
| GET    | `/api/v1/showtimes/:id` | Public; chi tiết, kể cả suất đã qua     |
| POST   | `/api/v1/showtimes`     | ADMIN; tạo lịch, trả201                 |
| PATCH  | `/api/v1/showtimes/:id` | ADMIN; sửa suất chưa có booking         |
| DELETE | `/api/v1/showtimes/:id` | ADMIN; xóa suất chưa có booking, trả200 |

Tạo suất trong Swagger bằng access token ADMIN từ login:

```json
{
  "movieId": "UUID_PHIM_THAT_TU_API_MOVIES",
  "roomId": "UUID_PHONG_THAT_TU_API_ROOMS",
  "startTime": "2042-01-01T10:00:00+07:00",
  "baseTicketPrice": "90000.00"
}
```

Thay hai giá trị UUID bằng IDs thật; cấu hình ghế trước khi tạo lịch vì Phase4 đóng băng layout khi có showtime. `startTime` bắt buộc timestamp ISO đầy đủ giây và timezone Z/offset, tối đa3 chữ số milliseconds. Giá là **chuỗi Decimal dương**, tối đa12 chữ số nguyên và2 số thập phân; không nhận JSON number, exponent, giá0 hay client `endTime`. Response trả thời gian UTC và giá fixed2 string, kể cả `999999999999.99` không mất độ chính xác.

Server tính `endTime = startTime + movie.durationMinutes + 15 phút dọn phòng` trong transaction sau khi khóa movie/room. Overlap trong cùng room là `other.startTime < newEnd AND other.endTime > newStart`, PATCH exclude chính ID đang sửa. Phim120 phút, suất10:00 kết thúc12:15: suất12:00 trả **409 SHOWTIME_CONFLICT**, suất12:15 được phép. Constraint GiST `[start,end)` vẫn bảo vệ writes ngoài service. Movie/room thiếu404; UUID/null/trường thừa/giá/ngày sai400.

List nhận `movieId`, `cinemaId`, `roomId`, `date`, `page`, `limit`; filters kết hợp AND, sort startTime/UUID tăng dần, items/count cùng REPEATABLE READ snapshot. **Không có date: chỉ suất có startTime >= server now. Có date=YYYY-MM-DD: toàn ngày Việt Nam UTC+07:00, từ00:00 inclusive đến00:00 ngày sau exclusive**, cho phép đọc lịch sử. Ví dụ `?movieId=<UUID>&cinemaId=<UUID>&date=2042-01-01&page=1&limit=20`. Mặc định page1/limit20, tối đa100. ADMIN có thể tạo/sửa lịch quá khứ nếu chưa có booking; API này quản lý lịch, không xác nhận một suất còn đặt vé được. Điều kiện đặt vé tương lai và availability thuộc Phase6.

Mọi sửa đổi thực tế về movie/room/thời gian/giá hoặc DELETE khi có **bất kỳ booking nào, kể cả CANCELLED/EXPIRED**, trả409 `SHOWTIME_IN_USE`; không cascade lịch sử. PATCH không thay giá trị thực tế trả nguyên bản, không đổi updatedAt. Locks movie IDs sorted → room IDs sorted → showtime row; reload row sau lock, retry tối đa3 transactions nếu concurrent move đổi parent IDs hoặc PostgreSQL báo deadlock/serialization conflict. Hết retry trả409 `SHOWTIME_CHANGED`. Không đọc duration từ ngoài transaction, không ghi đè các trường PATCH bị bỏ qua.

Phase5 dùng lại schema/migration/dependencies/env hiện có. TC-02 đã qua HTTP API với PostgreSQL/Redis thật; chưa triển khai seat map theo suất, giữ ghế hay booking APIs.

## Phase 6: Booking, Pricing, Seat Lock và Auto Release

Nâng cấp từ Phase5 trong môi trường đã cài dependencies:

```bash
cd backend
npm run infra:up:test
npm run prisma:generate
npm run db:migrate
npm run db:migrate:test
npm run check
npm run test:db
node scripts/smoke-booking.cjs
npm run start:dev
```

Migration mới `20261015000100_booking_snapshots_idempotency` bổ sung5 cột nullable của Booking: baseTicketPrice, membershipTier, discountRate, idempotencyKey và requestHash; unique(userId,idempotencyKey) và CHECK cho snapshot/hash. Legacy bookings giữ NULL, không tự bịa giá/hạng cũ. Giữ nguyên14 models và tất cả constraints/migration Phase1. Không thêm dependency, secret hay env requirement. **Cần generate client và migrate trước khi chạy code mới**; không dùng db push/reset.

| Method | Endpoint                      | Quyền/kết quả                                        |
| ------ | ----------------------------- | ---------------------------------------------------- |
| POST   | `/api/v1/bookings/hold`       | Đăng nhập; giữ1–20 ghế, trả201                       |
| GET    | `/api/v1/bookings/me`         | Chỉ đơn của mình; status/page/limit                  |
| GET    | `/api/v1/bookings/:id`        | Chỉ đơn của mình; tự xử lý overdue hold              |
| POST   | `/api/v1/bookings/:id/cancel` | Chỉ đơn của mình; không cần body; trả200, idempotent |
| GET    | `/api/v1/combos`              | Public; active combos, pagination                    |
| POST   | `/api/v1/combos`              | ADMIN; name/description/price/imageUrl?/isActive?    |
| PATCH  | `/api/v1/combos/:id`          | ADMIN; sửa giá/metadata, bật/tắt active              |

Tất cả CUSTOMER/STAFF/ADMIN đã đăng nhập có thể đặt vé của mình; không role nào được đọc/hủy đơn người khác qua endpoints này (404). Không trả user email, token, requestHash hoặc idempotencyKey trong booking response. Combo price là chuỗi Decimal không âm, cùng giới hạn12 số nguyên/2 thập phân; null chỉ được dùng để xóa imageUrl. Combo thiếu/inactive không được đặt. Tắt combo không làm đổi BookingCombo.unitPrice đã snapshot.

Trong Swagger đăng nhập, Authorize bằng access token, lấy IDs từ movies/showtimes/physical seats/combos. POST hold chỉ gửi IDs và quantity:

```json
{
  "showtimeId": "UUID_SUAT_CHIEU_THAT",
  "seatIds": ["UUID_GHE_THAT_1", "UUID_GHE_THAT_2"],
  "comboItems": [{ "comboId": "UUID_COMBO_THAT", "quantity": 2 }]
}
```

`comboItems` tùy chọn; tối đa20 combo IDs unique, quantity integer1–20 mỗi loại. Seat IDs unique sau normalize chữ hoa/thường, phải nằm trong room của showtime, tối đa20; suất chưa bắt đầu tại DB clock. Client không được gửi giá, userId, status, tier hoặc expiredAt. Sai DTO400, ghế không thuộc phòng400 SEATS_NOT_IN_ROOM, combo không khả dụng400 COMBO_UNAVAILABLE, showtime thiếu404, suất đã bắt đầu409 SHOWTIME_STARTED, ghế đang HOLDING/SOLD hoặc mutex đang bận409 SEAT_UNAVAILABLE. Redis lock lỗi503 và không tạo booking.

Header tùy chọn **Idempotency-Key: UUID** nên được giữ nguyên khi retry cùng một yêu cầu. Scope theo user; cùng normalized body (không phụ thuộc thứ tự ghế/combo hoặc UUID case) trả201 với **booking cũ và trạng thái hiện tại**, không tạo đơn/ghế mới và không gia hạn expiredAt. Body khác cùng key409 IDEMPOTENCY_CONFLICT. Đơn đã EXPIRED/CANCELLED được trả lại đúng trạng thái; muốn đặt lại dùng key mới. Khi không gửi key, giữ lại cùng ghế đang bận trả409.

Giá vé = baseTicketPrice × STANDARD1.00/VIP1.20/SWEETBOX1.50; từng vé làm tròn2 số HALF_UP rồi cộng. Combo69K ×quantity, discount SILVER5%/GOLD7%/DIAMOND10% trên tổng vé+combo, discount làm tròn2 số một lần, final=subtotal-discount. Toàn bộ phép toán Decimal từ chuỗi, không dùng JS floating-point; mọi amount trả fixed2 string, discountRate fixed3. Snapshot base price/tier/rate, từng seat.price, combo.unitPrice và totals lưu cùng transaction. Tổng/đơn giá/subtotal vượt999999999999.99 trả400 BOOKING_AMOUNT_OUT_OF_RANGE; không ghi một phần. Ví dụ3 loại ghế với base90000 và2 combo69000: ticket333000, combo138000, Silver discount23550, final447450. Phase6 chỉ snapshot giá; payment/points đã có ở Phase8, ticket ở Phase9.

Hold có expiredAt **đúng createdAt+300000ms** từ PostgreSQL clock, không dùng Redis TTL để thay5 phút nghiệp vụ. Mutex Redis10 giây có owner token, acquire all-or-none bằng Lua, release compare-and-delete; transaction và partial unique active seat index là rào chắn cuối cùng. Cancel/expiry khóa booking FOR UPDATE, cập nhật booking + HOLDING→AVAILABLE + durable seat_released cùng transaction; giữ lịch sử rows. PAID hoặc SOLD luôn được bảo vệ. Suất có booking sẽ bị Phase5 chặn đổi lịch/giá.

Outbox relay poll1 giây, batch20, lease30 giây và SKIP LOCKED; chỉ xử lý booking.expiration.requested. Enqueue **sau commit**, queue seat-expiration/job expire-booking-hold, ID booking-expire-UUID (BullMQ không cho dấu `:` trong custom ID), delay là thời gian còn lại đến deadline gốc. Retry exponential và stable job ID bảo vệ duplicate delivery. Worker concurrency5, kiểm tra DB dưới row lock; chạy sớm moveToDelayed theo deadline cũ, chạy lặp/no-longer-HOLDING là no-op. Cancel giữ delayed job cũ; job đó về sau không giải phóng ghế của đơn mới.

Hold và GET detail xử lý lazy expiry; GET me và background sweep xử lý tối đa100 overdue bookings mỗi lượt, background mỗi5 giây và ngay startup. Vì vậy lỗi publish/Redis restart/lost delayed jobs không khiến ghế bị khóa vô hạn; backlog lớn được xử lý qua nhiều lượt. Job failures giữ tối đa7 ngày/10000 jobs; completed jobs tối đa1 ngày/10000. API process hiện chứa cả worker và recovery loop; tách deployment thuộc Phase12.

`seat_locked`/`seat_released` được ghi vào outbox sau khi transaction thành công có thể quan sát, chưa đánh dấu delivered. WebSocket, seat-map và gợi ý ghế nhóm đã có ở Phase7. Payment failure/cancel webhook Phase8 dùng cùng release transaction; TC-04 đã kiểm chứng. UI frontend chưa được nối API.

## Phase 7: Seat map, gợi ý nhóm và WebSocket

Nâng cấp từ Phase6: chạy `npm ci` để cài đúng lockfile mới (`socket.io-client@4.8.4` là dev dependency dùng cho tests/smoke), sau đó `npm run check`, `npm run test:db`, `node scripts/smoke-booking.cjs`, `npm run start:dev`. Không có migration, secret, biến môi trường hay runtime dependency mới. Local PostgreSQL/Redis tiếp tục dùng cấu hình hiện có.

| Method | Endpoint                                                                      | Quyền/kết quả                                                |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| GET    | `/api/v1/showtimes/:showtimeId/seats`                                         | Public; snapshot ghế và capacity, tối đa120 requests/IP/phút |
| GET    | `/api/v1/showtimes/:showtimeId/group-seat-suggestion?quantity=3&seatType=VIP` | Public; quantity1–20, seatType tùy chọn; không giữ ghế       |

Seat-map trả `data = {showtimeId,roomId,startTime,asOf,canBook,capacity,seats}`. Mỗi ghế `{seatId,row,column,type,price,status,expiresAt}`; status AVAILABLE/HOLDING/SOLD theo đúng showtime, price là chuỗi Decimal fixed2 trước C’MEMBER, expiresAt chỉ có cho hold còn hạn. Capacity gồm total/available/holding/sold từ số ghế vật lý thật. Không trả bookingId/user/email trong map. `asOf` từ DB clock, `canBook` chỉ xét suất chưa bắt đầu; client vẫn kiểm tra available capacity và hold qua API đăng nhập.

Một lần đọc sử dụng REPEATABLE READ để room, base price, physical seats và ownership cùng snapshot. Lazy cleanup tối đa100 overdue holds của suất/lượt; phần backlog đã quá hạn được suy ra AVAILABLE theo DB clock, hold API vẫn tự giải phóng rows liên quan trong transaction trước khi giữ lại. Không tạo rows AVAILABLE dư thừa, không suy ra free từ deadline của PAID/SOLD. Lịch sử đã qua vẫn xem được map nhưng suggestion trả409 SHOWTIME_STARTED; ID thiếu404, UUID/query sai400; room rỗng có capacity0.

Suggestion trả `{showtimeId,quantity,seatType,seatIds,asOf}`; không có dải phù hợp trả `seatIds:[]`. Chỉ cùng hàng và column tăng liên tiếp, không bắc qua ghế HOLDING/SOLD, ghế thiếu hoặc type khác. Nếu yêu cầu seatType, tất cả ghế phải thuộc type đó; không tự đổi loại. Ưu tiên tâm hàng vật lý (kể cả ghế bận), sau đó row label và cột đầu tăng dần để kết quả ổn định. Sort một lần theo hàng/cột rồi scan sliding windows và chỉ copy best window cuối: **O(S log S + S + N)** time, **O(S)** space. Gợi ý là tư vấn tại snapshot, không phải reservation; gửi IDs qua authenticated POST hold và xử lý409 nếu người khác giữ trước.

Socket.IO namespace **`/seats`**, Engine.IO path mặc định **`/socket.io`**, chỉ transport websocket, max payload16KiB. Dùng Socket.IO client, không dùng native `new WebSocket('/seats')`. Kênh chỉ đọc dữ liệu public nên GUEST không cần JWT; giữ/hủy/đổi trạng thái chỉ qua HTTP API có guard. Origin trình duyệt phải nằm trong CORS_ORIGINS; native client không gửi Origin được phép. Server kiểm tra Origin ở handshake, không chỉ dựa vào CORS headers. Redis limiter shared:30 kết nối/IP/phút,60 join/leave requests/IP/phút, kể cả payload sai; storage lỗi thì fail-closed.

| Client event     | Payload               | Ack                                                                   |
| ---------------- | --------------------- | --------------------------------------------------------------------- |
| `join_showtime`  | `{showtimeId:"UUID"}` | `{success:true,data:{showtimeId,room,joined:true}}`                   |
| `leave_showtime` | `{showtimeId:"UUID"}` | `{success:true,data:{showtimeId,room,joined:false}}`; lặp lại an toàn |

Room luôn `showtime:UUID` do server tạo. Join chỉ chấp nhận showtime tồn tại; unknown fields/room tùy ý bị từ chối. Một socket theo dõi tối đa1 showtime; join mới thành công sẽ leave room cũ. Các thao tác trên cùng socket được serialize. Ack lỗi có `{success:false,error,message}`, không echo dữ liệu riêng hoặc exception. Không có socket handler cho hold, payment hay ghi trạng thái ghế.

| Server event      | Dữ liệu public ngoài `eventId`, `occurredAt`                       |
| ----------------- | ------------------------------------------------------------------ |
| `seat_locked`     | `{showtimeId,bookingId,seatIds,expiresAt}`                         |
| `seat_released`   | `{showtimeId,seatIds}`                                             |
| `seat_sold`       | `{showtimeId,seatIds}`; phát sau payment SUCCESS commit ở Phase8   |
| `resync_required` | `{reason:"REDIS_UNAVAILABLE"}` hoặc `{reason:"REDIS_RECONNECTED"}` |

Relay chỉ đọc committed outbox rows, claim20/lease30s/SKIP LOCKED, publish qua Redis có acknowledgement rồi mới ack outbox. Mỗi instance có2 ioredis connections pub/sub và chỉ emit local namespace room của mình; không cần sticky sessions vì chỉ dùng websocket. Channel có BULLMQ_PREFIX và Redis DB (Redis Pub/Sub không tự chia theo DB). Payload được validate và dựng lại từ whitelist, không chuyển tiếp arbitrary JSON. Publish/ack failure có durable retry/backoff với eventId không đổi; stale lease được reclaim. Redis subscriber reconnect sẽ subscribe lại trước khi phát resync_required. Readiness có thêm `checks.realtime` (subscriber readiness + publisher PING).

**Events là thông báo cần tải lại snapshot**, không phải state version hoặc bảo đảm thứ tự/exactly-once. Retry có thể gửi trùng hoặc muộn; deduplicate bằng eventId và đọc map mới nhất thay vì tăng/giảm capacity theo delta. Pub/Sub không lưu lịch sử cho client offline: đăng ký listeners trước, join và nhận ack rồi GET map; reconnect/resync cũng GET lại. Coalesce refresh và không để responses cũ ghi đè responses mới. Ví dụ client chạy được sau khi thay UUID thật:

```javascript
import { io } from "socket.io-client";
const showtimeId = "UUID_SUAT_CHIEU_THAT";
const socket = io("http://localhost:4000/seats", {
  transports: ["websocket"],
  autoConnect: false,
});
const seen = new Set();
let dirty = false;
let active = false;
let timer;
function refreshSoon() {
  dirty = true;
  if (!active && !timer)
    timer = setTimeout(() => {
      timer = undefined;
      void refresh();
    }, 1000);
}
async function refresh() {
  active = true;
  dirty = false;
  try {
    const response = await fetch(
      `http://localhost:4000/api/v1/showtimes/${showtimeId}/seats`,
    );
    if (!response.ok) throw new Error(`Seat map HTTP ${response.status}`);
    console.log((await response.json()).data);
  } catch (error) {
    console.error(error);
  } finally {
    active = false;
    if (dirty) refreshSoon();
  }
}
for (const name of ["seat_locked", "seat_released", "seat_sold"]) {
  socket.on(name, (event) => {
    if (seen.has(event.eventId)) return;
    seen.add(event.eventId);
    if (seen.size > 1000) seen.delete(seen.values().next().value);
    refreshSoon();
  });
}
socket.on("resync_required", refreshSoon);
socket.on("connect", () =>
  socket.emit("join_showtime", { showtimeId }, (ack) => {
    if (ack.success) refreshSoon();
    else console.error(ack.error);
  }),
);
socket.on("connect_error", (error) => console.error(error.message));
socket.connect();
```

Các API instances dùng chung database/outbox **phải dùng cùng Redis DB và BULLMQ_PREFIX**. Môi trường độc lập dùng database độc lập. Chạy các HTTP suites và production smoke **nối tiếp** nếu chúng dùng chung TEST_DATABASE_URL; namespace riêng không cô lập shared outbox. `npm run check && npm run test:db && node scripts/smoke-booking.cjs` là chuỗi đã kiểm chứng. Test suites dùng persistent HTTP servers với free ports, cleanup đúng owned fixtures/sockets/Redis keys. Frontend Next.js chưa nối API; trang Sandbox backend Phase8 chạy độc lập.

## Phase 8 — Sandbox payment

**Đây là thanh toán mô phỏng, không thu tiền thật.** URL mở một trang Sandbox do chính backend phục vụ với ba nút SUCCESS/FAILED/CANCELLED. Không cần tài khoản MoMo/VNPay, không nhập thông tin ngân hàng. Frontend Next.js vẫn độc lập; payment status phải đọc từ backend, không tin query string trên trang return.

Nếu nâng cấp từ Phase7:

```bash
cd backend
npm ci
npm run payment:configure
npm run infra:up:test
npm run check
npm run test:db
node scripts/smoke-booking.cjs
npm run start:dev
```

Không có migration hoặc dependency mới. `payment:configure` tạo key local ngẫu nhiên vào ignored `.env` quyền0600, chạy lại giữ nguyên key; có injected key thì không copy vào file. Key phải ≥32 ký tự, khác cả hai JWT secrets. Không dùng key production cho Sandbox công khai. Các instances cùng DB/outbox phải dùng cùng key, Redis DB/BULLMQ_PREFIX và base URL của deployment.

| Setting                    | Mặc định và ý nghĩa                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `PAYMENT_SANDBOX_SECRET`   | Bắt buộc; helper tạo private key local, không in giá trị                                                            |
| `PAYMENT_SANDBOX_BASE_URL` | Origin backend, mặc định `http://localhost:PORT` (PORT4000); không có path/trailing slash; HTTPS ngoại trừ loopback |
| `PAYMENT_RETURN_ORIGINS`   | Exact origins phân cách dấu phẩy; mặc định localhost:3000 và127.0.0.1:3000; HTTPS ngoại trừ loopback                |

| Method/path dưới `/api/v1`          | Auth                    | Kết quả                                                                           |
| ----------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| POST `/payments/create-sandbox-url` | JWT owner               | 201 signed URL cho một active hold; repeat cùng booking/return URL trả cùng URL   |
| POST `/payments/webhook`            | HMAC-SHA512, không JWT  | 200 applied/duplicate; conflicting terminal outcome409                            |
| GET `/payments/:bookingId/status`   | JWT owner               | booking/payment states, amount fixed2, expiredAt, canPay; nonowner kể cả ADMIN404 |
| GET `/payments/sandbox`             | Signed query capability | HTML chọn kết quả mô phỏng; no-store/no-referrer                                  |
| POST `/payments/sandbox/complete`   | Signed checkout +result | Form simulator; dùng cùng state machine, trả HTML kết quả                         |

Thử bằng Swagger `/api/docs`: login, Authorize access token, POST bookings/hold để lấy bookingId. POST create-sandbox-url với JSON gồm `bookingId` đó và `returnUrl` là `http://localhost:3000/`. Mở `data.url` trong trình duyệt trước hạn5 phút; chọn kết quả, rồi GET payment status/booking/membership để kiểm tra. Trang kết quả có link quay lại return URL; ứng dụng phải gọi status API để xác nhận. URL là capability của Sandbox: người có link có thể mô phỏng kết quả, không chia sẻ/log query string. HMAC secret chỉ nằm phía server.

Một Sandbox attempt cho một booking qua service; repeated create được serialize trên booking lock, không tạo transactionCode khác hoặc gia hạn expiredAt. Chọn return URL khác cho attempt đang tồn tại trả409PAYMENT_REQUEST_CONFLICT. Amount lấy Booking.finalAmount, không tính lại từ giá/tier hiện hành. Client không được gửi amount/status/userId/transactionCode khi create. `canPay` kiểm tra booking/seat/deadline/showtime và payment state; payment PENDING một mình không chứng minh hold còn hợp lệ.

### Hợp đồng chữ ký

Các field là string; UUID checkout lowercase, orderCode `NOVA-` +32 lowercase hex, transactionCode `NOVA-SB-` +UUID, amount fixed2 VND không có dấu phân cách (ví dụ `85500.00`), timestamp UTC chính xác milliseconds (`2026-10-15T10:00:00.000Z`). Callback status chỉ SUCCESS/FAILED/CANCELLED; FAIL/PENDING không hợp lệ. Signature128 lowercase hex. Cả query lẫn body đều từ chối field lạ; duplicate form/query values là arrays nên bị reject.

HMAC-SHA512 input UTF8 gồm domain, dấu `:` và JSON string array theo đúng thứ tự. Không ký raw URL, không phụ thuộc thứ tự JSON object hoặc query params. Code Node.js đầy đủ cho phía mô phỏng trusted callback:

```javascript
const { createHmac } = require("node:crypto");
function signCheckout(payload, secret) {
  const fields = [
    payload.bookingId,
    payload.orderCode,
    payload.transactionCode,
    payload.amount,
    payload.timestamp,
    payload.returnUrl,
  ];
  return createHmac("sha512", secret)
    .update(`checkout.v1:${JSON.stringify(fields)}`, "utf8")
    .digest("hex");
}
function signWebhook(payload, secret) {
  const fields = [
    payload.bookingId,
    payload.orderCode,
    payload.transactionCode,
    payload.amount,
    payload.timestamp,
    payload.status,
  ];
  return createHmac("sha512", secret)
    .update(`webhook.v1:${JSON.stringify(fields)}`, "utf8")
    .digest("hex");
}
module.exports = { signCheckout, signWebhook };
```

Webhook JSON chứa bookingId/orderCode/transactionCode/amount/timestamp/status/signature. Checkout URL chứa bookingId/orderCode/transactionCode/amount/timestamp/returnUrl/signature. **Checkout signature không dùng được cho webhook.** Form simulator gửi các checkout fields đã ký và `result` được holder chọn; server xác minh capability rồi chạy payment state machine. Không có secret hay webhook-signing endpoint dành cho browser.

Verify timing-safe; verify binding booking/provider/order/transaction và amount bằng cả snapshot Payment/Booking. First callback timestamp không trước payment.createdAt−30s, không cũ hơn DB now−300s, không vượt now+30s. Giữ5 phút từ hold ban đầu và future showtime vẫn bắt buộc với SUCCESS; timestamp ký mới không gia hạn hold. Replay terminal outcome hợp lệ được ack dù đã quá freshness window, không thực hiện lại effects. Sai signature401, sai amount400, first timestamp sai400, khác terminal outcome409, booking/transaction không tồn tại404, hết hạn/đã hủy không payable409.

### Trạng thái, điểm và sự kiện

| Callback đầu tiên           | Booking/seat/payment trong cùng transaction                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| SUCCESS hợp lệ              | PAID / SOLD / SUCCESS; cộng điểm và ghi3 outbox events                                    |
| FAILED trước hạn            | CANCELLED / AVAILABLE / FAILED; release event +cancel-expiry request                      |
| CANCELLED trước hạn         | CANCELLED / AVAILABLE / CANCELLED; release event +cancel-expiry request                   |
| SUCCESS quá hạn/đã hủy      | Không bán ghế; commit expiry nếu cần, payment CANCELLED rồi409; không ảnh hưởng owner mới |
| FAILED/CANCELLED sau expiry | Giữ booking EXPIRED; finalize payment theo callback, không release lại                    |
| Same transaction/outcome    | 200 duplicate=true; không đổi amount/deadline/points/outbox                               |
| Terminal outcome khác       | 409; PAID/SOLD không bị release                                                           |

Points = **floor(finalAmount ×0.10 /1000)** bằng Decimal;1 điểm/10.000đ thanh toán. Ví dụ85500.00→8 điểm,319200.00→31 điểm. Hai constants `MEMBER_POINT_EARNING_RATE`/`MEMBER_POINT_REVENUE_UNIT` nằm tại member-points.ts. Increment được khóa theo user, kiểm tra overflow Int trước ghi; không tự đổi tier. Payment/points/seat/events lỗi thì rollback toàn bộ, retry callback cùng transactionCode an toàn.

SUCCESS ghi `seat_sold`, `booking.ticket.requested` và `booking.expiration.cancel.requested` trong transaction; Phase7 relay chỉ broadcast sau commit. Expiry relay xóa delayed job sau commit với retry; job đang active hoặc schedule đến muộn vẫn harmless vì worker kiểm tra DB. Redis/queue lỗi không biến một payment đã commit thành thất bại. `booking.ticket.requested {bookingId}` giữ pending cho Phase9; hiện **chưa phát hành QR/email/check-in**, nên TC-03 còn bước ticket existence. TC-04 đã hoàn tất, TC-03 phần PAID/SOLD/points/idempotency/Socket.IO đã pass.

Files mới trong Phase8:

```text
src/config/payment.config.ts
src/modules/payments/
  member-points.ts
  payment.dto.ts
  payment-signature.service.ts
  payment-signature.spec.ts
  payments.controller.ts
  payments.module.ts
  payments.repository.ts
  payments.service.ts
  sandbox-page.ts
scripts/configure-payment.cjs
test/payments.e2e-spec.ts
docs/validation-phase-8.md
```

## Tests và build

```bash
npm run check
npm run test:db
```

`check`: TypeScript (gồm seed/tests), typed lint (gồm prisma/scripts), **54 unit tests**, **146 HTTP/Socket.IO e2e tests** trên PostgreSQL/Redis thật và Nest build. `test:db`: **22 tests trên PostgreSQL thật**, kiểm tra ownership concurrent, release/history, SOLD exclusivity, INSERT/UPDATE/concurrent showtime conflicts và boundary, room/showtime FKs, exact Decimal, unique payment/ticket và conditional check-in primitive, seed idempotence/hash/schedule. Tổng222 tests; TC-01 chạy2 API instances và shared test DB/Redis, không mock concurrency.

Các test DB chứng minh constraint/nền tảng, không thay TC01–TC05 qua API. **TC-01/TC-02 đã kiểm chứng qua HTTP**, Phase7 kiểm tra Socket.IO qua2 API instances +Redis Pub/Sub thật, delayed expiry qua worker BullMQ thật; TC-04 hoàn tất; TC-03 đã kiểm chứng PAID/SOLD/points/events và một durable ticket request, còn phát hành vé ở Phase9. TC-05/check-in chưa có. Test expiry dịch chuyển timestamps của fixture cùng nhau để đi qua deadline, không đợi5 phút hoặc rút ngắn TTL production.

Smoke bản build với HTTP, automatic outbox relay và worker thật, tự cấp free port/ephemeral secrets/test fixtures rồi cleanup:

```bash
npm run build
node scripts/smoke-booking.cjs
```

## HTTP bootstrap

```bash
npm run build
npm run start:prod
```

```bash
curl -i http://127.0.0.1:4000/api/v1
```

HTTP 200 trả `{success:true,data:{phase:8,status:"running",health:"/api/v1/health",docs:"/api/docs"},message}`. API nghiệp vụ chưa có sẽ trả 404; frontend chưa gọi API này.

## Docker database and Redis lifecycle

```bash
npm run infra:up:test
npm run infra:down
```

`infra:down` dừng/xóa bốn container nhưng giữ volumes và dữ liệu. Không dùng `down -v` cho dữ liệu cần giữ. Compose hiện chạy PostgreSQL/Redis local; API Nest vẫn được chạy từ Node trên host. Docker hóa app/worker thuộc Phase 12.

## Cây mã nguồn hiện tại đến Phase 8

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
      20261015000100_booking_snapshots_idempotency/
        migration.sql
  scripts/
    configure-database.cjs
    configure-infrastructure.cjs
    configure-auth.cjs
    configure-payment.cjs
    test-database-target.cjs
    migrate-test-database.cjs
    smoke-booking.cjs
  src/
    common/
    config/
    database/
    health/
    queues/
      outbox/
      seat-expiration/
    redis/
    modules/
      auth/
      users/
      movies/
      cinemas/
      rooms/
      seats/
      showtimes/
      combos/
      bookings/
      showtime-seats/
      payments/
  test/
    app.e2e-spec.ts
    auth.e2e-spec.ts
    catalog.e2e-spec.ts
    showtime-conflict.e2e-spec.ts
    booking-concurrency.e2e-spec.ts
    seats-realtime.e2e-spec.ts
    payments.e2e-spec.ts
    jest-database.config.cjs
    schema.database-spec.ts
    setup-environment.cjs
  docs/
    validation-phase-1.md
    validation-phase-2.md
    validation-phase-3.md
    validation-phase-4.md
    validation-phase-5.md
    validation-phase-6.md
    validation-phase-7.md
    validation-phase-8.md
```

Các bootstrap/config/test Phase 0 được giữ; không có module API rỗng hoặc placeholder. Dừng sau Phase 8 và chờ **“TIẾP TỤC PHASE 9”**.
