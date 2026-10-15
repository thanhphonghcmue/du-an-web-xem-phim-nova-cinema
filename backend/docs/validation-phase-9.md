# Phase9 validation evidence

Ngày15/10/2026. Node24.19.0/Nest11/Prisma6.19/PG17.11/Redis7.4/Nodemailer7/Socket.IO4.8.4. Scope: one QR per booking PAID, owner tickets/ICS, SMTP worker/retry, STAFF/ADMIN atomic check-in. Không migration/schema/runtime dependency mới. Frontend chưa nối API.

| Check                            | Result                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`              | Strict TypeScript pass                                                                                                   |
| `npm run lint`                   | Typed ESLint pass, zero warnings                                                                                         |
| `npm test`                       | 61 unit tests, gồm7 Phase9 config/window cases                                                                           |
| `npm run test:e2e`               | 173 HTTP/Socket.IO tests:27 ticket/SMTP +28 payment +29 booking +16 realtime +21 showtime +22 catalog +19 auth +11 infra |
| `npm run test:db`                | 22 real PostgreSQL constraint/regression tests                                                                           |
| `npm run build`                  | Production Nest build pass                                                                                               |
| `node scripts/smoke-booking.cjs` | Compiled NODE_ENV=production payment→QR→SMTP→staff check-in pass                                                         |
| Mailpit development              | Compose healthy; compiled SmtpMailer→actual SMTP→inbox API probe pass, owned probe removed                               |

**256 automated tests pass**, không skip/disable. State tests và production smoke chạy nối tiếp trên shared test DB. Các API listeners dùng free persistent localhost ports; PG/Redis/BullMQ/SMTP thực, không mock DB uniqueness hoặc conditional admission. Fault injection chỉ ở các bước lỗi được nêu dưới.

## Ticket và TC-03 completion

- Actual hold2 seats +combo69K→signed webhook SUCCESS→FulfillmentRelay tạo ETicket1 +email event1 trong transaction. Ticket request ack sau commit, email event ack sau actual SMTP acceptance. Callback lại trên instanceB không thêm vé/email/points; điểm đúng23 cho236550.00VND trong acceptance. Kết hợp Phase8 assertions PAID/SOLD/realtime/points, **TC-03 hiện hoàn tất cả ticket existence**.
- QR PNG thật được decode bằng pngjs/jsQR thành đúng64hex hash, không booking/user metadata. Hai bookings khác hash;6 concurrent generate calls qua2 instances có cùng1id/hash/QR và1email request. Unpaid/cancelled generation bị reject và không ghi vé/email.
- Fault-injected email-event INSERT failure rollback cả ticket/email nhưng PAID không rollback; bỏ injection retry tạo1 vé. Ticket issuance failure giữ request pending/safe backoff; ticket-request ack failure sau creation replay trả QR cũ, không thêm email event. Actual transaction gate chứng minh ticket/email event không visible trước commit.
- Owner detail trả đúng2seat labels A1/A2,combo/snapshot amount,QR/check-in; list pagination và strict boolean query đúng. JWT bắt buộc, nonowner/ADMIN404, owner khác có list rỗng. Response no-store không credentials/userId/email/payment payload. Calendar owner-only text/calendar download, stable UID/UTC/no hash/email; Unicode folding≤75bytes và CR/LF/separator injection escaped. Email HTML markup escaped.

## Staff admission và TC-05

- STAFF scan lần đầu200 với movie/cinema/room/showtime/seats/combos/orderCode; DB lưu checkedInAt và staffId đúng. Scan lần hai qua instanceB409TICKET_ALREADY_USED, không sửa audit metadata. **Sáu simultaneous STAFF/ADMIN scans qua2 instances có1success/5conflicts**, conditional update bảo đảm single winner.
- Customer403/unauth401; server đọc current DB role, token cũ của STAFF bị demote vẫn403. Caller-supplied staffId400, malformed/hash arrays400, valid unknown hash404. Những trường hợp này không consume ticket.
- Too-early và31min-after-start scans409, ticket vẫn unused. Unit boundaries xác nhận inclusive -60min/+30min, adjacent millisecond reject và zero-width window. Current PAID/SOLD condition được kiểm tra; fixture booking không còn PAID bị từ chối. Fault-injected DB admission update failure500 masked, checkedInAt vẫnnull, retry có first success.

## SMTP/BullMQ và delivery semantics

- Owned loopback TCP SMTP fixture nhận actual Nodemailer protocol/MIME; kiểm tra recipient, text/html, inline PNG Content-ID và ICS attachments. Không mock sendMail. SMTP metadata lấy ticket/booking snapshot, không secrets trong MIME; queue payload chỉ IDs.
- Real SMTP451 làm email event pending +EMAIL_DELIVERY_FAILED/backoff; booking vẫn PAID, QR giữ nguyên. Retry cùng event thành công chỉ1 accepted message. Stalled DATA acceptance bị absolute socket deadline1000ms của test đóng; event retry và lần sau nhận SMTP acceptance. Production default deadline10000ms, không giảm hold TTL.
- Paused actual workers chứng minh queue acceptance chưa set processedAt. Stale lease bị2 relay instances reclaim; old queued owner no-op, attempt2 deliver1 accepted message. Queue enqueue failure injection giữ durable state rồi retry thành công. Stable eventId+attempt job IDs tránh retained failed job cản retry; job retention có count/age.
- Fault-injected DB ack failure **sau SMTP acceptance**:1 accepted message nhưng event pending; retry nhận message thứ2 cùng Message-ID và cùng QR. Đây là evidence at-least-once SMTP, không exactly-once/inbox guarantee. PAID/points/ticket vẫn1. Các test không dùng Message-ID như bằng chứng provider chắc chắn dedup.
- Local Mailpit image pin sha256:e22dce5b36f93c77082e204a3942fb6b283b7896e057458400a4c88344c3df68, SMTP1025/HTTP8025 chỉbind127.0.0.1. Actual compiled SmtpMailer gửi một unique owned probe, Mailpit API xác nhận capture và xóa đúng probe; không xóa mailbox người dùng. Remote SMTP TLS/STARTTLS giữ certificate verification, không cần external credentials để kiểm thử local.

## Compiled production smoke

Script chạy child dist/main.js với NODE_ENV=production, free API/SMTP ports, ephemeral JWT/HMAC, test DB/Redis riêng và fixture users2CUSTOMER+2STAFF. Giữ/release/expiry qua actual worker, Sandbox HMAC success/fail/duplicate, actual seat_sold và expiry-cancel vẫn pass. Automatic fulfillment (không gọi relay thủ công) tạoQR1, decode PNG đúnghash, actual SMTP text/html/PNG/ICS accepted vàoutbox processed. Owner detail/list/calendar pass, nonowner404, customer check-in403;2 actual staff scans đồng thời có200/409, audit staffId đúng vàSOLD vẫngiữ. Duplicate payment/form không phát hành thêmvé hoặc cộngđiểm.

Cleanup đóng owned child/socket/SMTP server, xóa đúng fixtures/payment/ticket/outbox/Redis namespace; không truncate, không sửa dev/demo data, không stop unrelated services. Frontend build/test không cần chạy lại vì không đổi frontend.

## Reproduce

```bash
cd backend
npm ci
npm run infra:up:test
npm run mail:up
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

Fresh setup cần db:configure/infra:configure/auth:configure/payment:configure/generate/migrate/seed theo README. Existing Prisma engines hoạt động; checksum fresh download limitation cũ vẫn trong README, không bypass TLS/checksum. QR decoder deps là dev-only; qrcode giữ nested runtime pngjs5. Health core không bao gồm external SMTP inbox proof. Phase10–12 và frontend API wiring chưa triển khai; dừng Phase9 chờ người dùng yêu cầu tiếp.
