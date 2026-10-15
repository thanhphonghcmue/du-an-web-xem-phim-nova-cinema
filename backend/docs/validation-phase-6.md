# Phase 6 validation evidence

Ngày kiểm tra: **15/10/2026**, giờ Việt Nam. Node24.19.0, NestJS11, Prisma6.19, PostgreSQL17.11 và Redis7.4. Scope: Booking/Pricing/Seat Lock/BullMQ/outbox, BR01/02/04/05 và TC-01. Frontend độc lập; Phase7 chưa bắt đầu.

| Check                            | Result                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Prisma validate/generate         | Pass                                                                                |
| `db:migrate` / `db:migrate:test` | Migration snapshot/idempotency deployed ở2 DB riêng                                 |
| Prisma migrate diff              | No difference detected ở model/schema có thể biểu diễn                              |
| TypeScript / typed ESLint        | Pass, zero warnings                                                                 |
| `npm test`                       | 33 unit tests pass, gồm6 Decimal pricing cases                                      |
| `npm run test:e2e`               | 102 HTTP tests pass:29 booking +21 showtime +22 catalog +19 auth +11 infrastructure |
| `npm run test:db`                | 22 PostgreSQL regression tests pass                                                 |
| Nest production build            | Pass                                                                                |
| `node scripts/smoke-booking.cjs` | Actual built HTTP/outbox/worker smoke pass, owned cleanup pass                      |

**157 automated tests pass**, không skip/disable. `npm run check` chạy typecheck/lint/unit/HTTP/build. Migration mới giữ14 models, GiST exclusion/partial unique/FKs/CHECK cũ. Legacy snapshot NULL được bảo toàn; tests kiểm tra không thể lưu snapshot thiếu/sai tier-rate hoặc key/hash thiếu và DB uniqueness theo user/key. Dependencies/lockfile/secrets/env requirements không thay đổi.

## TC-01 và concurrent ownership

- **Hai Nest API instances dùng cùng PostgreSQL/Redis test và namespace. Hai user gửi hold cùng showtime/seat qua Promise.allSettled:1 HTTP201,1 HTTP409 SEAT_UNAVAILABLE; DB đúng1 booking và1 active seat owner.** Không mock DB/Redis hoặc thay TC-01 bằng memory locks.
- Hai request overlapping sets [A1,A2]/[A2,A3]:1 success/1 conflict, chỉ2 seat rows, không giữ lẻ ghế của request thua. Disjoint sets đồng thời thành công;20 ghế trong1 đơn hợp lệ.
- Final PostgreSQL barrier: fault hook tạm dừng API sau actual active-seat query; một SQL writer bypass Redis insert/commit owner trước khi API ghi. Partial unique từ chối API409, toàn bộ losing booking/seat thứ2 rollback. Đây là test interleaving có nhãn, không phải TC-01 mock.
- Redis lease10s và canonical key order, Lua all-or-none; compare-and-delete giữ nguyên key khi ownership đã đổi, chỉ xóa key của owner cũ. Mutex failure503 fail-closed/no DB writes; logs/client không lộ diagnostic riêng.
  -5 concurrent requests cùng user/key/body qua2 instances đều201, cùng booking ID, đúng2 initial outbox records. Reorder body keys/seat/combo IDs, UUID case khác vẫn replay cùng booking/deadline; mismatched body409. Cancelled replay không tạo hold mới. Key giống nhau ở2 user vẫn độc lập.

## Pricing, validation và quyền

- Decimal ticket multipliers1.00/1.20/1.50, Party Combo69000×quantity; SILVER5%/GOLD7%/DIAMOND10% trên vé+combo. Unit tests kiểm tra per-seat HALF_UP, discount rounding và maximum money precision; overflow bị chặn trước persist. Không dùng float cho money hoặc cộng điểm trước payment.
- New hold expiredAt-createdAt đúng300000ms. Snapshot line prices/base/tier/rate/totals giữ nguyên sau đổi combo price/isActive và user tier. Trả Decimal fixed2/rate fixed3 strings; historical nullable snapshots không bị suy diễn từ giá hiện tại.
- Actual PostgreSQL transaction giữ membership/combo update chưa commit; HTTP hold phải chờ user FOR SHARE lock rồi tính từ tier/price mới sau commit, không dùng profile/giá đọc sớm.
- Anonymous booking requests401. Other CUSTOMER/STAFF/ADMIN đọc/hủy owner booking404; không admin bypass. Own list có filter/status/pagination. Responses không có email/password/token/userId/key/hash.
- Bad/null/duplicate/case-duplicate seat IDs, >20 ghế, nested combo null/number/object, duplicate combo IDs, quantity0/>20/fraction/string, client unitPrice/finalAmount/status/userId/expiredAt đều400. Missing showtime404, missing/foreign-room seats400, missing/inactive combos400, showtime quá khứ409. Invalid key/path/query/pagination400, không partial booking.
- Combo GET chỉ active; POST/PATCH ADMIN-only, invalid price/null bắt buộc400; disable không xóa history. Không thêm fake payment routes.

## Cancel, expiry và recovery

- Cancel atomic/idempotent: booking CANCELLED +seat AVAILABLE, một release event; new user giữ được ghế, history row cũ giữ lại. Job cũ chạy không release successor.
- Lazy expiry khi hold của user khác, GET own detail/list và overdue cancellation đều cập nhật EXPIRED, nhả đúng HOLDING rows. Deadline không gia hạn khi retry.
- **Real BullMQ worker:** job chạy sớm chuyển delayed theo original deadline;2 due jobs cùng booking chỉ1 transition/release event. Fixtures dịch timestamps qua deadline để không đợi5 phút hoặc rút ngắn TTL production.
- PAID/SOLD fixture không hủy/expire/nhả được; repeated jobs/lazy reads giữ nguyên. In-flight PAID/SOLD SQL transaction giữ booking lock, expiry job thực sự chờ PostgreSQL lock rồi thấy state mới và no-op. Đây là state-protection fixture, chưa là payment acceptance Phase8.
- Cancel +2 expiry jobs đồng thời: state EXPIRED,1 release event, new owner giữ được ghế.
- Queue publish failure injection sau DB commit: booking vẫn HOLDING, outbox pending với safe code và retry time. Sau restore, relay enqueue job thật đúng stable ID và ack. Durable seat_locked vẫn pending cho Phase7, payload không chứa PII.
- Stale relay lease được reclaim;2 relays đồng thời chỉ1 claim/enqueue theo deterministic ID. Xóa lost delayed job của fixture rồi sweep thật vẫn expire/nhả ghế.
- Failure injection ở **second outbox INSERT** sau booking/seat/combo/first outbox đã ghi: HTTP500 masked, rollback cả4 nhóm dữ liệu, mutex sạch, retry cùng key thành công. Release outbox failure cũng rollback cả booking status/seat release; retry cancel thành công.

## Compiled production smoke và reproduce

`scripts/smoke-booking.cjs` khởi động **dist/main.js với NODE_ENV=production** trên free port, ephemeral JWT secrets, test DB/Redis, random owned namespace/users/catalog fixtures. Kiểm tra health/root phase6/login, fixed TTL, Decimal/tier snapshots, equivalent key replay, conflict/privacy, cancel/re-hold, **automatic relay không gọi nội bộ**, delayed job thật và worker expiry qua job thật, OpenAPI. Dừng child/cleanup owned booking history/outbox/catalog/user/session/Redis keys, không truncate hoặc sửa demo/dev data, không in secrets.

```bash
cd backend
npm run infra:up:test
npm run prisma:generate
npm run db:migrate
npm run db:migrate:test
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

## Scope và handoff

API process hiện chạy HTTP +expiry worker +maintenance; split deployment thuộc Phase12. Outbox poll1s/batch20/lease30s, sweep100 rows mỗi5s/startup; backlog được xử lý nhiều lượt, không tuyên bố synchronous recovery toàn backlog. Cancel để job cũ no-op, không xóa toàn bộ queue. seat_locked/seat_released durable events chưa broadcast/ack trước Phase7. Payment fail/cancel/webhook và TC-03/04 tiếp tục Phase8; QR/check-in/TC-05 Phase9. Frontend chưa nối backend. Fresh Prisma engine download limitation từ Phase2 vẫn ghi README, không bypass checksum/TLS.
