# Phase 0 — Architecture Decision Record

Ngày: 14/10/2026, cập nhật Phase6 ngày15/10/2026. Nguồn yêu cầu: SUPER PROMPT MASTER BACKEND do người dùng gửi. Phase0–6 đã triển khai nền tảng, auth/catalog/showtimes, booking hold/cancel/pricing, Redis mutex, outbox/BullMQ expiry. Các phần gateway/group/payment/ticket/report bên dưới vẫn là hợp đồng cho các phase tiếp theo.

## Quyết định nền tảng

Backend NestJS chạy độc lập trong `backend/`, dùng package và lockfile riêng; frontend Next.js vẫn ở root repository. Cổng mặc định backend 4000, frontend 3000. API version `/api/v1`; Swagger UI `/api/docs` và OpenAPI JSON `/api/docs-json` đã bật. Không nối frontend demo vào backend chưa có nghiệp vụ.

Node.js 24 LTS, TypeScript 5 strict, NestJS 11, PostgreSQL, Prisma 6.19, Redis, BullMQ 5, Socket.IO, JWT, Argon2, class-validator/class-transformer, Jest 29 và Supertest. Dùng các major tương thích có lockfile; không tự chuyển sang NestJS 12 hay Prisma 7 giữa các phase. Prisma 6 cho phép schema datasource và migration workflow như đặc tả; không sinh client khi chưa có schema Phase 1.

Kiến trúc: Controller → Service → Repository → Prisma. Controller nhận DTO, guard và chuyển dữ liệu; service sở hữu nghiệp vụ và ranh giới transaction; repository nhận Prisma TransactionClient để cùng tham gia một transaction. Không đưa Prisma vào controller, không cho từng repository tự commit một phần của giao dịch lớn. Domain model/DTO dùng theo nhu cầu thực, không tạo interface/abstraction rỗng.

## Ranh giới module

| Module        | Trách nhiệm                                                | Phụ thuộc nghiệp vụ                                      |
| ------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| auth          | đăng ký/login, password hash, refresh rotation/revoke      | users và token repository                                |
| users         | hồ sơ, tier/points, membership                             | database                                                 |
| movies        | phim, trạng thái, thời lượng/nhãn tuổi                     | database                                                 |
| cinemas       | rạp, thành phố, địa chỉ                                    | database                                                 |
| rooms         | phòng/công nghệ/cấu hình ghế                               | cinemas                                                  |
| seats         | ma trận ghế vật lý, modifier                               | rooms                                                    |
| showtimes     | lịch và BR03, giá gốc; query seat map                      | movies, rooms, booking seat repository                   |
| combos        | giá combo hiện hành/active                                 | database                                                 |
| bookings      | quyền sở hữu ghế, hold/release/group, snapshot giá         | showtimes, seats, pricing, locks, outbox                 |
| payments      | URL Sandbox, HMAC, webhook idempotent                      | booking state machine, users, payment repository, outbox |
| tickets       | một QR cho một booking PAID, check-in atomic               | bookings, ticket repository                              |
| notifications | email ticket qua queue, retry độc lập                      | tickets, mail transport                                  |
| reports       | tổng hợp chỉ booking PAID                                  | database, filter DTO                                     |
| gateways      | namespace /seats; join theo showtime; broadcast sau commit | outbox dispatcher, showtimes                             |
| queues        | expiry worker, outbox relay, email retry                   | services nghiệp vụ                                       |
| health        | kiểm tra DB/Redis/queue, không giả báo khỏe                | infrastructure                                           |

PricingService thuộc bookings; shared DiscountService export từ UsersModule, tách khỏi SeatBookingService. Payments không tự viết lại thuật toán giá hoặc hold. Queue processor chỉ gọi service nghiệp vụ; gateway không cập nhật DB. Shared infrastructure gồm config, Prisma, Redis, guards/decorators, error filter, response interceptor và validation.

## Ranh giới transaction

| Nghiệp vụ              | Dữ liệu commit cùng nhau                                                                         | Thao tác sau commit                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| hold 1–20 ghế          | booking HOLDING, seat snapshots, combo snapshots, expiresAt, outbox                              | đặt job expiry; seat_locked                  |
| cancel/fail/expiry     | khóa booking; cập nhật status booking + HOLDING seats → AVAILABLE; outbox                        | bỏ job hoặc để job idempotent; seat_released |
| payment success        | khóa booking/payment, xác nhận số tiền và hạn; PAID + SOLD + SUCCESS + cộng điểm một lần; outbox | seat_sold; tạo ticket/email có retry         |
| QR generation          | kiểm tra PAID, tạo ticket unique bookingId/ticketHash hoặc trả bản cũ                            | enqueue email                                |
| staff check-in         | kiểm tra thời gian/PAID và update WHERE isCheckedIn=false                                        | trả chi tiết vé                              |
| refresh                | khóa refresh row, revoke token cũ và tạo hash token mới                                          | trả token rotation                           |
| create/update showtime | khóa movies → rooms → showtime, đọc duration, tính endTime và check overlap, insert/update       | trả lịch                                     |

Mọi event chỉ phát sau commit thành công. SMTP hoặc Redis lỗi không rollback một payment đã thành công. Với thông báo/queue không thể commit atomically cùng PostgreSQL, transactional outbox ghi sự kiện trong transaction DB; relay publish với event ID và consumer idempotent. Các thao tác payment/cancel/expiry đều khóa booking theo cùng thứ tự trước khi đổi trạng thái, tránh expiry giải phóng ghế ngay sau khi payment bán.

## Chống race condition và nhất quán

**Ghế**: Redis SET NX PX lock ngắn 10 giây với owner token; lấy khóa theo seatId đã sort, thất bại giải phóng những khóa đã lấy; Lua compare-and-delete khi unlock. Lock không thay thế hold 5 phút. PostgreSQL transaction và partial unique index `WHERE status IN ('HOLDING','SOLD')` là ràng buộc cuối cùng, kể cả Redis TTL hết khi request còn chạy. Lỗi unique được map sang HTTP 409 SEAT_UNAVAILABLE. History AVAILABLE không bị xóa và không dùng unconditional UNIQUE(showtimeId,seatId).

**Hạn giữ**: booking.expiresAt do server đặt một lần, 300 giây, không gia hạn khi retry. Worker kiểm tra trạng thái/hạn trong DB dưới row lock, không giải phóng PAID/SOLD. Query seat map và hold xử lý lazy expiry để booking hết hạn không khóa ghế vô hạn khi queue gián đoạn; outbox relay và sweep bù sau restart. Khi job chạy sớm thì reschedule theo thời gian còn lại.

**Lịch**: `[startTime,endTime)` với endTime = startTime + movie duration + 15 phút. Boundary end == next start được phép. Service kiểm tra overlap với exclude ID khi update; lock room tuần tự hóa việc tạo/update. Migration bổ sung PostgreSQL GiST exclusion trên room/time range với btree_gist để không thể bypass bằng hai transaction đồng thời. Phim đã được dùng trong lịch cần bảo vệ sửa duration; không âm thầm thay đổi endTime lịch cũ.

**Thanh toán**: HMAC-SHA512 constant-time compare, xác minh IDs/số tiền/transactionCode; mỗi transaction code unique, khóa payment và booking. Webhook lặp đúng dữ liệu trả kết quả trước đó; webhook reuse transactionCode với dữ liệu khác bị từ chối. Snapshot amount bất biến; PAID không thể chuyển thành CANCELLED/EXPIRED bằng webhook cũ. Booking hết hạn không được bán dù expiry worker chưa chạy.

**QR/check-in**: mặc định 1 booking → 1 e-ticket, unique bookingId + random ticketHash. QR chứa opaque hash, không email/thông tin nhạy cảm. Ticket chỉ tạo khi PAID; insert race unique trả bản tồn tại. Check-in conditional update affectedRows=1; scan đồng thời chỉ một success. Window cấu hình áp dụng theo server UTC.

**Database**: IDs UUID; timestamptz UTC; money Numeric(14,2), multiplier Decimal; tiền trả JSON string. Foreign keys/restrict bảo vệ lịch sử đã bán; không hard-delete phim/phòng có booking. Snapshot seat/combos/discount lưu lúc hold; không tin giá frontend. Report chỉ PAID, có index theo status/createdAt/showtimeId. Retry serialization/deadlock có giới hạn; không retry nghiệp vụ đã reject hoặc hiệu ứng ngoài transaction.

## Các mâu thuẫn đã giải quyết công khai

1. **Job ID `booking-expire:{bookingId}`**: BullMQ không cho `:` trong custom ID. Dùng `booking-expire-<bookingId>`; queue vẫn `seat-expiration`, job name vẫn `expire-booking-hold`, delay vẫn 300000ms. Không đổi BR02.
2. **Enqueue trong DB transaction**: Redis không có chung transaction PostgreSQL. Chọn outbox ghi trong transaction, enqueue sau commit qua relay và retry. Tránh orphan job hoặc hold không có expiry sau crash.
3. **Điểm 10% và ví dụ conversion**: chọn một constant `MEMBER_POINT_EARNING_RATE = 0.10`, `MEMBER_POINT_REVENUE_UNIT = 1000`. Earn = floor(finalAmount × 0.10 / 1000), dùng Decimal; tương đương 1 điểm trên mỗi 10.000đ tổng thanh toán. Định nghĩa này thực hiện 10% doanh thu quy đổi 1 điểm=1.000đ, không phải giảm giá thêm 10%. Chỉ cộng lần đầu SUCCESS. Nếu đặc tả nghiệp vụ sau này chọn conversion khác sẽ đổi constant và test.
4. **Phụ thuộc tickets/email ở Phase 8 nhưng triển khai Phase 9**: Phase 8 commit payment + outbox event durable; Phase 9 consumer phát hành ticket/email từ event. TC-03 cuối cùng yêu cầu có ticket sẽ hoàn thiện cùng Phase 9, không giả báo TC-03 hoàn chỉnh sớm.
5. **Prisma/API ghi AVAILABLE**: không tạo row AVAILABLE cho toàn bộ ghế/suất, nhưng giữ row AVAILABLE của hold đã release để bảo toàn history. Seat map suy ra available từ việc không có active row.

## Giá và ưu đãi BR05

Giá STANDARD ×1.0, VIP ×1.2, SWEETBOX ×1.5. Party Combo 69K mỗi đơn vị. Discount SILVER 5%, GOLD 7%, DIAMOND 10% trên subtotal gồm vé + combo theo prompt backend mới, khác frontend demo hiện tại chỉ giảm vé. Không âm thầm dùng logic frontend cho backend. Decimal làm tròn tiền về 2 chữ số thập phân, không cộng số tiền bằng number; quantity dùng integer. API hold chỉ nhận IDs và quantity, server truy vấn giá và snapshot.

## Cây thư mục đích theo phase

Đây là kế hoạch đầy đủ; chỉ các module Phase0–6 trong README/evidence đã được tạo. Module nghiệp vụ tương lai không có placeholder.

```text
backend/
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.build.json
  nest-cli.json
  eslint.config.cjs
  jest.config.cjs
  .env.example
  .dockerignore
  Dockerfile
  docker-compose.yml
  README.md
  docs/
    architecture.md
    phases.md
    validation-phase-0.md
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    main.ts
    bootstrap.ts
    app.module.ts
    app.controller.ts
    app.service.ts
    config/
      app.config.ts
      database.config.ts
      redis.config.ts
      jwt.config.ts
    common/
      decorators/
      guards/
      filters/
      interceptors/
      enums/
      exceptions/
      utils/
    database/
      prisma.module.ts
      prisma.service.ts
    redis/
      redis.module.ts
      redis.service.ts
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
        dto/
        entities/
        repositories/
        booking.controller.ts
        booking.service.ts
        seat-booking.service.ts
        pricing.service.ts
        discount.service.ts
        booking.module.ts
      payments/
      tickets/
      reports/
      notifications/
    queues/
      seat-expiration/
      outbox/
      mail/
    gateways/
      seats.gateway.ts
    health/
      health.controller.ts
  test/
    app.e2e-spec.ts
    jest-e2e.config.cjs
    helpers/
    booking-concurrency.e2e-spec.ts
    showtime-conflict.e2e-spec.ts
    payment.e2e-spec.ts
    ticket-check-in.e2e-spec.ts
```

Các module nghiệp vụ dùng DTO/entity/service/repository/controller/module khi có triển khai, không phải tất cả module đều cần abstraction giống nhau. Phase 11 dùng DB và Redis test riêng; không mock DB trong TC-01/02/03/04/05. Docker Compose production-style và kiểm tra DB/Redis thuộc Phase 12, không đưa forward reference Dockerfile chưa tồn tại vào lệnh Phase 0.

## Chấp nhận Phase 0

Cài lockfile, TypeScript strict compile, lint, unit tests và HTTP e2e test, start build với response thật trên `/api/v1`. Không cần PostgreSQL, Redis hoặc secret để chạy Phase 0. Endpoint bootstrap không tuyên bố database/queue đã khỏe. Dừng sau Phase 0 và chờ `TIẾP TỤC PHASE 1` theo yêu cầu người dùng.

## Database Phase 1 đã triển khai

Prisma schema có 13 model theo đặc tả và OutboxEvent. Các FK ghép bổ sung `roomId` vào BookingSeat và unique reference keys `(seat.id,roomId)`, `(showtime.id,roomId)`, `(booking.id,showtimeId)` để DB bảo đảm ghế/phòng/suất/booking cùng phạm vi. Đây là lớp nhất quán dữ liệu, không đổi API hold IDs của phase sau. FK dùng Restrict để giữ lịch sử. SQL partial unique, exclusion `[)`, CHECK tiền/modifier/quantity/timestamp/check-in/outbox được lưu trong migration; Prisma schema không biểu diễn trọn các ràng buộc này.

Seed chỉ thêm dữ liệu thiếu, giữ bản đã tồn tại, một transaction, không hard-code password. Image PostgreSQL 17 pin digest, hai local database tên/port/password khác nhau; credentials ignored 0600. DB conditional check-in test chỉ kiểm tra primitive update, chưa có role/window kiểm soát API.

## Infrastructure Phase 2 đã triển khai

PrismaModule là global, cung cấp PrismaService lifecycle và DatabaseRepository probe; controllers không nhận Prisma trực tiếp. RedisModule dùng một ioredis connection cho readiness và Lua rate storage. Local Compose bổ sung Redis 7.4 với password bắt buộc, AOF, `noeviction`, healthcheck xác thực password và development/test service/volume tách riêng. Docker Compose chạy infrastructure; API vẫn chạy native trên host đến Phase 12.

BullMQ đăng ký queue `infrastructure` với worker concurrency 2 và queue `seat-expiration` để phase sau. Health readiness thêm một `infrastructure-probe`, đợi worker trả `pong` rồi xóa job. Queue worker/events dùng Redis retry policy bắt buộc BullMQ; readiness có timeout độc lập. Queue này không xóa ghế hoặc xử lý expiry nghiệp vụ.

Global ValidationPipe transform/whitelist/forbidNonWhitelisted validate nested DTO, 400/413 parser errors dùng envelope thống nhất, API exception filter mask 5xx internal detail, success interceptor bọc data/message. Request ID, `helmet`, CORS allowlist, HTTP status/duration logging và Swagger OpenAPI schemas được gắn bootstrap. JWT config nhận secret tùy chọn để validate cấu hình trước Phase 3, nhưng Phase 2 không phát hành token hoặc bật auth.

Rate limiter dùng Lua script với per-identity SHA-256 namespaced key, atomic fixed-window count và block TTL; `ThrottlerGuard` gắn toàn cục, health routes skip. Redis failure trả 503 thay vì cho request đi qua bằng local-memory fallback. Test suite HTTP lấy connection từ các `TEST_*` env và BullMQ prefix per-run; không chạm dev Redis.

Readiness `/api/v1/health` kiểm tra Postgres/Redis/BullMQ song song có timeout, trả 200 healthy hoặc 503 degraded kèm status, timestamp và component statuses. `/api/v1/health/live` chỉ xác nhận tiến trình. Unknown 500 không lộ exception text; health/rate-limit 503 chỉ phát safe messages. Swagger mô tả routes hiện có, không quảng bá route nghiệp vụ chưa code.

## Authentication và Users Phase 3 đã triển khai — 15/10/2026

AuthController/UsersController chỉ xử lý DTO, status và chuyển lời gọi; AuthService/UserService sở hữu nghiệp vụ, AuthRepository/UsersRepository truy cập Prisma. AuthRepository truyền TransactionClient cho thao tác liên quan. Schema RefreshToken Phase 1 đáp ứng lưu session hash nên không cần migration mới; không thay đổi SQL constraints.

Public registration normalize email, Argon2id (19 MiB, 2 iterations, parallelism 1), CUSTOMER/SILVER/0 points và unique-email conflict mapping. PasswordService verify dummy Argon2id hash cho email không tồn tại để giảm khác biệt timing. Login luôn dùng cùng lỗi credentials cho password/email sai. Profiles không bao giờ select password hash; chỉ login repository lấy credential nội bộ. PATCH whitelist tên/số điện thoại, role/points/tier do server quản lý.

JWT HS256 được ký bằng secret riêng access/refresh, kiểm tra algorithm/issuer/audience/tokenUse/UUID sub+jti/expiry. Role không lấy từ JWT mà load từ DB mỗi request; GUEST/deleted users bị chặn. Global JwtAuthGuard mặc định bảo vệ mọi handler, `@Public()` cho root/health/auth. Global RolesGuard hỗ trợ method/class `@Roles`; `@CurrentUser()` chỉ trả safe profile. Không cấu hình auth bằng tài khoản demo hard-code.

Refresh JWT có random JTI, DB chỉ lưu SHA-256 digest token có entropy cao. Transaction thực hiện parameterized conditional UPDATE `revoked_at IS NULL AND expires_at > clock_timestamp()`, sau đó tạo successor trong cùng transaction. PostgreSQL row lock/condition làm 5 concurrent request chỉ 1 winner, không dùng memory lock. Nếu tạo successor lỗi, transaction rollback cả revoke; old token vẫn dùng được. Logout idempotently revoke token được trình; không revoke toàn bộ phiên hoặc access JWT đã phát hành (hết hạn ngắn). Token-family reuse revocation chưa được thêm vì nằm ngoài hợp đồng hiện tại.

Config JWT mandatory, distinct secrets >=32 ký tự; helper tạo random 48 bytes/secret và giữ trong `.env` 0600. Access default 15m/max1h, refresh default7d/max90d và dài hơn access. Tests dùng secrets ephemeral. Auth/profile responses `Cache-Control: no-store`, không log request bodies. Redis throttler login/register 5/IP/min, refresh30/min. Membership dùng shared DiscountService rates SILVER5%/GOLD7%/DIAMOND10%; chỉ đọc points/tier, reward khi payment success ở Phase 8 theo conversion ADR.

## Catalog Phase 4 đã triển khai

Movies/Cinemas/Rooms/Seats mỗi domain có controller, service, repository, DTO và module thực. UnitOfWork trong global PrismaModule cho service mở transaction xuyên repositories. Repository sở hữu parameterized SQL/Prisma; không có Prisma trong controllers. Không thay14 models/migration/lockfile. Single INSERT/UPDATE metadata không có business checks chạy atomic statement; mutation có dependency/structure/count checks dùng transaction và row lock.

GET catalog (kể cả physical seats) public, POST/PATCH/DELETE ADMIN-only, STAFF read-only. Đây là lựa chọn quyền đọc cho dữ liệu danh mục không có user/booking information, giữ admin mutation được bảo vệ mặc định. DTO validator strict, PartialType skipNullProperties=false cho non-null fields; media URL nullable rõ ràng. API response pagination chuẩn, list/count cùng REPEATABLE READ snapshot, stable tie-break UUID. Decimal priceModifier serialize thành fixed2 string.

Movie update/delete khóa movie FOR UPDATE trước load/check; duration thay đổi bị409 nếu có bất kỳ showtime tham chiếu. Room structure update/delete khóa room; roomType/cinemaId khóa khi đã có showtime. Cinema delete khóa cinema và từ chối còn child rooms. FK RESTRICT bổ sung protection cho insertion/deletion races. Không có soft-delete column nên API chỉ xóa record chưa tham chiếu; movie ENDED dùng để ngừng quảng bá.

SeatsService khóa room trước mọi layout mutation. Generate chỉ cho room rỗng, tối đa26 row labels ×50 columns; không overwrite IDs. Row labels uppercase unique; VIP và Sweetbox là subset disjoint của rows. SeatType ánh xạ multiplier ở server từ string Decimal constants. Generate/create/delete và recount/update room.totalSeats nằm cùng transaction; duplicate hoặc lỗi counter rollback toàn bộ. PATCH seatType cập nhật multiplier cùng statement; coordinate unique vẫn do DB bảo vệ. Không cho client ghi totalSeats, priceModifier, status, IDs/foreign IDs tùy ý.

Bất kỳ showtime nào trong room đều đóng băng toàn layout và venue/format của room, cả showtime lịch sử. Test trực tiếp giữ FK transaction của một showtime mới rồi gọi duration/layout mutation: FOR UPDATE chờ writer commit, sau đó read committed thấy reference và trả409. Đây là protection catalog, không phải TC-02 schedule API.

Hợp đồng cho Phase5: tạo/update showtime cần khóa movie(s) trước room(s), IDs sắp xếp ổn định, rồi đọc duration/room và tính endTime trong cùng transaction. Không được đọc duration bên ngoài transaction rồi insert sau khi lock. Kết hợp movie/room locks với GiST exclusion `[)` để bảo vệ cả catalog changes và schedule overlaps. Phase4 chưa có showtime endpoints, realtime availability hoặc booking holds.

## Showtime engine Phase 5 đã triển khai

ShowtimesController → ShowtimesService → ShowtimesRepository cùng MoviesRepository/RoomsRepository; UnitOfWork sở hữu transaction. GET public, writes ADMIN-only như catalog. DTO chỉ nhận movieId/roomId/startTime/baseTicketPrice; không cho client tính endTime. Timestamp có timezone và millisecond precision, giá dương Decimal(14,2) từ chuỗi và serialize fixed2. Không cần sửa schema/migration/dependencies/env.

Create khóa movie rồi room, đọc duration/room sau lock, tính thời gian +15 phút cleaning, query overlap và INSERT trong transaction READ COMMITTED. Update/delete đọc snapshot để xác định parent IDs, khóa tất cả movie IDs sorted rồi room IDs sorted, cuối cùng showtime FOR UPDATE và đọc lại. Nếu movieId/roomId đã đổi so với snapshot thì rollback/retry với bộ parents mới; tránh giữ sai room lock hoặc deadlock khi các suất đổi phòng/phim. Merge PATCH từ fresh row để không mất independent concurrent changes. Tối đa3 attempts cho snapshot change hoặc P2034/SQL deadlock; hết trả409 SHOWTIME_CHANGED. Không retry business conflict hay external side effects.

Overlap dùng strict `<`/`>` và exclude ID trên update. GiST exclusion từ Phase1 bảo vệ cả INSERT/UPDATE; riêng constraint showtimes_no_room_overlap được map409 SHOWTIME_CONFLICT, không chuyển mọi unknown DB error thành conflict. Không trả constraint/internal SQL ra client. No-op PATCH trả nguyên row. Khi có bất kỳ booking status nào, mọi thay đổi thực tế hoặc DELETE trả409 SHOWTIME_IN_USE; showtime row lock tương thích FK protection: chờ in-flight booking insert commit rồi kiểm tra lại trước mutation.

List/count chung REPEATABLE READ snapshot, sort startTime/UUID; filters movieId/cinemaId/roomId/date và pagination. Không date chỉ upcoming starts; có date là trọn ngày Việt Nam UTC+07:00 và có thể đọc history. Detail trả lịch sử không nhạy cảm. ADMIN được quản lý lịch quá khứ chưa tham chiếu; quyền hold/đặt vé tương lai vẫn phải được Phase6 kiểm tra, không suy ra từ việc GET detail thành công. Booking writers Phase6 phải khóa/read showtime trước lấy giá và snapshot, cùng một transaction, để không dùng giá/lịch cũ khi có concurrent schedule mutation.

TC-02 API đã kiểm chứng, gồm exact boundary và concurrent create/update trên PostgreSQL/Redis thật; fault injection chỉ bỏ advisory overlap precheck để xác nhận GiST rejection được map đúng. Chưa có holds/seat availability/payment/tickets. Evidence: validation-phase-5.md.

## Booking/Pricing/Expiry Phase 6 đã triển khai

BookingsController → BookingsService/SeatBookingService → BookingsRepository; PricingService dùng shared Decimal DiscountService. CombosModule cung cấp active list và ADMIN create/PATCH với server-loaded price. BookingsService serialize explicit safe fields; chỉ owner được GET/cancel kể cả caller ADMIN. Snapshot base price/membership tier/discount rate nullable để bảo toàn legacy history, line prices/totals bất biến sau hold. Migration mới thêm5 cột/CHECK và unique(userId,idempotencyKey), không backfill giả và không thay14 models/SQL constraints Phase1.

Optional Idempotency-Key UUID được serialize bằng PostgreSQL transaction advisory lock theo user/key, trước mutex ghế. Query advisory dùng executeRaw vì PostgreSQL void không deserialize qua Prisma queryRaw. Hash body canonical (lowercase UUIDs, sort IDs, chỉ comboId/quantity) đảm bảo reorder/case không đổi request. Same key/body trả original booking với current status và deadline cũ; mismatch409. DB compound unique là final protection; không dùng Redis cache làm authority cho idempotency.

Fresh hold lấy all-or-none Redis mutex10s/owner token, cùng hash slot theo showtime, IDs sorted, release Lua compare-and-delete sau transaction. Showtime FOR SHARE trước đọc giá/room để không chạy đua với Phase5 FOR UPDATE; các showtime mutation không cần đợi movie/room lock từ hold nên không tạo chu trình ngược. Layout đã frozen từ Phase4 khi có showtime. Tiếp theo khóa expired booking IDs sorted để lazy release, đọc active ownership; khóa/read membership FOR SHARE rồi combos FOR SHARE sorted. Pricing dùng Decimal string multipliers, round per-seat2 HALF_UP, discount subtotal2 HALF_UP, final difference; kiểm tra Numeric(14,2) capacity trước ghi. Clock_timestamp sau checks quyết định future showtime, createdAt và expiredAt=+300000ms. Insert Booking/BookingSeats/BookingCombos +expiry request/seat_locked outbox cùng READ COMMITTED transaction. Partial unique conflict tại seat INSERT map409 SEAT_UNAVAILABLE, rollback toàn bộ. Bounded retry3 cho DB serialization/deadlock; không retry business rejection.

Cancel/autoRelease/get-overdue khóa booking FOR UPDATE và đọc lại trạng thái/deadline theo DB clock. PENDING/HOLDING đến hạn →EXPIRED; owner cancel trước hạn →CANCELLED. Chỉ HOLDING seats →AVAILABLE; PAID/SOLD luôn no-release. Update booking/seats và seat_released outbox cùng transaction, failure rollback. Cancel/duplicate jobs trên terminal states no-op. GET own detail lazy-expires; GET me xử lý100 overdue rows/user trước snapshot pagination; sweep100 rows/startup/mỗi5s. Holds lazy-clean bookings liên quan requested seats nên không bị kẹt khi queue gián đoạn. Không mutate/delete lịch sử hoặc gia hạn khi retry. Payment Phase8 phải tuân lock order showtime→booking→user và commit state/seat/payment/outbox chung transaction.

Expiry relay chỉ claim booking.expiration.requested qua SKIP LOCKED, batch20, lease30s/fenced owner mới mỗi batch. Queue publish sau DB commit, deterministic job ID và backoff; ack/retry chỉ khi still owns lease. Worker concurrency5 load DB dưới lock; job đến sớm moveToDelayed và DelayedError theo deadline cũ, duplicate/no-longer-HOLDING no-op. Stable job retention1 ngày/10000 completed,7 ngày/10000 failed; background sweep bù mất job sau Redis restart. API process đăng ký worker+maintenance hiện tại; không giả tách worker deployment trước Phase12.

seat_locked/seat_released outbox giữ pending để Phase7 phát WebSocket sau commit, không ack giả. Payment/QR/points chưa được làm. TC-01 dùng2 app instances/real DB+Redis và real BullMQ worker; các fault injection có nhãn chỉ dùng để thử rollback/lỗi infra/precheck interleaving. Evidence: validation-phase-6.md. Không dependencies/env/secrets mới.
