# Phase 0 — Kết quả chạy thực tế

Ngày: 14/10/2026, cloud Linux, Node.js 24.19.0, npm 11.9.0. Phạm vi chỉ Architecture Decision & Project Bootstrap theo yêu cầu người dùng.

## Kết quả

| Kiểm tra                                                                                  | Kết quả                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm install --prefix backend --cache /workspace/.npm-cache --no-audit --no-fund` từ root | thành công, 795 packages, lockfile được tạo                                    |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` trong backend                 | cài lại thành công từ lockfile                                                 |
| `npm run typecheck`                                                                       | TypeScript strict, không lỗi                                                   |
| `npm run lint` trong backend                                                              | typed ESLint, không lỗi/warning                                                |
| `npm test` trong backend                                                                  | 1 suite, **15/15 unit tests pass**                                             |
| `npm run test:e2e`                                                                        | 1 suite, **5/5 HTTP tests pass**, application bootstrap thật qua Supertest     |
| `npm run build` trong backend                                                             | Nest build thành công, có `dist/main.js`                                       |
| `npm run start:prod`                                                                      | Node entrypoint khởi động trên cổng 4000                                       |
| Production GET `/api/v1`                                                                  | HTTP 200, đúng application/phase 0, DB/Redis `not-configured`                  |
| Production GET `/`, `/api/v1/health`                                                      | HTTP 404, không công bố route chưa triển khai                                  |
| Production CORS frontend origin                                                           | đúng Access-Control-Allow-Origin cho origin cho phép                           |
| `npm run start:dev` sau restart                                                           | watch compile 0 errors; GET `/api/v1` HTTP 200                                 |
| Argon2 native dependency                                                                  | hash/verify dữ liệu random trong RAM thành công; không phải test auth endpoint |
| `npm ls --depth=0` trong backend                                                          | dependency tree hợp lệ, không lỗi peer                                         |
| Frontend root `npm run lint`                                                              | pass; backend có scope lint riêng                                              |
| Frontend root `npm run build`                                                             | Next.js production build pass sau khi thêm backend                             |

Phiên bản resolve trong lockfile: NestJS core 11.2.7, Nest BullMQ 11.0.5, BullMQ 5.81.5, Prisma và @prisma/client 6.19.0, TypeScript 5.9.3, Argon2 0.44.0, Jest 29.7.0.

## Những lỗi tìm thấy và đã sửa

- npm cache mặc định home không được ghi: dùng `/workspace/.npm-cache`, không đổi quyền thư mục hệ thống.
- Typed lint ban đầu áp dụng vào Jest `.cjs`: giới hạn typed rules vào TS; CJS vẫn nhận ESLint recommended và Node globals.
- Nest `@Module()` class rỗng là đăng ký metadata hợp lệ: dùng allowWithDecorator, vẫn kiểm tra class không decorator.
- Template interpolation port chuyển số sang string rõ ràng để qua strict lint.
- Terminal Ctrl+C kết thúc npm nhưng process con còn giữ cổng: xác minh PID process production do phiên này tạo, SIGTERM process đó, rồi dev restart thành công. Không dừng dịch vụ của người khác.

## Điều kiện chưa đạt vì nằm ngoài Phase 0

`prisma --version` chưa chạy thành công trong runtime: HTTP 403 khi tải SHA256 checksum schema engine từ `binaries.prisma.sh`. Không tắt TLS hoặc checksum; không dùng engine chưa được xác minh. Domain đã bổ sung vào **network draft**, không đồng nghĩa runtime được mở mạng. Trước Phase 1 cần áp dụng cấu hình và chạy lại verification, rồi PostgreSQL + schema/migration/seed. Không tuyên bố Prisma validate/migrate pass khi chưa có schema.

Install/start instructions của frontend và backend đã lưu bản nháp cloud; bổ sung domain cần thiết, giữ các domain cũ. Draft save không apply/publish hoặc khởi động service. Khi muốn áp dụng, Review/Save rồi Publish trong environment settings.

PostgreSQL, Redis, BullMQ worker, JWT/RBAC/CRUD, BR01–BR05, TC01–TC05, QR/check-in/reports, SMTP, Swagger, Docker/Compose và frontend integration **chưa triển khai/chưa kiểm thử**. Unit/HTTP tests Phase 0 không được tính thay các TC nghiệp vụ. Chưa có tài khoản test seed hoặc API bán vé có thể dùng.

## Kết luận phạm vi

Phase 0 bootstrap và môi trường Node/Nest phục vụ Phase 0 đã kiểm chứng. Backend hoàn chỉnh chưa được xây; dừng theo yêu cầu và chờ “TIẾP TỤC PHASE 1”.
