# Phase 8 validation evidence

Ngày kiểm chứng:15/10/2026. Node24.19.0/Nest11/Prisma6.19/PG17.11/Redis7.4/Socket.IO4.8.4. Scope: signed Sandbox URL, runnable HTML simulator, webhook/status, atomic payment/points/outbox; không đổi schema/migrations/dependencies. Không tích hợp cổng tiền thật.

| Check                            | Result                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run typecheck`              | Strict TypeScript pass                                                                         |
| `npm run lint`                   | Typed ESLint pass, zero warnings                                                               |
| `npm test`                       | 54 unit tests pass, gồm9 signature/Decimal point cases và1 payment config case                 |
| `npm run test:e2e`               | 146 pass:28 payment +29 booking +16 seats/realtime +21 showtime +22 catalog +19 auth +11 infra |
| `npm run test:db`                | 22 PostgreSQL regression tests pass                                                            |
| `npm run build`                  | Production Nest build pass                                                                     |
| `node scripts/smoke-booking.cjs` | Compiled NODE_ENV=production HTTP/HTML/WebSocket/outbox/actual worker smoke pass               |

Tổng **222 automated tests**, không skip/disable. Test HTTP dùng free-port persistent listeners và shared test DB/Redis namespace giữa2 API instances. Không mock DB locks, unique constraints, Redis broker hoặc Socket.IO trong concurrency/acceptance assertions. Tests/smoke chạy nối tiếp do shared outbox.

## Payment acceptance

- Fresh hold→signed checkout, fixed2 amount85500.00, original expiredAt; repeat và5 concurrent creates trên2 instances trả cùng URL/transaction,1 Payment row. Query string sort để stable URL; returnUrl khác409. Initial status canPay=true/payment null; after create PENDING; safe status không payload/PII/signature.
- JWT bắt buộc cho create/status, owner-only; nonowner và unrelated ADMIN404. Public webhook chỉ HMAC-authenticated, strict UUID/status/string amount; numeric amount/unknown field/array signature/noncanonical amount rejected400. Invalid HMAC, amount/status tampering và checkout-signature-as-webhook401 trước effects.
- Independent HMAC code trong test, không dùng production signer để ký acceptance callbacks. Signed wrong amount400, unknown transaction/order/binding404; first signed stale/future timestamps400. Timing-safe verifier và canonical signature vector có unit test riêng.
- **TC-03 phần Phase8**: SUCCESS atomically booking PAID, seats SOLD, payment SUCCESS, member+8points; remote Socket.IO nhận actual seat_sold đúng room/IDs, không PII. Ticket request đúng1 và pending, không tạo ETicket giả.6 concurrent SUCCESS qua2 instances có1 applied/5duplicates, points/events chỉ một lần. FAILED/CANCELLED sau SUCCESS409 và owner cancel409, không release SOLD.
- **TC-04 FAILED và CANCELLED**: booking CANCELLED, previous child row AVAILABLE giữ lịch sử, matching Payment terminal, points0; actual remote seat_released; owner mới hold được. Retry callback và expiry method không tác động owner mới, không duplicate release/ticket request.
- SUCCESS sau FAILED/owner cancel/expiry không resurrect; late success commit EXPIRED +AVAILABLE +payment CANCELLED rồi409, không rollback expiry do throw. New hold vẫn còn ownership, points0.
- Concurrent SUCCESS/FAILED có1 terminal winner,1conflict, booking/payment/seat/points nhất quán. SUCCESS/owner cancel/expiry trên2 instances chạy3 rounds; PAID luôn SOLD/+points, CANCELLED luôn AVAILABLE/no points.
- **Actual member FOR UPDATE lock** giữ callback đến khi DB clock vượt remaining hold deadline; first SUCCESS bị từ chối và booking EXPIRED. Payment reads clock sau member lock, không dùng timestamp client làm authority hoặc rút ngắn production TTL. Chỉ fixture timestamps được dịch, interval300000ms giữ nguyên.
- Fault-injected ticket outbox INSERT failure sau payment/points/seat updates rollback toàn transaction; response masked, payment PENDING/booking HOLDING/points0/no new events. Bỏ injection→same transaction retry thành công.
- Gate actual transaction sau ticket-request INSERT: remote relay flush không thấy seat_sold trước commit, DB reader vẫn HOLDING; sau commit event thật được broadcast. Không gọi socket emit trực tiếp trong test.
- Fault-injected queue.cancel failure sau PAID commit giữ cancellation outbox pending +safe error/backoff; retry thành công ack và remove delayed job. Actual BullMQ job cho booking PAID complete harmless, SOLD không release.
- Real GET signed HTML và POST urlencoded form SUCCESS thực thi payment, repeat form không cộng điểm lại; tampered returnUrl401. Origin credential/fragment/deceptive host/javascript/relative URLs400. HTML escape, CSP form-action self/no script, no-referrer/no-store và không key leak.
- Catalog price sau hold thay đổi không đổi85500 snapshot/8points. Hai bookings cùng member success đồng thời tăng16, không lost update. Int overflow409 rollback booking/payment; sửa balance rồi retry thành công.
- Create/status lazy expiry không gia hạn; Swagger có3 contract endpoints và2 simulator routes, JWT chỉ owner operations, không ticket/check-in route.

## Compiled production smoke

Child process chạy dist/main.js, NODE_ENV=production, free loopback port, test DB/Redis, ephemeral JWT/HMAC keys và fixture sở hữu riêng. Smoke verify hold fixedTTL/Decimal/idempotency/conflicts/owner privacy, automatic expiry relay/delayed job +actual BullMQ expiry, rehold; sau đó FAILED webhook release→rehold→signed checkout HTML→invalid HMAC401→SUCCESS/duplicate once→PAID/SOLD/+31points, owner status/nonowner404, conflicting failure409. Actual Socket.IO seat_sold tới client, automatic expiry-cancel outbox ack/remove, ticket request pending exactly1 và ETicket0, HTML form duplicate no extra points, paid worker harmless. Không gọi relay thủ công trong smoke. Cleanup đóng đúng child/socket và xóa đúng owned fixtures/payments/outbox/Redis namespace; không truncate hay sửa dev/demo data.

## Reproduce

```bash
cd backend
npm ci
npm run payment:configure
npm run infra:up:test
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

PAYMENT_SANDBOX_SECRET bắt buộc và riêng với JWT; helper local chạy2 lần đã xác nhận preserve key, không in giá trị. Config public origin/return allowlist không lấy từ Host header. Không schema/dependency/migration mới. Prisma engines đã cài tiếp tục dùng; fresh checksum download limitation cũ vẫn trong README, không bypass verification.

TC-03 **chưa hoàn tất ticket existence**: Phase9 consumer mới tạo vé QR/email từ booking.ticket.requested. TC-05/check-in/Phase9–12 và frontend API wiring chưa triển khai. Không tuyên bố exactly-once/ordered/offline WebSocket delivery; client vẫn resync snapshots theo hợp đồng Phase7.
