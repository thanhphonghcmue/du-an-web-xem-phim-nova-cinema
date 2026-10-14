# NOVA Cinema Backend — Phase 0

Backend NestJS của NOVA CINEMA (INFINITY), triển khai theo từng phase trong yêu cầu của bạn. **Phase 0 cung cấp kiến trúc và HTTP bootstrap chạy được**, chưa có schema/database, xác thực, booking, payment, QR, email hoặc frontend integration. Frontend Next.js ở root vẫn là Sandbox độc lập.

## Architecture

Controller → Service → Repository → Prisma. Ranh giới module, transaction, PostgreSQL partial unique index, Redis lock ngắn, outbox, HMAC/idempotency và showtime exclusion constraint được xác định trong [docs/architecture.md](docs/architecture.md). Kế hoạch và phụ thuộc từng phase: [docs/phases.md](docs/phases.md).

Chọn NestJS 11, TypeScript 5 strict, Prisma 6.19, Redis/BullMQ 5. Dependencies cho các phase tiếp theo đã khai báo và khóa trong `package-lock.json`; cài package không đồng nghĩa tính năng đã được triển khai. Tiền backend sẽ dùng Decimal(14,2), timestamp UTC/timestamptz. Một booking sẽ có một QR. Phase 0 không import PrismaClient khi chưa tạo schema. Trong cloud hiện tại, Prisma CLI bị HTTP 403 khi tải checksum từ `binaries.prisma.sh`; không tắt checksum để bỏ qua. Domain đã được thêm vào cấu hình mạng dạng bản nháp, cần áp dụng và kiểm tra lại trước Phase 1. Điều này không chặn HTTP bootstrap Phase 0.

## Requirements và installation

Node.js **24 LTS** theo `.nvmrc` ở root; package hỗ trợ Node ≥22.12.0. Cần npm và mạng registry khi cài lần đầu. Phase 0 không cần PostgreSQL, Redis, Docker hoặc secret.

Từ root repository:

```bash
cd backend
npm ci
npm run check
npm run start:dev
```

Trong cloud này dùng cache được phép ghi:

```bash
cd /workspace/nova-cinema-skills-thanh-phong/backend
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run check
npm run start:dev
```

`npm run check` thực hiện typecheck, lint strict, unit, HTTP e2e và build. Expected result: TypeScript/ESLint không lỗi, Jest pass, Nest tạo `dist/main.js`. Backend mặc định lắng nghe cổng **4000**, không chiếm cổng 3000 của Next.js. Dừng bằng Ctrl+C.

## .env

`.env.example` chứa tên biến và cấu hình không bí mật. Có thể chạy Phase 0 với mặc định, không cần copy. Nếu muốn đổi cổng/origin:

```bash
cp .env.example .env
```

Sửa `PORT`, `HOST`, `CORS_ORIGINS` trong `.env` rồi chạy lại server. File `.env` đã ignore. Các biến database/JWT/payment/SMTP đang để trống, chỉ bắt buộc khi phase tương ứng được triển khai; không có secret hard-code. Lệnh tạo secret gợi ý: `openssl rand -hex 32`, tạo riêng cho từng mục đích và lưu vào `.env`, không đưa lên GitHub.

`PORT` phải là số nguyên 1–65535. `CORS_ORIGINS` là danh sách HTTP(S) origins phân cách dấu phẩy, không path/credentials hoặc wildcard. Mặc định chỉ frontend local 3000; chuỗi rỗng tắt quyền CORS trình duyệt. CORS không thay authentication/authorization. `APP_URL` và các biến Phase 1 trở đi chưa được Phase 0 đọc.

## Chạy build và kiểm tra HTTP

```bash
npm run build
npm run start:prod
```

Trong Terminal khác:

```bash
curl -i http://127.0.0.1:4000/api/v1
```

Expected HTTP 200 và JSON:

```json
{
  "success": true,
  "data": {
    "application": "NOVA CINEMA (INFINITY)",
    "phase": 0,
    "status": "bootstrap-ready",
    "apiPrefix": "/api/v1",
    "database": "not-configured",
    "redis": "not-configured"
  },
  "message": "NOVA Cinema backend bootstrap is running."
}
```

Root `/` và các route nghiệp vụ chưa triển khai trả 404. `bootstrap-ready` chỉ xác nhận HTTP application, không báo PostgreSQL/Redis đã khỏe. Global error envelope, validation, Helmet/rate limiting và Swagger nằm trong Phase 2; lỗi 404 Phase 0 còn dùng Nest default response.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Unit tests kiểm tra cấu hình cổng/origin, không chỉ một hàm trả hằng. HTTP e2e dùng application bootstrap thật qua Supertest: response versioned, route 404, CORS allow/reject. E2e Phase 0 không mock DB vì chưa có DB. Từ Phase 11 sẽ có PostgreSQL test database và Redis namespace/database riêng; TC-01 concurrency phải chạy trên DB thật.

Kết quả chạy thực tế: [docs/validation-phase-0.md](docs/validation-phase-0.md).

## Cây file Phase 0 đã tạo

```text
backend/
  .env.example
  .gitignore
  .nvmrc
  AGENTS.md
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.build.json
  nest-cli.json
  eslint.config.cjs
  jest.config.cjs
  README.md
  docs/
    architecture.md
    phases.md
    validation-phase-0.md
  src/
    main.ts
    bootstrap.ts
    app.module.ts
    app.controller.ts
    app.service.ts
    config/
      bootstrap.config.ts
      bootstrap.config.spec.ts
  test/
    app.e2e-spec.ts
    jest-e2e.config.cjs
```

Mỗi file trong cây là mã nguồn/tài liệu đầy đủ, không có module rỗng hoặc pseudocode. Controller chỉ gọi AppService; cấu hình được kiểm tra trước khi tạo application. `createApplication()` dùng chung giữa production entrypoint và HTTP tests để tránh test một bootstrap khác.

## Các phần chưa chạy vì thuộc phase sau

| Hạng mục                                                                                            | Phase |
| --------------------------------------------------------------------------------------------------- | ----- |
| PostgreSQL, Prisma schema/migrate/seed, test accounts hash                                          | 1     |
| Redis/BullMQ infrastructure, error envelope, validation, Swagger `/api/docs`, health DB/Redis/queue | 2     |
| Register/login, JWT/refresh rotation, RBAC, C’MEMBER                                                | 3     |
| Movie/cinema/room/seat CRUD                                                                         | 4     |
| Showtime BR03 và TC-02                                                                              | 5     |
| Hold 5 phút, Decimal pricing, partial unique, Redis lock, expiry/outbox, TC-01                      | 6     |
| WebSocket `/seats`, group-seat suggestion                                                           | 7     |
| HMAC Sandbox payment, TC-03/TC-04                                                                   | 8     |
| QR, SMTP, staff check-in, TC-05 và phần ticket của TC-03                                            | 9     |
| Revenue chỉ PAID                                                                                    | 10    |
| Unit/integration/e2e nghiệp vụ đầy đủ                                                               | 11    |
| Dockerfile/Compose postgres+redis+backend healthcheck, validation cuối                              | 12    |

Chưa có lệnh migration/seed/Docker hoặc tài khoản demo có thể dùng ở Phase 0. Sẽ cung cấp lệnh thực khi file tương ứng tồn tại. Events dự kiến `seat_locked`, `seat_released`, `seat_sold`; chỉ publish sau transaction commit, không chứa dữ liệu cá nhân. BR01–BR05 và TC01–TC05 đầy đủ được giữ trong kế hoạch, không đánh dấu pass khi chưa triển khai.

Sau Phase 0, dừng và chờ **“TIẾP TỤC PHASE 1”** theo yêu cầu của bạn.
