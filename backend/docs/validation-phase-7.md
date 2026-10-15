# Phase 7 validation evidence

Ngày kiểm tra: **15/10/2026**, giờ Việt Nam. Node24.19.0, NestJS11, Prisma6.19, PostgreSQL17.11, Redis7.4, Socket.IO server/client4.8.4. Scope: seat-map/capacity, contiguous group suggestion, public /seats gateway, Redis Pub/Sub và committed outbox delivery. Không đổi schema/migration/env/runtime dependencies; thêm exact dev socket.io-client cùng lockfile.

| Check                            | Result                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run typecheck`              | Strict TypeScript pass                                                                    |
| `npm run lint`                   | Typed ESLint pass, zero warnings                                                          |
| `npm test`                       | 44 unit tests pass, gồm11 group sliding-window cases                                      |
| `npm run test:e2e`               | 118 tests pass:16 Phase7 +29 booking +21 showtime +22 catalog +19 auth +11 infrastructure |
| `npm run test:db`                | 22 PostgreSQL regression tests pass                                                       |
| `npm run build`                  | Nest production build pass                                                                |
| `node scripts/smoke-booking.cjs` | Compiled HTTP +Socket.IO +automatic outbox +actual BullMQ expiry pass                     |

**184 automated tests pass**, không skip/disable. Chuỗi chốt `npm run check && npm run test:db && node scripts/smoke-booking.cjs` hoàn tất với exit0. HTTP suites dùng persistent free-port listeners; không tăng max listeners hay tắt warnings. Schema/migrations giữ nguyên các constraints từ Phase1/6.

## Seat map và group acceptance

- Public map chứa showtimeId/roomId/startTime/asOf/canBook, capacity total/available/holding/sold và seatId/row/column/type/Decimal price/status/expiresAt. New room24 ghế có24 AVAILABLE và không tạo BookingSeat dư thừa. VIP108000, Sweetbox135000 khi base90000; không user/booking/email/hash/token trong map.
- Cùng physical room nhưng khác showtime có ownership độc lập. Hold/cancel phản ánh capacity đúng; SOLD fixture được bảo vệ. Lazy map read chuyển expired hold →EXPIRED/AVAILABLE, giữ lịch sử rows. REPEATABLE READ bảo đảm showtime/price/layout/ownership cùng snapshot, clock từ DB; capacity tính physical rows thật.
- Centered suggestion3 ghế và strict VIP suggestion đúng IDs; blocked seats không được đi qua, request20 khi không có một hàng đủ dài trả[]. Suggestion không tạo booking; chỉ caller hold qua authenticated API mới giữ ghế.
  -11 pure group cases kiểm tra input không bị mutate, full physical row center, sold/holding blockers, missing column và row boundaries, requested type, center/row/column ranking, quantity0/21/-1/fraction, empty/full rooms và20-seat window. Thuật toán sort O(S logS), scan O(S), copy cuối O(N), space O(S).
- Missing ID404, invalid UUID/query/type/quantity/null/mass assignment400. Past seat-map canBook=false, suggestion409 SHOWTIME_STARTED; empty room capacity0. canBook chỉ là time gate, không thay kiểm tra tồn kho/hold.

## Real Socket.IO và distributed delivery

- Hai actual Nest API listeners với Socket.IO clients riêng, PostgreSQL/Redis test chung, cùng Redis namespace. Namespace /seats, room showtime:UUID. Public join UUID normalize, existing-showtime check, unknown room/user fields bị reject bằng safe ack. Repeat leave an toàn; successful join mới thay room cũ.
- **HTTP hold trên instance A →client ở A và B nhận cùng eventId/bookingId/seatIds; client ở suất khác không nhận.** Cancel phát đúng seat_released tới subscriber ở instance B. Không email/user/token/password/price trong notifications.
- **Gate actual transaction sau second outbox INSERT:** flush ở instance B khi transaction chưa commit không nhận event; sau commit flush mới nhận. Fault-injected hold rollback không có event hoặc partial booking. Gate chỉ điều khiển interleaving, không mock DB/Redis publish của acceptance này.
- Publish failure injection giữ event pending, safe lastError/backoff; stale lease được reclaim bởi2 relays, stable event ID không đổi và processedAt chỉ được set sau publish. Ack failure sau publish có thể gửi lại cùng ID. Test phát lại hold notification sau cancel rồi GET map vẫn AVAILABLE: notification là invalidation, không được áp delta theo arrival order.
- **Kill đúng2 named subscriber connections của owned test namespace bằng Redis CLIENT KILL**, không kill connection ứng dụng khác. Actual ioredis reconnect/resubscribe phát resync_required, socket vẫn connected, hold event tiếp theo được nhận, map mới và realtime readiness đều đúng. Không mock reconnect.
- Worker expiry sử dụng actual BullMQ job; sau EXPIRED, relay phát seat_released qua Redis tới remote subscriber. Fixture timestamps được dịch qua deadline, không đổi production TTL300000ms.
- seat_sold wire fixture được forward qua cùng dispatcher, bỏ arbitrary email/user fields. Đây là kiểm tra hợp đồng Phase8, **không phải payment success/TC-03**.
- Origin không cho phép bị handshake reject; configured browser origin được connect. Shared Redis message limiter chặn cả invalid join. Websocket-only/16KiB được cấu hình tại adapter cho mọi bootstrap path. Không có socket mutation handlers; HTTP hold/cancel guards giữ nguyên.
- Readiness có checks.realtime; failure503 masked diagnostic và liveness200. Swagger có public map/suggestion schemas và không có payment endpoints.

## Compiled production smoke

`scripts/smoke-booking.cjs` chạy **dist/main.js với NODE_ENV=production**, free localhost port, isolated test DB/Redis, ephemeral secrets và owned fixtures. Actual socket connect/join, initial map/suggestion, authenticated hold +automatic seat_locked, cancel +automatic seat_released, idempotency/Decimal/ownership conflict, automatic expiry outbox/delayed job và real worker expiry +live release đều pass. Không gọi manual relay từ smoke. Socket/child process/booking history/outbox/catalog/users/sessions/owned Redis namespace được cleanup, không truncate hoặc sửa dev/demo data.

## Reproduce và vận hành

```bash
cd backend
npm ci
npm run infra:up:test
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

Chạy lần lượt; không chạy HTTP suites và production smoke song song trên cùng TEST_DATABASE_URL với broker prefix khác nhau. Một lần kiểm tra song song đã bộc lộ shared outbox có thể được relay của process khác claim/publish; chuỗi kiểm chứng cuối đã chạy nối tiếp và pass. Đây là cấu hình bắt buộc: tất cả instances chia sẻ database/outbox phải cùng Redis DB/BULLMQ_PREFIX; môi trường độc lập dùng database độc lập. Test namespaces không phải DB tenancy.

Delivery có retry nhưng không exactly-once/ordered/offline replay. Redis publish acknowledgement không chứng minh client receipt. Clients đăng ký listeners trước join, fetch sau ack, dedup eventId, coalesce/serialize refresh và đọc snapshot lại khi reconnect/resync. README có complete client example. Phase8 payment producer, TC-03/04 và Phase9 ticket/TC-05 chưa triển khai; frontend chưa nối API. Fresh Prisma checksum-download limitation cũ vẫn ghi README; không bypass TLS/checksum.
