# Phase 1 — PostgreSQL, Prisma schema, migration và seed

Ngày kiểm tra: 14/10/2026. Node.js 24.19.0; Prisma/client 6.19.0; PostgreSQL **17.11**, timezone UTC; Docker 28.4.0 và Compose v2.40.3. Backend Phase 1 tách khỏi frontend và không triển khai Phase 2.

## Evidence đã chạy

| Lệnh/kiểm tra                            | Kết quả                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `prisma --version`                       | schema/query engines commit 2ba551f319ab1df4bc874a89965d8b3641056773 chạy được                                   |
| Docker pull image pin digest             | thành công, layer checksum verification giữ nguyên                                                               |
| `npm run db:configure` lần đầu/lần sau   | tạo local random passwords, rerun giữ nguyên, files ignored 0600                                                 |
| `npm run db:up:test`                     | development và test PostgreSQL healthy, bind localhost ports 55432/55433                                         |
| `npm run prisma:validate`                | schema valid                                                                                                     |
| `npm run prisma:generate`                | client generated                                                                                                 |
| `npm run db:migrate` + `db:migrate:test` | migration deploy thành công trên hai database riêng                                                              |
| deploy lần hai                           | No pending migrations, không reset dữ liệu                                                                       |
| `npm run db:status`                      | database schema up to date                                                                                       |
| migrate diff live datasource → schema    | No difference detected ở các thành phần Prisma hỗ trợ                                                            |
| `npm run db:seed` lần đầu/lần sau        | thành công, không thêm duplicate hoặc reset dữ liệu cũ                                                           |
| `npm run check`                          | strict TypeScript, typed lint, Nest build pass; **21 unit + 5 HTTP tests pass**                                  |
| `npm run test:db`                        | **22/22 PostgreSQL integration tests pass**, không mock DB                                                       |
| `db:down` rồi `db:up:test`               | containers được tạo lại, volumes giữ dữ liệu; cả hai healthy                                                     |
| query qua Prisma sau restart             | 14 model tables; 3 users, 6 movies, 2 cinemas, 3 rooms, 480 seats, 54 showtimes, 1 combo, 0 development bookings |

Prisma schema có 13 model yêu cầu + OutboxEvent. Monetary columns Numeric(14,2); modifier Numeric(4,2); tất cả DateTime timestamptz(3). Migration transaction, composite FKs, enum và index được kiểm tra thực tế. SQL partial unique không bị thay bằng unconditional unique.

## Ý nghĩa các kiểm thử database

- Hai connection/request insert ownership cùng seat/showtime: đúng một thành công và một P2002; chỉ một active HOLDING.
- AVAILABLE history được giữ, booking mới có thể sở hữu ghế; SOLD vẫn exclusive.
- Lịch overlap bị constraint từ chối khi INSERT, UPDATE và hai request đồng thời; boundary end==next start được phép.
- Seat sai room hoặc booking sai showtime bị composite FK từ chối; tọa độ ghế unique.
- Modifier BR05 và tiền âm/tổng booking không khớp bị CHECK từ chối; Decimal 0.10+0.20 round-trip đúng 0.30.
- FK Restrict giữ lịch sử, transactionCode unique, ticketHash/bookingId unique; conditional check-in update có một winner.
- Seed password verify Argon2id, role ADMIN/STAFF/CUSTOMER; chạy lại giữ hash/ID/lịch và không ghi đè movie title đã chỉnh. 3 phòng ×160 ghế và 54 suất có endTime đúng duration +15 phút, không overlap.
- Unit guard không cho test trỏ development database, kể cả hostname alias; error URL malformed không lộ connection input.

Đây là kiểm thử **constraint và primitive PostgreSQL**, không phải TC01–TC05 qua API đã hoàn thành. Payment HMAC/idempotency, holding timer/queue, user auth/RBAC, QR issuance only PAID và staff check-in window vẫn cần services/API các phase sau. Test tạo row PAID/ticket trực tiếp chỉ để kiểm tra unique/atomic primitive, không khẳng định payment flow chạy được.

## Mạng và engine

Prisma CLI và query engine hiện có hoạt động, validate/generate/migrate/seed/queries đã qua; checksum bypass không bật. Tuy nhiên probe HTTPS tải checksum mới từ binaries.prisma.sh vẫn HTTP 403; native Node direct request còn gặp DNS EAI_AGAIN. Chưa chứng minh fresh engine download trên một cloud mới. Không tắt TLS/checksum, không thay expected hash. Domain đã có trong network draft, cần áp dụng/kiểm tra lại khi phải tải mới. Các kết quả hiện tại không phải tuyên bố network hoàn toàn mở.

## Giới hạn và phase tiếp theo

Credentials chỉ nằm trong ignored `.env`/`.runtime/database.env`, không commit hoặc đưa vào archive. Volumes Docker bên ngoài checkout không được giả định tự restore trên một môi trường cloud mới; setup phải tạo/start containers rồi migrate/seed. Không dùng `down -v` cho dữ liệu cần giữ.

Nest HTTP vẫn chỉ bootstrap Phase 0; PrismaModule, Redis/BullMQ, config/security/validation/filter/interceptor/Swagger/health sẽ triển khai **Phase 2**. Frontend chưa nối API. Full Docker backend+Redis thuộc Phase 12. Dừng và chờ “TIẾP TỤC PHASE 2”.
