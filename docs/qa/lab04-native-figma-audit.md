# Kiểm toán LAB04 — native, nghiệp vụ và chuẩn bị Figma

Đợt kiểm toán ngày 29/10/2026 (UTC; timestamp evidence giữ UTC, giờ chiếu hiển thị Asia/Ho_Chi_Minh). Baseline GitHub `f755e83`, nhánh `feat/nova-discovery-ui`. Yêu cầu nguồn: file “Pasted text.txt” người dùng gửi trong lượt này. Giữ cấu trúc frontend/backend/docs, các route, UUID, Decimal money và cơ chế bảo vệ lịch sử giao dịch. Không Docker và không thêm dependency.

## Lỗi/gap đã xử lý

| Mã               | File                                                                                                                    | Phát hiện → bản sửa                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SIT-FIELD-01     | `backend/src/bootstrap.ts`, `common/exceptions/input-validation.exception.ts`, `common/filters/api-exception.filter.ts` | Validation chỉ có mảng thông báo chung, không biết ô bị lỗi → bổ sung `details.fieldErrors` với đường dẫn DTO và thông báo. Giữ nguyên status/error/message hiện hữu. Chỉ exception validation nội bộ được phép xuất chi tiết này; không trả target/value, không trả chi tiết tùy ý của lỗi500. Bỏ field prototype/whitelist không thuộc form, chặn độ sâu và số mục chi tiết. |
| UI-FIELD-01      | `frontend/src/api/formErrors.js`, `DangNhap_DangKy.jsx`                                                                 | Tên vượt giới hạn server hoặc email trùng chỉ hiện banner → gắn lỗi ngay dưới đúng ô, `aria-invalid`/`aria-describedby`, xóa lỗi trường khi sửa. Danh sách ô được allowlist, tên DTO `fullName` ánh xạ về `name`; lỗi500/phiên bản API cũ vẫn có thông báo chung. Khóa các trường/tab trong lúc gửi.                                                                           |
| UI-FIELD-02      | `QuanLyDanhMucPhimRap.jsx`, `RoomLayoutBuilder.jsx`                                                                     | Thời lượng/tên phim và lỗi ma trận thiếu phản hồi từng trường → hiển thị lỗi ở đúng control; báo khả năng vượt300 ghế/15 hàng/24 cột và Sweetbox; không chuyển phân hệ/phòng khi mutation đang chạy. Không tự sửa giá, ID hoặc sức chứa để né validation.                                                                                                                      |
| RAM-CONTRACT-01  | `backend/standalone/runtime.cjs`                                                                                        | RAM nhận tên quá120 ký tự hoặc phone object dù Nest từ chối → đồng bộ giới hạn name2–120, email≤254, password12–128 và phone string; lỗi có fieldErrors, không lưu user nếu chưa hợp lệ. Giữ scrypt/session hiện có và nhãn RAM không bền vững.                                                                                                                                |
| START-01         | `scripts/dev-fullstack.cjs`                                                                                             | Sau pull/fresh install, launcher có thể seed trước migration/Prisma hoặc chạy `dist` backend cũ → PostgreSQL mode development chạy seed-native (generate, preflight Unicode, migrate, seed additive) và build backend trước readiness/Next. Không ghi đè `.env`/secrets; vẫn giữ RAM fallback đã được chọn khi chuẩn bị DB thất bại.                                           |
| FIGMA-FLOW-01    | `styles.css`, `premiere.css`, `cinema.css`                                                                              | Icon/nút mật khẩu xếp bằng absolute; quick-booking và header nhúng kéo bằng margin âm → dùng Grid cho form/header và flow dương cho thanh đặt vé. Giữ nền ảnh/badge/canvas/SVG/overlay có vị trí riêng khi cần.                                                                                                                                                                |
| UI-AUTH-ID-01    | `DangNhap_DangKy.jsx`, `tests/booking.spec.mjs`                                                                         | Trang đăng nhập và modal cùng tồn tại có ID input/error trùng nhau → tạo prefix `useId()` riêng cho mỗi form, nối đúng label/password toggle/aria-describedby. Hai test cũ đổi từ ID cố định sang kiểm tra accessible description của input thật.                                                                                                                              |
| CATALOG-RACE-01  | `CatalogProvider.jsx`, `tests/lab04-catalogue-recovery.spec.mjs`                                                        | Admin tạo rạp trong lúc snapshot cũ chưa hoàn tất: reload chỉ nhập vào request cũ nên dropdown thiếu rạp mới → xếp một lượt tải mới sau request đang chạy. Test giữ phản hồi snapshot cũ, tạo rạp thật rồi xác nhận chọn được UUID mới.                                                                                                                                        |
| CATALOG-429-01   | `api/programme-transport.js`, `scripts/programme-transport.test.mjs`, `tests/lab04-catalogue-recovery.spec.mjs`         | Danh mục lớn và nhiều context dùng chung IP có thể hết quota chunk, làm trống lịch/soát vé → chỉ khi chunk trả429, hủy nhóm tải dở và gọi API legacy thật đúng một lần, cùng deadline gốc. Không tăng quota; lỗi mạng/503 vẫn được báo lỗi, không mock hoặc cắt phim/suất.                                                                                                     |
| QA-TIMING-01     | `tests/optimization-metrics.spec.mjs`                                                                                   | Bộ đệm Resource Timing mặc định250 entry đầy khi danh mục có khoảng200 chunk cộng ảnh, thiếu5 mẫu dù tải thành công → tăng buffer chỉ trong test; giữ assertion số chunk đầy đủ và kích thước từng response.                                                                                                                                                                   |
| QA-CORE-01       | `scripts/qa-native.cjs`, `package.json`                                                                                 | Có bộ đầy đủ nhưng thiếu lối chạy riêng cho deliverable LAB04 → `npm run qa:lab04` chạy generate/migrate test, business suites PG/Redis/SMTP thật và 4 hành trình browser quan trọng, có summary riêng. Runner đầy đủ `qa:native` được giữ.                                                                                                                                    |
| FIGMA-HANDOFF-01 | `docs/design/figma-lab04-capture.json`, `figma-lab04-guide.md`                                                          | Thiếu inventory đầy đủ trang/trạng thái/prototype → có20 trang/nhóm trang canonical,6 URL cũ,16 trạng thái và dây nối mẫu; nêu rõ cần import/cấu hình prototype trong Figma riêng.                                                                                                                                                                                             |

Không thay request payload/endpoint hoặc chuyển phép tính tiền sang client. Chi tiết lỗi validation là trường response bổ sung; các consumer cũ vẫn nhận message/error cũ. Không xóa component hoạt động tốt hoặc thay toàn bộ thiết kế.

## Ma trận HTTP và contract

| Tình huống                                                     | Kết quả thực thi                                                                                             | Chứng cứ tự động                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 400: email/name/password, duration, ma trận, combo âm/phân số  | DTO chặn trước mutation; fieldErrors cho ô hợp lệ, bản cũ vẫn đọc được message                               | auth/catalog/booking-concurrency/app e2e; `lab04-readiness.spec.mjs`; RAM contract                                      |
| 401: chưa đăng nhập/token sai/hết hạn                          | Cookie HttpOnly + refresh; khi hết refresh mở đăng nhập, giữ context chọn vé                                 | auth e2e; business-audit SIT-04; booking browser                                                                        |
| 403: CUSTOMER/C'MEMBER → STAFF; STAFF → ADMIN; LOCKED/INACTIVE | Kiểm tra role/status từ DB hiện tại                                                                          | auth/catalog/tickets e2e; business-audit                                                                                |
| 404: tài nguyên không tồn tại, vé không tồn tại                | Domain error, UI empty state/soát vé rõ ràng                                                                 | showtime-conflict/tickets e2e; booking browser                                                                          |
| 409: email/tên phim trùng, tranh ghế, chồng lịch, QR dùng lại  | Atomic uniqueness/locks, không commit một phần                                                               | booking-concurrency/showtime-conflict/catalog/tickets e2e                                                               |
| 500 và timeout DB                                              | Global filter che exception/stack/SQL; lỗi pool trả503 có thông báo an toàn                                  | app e2e; database/pool unit tests                                                                                       |
| Success và lỗi                                                 | Success `{success,data,message}`; lỗi giữ `{success:false,error,message,statusCode,...}` và optional details | Không đổi lỗi thành envelope mới làm gãy client; `errorCode` trong prompt là alias tùy chọn, không thay `error` hiện có |
| IDOR                                                           | Chủ khác không xem/hủy/nhận QR;404 theo contract để không lộ sự tồn tại                                      | booking/tickets/payment e2e; business-audit                                                                             |
| Giá/điểm giả từ frontend                                       | Từ chối field ngoài DTO; tính Decimal từ DB và snapshot, không tạo claims khi request bị từ chối             | SEC-01 trong booking-concurrency + schema constraints                                                                   |

HTTP tạo hold là **201**, không đổi sang200 chỉ để khớp ví dụ prompt. Tiền vẫn là chuỗi fixed2, IDs UUID. API dùng `comboItems:[{comboId,quantity}]`, không thêm `comboCount/useCmemberPoints` giả vào payload.

## Truy vết 14 use cases và 5 hành trình

Đã đối chiếu cả PDF gốc `LAB04_NOVA_Cinema_LaTeX.pdf` được đính kèm: **Bảng2.12, trang31–33**, UC05 ghi “áp dụng quyền lợi C’MEMBER hợp lệ theo chính sách đã chốt của nhóm”. Tài liệu không đưa ra tỷ lệ đổi điểm thành tiền. Vì vậy giữ chiết khấu hạng/tích điểm đã chốt trong code; không suy ra1 điểm bằng1đ hay1.000đ để tự trừ tiền. Yêu cầu đổi điểm trong prompt tham khảo vẫn cần chính sách riêng nếu nhóm muốn bổ sung.

| Use case            | Triển khai/kiểm tra                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UC01 đăng ký        | Argon2id PostgreSQL, email duy nhất và chuẩn hóa;400/409; field error đúng ô. RAM dùng scrypt native, không tuyên bố có Argon2id trong RAM.                                                      |
| UC02 đăng nhập/RBAC | JWT/refresh, trạng thái tài khoản hiện tại, current DB role; giới hạn API auth giữ nguyên.                                                                                                       |
| UC03 tra cứu        | Đủ phim/rạp/phòng/lịch theo ngày, dữ liệu rỗng có items:[], catalogue không nhúng từng ghế. Snapshot/chunk giữ nguyên toàn bộ dữ liệu.                                                           |
| UC04 giữ ghế        | 1–20 ghế, all-or-none, 300 giây từ server; idempotency không gia hạn; database uniqueness là lớp bảo vệ cuối.                                                                                    |
| UC05 tính tiền      | Giá ghế/combos theo DB, chiết khấu hạng SILVER/GOLD/DIAMOND, snapshot Decimal. Đổi điểm sang tiền chưa có quy tắc quy đổi/API được định nghĩa; không tự bịa giảm tiền.                           |
| UC06 Sandbox        | SUCCESS/FAILED/CANCELLED và callback đến muộn sau expiry; atomic PAID/SOLD/payment/points/outbox; lặp SUCCESS chỉ một vé. `TIMEOUT` được biểu diễn bằng booking EXPIRED, không đổi enum hiện có. |
| UC07 QR             | Opaque hash64hex do server tạo, chỉ PAID/SOLD, một ticket/booking. F5/retry lấy lại vé cũ.                                                                                                       |
| UC08 email          | Outbox + retry async, SMTP451/stall không rollback PAID/QR; SMTP acceptance không đồng nghĩa đã vào inbox và không bảo đảm exactly-once email.                                                   |
| UC09 gợi ý ghế      | Cùng hàng/cột liên tục, ưu tiên trung tâm, loại ghế bị giữ/bán; giữ ghế vẫn tái kiểm tra dưới transaction.                                                                                       |
| UC10 ICS            | UTC RFC5545, đúng phim/rạp/phòng, UID ổn định, escape/fold UTF8; không nhúng ticket capability.                                                                                                  |
| UC11 phim           | Tên duy nhất kể cả Unicode/case/space, thời lượng1–600 theo DTO đang dùng, nhãn P/K/T13/T16/T18.                                                                                                 |
| UC12 phòng/ghế      | Ma trận và totals atomic, capacity300, rollback; bảo vệ cấu trúc khi đã có lịch sử tham chiếu, kể cả booking đã hủy.                                                                             |
| UC13 lịch           | `endTime = startTime + duration +15 phút`; boundary đúng end được phép; room lock và GiST exclusion chống race.                                                                                  |
| UC14 soát vé        | Verify không tiêu thụ; chỉ xác nhận mới dùng vé; bốn nhánh hợp lệ/đã dùng/sai suất-khác ngày/không tồn tại; concurrent check-in chỉ một winner.                                                  |

- **E2E-01:** GOLD fixture có50.000 điểm → cinema/phim thật → gợi ý cặp VIP + Party69K → hold300s → tổng server/chiết khấu → Sandbox → QR/ICS → STAFF verify/check-in một lần. Dùng tài khoản/đơn fixture riêng, không dùng tài khoản `cmember@nova.vn` của người dùng.
- **E2E-02:** giả lập expiry ở DB test/đồng hồ UI → không thanh toán được, ghế hiển thị khả dụng; không reset5 phút khi F5.
- **E2E-03:** hủy trả ghế ngay sau commit; thêm ca phản hồi HOLDING cũ đến muộn không hồi sinh nút thanh toán.
- **E2E-04:** ma trận UC14 trên API và UI; scanner camera thiếu hỗ trợ có đường nhập mã thủ công.
- **E2E-05:** tạo phim/phòng/ghế/lịch qua ADMIN, chặn overlap và cho phép boundary sau15 phút. Không viết trực tiếp vào DB người dùng để làm đẹp kết quả UI.

## Hiệu năng, database và bảo mật

- PostgreSQL17/Prisma: một PrismaService cho mỗi Nest application, pool có giới hạn và đóng lúc shutdown. Không ép globalThis chia client giữa các app/test DB. SQLite không được chọn, vì vậy WAL/SQLITE_BUSY không áp dụng.
- Không ghép mọi collection thành một JOIN tạo nhân chéo lịch×combo×phim. Giữ các query theo collection/set-based và cache snapshot; tránh N+1 ghế bằng capacity batch. Lazy expiry là phép chiếu read-only, cleanup worker/outbox tách khỏi GET.
  -20 users qua2 API instances tranh một ghế VIP: chỉ1 ×201 và19 ×409, không500. Partial unique constraint giữ an toàn cả khi Redis lock bị bỏ qua. SQL parameterized/ORM, staff conditional update và snapshot price vẫn giữ.
- Mỗi chunk catalogue <15KiB, nhưng tổng JSON catalogue hàng nghìn suất vẫn lớn hơn15KiB. API legacy và cache lạnh có thể vượt30ms. Không cắt phim/suất để đạt số byte.
- Không có tương tác/mutation mạng thật nào bảo đảm “0ms”; thời gian giải phóng ghế có ranh giới commit, GET lại từ client có chi phí mạng/render. Timer riêng không cập nhật toàn ma trận mỗi giây; request có budget8s và finally mở khóa UI.
- Fallback khi quota chunk trả429 đọc API legacy đầy đủ, có thể lớn hơn15KiB. Đây là nhánh phục hồi dữ liệu thật; không được gộp với kết quả budget từng chunk. Đoạn chỉ fallback404/422 trong báo cáo tối ưu cũ mô tả baseline trước bản vá này.
- Burst20 request xác nhận kết quả nhất quán, không phải phép đo chứng minh mỗi transaction dưới10ms hoặc mọi packet tới server cùng một mili giây.

### Đối chiếu mã kiểm thử trong master prompt

Các assertion chi tiết Input → Steps → HTTP/DB/UI trong [ma trận69 kịch bản](ultra-expanded-audit.md#ma-trận-kịch-bản) tiếp tục được chạy; bảng dưới trỏ thêm phần vá/evidence hiện tại. Bảng không cộng số bài kiểm thử.

| Nhóm         | Test/script chính                                                                                            | Kết luận/phạm vi                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| SIT-01/02    | `booking-concurrency.e2e-spec.ts`, `catalog.e2e-spec.ts`, `tickets.e2e-spec.ts`                              | DTO/UUID/Decimal, mảng rỗng, envelope hiện hữu; không ép đổi payload sang tên mẫu trong prompt.                                                 |
| SIT-03       | `app.e2e-spec.ts`, `auth.e2e-spec.ts`, `catalog.e2e-spec.ts`, `lab04-readiness.spec.mjs`                     | 400 không ghi dữ liệu sai; lỗi đúng ô đăng ký/phim/ma trận, không lộ giá trị gửi lên.                                                           |
| SIT-04/05    | `auth.e2e-spec.ts`, `business-audit.spec.mjs`                                                                | 401 tái xác thực giữ context;403 RBAC/LOCKED/INACTIVE.                                                                                          |
| SIT-06/07/08 | `tickets.e2e-spec.ts`, `showtime-conflict.e2e-spec.ts`, `app.e2e-spec.ts`                                    | 404/409 đúng contract; lỗi500/503 an toàn. Mã QR sai format là400, hash đúng format không tồn tại là404.                                        |
| SIT-09/10    | `payments.e2e-spec.ts`, `tickets.e2e-spec.ts`                                                                | Callback lặp, fail/cancel/expiry; SMTP451/stall/retry không làm mất PAID/QR. Không khẳng định toàn luồng QR dưới50ms.                           |
| SIT-11       | `ticket-format.spec.ts`, `tickets.e2e-spec.ts`                                                               | RFC5545 UTC/escape/fold đúng; chưa thao tác import thực trong Google/Apple/Outlook.                                                             |
| E2E-01…05    | `business-audit.spec.mjs`, `booking.spec.mjs`, `creative.spec.mjs`, `discovery.spec.mjs`                     | Năm hành trình theo nghiệp vụ hiện hữu. Riêng đổi điểm thành tiền chưa có policy/API, không đánh dấu phần đó đã triển khai.                     |
| CONC-01/02   | `booking-concurrency.e2e-spec.ts`, `tickets.e2e-spec.ts`                                                     | 20 khách/2 API tranh1 ghế; check-in đồng thời chỉ1 lần thành công.                                                                              |
| SEC-01/02/03 | `booking-concurrency.e2e-spec.ts`, `tickets.e2e-spec.ts`, `catalog.e2e-spec.ts`, `business-audit.spec.mjs`   | Chặn sửa giá/IDOR/SQL injection; XSS hiện text. Đây là kịch bản đã thử, không là chứng nhận mọi lỗ hổng bảo mật đã hết.                         |
| UI-01/02/03  | `business-audit.spec.mjs`, `creative.spec.mjs`, `lab04-readiness.spec.mjs`                                   | Dedup UUID, gateway/nút không tràn trên375/768/1440px; timer state riêng và grid không DOM mutation mỗi tick. Chưa profile mọi React component. |
| RES-01/02    | `performance.spec.mjs`, `frontend-booking-resilience.spec.mjs`, `booking.spec.mjs`, `check-backend-only.cjs` | Offline/timeout8s mở lại nút; reload giữ deadline; phản hồi HOLDING cũ không hồi sinh đơn hết hạn.                                              |
| PERF-01/02   | `pool-url.spec.ts`, `seats-realtime.e2e-spec.ts`, `qa-metrics.spec.mjs`, `optimization-metrics.spec.mjs`     | Pool hữu hạn, GET lazy read-only; số đo và budget chưa đạt được giữ riêng phía dưới.                                                            |
| RES-CATALOG  | `programme-transport.test.mjs`, `lab04-catalogue-recovery.spec.mjs`                                          | Snapshot cũ/mutation và chunk429 đều có hồi quy riêng; đối chiếu phim hiển thị với danh mục API thật.                                           |

## Kết quả thực thi

**579 bài kiểm thử độc lập đạt** ở bản cuối, không cộng các lượt chạy lại:

| Nhóm                           | Số bài đạt | Bằng chứng                                               |
| ------------------------------ | ---------: | -------------------------------------------------------- |
| Backend unit                   |        115 | Lượt đầy đủ `qa:native`,18 suite                         |
| HTTP/Socket.IO/PostgreSQL/SMTP |        248 | Lượt đầy đủ `qa:native`,10 suite                         |
| Schema PostgreSQL              |         23 | Lượt đầy đủ `qa:native`                                  |
| Node/RAM/config/launcher       |         87 | Chạy lại toàn bộ Node sau bản vá chunk429                |
| Browser production             |        106 | Chạy lại toàn bộ106 bài sau các bản vá form ID/catalogue |

Typecheck/typed lint/frontend lint/build hai workspace đạt; smoke RAM startup và backend unavailable/timeout đạt. Backend không thay đổi sau lượt native đầy đủ. [Tổng hợp các lượt và phạm vi](measurements/lab04-native-validation.json).

Lịch sử được giữ để không che lỗi: lượt `qa:native` đầu tiên đạt575 (115+248+23+86+103). Sau đó thêm ID riêng cho hai form cùng xuất hiện và chạy launcher PostgreSQL thật, seed additive làm database test có danh mục lớn hơn. Lượt UI104 lúc này đạt99/104: hai selector còn trỏ ID cố định cũ, một stale snapshot làm thiếu rạp vừa tạo, một chunk429 làm dropdown soát vé không tải được, một phép đo mất entry do buffer250. Đã sửa đúng từng nguyên nhân, thêm hai hồi quy catalogue, rồi chạy lại toàn bộ **106/106 đạt trong9,7 phút**. Không tăng timeout/quota, không bỏ/skip assertion nghiệp vụ hoặc cắt danh mục.

`qa:lab04` độc lập đạt **134 kiểm thử business native +4 hành trình browser**. Đây là tập con của bộ đầy đủ, không cộng138 này vào tổng. Từng bước và `scope=lab04-core` có trong [summary riêng](measurements/lab04-core-summary.json).

Khởi chạy `npm run dev` qua PostgreSQL/Redis thật cũng đạt: generate/migration/seed/build → backend readiness → Next BFF → danh mục có13.519 suất → lỗi đăng ký400 hiển thị đúng ô trên browser. Chỉ dùng database test riêng; không ghi database ứng dụng, không gửi thư ra dịch vụ ngoài. [Bằng chứng startup](measurements/lab04-native-startup.json). Probe lần đầu có lỗi EBADF ở thao tác đóng log lúc teardown; sửa probe cục bộ và chạy lại exit0, không sửa ứng dụng để né test.

[Ảnh biểu mẫu mobile](screenshots/lab04-auth-fields-mobile.jpg). Bằng chứng công khai chỉ chứa summary/timing/size, không token, mật khẩu, hash vé, ảnh QR hoặc URL Sandbox có chữ ký.

### Số đo thực tế

Build production, Chromium/BFF qua loopback, PostgreSQL/Redis native riêng. Lượt đo đầy đủ có32 phim,8 rạp,105 phòng,25 combo,6.326 suất (gồm fixture); khác dataset seed development trong smoke startup phía trên. Không xóa mẫu chậm hoặc gộp hai dataset thành so sánh trước/sau.

| Phép đo                                                         |       Kết quả | Giới hạn                                                     |
| --------------------------------------------------------------- | ------------: | ------------------------------------------------------------ |
| Manifest sau Admin sửa thật làm mất cache                       |      224,40ms | 1 mẫu lạnh, chưa đạt30ms                                     |
| Manifest nóng p95                                               |       11,40ms | 10 mẫu                                                       |
| Chunk lượt đầu p95                                              |       18,50ms | 46 chunk                                                     |
| Chunk nóng qua network p95                                      |        9,00ms | 10 mẫu                                                       |
| HTTP JSON chunk lớn nhất                                        |    14.764byte | Đạt từng response <15KiB                                     |
| Catalogue đầy đủ sau ghép                                       | 2.113.585byte | Không đạt toàn catalogue <15KiB                              |
| Thanh toán HTTP + direct ticket service QR sẵn sàng khi SMTP451 |       61,00ms | 1 mẫu trong Jest, chưa đạt50ms; không gồm browser/relay poll |

API legacy (10 mẫu có giữ mẫu đầu): movies p95 **169,90ms**, cinemas **23,90ms**, programme **101,30ms**, sơ đồ ghế **27,40ms**. Summary giữ `performanceBudgets=NOT_MET`; chỉ các budget nóng/chunk đạt mới ghi true. Không gọi số đo trên một máy là SLA mọi thiết bị hoặc Internet.

[Bản summary](measurements/lab04-summary.json) · [từng mẫu legacy](measurements/lab04-performance.json) · [structured transport và cache F5](measurements/lab04-optimization-performance.json) · [SMTP451/tách QR encoder](measurements/lab04-smtp-performance.json) · [hành trình browser](measurements/lab04-journey-performance.json).

### Đo bổ sung với danh mục lớn sau native seed

Lượt browser106 có200 chunk: manifest nóng p95 **8,7ms**, chunk nóng p95 **31,6ms**. Phần đo legacy lúc cuối lượt thiếu wire bytes ở một số tài nguyên vì buffer mặc định bị đầy; không coi giá trị null là đạt. Sau đó chỉ tăng buffer trong `qa-metrics.spec.mjs`, chạy lại3 bài metrics và xuất đủ mẫu mới. Nguồn ứng dụng không đổi; không cộng3 lượt này vào579.

Lượt đo bổ sung có **50 phim,7 rạp,260 phòng,25 combo,19.789 suất/200 chunk** (gồm seed + fixture), chạy đồng thời lint trên cùng máy. Đây là phép đo chẩn đoán mới, không phải benchmark trước/sau với dataset hoặc tải máy cố định. Không thay thế hay xóa số đo của lượt575 phía trên.

| Phép đo bổ sung                           |       Kết quả | Budget                                                |
| ----------------------------------------- | ------------: | ----------------------------------------------------- |
| Manifest lạnh sau Admin invalidation thật |      745,10ms | Chưa đạt30ms,1 mẫu                                    |
| Manifest nóng p95                         |       15,50ms | Đạt30ms trong10 mẫu này                               |
| Lượt chunk đầu p95                        |       31,00ms | Chưa đạt30ms,200 mẫu                                  |
| Chunk nóng qua network p95                |       44,40ms | Chưa đạt30ms,10 mẫu                                   |
| HTTP JSON chunk lớn nhất                  |    15.348byte | Đạt15KiB theo code; còn vượt15.000byte                |
| JSON catalogue đầy đủ                     | 6.560.246byte | Chưa đạt tổng catalogue <15KiB                        |
| Tải đủ200 chunk + automation              |    3.377,89ms | Có chi phí tải đầy đủ; không phải latency một request |

Legacy p95 trong10 mẫu có giữ mẫu đầu: movies **152,30ms**, cinemas **34,60ms**, programme **762,20ms**, seats **44,20ms**. Vì vậy không khẳng định ghế hoặc chunk nóng luôn dưới30ms từ lượt nhỏ trước đó. Các assertion kích thước dùng15×1024=15.360byte; nếu yêu cầu “15KB” nghĩa là15.000byte thì chunk lớn nhất còn vượt348byte. [Toàn bộ mẫu legacy lớn](measurements/lab04-expanded-performance.json) · [toàn bộ mẫu structured/cache lớn](measurements/lab04-expanded-optimization-performance.json). Kết luận hiệu năng vẫn **NOT_MET**.

## Chạy lại

Cần PostgreSQL/Redis native test riêng và `TEST_DATABASE_URL` khác DB ứng dụng, theo README. Không chạy đồng thời các suite ghi chung test DB/outbox.

```powershell
# Script độc lập cho tranh ghế, payment/QR/ICS, UC14 và E2E chuẩn:
npm run qa:lab04

# Kiểm toán đầy đủ, có schema/unit/browser/performance và smoke lỗi upstream:
npm run qa:native
```

Hai lệnh dùng [scripts/qa-native.cjs](../../scripts/qa-native.cjs); scope `lab04-core` và `full` được ghi tách trong `.runtime/qa-native/<run-id>/summary.json`. Core tái sử dụng assertion native đang có, không thay bằng mô hình giả. Test launcher riêng dùng service stub loopback để kiểm thứ tự prepare/build/readiness, không được tính là bài PostgreSQL nghiệp vụ; các integration suite và browser fixture mới là evidence PG thật.

## Bàn giao Figma và giới hạn còn lại

[Capture guide](../design/figma-lab04-guide.md) · [20 trang + trạng thái + dây nối](../design/figma-lab04-capture.json).

Bố cục web đã kiểm tra không đè/tràn ở các vùng sửa trên ba viewport. **Chưa import/tạo file Figma hoặc kiểm chứng Auto Layout do plugin chuyển đổi.** HTML capture không chuyển React handlers/auth/API thành prototype có nghiệp vụ; cần wire frame trong Figma theo bản đồ bàn giao.

Các điểm không được đánh dấu đạt giả: đổi điểm C'MEMBER thành tiền khi chưa có tỷ lệ/quy tắc, mọi request/cache lạnh dưới30ms, tổng catalogue đầy đủ dưới15KiB, mọi tương tác0ms, chạy PostgreSQL/Redis trên máy chưa cài dịch vụ chỉ bằng npm, hoặc prototype Figma đã xuất xong.

Browser evidence là Chromium headless production trên môi trường cloud này; chưa chứng minh Safari/Firefox, camera điện thoại thật hoặc tốc độ trên máy Windows của người dùng. Thanh toán là Sandbox, không phải kết nối ngân hàng tiền thật. RAM fallback giữ theo lựa chọn trước đó và vẫn mất dữ liệu khi restart; kiểm thử PostgreSQL chạy riêng, không lấy kết quả RAM làm bằng chứng DB bền vững.
