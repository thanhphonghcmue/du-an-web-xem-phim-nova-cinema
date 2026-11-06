# FR09 — nhập mã, soát vé và tra cứu riêng lẻ (07/11/2026)

## RCA và ranh giới giữ nguyên

Ô nhập staff tại HEAD không có HTML pattern. Lỗi chính là DTO `CheckInDto`/`VerifyTicketDto` chỉ nhận hash64 hoặc mã8, và repository chỉ tìm hai dạng đó. Vì vậy V1/8F9A/mã giả chưa đi đến bước tra tồn tại. Camera đã có jsQR, nhưng nhánh thiếu quyền hiển thị hướng dẫn như lỗi; chưa có tải ảnh và các nút mẫu. Trang `/ve#opaque-token` trước đây chỉ đọc QR token và ví vé có tìm danh sách, chưa có form tra một mã độc lập.

Vá tại controller/service/repository hiện có, không thay API cũ hoặc dữ liệu QR đã phát hành. Nghiệp vụ check-in vẫn là kiểm tra STAFF/ADMIN từ DB, PAID/SOLD, suất, giờ và cập nhật có điều kiện `isCheckedIn=false` trong transaction. Soát trước/xác nhận sau vẫn là mặc định; API mới hỗ trợ `autoCheckin:true` cho thiết bị muốn xác nhận ngay. Một vé chỉ được dùng một lần.

## Mã và dữ liệu

- Migration `20261107000400_ticket_aliases`: mở rộng ticket_code từ8 lên96 ký tự, giữ nguyên giá trị/default cũ; thêm short_code unique, aliases[] có GIN index, qr_payload/hmac_signature nullable cho tương thích vé cũ và demo_only mặc định false. Không reset hoặc sinh lại QR cũ.
- `shared/ticket-input.cjs` + khai báo kiểu `.d.cts` dùng chung Node/NestJS/Next: JSON keys, URL fragment/query/path, TICKET: prefix, NV- mã8, trim/in hoa. Không thực thi/tải URL. Chuỗi lạ vẫn tới server để tra; chỉ rỗng, sai kiểu hoặc quá4096 ký tự bị400. Không lấy tên file làm mã QR.
- Tìm chính xác hash/canonical code/short_code/alias đã đăng ký. Không dùng LIKE hậu tố: suffix ngẫu nhiên có thể khớp nhầm vé hoặc nhiều ghế. Nếu nhiều bản ghi khớp thì từ chối thay vì chọn vé đầu tiên.
- `payment_status` lấy từ bookings.status; `ticket_status` tính từ PAID/isCheckedIn; `used_at` là checked_in_at; `checked_in_by` là checked_in_by_staff_id. Không thêm các cột trạng thái trùng nhau dễ lệch. API xuất paymentStatus/ticketStatus/usedAt/shortCode cùng các trường cũ.
- QR mới lưu qr_payload và HMAC-SHA256 có domain prefix từ key server. Token QR ngẫu nhiên64 vẫn là capability hiện có; HMAC không được nhận từ client để thay quyền sở hữu. Key/HMAC không xuất ra API ticket details. Vé cũ không có hai cột mới vẫn đọc/check-in bằng token cũ.

## Seed và chế độ mô phỏng

`npm run seed:admission` build backend, migrate native và tạo fixture nếu chưa có V1. Cần chạy seed tài khoản chuẩn trước (`npm run seed`); lệnh mới không reset vé đã dùng. Launcher `npm run dev`/`npm run dev:full` tự tạo fixture sau seed/build khi NOVA_REFRESH_PROGRAMME không bị tắt. Không chạy seed ở production.

Mẫu được gắn với tài khoản CUSTOMER có tier GOLD do seed phát hiện; CLI in email chủ vé để tester đăng nhập đúng người. Mọi API tra mã ngắn đều yêu cầu đăng nhập và chỉ trả vé của chính tài khoản đó. STAFF/ADMIN soát được bằng cổng soát vé. Tên phim/cụm rạp fixture có hậu tố demo để phân biệt dữ liệu thật, phòng Hall1 IMAX, giờ19:30 và21:45 theo ngày Việt Nam hiện tại. Suất mẫu khóa và phim ENDED để không đưa vào lịch đặt vé đang bán.

| Mã                 | Alias     | Ghế                    | Trạng thái ban đầu                    |
| ------------------ | --------- | ---------------------- | ------------------------------------- |
| NOVA-20261102-8F9A | V1, 8F9A  | F8 VIP                 | PAID, chưa dùng                       |
| NOVA-20261102-8F9B | V1B, 8F9B | F9 VIP cùng đơn với V1 | PAID, chưa dùng                       |
| NOVA-20261102-USED | V2        | F10 VIP                | PAID, dùng cách thời điểm seed16 phút |
| NOVA-20261102-LATE | V3        | F11 VIP, suất21:45     | PAID, chưa dùng                       |

Giữ yêu cầu trước **mỗi ghế một vé/QR**: V1 chỉ check-in F8; F9 cần V1B. Không dùng QR V1 để cho cả hai người vào. Mốc ngày trong mã là alias cố định để tester gõ đúng prompt; ngày chiếu thuộc fixture hôm nay. Vé demo có cờ riêng; chỉ fixture này bỏ cửa sổ thời gian trong non-production để test ở mọi giờ, không phải mở rộng cửa sổ cho vé thật. Production từ chối admission/lookup demo. V2 giữ timestamp DB, số phút tăng theo thời gian thực, không hardcode16 sau khi đã chờ lâu.

RAM có alias/REST/usedAt tương ứng, bộ mẫu được tạo khi mở công cụ staff/tra V1 với catalogue demo đầy đủ; dữ liệu mất khi restart như chế độ RAM đã được chấp thuận. Các phiếu mẫu không gửi email thật.

## API

Prefix thật giữ `/api/v1`:

- POST `/staff/verify` và `/staff/check-in` cũ vẫn tồn tại, ticketHash nhận mọi mã không rỗng; mã giả trả404 thay vì400 định dạng. Verify cũ vẫn yêu cầu showtimeId.
- POST `/staff/verify-ticket`: `{code, showtimeId?, currentShowtime?, autoCheckin?}`. Chỉ STAFF/ADMIN. Preview mặc định chưa dùng; autoCheckin=true thực hiện cùng primitive check-in nguyên tử. `currentShowtime` chỉ là điều kiện kiểm tra thêm, không cấp quyền vào suất khác.
- POST `/staff/checkin`: cùng payload, luôn xác nhận nếu hợp lệ.
- GET `/tickets/lookup?code=...`: authenticated owner-only. Chính xác một vé của người gọi hoặc404 `{found:false,data:null,...}`; mã của người khác và mã không tồn tại trả cùng phản hồi. Không fallback sang danh sách.
- POST `/tickets/lookup` public cũ chỉ nhận opaque hash và chỉ trả thông tin tối thiểu, không PII/token QR; không mở public lookup theo V1/mã ngắn.
- GET `/staff/demo-fixtures`: chỉ STAFF/ADMIN; enabled=false ở production, chỉ cung cấp trạng thái công cụ demo và suất mẫu hiện có.

API mới có statusType VALID_SUCCESS/ALREADY_USED/WRONG_SHOWTIME/INVALID_NOT_FOUND. Kết quả thành công giữ envelope `{success,data,message}` và thêm các trường status tương ứng để tương thích client mới. Lỗi vé đã dùng có409 TICKET_ALREADY_USED, checkedInAt DB, tiêu đề và minutesAgo. Lookup404 có found=false/data=null; các lỗi server khác vẫn qua global handler cũ, không lộ stack/SQL.

## UI

- `SoatVeNhanVien.jsx`: nhập mã không regex chặn định dạng, hiển thị thẻ neon xanh/đỏ/cam; nút xác nhận, quét lại lần2 và giờ check-in trước. Mã giả hiển thị rõ mã đã nhập và từ chối vào rạp.
- `QrCapture.jsx`: camera getUserMedia trong try/catch, fallback viewport mô phỏng có laser; tải ảnh decode pixel qua jsQR, đóng bitmap/stream/RAF khi kết thúc/unmount. Bốn nút mẫu phụ thuộc cờ backend non-production; không xuất hiện như vé thật ở production. Thiếu camera không biến thành lỗi vé.
- `SingleTicketLookup.jsx`: ô riêng, nhập tay/dán JSON hoặc quét ảnh/camera, chip V1/full/mã giả; xóa kết quả cũ trước request và chống response cũ ghi đè mã mới. `/tai-khoan` ẩn danh sách tổng và QR featured khi đang tra; `/ve` cũng ẩn thẻ auto-lookup cũ. Có nút xóa tra cứu để trở về danh sách.
- Header có đường dẫn Tra cứu vé. Lỗi mạng giữ thông báo lỗi mạng, không suy thành vé hợp lệ/đã dùng. Timeout API8s giữ nguyên.

## Ma trận kiểm chứng

| Ca                     | Kết quả | Assert thực tế                                                                                                                            |
| ---------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TC_FR09_02             | PASS    | QR PNG thật mang tên file QR_INVALID_999 vẫn giải mã đúng V1; preview có phim/phòng/ghế, xác nhận đổi USED; thiếu camera chuyển mô phỏng. |
| TC_FR09_03             | PASS    | V1 quét lại409 và hiển thị giờ DB; V2 hiển thị số phút thực từ usedAt; hai cửa check-in V1B đồng thời chỉ một200, một409.                 |
| TC_FR09_04             | PASS    | QR_INVALID_999 thực sự gọi API và nhận404, hiện thẻ đỏ, không bị chặn định dạng; V3 sai suất bị409/cam và không được dùng.                |
| Tra cứu V1             | PASS    | V1/8F9A/full code/JSON cùng một vé PAID, có QR SVG; V1B là vé khác chỉ ghế F9; danh sách tổng bị ẩn.                                      |
| Tra cứu mã giả/bảo mật | PASS    | Mã giả, chuỗi SQL và script trả404/data:null, không fallback; chủ khác404, chưa đăng nhập401, CUSTOMER check-in403.                       |

Vòng cuối: **7/7 Playwright PASS (1.7 phút)**, gồm năm ca trên và golden path QR từng ghế/ICS/check-in độc lập, staff camera fallback + mobile không tràn ngang. Backend check: typecheck, typed lint, 116 unit +254 HTTP/integration và build PASS. Schema:26 PostgreSQL tests PASS, migration deploy thành công trên DB test. Node/helpers/RAM:115 PASS (gồm26 RAM contracts và bộ mẫu V1/V2/V3). Frontend production build/lint PASS, không warning lint; smoke tự chuyển RAM28 món → BFF HttpOnly → hold → signed Sandbox → QR PASS. Không phải toàn bộ Playwright suite của repository.

Các lỗi fixture bắt gặp trong QA được sửa tại nguồn: modifier VIP phải1.20, movie demo có tên riêng tránh unique title, snapshot GOLD cần baseTicketPrice/discountRate0.070 và số tiền khớp discount. Không nới constraint DB. Login rate limiter của app giữ nguyên; mỗi case chỉ xóa throttle trong Redis namespace fixture do chính bộ test tạo. Selector input dùng exact để không nhầm với nhãn khu vực.

## Chạy lại

Cấu hình PostgreSQL/Redis test riêng theo README backend; SMTP test chỉ loopback. Không chạy fixture suite trên production.

```bash
npm run seed:admission
npm run test:backend
npm run test:db
npm run test:unit
npm run build
npx playwright test tests/ticket-admission.spec.mjs tests/booking.spec.mjs --grep 'FR09|TC_FR09|Sandbox success|staff date lookup'
node scripts/check-fullstack-startup.cjs
```

Seed mới cần schema mới và Prisma Client được generate: launcher native đã chuẩn bị theo luồng seed/build; chạy backend riêng thì `npm run db:migrate --workspace backend` và `npm run prisma:generate --workspace backend` trước khi start. Seed CLI in email chủ vé mẫu để tester đăng nhập đúng người; không biến mã V1 thành mã tra công khai. Dùng tài khoản STAFF/ADMIN cho soát vé, không dùng tài khoản khách hàng.

Chưa benchmark tải thực tế/khẳng định mọi API dưới30ms trong đợt này. Index mã/alias hỗ trợ tra chính xác; không bỏ quyền sở hữu/khóa/validation để lấy số đo đẹp. Chưa thử camera vật lý trên mọi thiết bị; đã kiểm tra fallback bị từ chối quyền và giải mã ảnh PNG thật qua browser.
