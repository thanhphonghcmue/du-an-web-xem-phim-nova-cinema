# NOVA Cinema — Full-stack repair Phase 0: current-state audit

Ngày kiểm chứng: **15/10/2026, Asia/Ho_Chi_Minh**. Source baseline: `7351d2c22b01958496f68a31473ef61cdab13b50` (backend Phase10 +partial full-stack commit mới). Branch: `fix/fullstack-productization`.

Theo MASTER REPAIR + FULL-STACK INTEGRATION mới, đây là **Phase0 của roadmap sửa/tích hợp full-stack**, khác roadmap backend Phase0–10 đã có. Chỉ audit, reproduce và đề xuất patch; không thay application code, tests, dependency manifests/locks hoặc migrations. Phần test backend Phase11 đang viết trước khi nhận yêu cầu mới được giữ riêng ngoài checkout, không đưa vào baseline hoặc commit này. Backend Phase11 cũ chưa được hoàn tất.

Main ban đầu trong checkout là776ce31. Khi fetch trước push, phát hiện commit7351d2c của người dùng; branch audit đã fast-forward, đọc9file thay đổi và chạy lại baseline/probes. Source/application changes trong7351d2c là của người dùng, không phải implementation của Phase0 này.

## Kết luận chính

Commit7351d2c đã thêm src/api/client.js, API login/register, AdminDashboard, overview/users và manual outbox purge. **Không còn đúng khi nói hoàn toàn chưa có integration hoặc purge.** Tuy vậy core catalog/seat/checkout/QR vẫn dùng browser-local store, auth contracts/session còn lỗi và realtime chưa nối; invariants PostgreSQL/Redis chưa bảo vệ checkout của website.

**Đã reproduce:** hai Chromium contexts độc lập chọn cùng suất/ghế A1 rồi cả hai checkout thành công; số request `/api/v1` quan sát được bằng0. Đây là thiếu sót full-stack, không phải bằng chứng PostgreSQL bán trùng. Test concurrency backend riêng vẫn pass với một winner.

**Đã reproduce:** API nhận một ghế SWEETBOX, trả201 và lưu một BookingSeat; sơ đồ trả hai ghế cạnh nhau ở trạng thái `HOLDING / AVAILABLE`. Backend chưa có domain pair. Một future showtime cho movie `ENDED` cũng được tạo/hold thành công; đây là khoảng trống sales eligibility theo yêu cầu mới, không phải lỗi overlap BR03.

## Baseline thực chạy

Node24.19.0; Next16.4.0/React19.3.0, Nest11/Prisma6.19.0, PostgreSQL17.11/Redis7.4. Dependencies cài bằng lockfile với `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` ở cả root và backend, đều exit0. Không thay lockfile. Docker PG/Redis dev/test và Mailpit đã healthy trước audit, được giữ nguyên.

| Thư mục | Command                          | Kết quả                                                                                          |
| ------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Root    | `npm run lint`                   | PASS                                                                                             |
| Root    | `npm run build`                  | PASS, Next webpack production build                                                              |
| Root    | `npm test`                       | Lượt npm test dùng preview cũ bị stale chunks; xem isolated rerun bên dưới                       |
| backend | `npm run prisma:validate`        | PASS                                                                                             |
| backend | `npm run typecheck`              | PASS, TypeScript strict                                                                          |
| backend | `npm run lint`                   | PASS, typed ESLint, zero warnings                                                                |
| backend | `npm test`                       | **66/66 unit tests** pass                                                                        |
| backend | `npm run test:e2e`               | **192/192 HTTP/Socket.IO** pass                                                                  |
| backend | `npm run test:db`                | **22/22 PostgreSQL** pass                                                                        |
| backend | `npm run build`                  | PASS                                                                                             |
| backend | `npm run test:cov`               | 66 unit tests pass; unit-only coverage bên dưới                                                  |
| backend | `node scripts/smoke-booking.cjs` | Compiled production booking/payment/realtime/QR/SMTP/check-in/ADMIN report và owned cleanup pass |

Có **293 automated test definitions**:13 frontend +280 backend. Backend280pass; không tuyên bố toàn bộ293pass trên commit mới. Không cộng lần chạy coverage lặp66 unit tests vào tổng. Backend suites và smoke chạy nối tiếp vì shared test database/outbox; Redis prefixes riêng không đủ cô lập outbox. PG/Redis/BullMQ/SMTP fixtures thực; không gửi thư qua external provider. Probes audit riêng không được tính là tests regression mới.

`npm run test:cov` chỉ instrument unit suite: lines **7.64%**, statements **7.57%**, functions **5.91%**, branches **14.00%** trên toàn bộ source được cấu hình. Không bao gồm coverage từ192 integration tests hoặc production smoke; không diễn giải thành full-suite coverage. Unit test riêng JWT/RolesGuard/DiscountService còn thiếu trong baseline, dù auth/RBAC đã có integration tests thực.

Kết quả có cấu trúc, command durations và probe summaries: [baseline-results.json](baseline-results.json). Ma trận truy vết30 test cases: [RTM](../requirements/RTM.md).

## Defects mới từ partial integration

- Registration: API trả safe profile trực tiếp trong data; AuthForm đọc data.user nên tạo account thành công vẫn lỗi giao diện. Login dùng data.user đúng, nhưng hard-coded sample password không gắn private seed credentials.
- Logout: helper không gửi refreshToken nên actual HTTP400, session DB còn active. App sign-out chỉ xóa nova-member, không gọi helper hoặc clear nova_access_token. Access token localStorage, remember checkbox không điều khiển token storage, chưa refresh rotation phía client.
- Group helper gửi groupSize thay vì quantity: actual API400. Catalog/hold/ticket helpers có nhưng core components chưa dùng; không tạo thêm client trùng để sửa.
- AdminDashboard Promise.allSettled không propagate errors; browser fault probe abort API requests vẫn thấy4nhãn UP, missing health fallback thành UP và count fallback6/2/3/54. Cần UNKNOWN/error states; chèn role ADMIN vào browser chỉ mở UI, backend vẫn401/403 — không gọi đây là server privilege escalation.
- Manual outbox purge có predicate đúng. Probe trong temporary isolated PostgreSQL schema dùng actual compiled ReportsRepository: old processed deleted1, recent processed và old pending giữ lại. Không chạy global purge vào public test/dev data. Thiếu bounded batches/schedule/default7day config/metrics, listUsers không pagination và overview không một consistent snapshot.
- VietQR image/destination không phải PaymentProvider implementation và không chứng minh thanh toán thành công. Không có bank transfer/callback được audit thực hiện.

## Phân loại nhận định

`CONFIRMED`: source và/hoặc reproduction xác nhận; `PARTIALLY TRUE`: đã có một phần, phạm vi cần phân biệt; `FALSE/OUTDATED`: nhận định không còn đúng; `NOT VERIFIED`: không đủ bằng chứng runtime.

| Nhận định                                                            | Phân loại      | Bằng chứng / giới hạn                                                                                                           |
| -------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Next.js ở root                                              | CONFIRMED      | package.json; src/app/page.jsx → CinemaExperience → NovaClient → App                                                            |
| LocalStorage/Web Locks đang quyết định ghế và vé trên website        | CONFIRMED      | src/bookingStore.js; SeatBooking.jsx; hai browser contexts cùng checkout A1,0 API requests                                      |
| Login frontend đã tích hợp hoàn chỉnh                                | FALSE/OUTDATED | AuthForm hiện gọi API login/register; register chờ sai data.user, logout/refresh chưa đúng contract                             |
| Backend là project rỗng / chưa có nghiệp vụ                          | FALSE/OUTDATED | 14 models,59 OpenAPI operations,280 tests và compiled smoke pass                                                                |
| Prisma startup phụ thuộc PostgreSQL                                  | CONFIRMED      | onModuleInit gọi $connect; isolated closed-port probe reject với lỗi an toàn                                                    |
| Redis startup phụ thuộc Redis                                        | CONFIRMED      | onModuleInit connect/ping rồi throw; closed-port probe reject; không stop Redis đang dùng                                       |
| Swagger/liveness có thể chạy khi khởi động không có PostgreSQL/Redis | FALSE/OUTDATED | Không có APP_RUNTIME_MODE/start:docs/InfrastructureMode; app.listen cần module init thành công                                  |
| Health không tồn tại / luôn giả healthy                              | FALSE/OUTDATED | Health live/readiness khác nhau; PG/Redis/worker/realtime probes; current healthy instance trả200                               |
| Sweetbox được frontend ghép cặp                                      | CONFIRMED      | SeatBooking.toggleSeat giải cả H odd/even; Playwright pair case pass                                                            |
| Sweetbox đã được backend giữ nguyên cặp                              | FALSE/OUTDATED | Schema không pairGroupCode/equivalent; API half-pair hold201, một persisted seat                                                |
| Group suggestion1–20 chưa có                                         | FALSE/OUTDATED | Sliding-window service + unit/integration tests; API probe1/2/5/20 trả đúng số ghế                                              |
| Voucher chỉ nằm trong JSX                                            | CONFIRMED      | NOVA10/NOVA20/CINEMA50/CHAOBANMOI tại SeatBooking; không Voucher/VoucherUsage model/API/service                                 |
| Outbox chưa có reliability/recovery                                  | FALSE/OUTDATED | SKIP LOCKED, fenced leases, retries/backoff, stale/lost-queue recovery đã có và test                                            |
| Processed OutboxEvent chưa có purge                                  | FALSE/OUTDATED | Đã có manual ADMIN purgeOutbox(daysOld default1) với processedAt NOT NULL/lt cutoff; chưa batch/scheduler/config retention7days |
| Outbox không có pending index                                        | FALSE/OUTDATED | Migration có partial outbox_pending_delivery ngoài Prisma indexes                                                               |
| Sandbox payment không đáp ứng đề vì không thu tiền thật              | FALSE/OUTDATED | Sandbox là yêu cầu bắt buộc; HMAC/idempotent state machine đã chạy                                                              |
| Đã có PaymentProviderAdapter abstraction                             | FALSE/OUTDATED | PaymentSignatureService/PaymentsService tích hợp Internal Sandbox trực tiếp; enum provider không phải adapter                   |
| Booking state machine chưa được bảo vệ                               | PARTIALLY TRUE | Terminal-state/locking/idempotency đã có; chưa PAYMENT_PENDING enum hoặc một transition policy tập trung như roadmap mới        |
| Movie domain đã đầy đủ                                               | PARTIALLY TRUE | CRUD/age/status/duration guards/restrict tốt; thiếu genre/slug/language và metadata bổ sung, release/sales policy               |
| Phim ENDED không tạo lịch/giữ ghế được                               | FALSE/OUTDATED | API probe tạo future showtime201 và hold201 cho ENDED fixture                                                                   |
| Sửa duration có thể âm thầm làm lịch overlap                         | FALSE/OUTDATED | MoviesService reject duration change khi có bất kỳ showtime; catalog/concurrency tests pass                                     |
| Combo snapshot sau đổi giá không có                                  | FALSE/OUTDATED | BookingCombo.unitPrice/quantity và booking totals đã snapshot; tests pass                                                       |
| Combo recommendation đã có backend                                   | FALSE/OUTDATED | Hiện list/create/update combo; chưa recommendation endpoint/service                                                             |
| Admin/Staff có website vận hành hoàn chỉnh                           | FALSE/OUTDATED | AdminDashboard metrics/users/recent10bookings/manual purge có; chưa CRUD catalog/seat/showtime và staff scan flow đầy đủ        |
| Refund đã có / phải thu hồi tiền thật                                | FALSE/OUTDATED | Không RefundRequest/API/REFUND_ENABLED; optional extension, không phải blocker Sandbox core                                     |
| Hai máy vật lý đã được acceptance end-to-end                         | NOT VERIFIED   | Hai isolated browser contexts reproduce gap; chưa có full-stack flow để xác nhận hai máy thật                                   |
| External SMTP inbox delivery, external payment sandbox provider      | NOT VERIFIED   | Local SMTP acceptance được test; không có credentials/provider integration hoặc inbox guarantee                                 |
| Repo đã production secure vì tests xanh                              | FALSE/OUTDATED | Dependency audit còn findings; unit-only coverage thấp; full-stack authority gap còn mở                                         |

## Frontend baseline: regression và nguyên nhân

Lượt `npm test` mặc định dùng lại production preview5173 có trước audit. Sau build/source update, server đó giữ manifest cũ, CSS/webpack/page chunks404 và trang kẹt initial-screen;13case fail do environment. Không coi lượt đó là13 product regressions và không stop preview ngoài scope.

Đã chạy lại **đầy đủ cùng13test không đổi assertion** bằng temporary Playwright config ngoài repo, chỉ đổi baseURL/webServer sang free port mới, reuseExistingServer:false. Kết quả **10pass /3fail** (exit1). Ba failure thực đều timeout ở nút cũ `Tạo tài khoản demo`:

| Test                                        | Source location            | Root cause quan sát                                               |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| member discount, mobile layout and menu     | tests/booking.spec.mjs:204 | AuthForm đổi nút thành Tạo tài khoản; test còn demo signup flow   |
| auth validates fields/password/social scope | tests/booking.spec.mjs:224 | Selector cũ; Google/Apple demo buttons cũng đã bị bỏ trong UI mới |
| quick three-seat helper/C'MEMBER points     | tests/booking.spec.mjs:285 | Vẫn setup hồ sơ qua nút demo signup đã bị thay                    |

Không sửa/skip ba test trong audit. Cần cập nhật setup test theo backend auth thật và sửa register/logout/session contracts trước khi xác nhận luồng tương đương; chỉ rename selector chưa giải quyết business defects. 280backend +10frontend pass =290tests pass,3frontend fail; không tuyên bố293pass. Không tiếp tục implementation phase sau khi regression còn mở.

Frontend lint/build vẫn pass. Temporary config và trace nằm ngoài repo; source tests/Playwright config không thay. Reproduce: dùng Playwright config gốc, giữ testDir/use/assertions, override riêng baseURL/webServer một free port và reuseExistingServer:false; chạy `npx playwright test --config /tmp/nova-audit-playwright.config.mjs`. Không mở hai dev server cùng output directory; không reuse production server sau rebuild.

## Frontend architecture, state và logic trùng

App Router hiện chỉ home/not-found/layout; client boundary dùng dynamic import với ssr:false. Dữ liệu movies/cinemas trong `src/data.js`; ngày và các giờ10:00/13:30/16:45/19:30/22:30 được dựng trong browser. IDs dạng slug/composite showId khác UUID backend. QuickBooking/ShowtimeTimeline cùng đọc bookingStore nên indicator nhất quán trong cùng browser store, không đại diện DB.

| State/rule    | Implementation frontend                                                                                            | Backend tương ứng / chênh lệch                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Auth/profile  | AuthForm gọi login/register; nova-member và nova_access_token browser storage; profile/session lifecycle chưa đúng | Argon2/JWT/refresh/RBAC và users/me đã có; frontend password min8 khác backend min12         |
| Ghế           | nova-seats-v1:showId; Web Locks + storage/nova-seats events; fallback operation nếu thiếu Web Locks                | Redis mutex ngắn + DB hold300000ms + partial unique; chưa frontend API wiring                |
| Hold lifetime | Browser Date.now, component owner UUID mới khi mount                                                               | DB clock/expiredAt + lazy expiry/sweep/queue; chưa refresh/recover owner booking trên UI     |
| Sweetbox      | H1/H2 theo odd/even; frontend Sweetbox110000 mỗi seat                                                              | Backend SWEETBOX ×1.50, không domain pair; rules không tương đương                           |
| Pricing       | JS number, seat constants + combo69000                                                                             | Prisma.Decimal snapshots và server-derived modifiers                                         |
| Membership    | 5% vé, không giảm combo; demo earn floor(total/1000); đổi điểm1điểm=100đ                                           | SILVER5/GOLD7/DIAMOND10% trên vé+combo; earn floor(final×0.10/1000); chưa redemption/voucher |
| Voucher       | NOVA10/20, CINEMA50, CHAOBANMOI giảm vé; một reward mỗi order; code normalize và calculation còn lệch              | Không voucher domain; không được chuyển số giảm phía client thành chính thức                 |
| QR/history    | qrcode browser, UUID +show/seats JSON; nova-tickets local                                                          | Một opaque random hash/ETicket cho mỗi PAID booking; owner APIs và atomic staff check-in     |
| Realtime      | storage events cùng browser profile                                                                                | Socket.IO /seats + Redis Pub/Sub; frontend chưa có Socket.IO client                          |

Đã có `src/api/client.js`, hard-code localhost:4000/api/v1; chưa NEXT_PUBLIC_API_BASE_URL. AuthForm/AdminDashboard gọi client; catalog/seat/hold/ticket helpers chưa được nối vào core UI. Browser core checkout probe vẫn0 request API. Root README vẫn nói backend chỉ Phase1/chưa có backend ở một số đoạn, đã lỗi thời. Frontend thêm VietQR hiển thị hard-coded bank destination và hướng dẫn dùng banking app, nhưng checkout vẫn tự coi thành công ở browser; chưa xác minh destination/provider, không thực hiện chuyển khoản khi audit. Cần gate/label Sandbox và chỉ xác nhận payment từ backend.

`src/MainShowcase.jsx` là **candidate unused module**: không có static importer/route được tìm thấy; chưa kết luận bundle reachability tuyệt đối hoặc xóa file. `CinematicBackdrop`, `GlassNavigation`, `FoodArt` đều đang được import; không đánh dấu dead code chỉ theo tên. Không có CI workflow `.github/workflows` ở baseline.

## Backend architecture và inventory

Nest độc lập trong backend/, Controller → Service → Repository → Prisma; strict DTO/whitelist/error envelope. UnitOfWork sở hữu DB transaction. Global Redis throttler fail-closed; JWT default-deny và current DB role guard. Password Argon2id, refresh hash-only/rotation. Frontend chưa dùng các cơ chế này.

API prefix `/api/v1`, Swagger `/api/docs` và `/api/docs-json`. Generated OpenAPI của compiled app: **42 paths,59 operations**. API inventory đầy đủ ở cuối file; roles xác minh từ controller/decorator, không suy ra RBAC chỉ từ Swagger bearer metadata.

Database có14 models: User, Movie, Cinema, Room, Seat, Showtime, Combo, Booking, BookingSeat, BookingCombo, ETicket, RefreshToken, Payment, OutboxEvent. Movie chưa Genre/MovieGenre, slug/endDate/language/cast/director/banner; Seat không pair identity; Booking không PAYMENT_PENDING enum; Voucher/VoucherUsage/RefundRequest chưa có. Không có BLOCKED seat status hoặc sales-state enum. Không tự thêm schema vì thấy thiếu enum nếu hành vi hiện tại đã biểu đạt được.

Hai migrations được giữ: `20261014000100_initial`, `20261015000100_booking_snapshots_idempotency`. Numeric(14,2), timestamptz(3), UUID, Restrict FKs, positive money/quantity/time/check-in checks. BR01 partial unique `(showtime_id,seat_id) WHERE status IN(HOLDING,SOLD)`; BR03 GiST exclusion `[start,end)` +btree_gist. Released AVAILABLE history được giữ. Parent composite FKs ngăn ghế sai phòng/suất. Không dùng db push/reset để thay migrations.

| Queue / relay                          | Chức năng và lifecycle hiện có                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| infrastructure                         | Readiness enqueue→actual worker→completed probe                                                 |
| seat-expiration                        | expire-booking-hold; stable booking-expire-ID, fixed deadline, DB recheck, early-job reschedule |
| ticket-email                           | SMTP worker, per-event/attempt jobs, fencing và durable DB retry                                |
| ExpiryOutboxRelay + BookingMaintenance | Startup/1s polls; sweep5s/batch100; schedule/cancel-expiry events; recover lost jobs            |
| SeatEventsRelay                        | After-commit seat_locked/released/sold publish qua Redis Pub/Sub                                |
| FulfillmentRelay                       | booking.ticket.requested→idempotent QR; ticket.email.requested→queue; retry độc lập             |

Queue jobs có removeOnComplete/removeOnFail retention. **Queue retention khác table retention.** ReportsRepository hiện đã có deleteMany processed rows qua manual ADMIN endpoint; không có scheduled bounded batches. Table có `(processed_at,available_at)`, `(aggregate_type,aggregate_id)` và SQL partial `outbox_pending_delivery(available_at,created_at) WHERE processed_at IS NULL`. Đánh giá cleanup index dựa trên query/EXPLAIN thực ở phase retention; không tạo index trùng theo suy đoán.

WebSocket thật nằm trong `backend/src/realtime/`, không phải một thư mục gateways bắt buộc. Namespace `/seats`, transport websocket; client emit `join_showtime {showtimeId}` / `leave_showtime`; server quản lý room `showtime:<id>`. Read-only events seat_locked/seat_released/seat_sold và resync_required; không nhận command mutation ghế qua socket. Origin/payload/rate limits có sẵn. Client cần refetch snapshot khi join/reconnect/events; delivery có thể lặp hoặc lệch thứ tự, không exactly-once/offline replay.

Payment provider thực hiện hiện tại chỉ SANDBOX: signed checkout +webhook domains riêng, exact stored amount/transaction binding, duplicate terminal no-op, PAID/SOLD/points/outbox commit atomically. MOMO/ZALOPAY/CARD enum không chứng minh tích hợp provider. Không thu/lưu card/CVV/OTP. QR và SMTP sau commit qua outbox; SMTP acceptance không phải external inbox receipt, ack-window retry có thể lặp thư cùng QR/Message-ID.

Revenue ADMIN hiện là cohort Booking.createdAt theo ngày Việt Nam, chỉ PAID; không phải cashflow theo paidAt. Reports SQL giữ Decimal, không fan-out; sold-seat ticketCount khác số QR. Owner booking/ticket APIs giữ privacy kể cả admin không phải owner; Admin overview đã có recent10 bookings nhưng ticket list/booking pagination/filter cần API riêng có RBAC, không mở rộng owner route tùy tiện.

## Security và consistency findings

Đã có parameterized SQL, database constraints, current-role authorization, amount snapshots, no-store, masked500/request IDs, CORS allowlist, Helmet, SMTP TLS verification và logs không ghi body/token. Không tìm thấy production memory seat-lock fallback. Các guardrails này cần giữ.

`npm audit --json` đã chạy thực: frontend **7 affected packages** (5high/2moderate), backend **43** (37high/6moderate), đều exit1. Đây là số package bị ảnh hưởng trong dependency graph, không phải số exploit độc lập. `npm audit --omit=dev --json`: root **0**, backend **8** (6high/2moderate), backend vẫn exit1. Không coi các lệnh audit này là PASS.

Runtime graph backend bị báo: @nestjs/swagger, @prisma/client, @prisma/config, deepmerge-ts, effect, js-yaml, nodemailer, prisma. Nodemailer hiện7.0.13 có advisory liên quan address parsing/SMTP/raw options; source giới hạn recipients/attachments và TLS nhưng audit này chưa chứng minh reachability hoặc exploit. Ví dụ [Nodemailer raw-option advisory](https://github.com/advisories/GHSA-p6gq-j5cr-w38f), [addressparser advisory](https://github.com/advisories/GHSA-v53p-9fqp-m79j), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Cần triage/upgrade tương thích và rerun SMTP/Prisma/build tests riêng; không npm audit fix/force hoặc đổi major trong audit.

Consistency gaps mới: hai authority stores khác nhau, browser totals/points khác policy server, browser IDs không match DB UUID, half Sweetbox accepted, movie sales eligibility không check status/release period, active booking chưa phục hồi sau refresh UI, voucher chưa server-side, auth/session/client-contract regressions và admin vận hành chưa hoàn chỉnh. Không có bằng chứng backend vi phạm unique active seat hoặc payment idempotency trong baseline; tests thực đang bảo vệ chúng.

## Reproduction và giới hạn

1. Startup down probes tạo loopback port đóng riêng rồi gọi compiled PrismaService/RedisService lifecycle: cả hai reject. Không dừng container hiện có, không sửa connection credentials đang dùng.
2. Compiled app dùng test DB/Redis, own prefix, ephemeral signing keys và local SMTP fixture: live/readiness/OpenAPI200; ADMIN login thật; tạo ENDED movie fixture và future schedule; group queries1/2/5/20; CUSTOMER hold chỉ H1; snapshot xác nhận H1 HOLDING/H2 AVAILABLE; genre query trả400. Overview/users ADMIN200, anonymous401/CUSTOMER403. Thêm client contract probes qua HTTP thật với temporary transport bridge tới owned free port; không fake API response.
3. Hai private Chromium contexts chọn cùng cinema/movie/ngày mai/19:30/A1, cả hai có thông báo checkout success; observed `/api/v1` requests0. Browser contexts mô phỏng storage isolation, không gọi đây là kiểm thử hai máy vật lý.
4. Cleanup đóng đúng owned app/browser/dev server/SMTP, xóa owned fixture IDs và Redis prefix; giữ dev/demo data/services. Probe scripts/logs nằm ngoài repo; sanitized evidence được lưu trong baseline-results.json. Không commit secrets, tokens, QR hashes, node_modules, dist hoặc coverage.

Source7351d2c thêm3 ADMIN operations nhưng existing permanent suites chưa có assertions riêng cho overview/users/purge; audit probes không thay cho regression coverage.

Chưa load-test/SLA, chưa fresh restore máy cloud khác, chưa kiểm chứng external inbox/provider hoặc full-stack two-device acceptance. Known fresh Prisma checksum download403 từ lịch sử không được retry/bypass trong audit; npm ci và Prisma Client hiện tại hoạt động trong instance này. Unit coverage hiện chưa đại diện integration coverage. Không có source implementation fix trong Phase0.

Patch plan và phase boundaries: [fullstack-patch-plan.md](fullstack-patch-plan.md). **Dừng ở audit; chưa triển khai Phase1 của roadmap repair mới.**

## API inventory từ compiled OpenAPI

59 operations dưới42 paths; `/api/docs` và `/api/docs-json` là Swagger infrastructure, không cộng vào59 operations dưới đây. Mới thêm overview/users/purge-outbox thuộc ADMIN; purge mặc định1ngày và nhận daysOld0, chưa scheduler.

| Path                                                   | Methods            | Auth/scope                                  |
| ------------------------------------------------------ | ------------------ | ------------------------------------------- |
| `/api/v1`                                              | GET                | Public bootstrap                            |
| `/api/v1/health`                                       | GET                | Public health                               |
| `/api/v1/health/live`                                  | GET                | Public health                               |
| `/api/v1/showtimes/{showtimeId}/seats`                 | GET                | Public GET; ADMIN mutations                 |
| `/api/v1/showtimes/{showtimeId}/group-seat-suggestion` | GET                | Public GET; ADMIN mutations                 |
| `/api/v1/bookings/hold`                                | POST               | JWT owner                                   |
| `/api/v1/bookings/me`                                  | GET                | JWT owner                                   |
| `/api/v1/bookings/{id}`                                | GET                | JWT owner                                   |
| `/api/v1/bookings/{id}/cancel`                         | POST               | JWT owner                                   |
| `/api/v1/users/me`                                     | GET, PATCH         | JWT current user                            |
| `/api/v1/users/me/membership`                          | GET                | JWT current user                            |
| `/api/v1/combos`                                       | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/combos/{id}`                                  | PATCH              | Public GET; ADMIN mutations                 |
| `/api/v1/auth/register`                                | POST               | Public; refresh/logout require refreshToken |
| `/api/v1/auth/login`                                   | POST               | Public; refresh/logout require refreshToken |
| `/api/v1/auth/refresh`                                 | POST               | Public; refresh/logout require refreshToken |
| `/api/v1/auth/logout`                                  | POST               | Public; refresh/logout require refreshToken |
| `/api/v1/movies`                                       | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/movies/{id}`                                  | GET, PATCH, DELETE | Public GET; ADMIN mutations                 |
| `/api/v1/cinemas`                                      | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/cinemas/{id}`                                 | GET, PATCH, DELETE | Public GET; ADMIN mutations                 |
| `/api/v1/rooms`                                        | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/cinemas/{cinemaId}/rooms`                     | GET                | Public GET; ADMIN mutations                 |
| `/api/v1/rooms/{id}`                                   | GET, PATCH, DELETE | Public GET; ADMIN mutations                 |
| `/api/v1/rooms/{roomId}/seats`                         | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/seats/{id}`                                   | GET, PATCH, DELETE | Public GET; ADMIN mutations                 |
| `/api/v1/rooms/{roomId}/seats/generate`                | POST               | Public GET; ADMIN mutations                 |
| `/api/v1/showtimes`                                    | GET, POST          | Public GET; ADMIN mutations                 |
| `/api/v1/showtimes/{id}`                               | GET, PATCH, DELETE | Public GET; ADMIN mutations                 |
| `/api/v1/payments/create-sandbox-url`                  | POST               | Owner JWT / HMAC webhook / signed Sandbox   |
| `/api/v1/payments/webhook`                             | POST               | Owner JWT / HMAC webhook / signed Sandbox   |
| `/api/v1/payments/sandbox`                             | GET                | Owner JWT / HMAC webhook / signed Sandbox   |
| `/api/v1/payments/sandbox/complete`                    | POST               | Owner JWT / HMAC webhook / signed Sandbox   |
| `/api/v1/payments/{bookingId}/status`                  | GET                | Owner JWT / HMAC webhook / signed Sandbox   |
| `/api/v1/tickets/me`                                   | GET                | JWT owner/private calendar                  |
| `/api/v1/tickets/{id}/calendar`                        | GET                | JWT owner/private calendar                  |
| `/api/v1/tickets/{id}`                                 | GET                | JWT owner/private calendar                  |
| `/api/v1/staff/check-in`                               | POST               | STAFF/ADMIN                                 |
| `/api/v1/admin/reports/revenue`                        | GET                | ADMIN                                       |
| `/api/v1/admin/reports/overview`                       | GET                | ADMIN                                       |
| `/api/v1/admin/reports/users`                          | GET                | ADMIN                                       |
| `/api/v1/admin/reports/purge-outbox`                   | POST               | ADMIN                                       |
