# Kiểm toán Fullstack LAB03/LAB04 và thư mục đổi tên — 28/10/2026

Baseline: `7b459a9` trên `feat/nova-discovery-ui`, không có commit upstream mới khi bắt đầu. Đây là kiểm toán bổ sung, không viết lại các luồng đã qua kiểm thử trong [báo cáo native](backend-native-audit.md). Không dùng Docker, không sửa database của người dùng, không thay logo và ảnh bắp nước đã được nhóm chọn.

## 1. Lỗi phát hiện và file được sửa

| Mã      | Mức độ | File                                                                                                                                           | Lỗi / thay đổi có kiểm chứng                                                                                                                                                                                                                                                                                          |
| ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENV-02  | High   | `frontend/next.config.mjs`, `frontend/legacy-env.mjs`, `frontend/.env.example`, root `.env.example`                                            | Sau khi chuyển Next vào `frontend/`, cấu hình upstream trong `.env*` ở root có thể bị bỏ qua. Thêm fallback chỉ cho BACKEND_API_URL/NEXT_PUBLIC_SITE_URL; ưu tiên env của shell/frontend, không lấy DB/JWT keys. Test cả đường dẫn chứa khoảng trắng, env theo mode và parent project khác.                           |
| AUTH-02 | High   | `backend/prisma/schema.prisma`, migration `20261028000100_account_status/migration.sql`                                                        | Chưa có trạng thái tài khoản nên không thể thực thi UC02 Exception E2. Thêm ACTIVE/LOCKED/INACTIVE; migration additive, account hiện hữu giữ ACTIVE.                                                                                                                                                                  |
| AUTH-03 | High   | `backend/src/modules/auth/auth.service.ts`, `users/{users.repository,users.service,users.controller}.ts`, `users/dto/account-status.dto.ts`    | Chặn đăng nhập/access/refresh khi bị khóa. Admin cập nhật trạng thái và revoke refresh trong cùng transaction; login/refresh khóa account theo cùng thứ tự để không phát refresh mới lọt qua thao tác khóa. Không cho khách/staff đổi trạng thái, không mass-assign status qua profile/đăng ký, bảo vệ account ADMIN. |
| ADM-02  | High   | `backend/src/modules/payments/reconciliation.{controller,dto,repository,service}.ts`, `payments.module.ts`                                     | Chưa có công cụ tra mã đơn/giao dịch cho Admin. Thêm lookup riêng, ẩn chữ ký, QR capability, JSON payment payload. Hiển thị cả trạng thái phát hành/email; overdue hold được chiếu EXPIRED mà GET không ghi DB.                                                                                                       |
| ADM-03  | High   | Cùng module reconciliation                                                                                                                     | Thêm khôi phục phát hành vé qua durable outbox cho PAID + payment SUCCESS đúng tiền + toàn bộ ghế SOLD. Không ghi PAID thủ công. Hai yêu cầu đồng thời hội tụ vào cùng event/vé; không cướp lease worker đang chạy.                                                                                                   |
| SEAT-02 | Medium | `backend/src/modules/bookings/{bookings.repository,seat-booking.service,seat-lock.service}.ts`, `common/filters/api-exception.filter.ts`       | Xung đột trước đây chỉ trả mã lỗi chung. Trả `details.seatIds` của chính các ghế bị xung đột, cả ở mutex Redis và claim PostgreSQL; không lộ owner/booking ID. Toàn bộ hold hỗn hợp vẫn rollback.                                                                                                                     |
| FE-02   | Medium | `frontend/src/components/BookingConsole.jsx`                                                                                                   | Gỡ ngay ID bị xung đột khỏi lựa chọn, rồi tải lại snapshot thật. Giữ ghế còn lại chỉ là lựa chọn UI; không báo đã giữ thành công khi API từ chối.                                                                                                                                                                     |
| FE-03   | Medium | `frontend/src/components/QuanTriHeThong.jsx`, `AdminReconciliation.jsx`, `frontend/src/api/errorMessage.js`, `frontend/src/qa-readability.css` | Thêm điều khiển trạng thái tài khoản và tab đối soát nối API thật; trạng thái chờ/lỗi, chống phản hồi cũ sau unmount; bảng responsive và khử ID trùng ở danh sách. Sửa navigation Admin: nhãn desktop không bị cắt, mobile cuộn ngang thay vì6 dòng chiếm gần hết màn hình.                                           |
| API-02  | Medium | `backend/src/common/filters/public-error-messages.ts`, `api-exception.filter.ts`                                                               | Thông điệp nghiệp vụ xác thực/ghế/lịch/vé/thanh toán có bản tiếng Việt ở server. Giữ error code, HTTP status và cơ chế che lỗi nội bộ 5xx.                                                                                                                                                                            |
| RAM-02  | Medium | `backend/standalone/runtime.cjs`, `admin.cjs`                                                                                                  | Adapter RAM áp dụng cùng trạng thái tài khoản, revoke refresh, xung đột ID ghế, đối soát và giới hạn khôi phục vé; vẫn là dữ liệu tạm trong process. Không báo đã gửi email khi không có SMTP.                                                                                                                        |
| MONO-05 | Medium | `scripts/check-backend-only.cjs`, `check-fullstack-startup.cjs`, `scripts/legacy-env.test.mjs`                                                 | Smoke scripts đọc frontend và config mới; resolve Next theo workspace, không hardcode vị trí hoist của npm.                                                                                                                                                                                                           |
| DOC-02  | Medium | `docs/ARCHITECTURE.md`, hướng dẫn VS Code, `backend/AGENTS.md`, README                                                                         | Bản đồ file/đường dẫn Windows cũ dễ dẫn đến sửa nhầm root/src. Sửa tài liệu về workspace đang chạy; bỏ hướng dẫn BFF fallback cũ không còn tồn tại.                                                                                                                                                                   |

Các sửa fixture nằm ở `tests/business-audit.spec.mjs` và `tests/frontend-audit.spec.mjs`; xem diễn giải lượt chạy tại mục6.

Không phát hiện thêm lỗi trong các nhánh transaction/QR/check-in đã được test dưới đây. Điều đó không phải cam kết hệ thống không thể phát sinh lỗi ở mọi môi trường.

## 2. Truy vết đầy đủ 14 Use Cases

| UC   | Code chủ đạo đang chạy                                            | Quy tắc / bằng chứng kiểm thử                                                                                                                              |
| ---- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC01 | `backend/src/modules/auth/`                                       | Email chuẩn hóa/unique race409, Argon2id, DTO không nhận role/tier/points/status từ đăng ký; auth HTTP.                                                    |
| UC02 | auth, users, `common/guards/`                                     | ACTIVE/LOCKED/INACTIVE; role hiện tại từ DB; CUSTOMER/STAFF không được ghi cấu hình ADMIN; auth HTTP và browser account-status.                            |
| UC03 | movies/cinemas/rooms/showtimes, `frontend/src/catalog.js`, client | Ngày/rạp/phim, programme nhiều ngày, không cắt âm thầm; catalog + extended-programme + frontend audit. File catalogue React thực tế xem hướng dẫn VS Code. |
| UC04 | bookings, `BookingConsole.jsx`                                    | Một active claim/ghế/suất, giữ300s, Sweetbox đủ cặp, transaction rollback; 2 API instances và RAM conflict tests.                                          |
| UC05 | `bookings/pricing.service.ts`, `users/discount.service.ts`        | Decimal; server snapshot giá, số lượng combo1–20/active, Party69K, ưu đãi hạng; chống payload giá giả. Chưa có tỷ lệ/API đổi điểm thành tiền.              |
| UC06 | payments, reconciliation, outbox                                  | HMAC-SHA512, order/amount/deadline, SUCCESS/FAILED/CANCELLED, callbacks idempotent, Admin lookup/recovery; payments/tickets HTTP.                          |
| UC07 | tickets, FulfillmentRelay                                         | Chỉ PAID/SOLD phát QR; unique bookingId/ticketHash; F5/callback lặp không sinh vé mới; QR PNG được decode thật trong test.                                 |
| UC08 | notifications, BullMQ/outbox                                      | SMTP loopback; reject/stall/retry không rollback PAID. Acknowledgement là SMTP tiếp nhận, không phải inbox receipt.                                        |
| UC09 | showtime-seats/group-seats                                        | Dải cùng hàng, liên tiếp theo cột, ưu tiên gần tâm, không gợi ý SOLD/HOLDING, kiểm tra lại khi hold; unit + realtime/browser.                              |
| UC10 | `tickets/ticket-format.ts`, calendar owner route                  | ICS UTC, CRLF, escaping/folding/VALARM, đúng movie/cinema/room/time, owner-only; tickets unit/HTTP/browser.                                                |
| UC11 | movies + catalog audit                                            | Mã UUID, tên phim NFC/case/space unique, duration>0, enum age P/K/T13/T16/T18, không đổi duration sau có lịch; catalog tests.                              |
| UC12 | rooms/seats                                                       | Sức chứa/sơ đồ/loại ghế, transaction rollback, immutable layout khi đã có lịch; không xóa dữ liệu có tham chiếu; catalog + DB + browser.                   |
| UC13 | showtimes                                                         | duration+15 phút dọn phòng; mốc14/15/16 phút; GiST exclusion + parent locks; không sửa/xóa lịch đã có booking; conflict suite.                             |
| UC14 | tickets verify/check-in, `SoatVeNhanVien.jsx`                     | Preview read-only, camera/manual input, 4 nhánh quyết định, conditional consume một lần trên2 server; tickets + browser staff.                             |

Lưu ý mô hình: trạng thái lỗi thanh toán nằm ở `Payment.status=FAILED`; booking được đưa CANCELLED và ghế AVAILABLE. Giữ enum API hiện hữu, không tự thêm `BookingStatus.FAILED` rồi làm hỏng client. Vé USED được biểu diễn bằng `ETicket.isCheckedIn=true` với timestamp/staff ID, không đổi schema vé thành enum mới.

## 3. Database, race và khả năng phục hồi

- Sơ đồ vật lý là `Seat(roomId, row, column)`. Claim theo suất nằm ở `BookingSeat(showtimeId, seatId, status)`; deadline nằm ở Booking.expiredAt. Không chép câu SQL mẫu của prompt vào bảng seats vốn không có các cột đó.
- Partial unique `uq_active_showtime_seat` bảo vệ HOLDING/SOLD; Redis mutex có owner + TTL ngắn chỉ hỗ trợ transaction. Xung đột rollback cả danh sách, kể cả yêu cầu có ghế vừa trống vừa bị giữ.
- Lazy expiration là phép chiếu khi đọc, không chạy sweep ghi DB ở mọi GET. BullMQ expiry + BookingMaintenanceService xử lý giải phóng vật lý và retry sau gián đoạn. Ghế SOLD không bị sweep nhầm.
- Ràng buộc `showtimes_no_room_overlap` dùng GiST/time range, cùng B-tree room/start và movie/start. Ticket hash và transaction code có unique index; không index chuỗi ảnh QR/base64. Booking có user/created, status/expired và status/created/showtime. Không thêm index trùng chỉ để giống tên cột trong prompt.
- Native Pool/lock/statement/transaction timeouts hữu hạn; Prisma lifecycle singleton mỗi app. Query programme/capacities theo tập; không gọi một seat-map request cho mỗi suất.
- Thanh toán PAID/SOLD và ticket-request event cùng commit. QR/email hoàn tất sau commit bằng durable retry, không kéo SMTP vào transaction thanh toán.
- Migration trạng thái đã chạy trên database development/test riêng, không reset/truncate. Database test có hậu tố `_test`, khác development; Redis và SMTP test độc lập.

## 4. Hướng dẫn kiểm chứng TC-01…TC-05 và UC14

Các mã dưới đây theo đúng thứ tự trong yêu cầu hiện tại. Trong source lịch sử, tên TC-03 từng dùng cho payment success; bài timer được truy vết riêng để tránh nhầm số.

| Ca                   | Cách thực thi tự động                                                                           | Kết quả cần kiểm tra                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TC-01 — Tranh ghế    | `booking-concurrency.e2e-spec.ts`: hai user/2instances cùng giữ một ghế và mixed-seat selection | Một201, một409; đúng1 active owner; ID ghế xung đột chính xác; không giữ phần còn lại khi fail.                                |
| TC-02 — Trùng lịch   | `showtime-conflict.e2e-spec.ts`                                                                 | Lịch10:00+120phút+15phút chặn bắt đầu12:14, cho12:15/12:16; concurrent create/update không vượt SQL constraint.                |
| TC-03 — Hết giữ300s  | payments boundary299/300/301 và booking expiry/recovery                                         | 299s được trả tiền; đúng300/301 bị từ chối; hết hạn trả AVAILABLE, không thể EXPIRED→PAID. Browser timer dựa expiredAt server. |
| TC-04 — Thất bại/hủy | payments FAILED/CANCELLED, booking cancellation, queued expiry                                  | Không phát vé; đơn kết thúc, payment terminal đúng nhánh; tất cả ghế trả lại; người khác giữ được.                             |
| TC-05 — QR một lần   | `tickets.e2e-spec.ts`, owner QR và staff browser                                                | Một QR/booking; lần check-in đầu thành công, lần sau409; sáu scan đồng thời chỉ1 thành công; không lộ QR cho người khác.       |

Chạy cả4 suite nghiệp vụ trong một lệnh từ root sau khi đã cấu hình PostgreSQL/Redis test riêng và migrate test:

```bash
npm run test:business
```

Lệnh tự generate Prisma và chọn đúng4 suite phía backend, chạy tuần tự. Mở rộng xác thực/catalog/schema/UI bằng:

```bash
npm run test:unit
npm run test:backend
npm run test:db
npm run lint
npm run build
# PowerShell: $env:NOVA_QA_PRODUCTION="1"
NOVA_QA_PRODUCTION=1 npm test
node scripts/check-fullstack-startup.cjs
node scripts/check-backend-only.cjs
```

### Ma trận soát vé UC14

| Dữ liệu đầu vào                                      | Verify                                          | Check-in / dữ liệu                           |
| ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| QR đúng, PAID/SOLD, đúng suất/ngày và trong cửa soát | 200, chi tiết phim/rạp/phòng/ghế; chưa ghi USED | 200; isCheckedIn=true, checkedInAt, staff ID |
| Hash đúng format nhưng không tồn tại                 | 404 TICKET_NOT_FOUND                            | Không thay đổi vé nào                        |
| Vé của suất/ngày khác suất đang chọn                 | 409 TICKET_SHOWTIME_MISMATCH                    | Không consume; chọn lại đúng suất            |
| Vé đã dùng, hoặc request thứ hai cạnh tranh          | 409 TICKET_ALREADY_USED                         | Giữ lần check-in đầu, không dùng lại         |

Ngoài ma trận: chưa đến/quá cửa soát bị409, khách bị403, không đăng nhập401; camera bị từ chối quyền vẫn có nhập mã thủ công. Quyền camera cần HTTPS hoặc localhost theo trình duyệt.

## 5. Chạy sau khi đổi thư mục

- Cài npm từ root monorepo; source chạy là `frontend/src`, assets là `frontend/public`, module Nest/Prisma là `backend/`. Root/src và root/public cũ là bản tương thích, không phải nơi sửa giao diện đang chạy.
- Cấu hình mới: `frontend/.env.local` từ `frontend/.env.example`, `backend/.env` từ `backend/.env.example`. `BACKEND_API_URL` chỉ dùng trên server BFF, không gắn NEXT_PUBLIC vào URL này. Frontend không nhận JWT signing secret hoặc DATABASE_URL qua fallback cấu hình cũ.
- `npm run dev` chạy cả hai phía. Khi chưa có PostgreSQL, RAM fallback đã được nhóm chọn vẫn hoạt động và công khai tính tạm thời. Backend bị mất sau startup trả lỗi503/timeout; BFF không tự tạo đơn PAID giả.
- Với PostgreSQL đang có dữ liệu, chạy **`npm run setup:local` sau khi cập nhật code**, rồi `npm run dev`: helper generate/migrate/seed additive/build, áp dụng cột status mới và cập nhật dist backend. Không chỉ chạy một dist cũ từ lần trước.
- `npm run build` build cả backend và frontend. `npm start` chỉ phục vụ frontend production; backend production phải được khởi chạy riêng và cấu hình upstream đúng.
- Không commit `.env`, mật khẩu seed, fixture runtime, capability QR hoặc signed checkout URLs. Test fixtures chỉ xóa dữ liệu do chính chúng tạo.

## 6. Kết quả và giới hạn

**488 ca độc lập đạt**:89 backend unit +232 HTTP/Socket.IO/PostgreSQL integration +23 schema/database +60 Node/RAM/planner/config +84 browser production. Backend typecheck/typed lint, frontend lint và build cả2 workspace đạt. Đã build lại frontend sau sửa responsive Admin.

Lượt browser đầy đủ đầu tiên có81 ca đạt và3 ca lỗi dữ liệu/giả định của test: dropdown soát vé giả định luôn có nhiều suất ở ngày admission gần nửa đêm Việt Nam; timeline giả định luôn có suất “Hôm nay”; test đối soát mới tham chiếu phần tử thứ5 trong fixture chỉ có4 suất. Đã dùng ngày có4 suất thật, kiểm tra nhãn theo ngày Việt Nam và dùng ID suất tồn tại; giữ kiểm tra unique ID/multiple choices/capacity và không giảm assertion nghiệp vụ. Cả3 ca chạy lại đạt. Sau đó chạy lại5 ca liên quan Admin/staff/timeline, rồi3 ca Admin sau chỉnh bố cục tìm kiếm mobile đều đạt; không cộng lặp vào488.

Hai smoke độc lập đều đạt: (1) fresh native RAM → BFF HttpOnly → hold thật → signed Sandbox → SVG QR; (2) upstream chết trả503, upstream treo được ngắt sau khoảng7,8 giây, không bịa đơn/vé hoặc báo thành công. Native PostgreSQL17.10/Redis7.4.2 và SMTP loopback dùng riêng cho HTTP/browser tests; không chạy các bộ ghi DB đồng thời.

Ảnh đã xem trực tiếp: [Admin desktop](screenshots/lab04/admin-reconciliation-desktop.jpg) và [đối soát mobile](screenshots/lab04/admin-reconciliation-mobile.jpg). Có kiểm tra viewport360px, input tra cứu đủ rộng và navigation không chiếm nhiều dòng.

Tóm tắt số ca và kết quả chạy lại: [lab04-validation.json](measurements/lab04-validation.json). Các số đo latency/FPS của lần audit trước giữ nguyên như lịch sử, không gắn thành số đo mới. Không cộng lặp số ca chạy lại vào tổng.

Hai nghiệp vụ chưa có mô hình/contract trong code được ghi rõ thay vì giả lập: đổi điểm thành tiền (chưa có tỷ lệ được duyệt/API) và quản lý tồn kho bắp/nước hữu hạn (hiện chỉ có active/inactive và số lượng1–20/đơn). Cổng ngân hàng thật chưa triển khai; Sandbox không trừ tiền thật. RAM không thay PostgreSQL về độ bền hoặc chống race nhiều process.

Bộ kiểm thử và báo cáo không đủ để cam kết100% không lỗi hoặc đạt SLA trên mọi máy/mạng. Số đo hiệu năng ở báo cáo native trước là baseline lịch sử, chưa được đo lại cho commit này.
