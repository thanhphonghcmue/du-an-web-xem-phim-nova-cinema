# Phase 0 — Architecture Decision Record

Ngày: 14/10/2026. Nguồn yêu cầu: SUPER PROMPT MASTER BACKEND do người dùng gửi. ADR được lập ở Phase 0; Phase 1 đã triển khai schema/migration/seed; Phase 2 đã triển khai infrastructure HTTP/Prisma/Redis/BullMQ. Các API và service nghiệp vụ dưới đây là hợp đồng thiết kế, không phải tính năng đã chạy.

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

PricingService và DiscountService thuộc bookings, tách khỏi SeatBookingService. Payments không tự viết lại thuật toán giá hoặc hold. Queue processor chỉ gọi service nghiệp vụ; gateway không cập nhật DB. Shared infrastructure gồm config, Prisma, Redis, guards/decorators, error filter, response interceptor và validation.

## Ranh giới transaction

| Nghiệp vụ              | Dữ liệu commit cùng nhau                                                                         | Thao tác sau commit                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| hold 1–20 ghế          | booking HOLDING, seat snapshots, combo snapshots, expiresAt, outbox                              | đặt job expiry; seat_locked                  |
| cancel/fail/expiry     | khóa booking; cập nhật status booking + HOLDING seats → AVAILABLE; outbox                        | bỏ job hoặc để job idempotent; seat_released |
| payment success        | khóa booking/payment, xác nhận số tiền và hạn; PAID + SOLD + SUCCESS + cộng điểm một lần; outbox | seat_sold; tạo ticket/email có retry         |
| QR generation          | kiểm tra PAID, tạo ticket unique bookingId/ticketHash hoặc trả bản cũ                            | enqueue email                                |
| staff check-in         | kiểm tra thời gian/PAID và update WHERE isCheckedIn=false                                        | trả chi tiết vé                              |
| refresh                | khóa refresh row, revoke token cũ và tạo hash token mới                                          | trả token rotation                           |
| create/update showtime | khóa phòng, đọc thời lượng phim, tính endTime và check overlap, insert/update                    | trả lịch                                     |

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

Đây là kế hoạch đầy đủ; chỉ module nền tảng Phase 0–2 và database Phase 1/2 trong README/evidence đã được tạo. Module nghiệp vụ tương lai không có placeholder.

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
