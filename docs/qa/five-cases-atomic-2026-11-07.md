# Đối soát năm ca FR07 / FR08 / TC-12 / TC-13 — 07/11/2026

Baseline `main`: `2f51c6f`. Kiểm tra và vá vào kiến trúc NestJS/PostgreSQL/Redis + Next.js hiện hữu; không Docker, không thay schema hoặc reset đơn/vé thật. Không viết lại giao diện Dark Cinema. Các endpoint thực dùng prefix `/api/v1` qua BFF HttpOnly.

## Nguyên nhân, bản vá và kết quả

| Ca         | Có tại baseline / phần thiếu                                                                                                                                                                                           | Bản vá                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_FR07_05 | Khóa suất, release unpaid holds và kiểm tra ACTIVE trong transaction đã có. Thiếu alias ADMIN, trạng thái trong form sửa và câu mã lỗi mới. Form gửi lại giờ theo phút có thể vô tình đổi giây khi chỉ sửa trạng thái. | Thêm PATCH `/admin/showtimes/:id` và `/:id/status`; nút khóa/mở và sửa rõ tên, form có ACTIVE/LOCKED/CANCELED. PATCH chỉ gửi trường đã đổi. Đổi trạng thái mềm và release HOLDING/PENDING cùng transaction, giữ PAID/SOLD. Trả409 với `errorCode: SHOWTIME_LOCKED_OR_CANCELED` và câu tiếng Việt yêu cầu; giữ trường `error: SHOWTIME_UNAVAILABLE` cho client cũ. Dropdown đọc trạng thái theo ngày, hiện Tạm khóa/Đã hủy và vô hiệu hóa. |
| TC_FR08_02 | DB/service đã phân biệt FAILED và có failure_reason; nút, nội dung và màu huy hiệu chưa khớp đề.                                                                                                                       | Nút **⚠️ Xác nhận Thanh toán Thất bại (Lỗi giao dịch)**, JSON/payload lưu `99_PAYMENT_FAILED`, đơn FAILED/PAYMENT_DECLINED và trả ghế. Modal **Thanh toán Sandbox thất bại (Trạng thái đơn: FAILED)**, nội dung theo đề, nút quay lại sơ đồ; huy hiệu FAILED đỏ trong lịch sử/đối soát.                                                                                                                                                   |
| TC_FR08_03 | Backend đã lưu CANCELLED/CUSTOMER_ABORTED, UI cần thể hiện tách biệt.                                                                                                                                                  | Nút **✕ Hủy thanh toán (Hủy giao dịch)**, `24_USER_CANCELLED`, đơn CANCELLED và trả ghế. Modal **Giao dịch đã được hủy bỏ (Trạng thái đơn: CANCELLED)**; huy hiệu CANCELLED xám, quay về sơ đồ và đặt lại được. Không đổi FAILED lịch sử thành CANCELLED.                                                                                                                                                                                 |
| TC-12      | Đã có lookup riêng, alias chính xác, QR camera/file/fallback và fixture V1; thẻ chưa hiện tổng tiền và toàn bộ ghế của booking để đối chiếu, thiếu lookup tại trang nhân viên.                                         | Tái sử dụng `SingleTicketLookup.jsx`, nâng tiêu đề/nút/badge, giờ Việt Nam, số tiền và `bookingSeats`. Có tại đầu ví vé, `/ve` qua Header **🔍 Tra cứu mã vé**, và trang nhân viên. Lookup nhân viên riêng, chỉ STAFF/ADMIN, chỉ đọc, không tự soát. Đơn mới cũng tra được bằng mã riêng của vé vừa phát hành.                                                                                                                            |
| TC-13      | Tra cứu đã owner-only và không fallback; thiếu đúng câu lỗi mới và hồi quy cho endpoint nhân viên.                                                                                                                     | Mã bất kỳ khác rỗng gửi xuống API; mã giả hoặc vé của chủ khác đều404 `found:false`, `data:null`, câu **Không tìm thấy mã vé hoặc mã vé không hợp lệ!**. UI ẩn kết quả cũ/danh sách tổng, hiện đầy đủ câu cảnh báo theo đề. CUSTOMER không gọi được lookup của nhân viên.                                                                                                                                                                 |

Không bỏ kiểm tra lịch giao nhau/15 phút hoặc khóa lịch đã có lịch sử đặt vé để làm Admin “lưu được”. Giờ/phòng/giá được sửa trên suất chưa có booking; trạng thái mềm vẫn sửa được khi có booking. Đây là bảo vệ toàn vẹn dữ liệu, không phải lỗi FK cần tắt. Nếu gửi đổi cấu trúc cùng đổi trạng thái mà vi phạm, transaction rollback toàn bộ.

## Vé V1 và nguyên tắc từng ghế

V1 dùng mã đầy đủ `NOVA-20261102-8F9A`, alias `8F9A`; V1B là QR riêng cho ghế còn lại. V1 chỉ cấp quyền vào ghế **F08**; thẻ lookup cho chủ vé/nhân viên bổ sung **Ghế trong đơn đã thanh toán: F08, F09**, tổng tiền **315.270đ**, GOLD, suất19:30 và Party Combo69K để đối chiếu booking. Không gộp hai quyền vào một QR. Hạng thành viên GOLD không đổi loại ghế DB từ VIP thành một enum mới.

Fixture dùng phim/rạp Dune/Landmark có dấu nhận biết demo và lịch hôm nay tại Việt Nam, tách khỏi lịch bán thật; chọn đúng gói Party Combo69K chuẩn, tránh gói Classic. Seed chỉ non-production, tạo khi thiếu, không reset vé USED. Launcher `npm run dev`/`npm run dev:full` chuẩn bị seed theo luồng hiện có; nếu chạy backend riêng có thể dùng `npm run seed:admission` ở root. Đăng nhập đúng tài khoản GOLD mà lệnh seed thông báo để tra V1; khách khác phải nhận404. Không công khai QR/PII chỉ vì biết mã ngắn. Vé mới giữ mã riêng duy nhất hiện hữu, không thay bằng chuỗi V2/V3 dễ đoán hoặc đụng mã demo.

## Tệp đã cập nhật

Frontend:

- `frontend/src/App.jsx`: tên liên kết Header, guard chọn suất không ACTIVE và phục hồi đơn đang xem sau reload.
- `frontend/src/api/client.js`, `components/CatalogProvider.jsx`, `useQuerySelection.js`: tham chiếu đơn trong URL, ngữ cảnh suất bị khóa vẫn đọc từ server, setter bộ lọc ổn định để effect phục hồi không lặp.
- `frontend/src/components/QuanLyDanhMucPhimRap.jsx`: thao tác dòng, trạng thái và PATCH chỉ trường đổi.
- `frontend/src/components/DatVeNhanh.jsx`: trạng thái suất theo ngày/focus/thông báo khóa, nhãn và option disabled.
- `frontend/src/components/BookingConsole.jsx`: mã lỗi mới, thông báo khóa, hai modal thanh toán và quay lại sơ đồ.
- `frontend/src/components/SandboxGateway.jsx`: ba hành động SUCCESS/FAILED/CANCELLED riêng.
- `frontend/src/components/LichSuVeKhachHang.jsx`, `QuanTriHeThong.jsx`, `AdminReconciliation.jsx`: nhãn/màu trạng thái rõ ràng.
- `frontend/src/components/SingleTicketLookup.jsx`, `SoatVeNhanVien.jsx`: thẻ đối chiếu booking, nhập/quét và lookup nhân viên.
- `frontend/src/styles.css`: FAILED đỏ/CANCELLED xám, nút thất bại và badge dài responsive; giữ CSS cũ.

Backend:

- `backend/src/modules/showtimes/{showtime.dto,showtimes.controller,showtimes.module,showtimes.service}.ts`: alias ADMIN, status DTO và cập nhật mềm cùng giải phóng ghế.
- `backend/src/common/filters/api-exception.filter.ts`: mã lỗi/câu lookup theo contract, không lộ lỗi nội bộ.
- `backend/src/modules/payments/{payment.dto,payments.service}.ts`: responseCode theo outcome, lưu payload hiện có, không đổi HMAC/giá/idempotency.
- `backend/src/modules/tickets/{staff.controller,ticket.dto,tickets.service}.ts`: lookup được bảo vệ, bookingSeats và chỉ đọc.
- `backend/standalone/{runtime,admin,admission-fixtures}.cjs`: giữ contract tương ứng trong adapter RAM tạm; RAM không phải lưu bền PostgreSQL.
- `backend/scripts/admission-fixtures.cjs`: fixture chọn đúng Party Combo69K.

Kiểm chứng: `backend/test/{catalog,payments,tickets}.e2e-spec.ts`, `scripts/memory-contract.test.cjs`, `tests/{booking,cinema-status,ticket-admission,business-audit}.spec.mjs`, bộ bắt lỗi React/runtime `tests/runtime-console.mjs`; kiểm tra khởi động tại `scripts/check-fullstack-startup.cjs`.

## Kiểm tra lại trên giao diện

1. **TC_FR07_05:** Khách giữ ghế; Admin → Rạp, Phim & Suất Chiếu → Suất chiếu → Khóa/Hủy trên dòng hoặc Sửa → đổi trạng thái. Khách tiếp tục/refresh thấy modal đỏ đúng câu, API409, ghế giữ được trả. Bấm chọn suất khác, suất cũ có nhãn và bị vô hiệu hóa. PAID/SOLD giữ nguyên.
2. **TC_FR08_02:** Giữ ghế → mở Sandbox → bấm nút thất bại. Modal nêu FAILED, lịch sử và đối soát badge đỏ, API có99_PAYMENT_FAILED, ghế AVAILABLE/không QR. Quay lại sơ đồ chọn lại được.
3. **TC_FR08_03:** Giữ ghế → Sandbox → Hủy thanh toán. Modal nêu CANCELLED, badge xám, API có24_USER_CANCELLED, ghế AVAILABLE/không QR. Quay lại và giữ lại chính ghế đó.
4. **TC-12:** Với chủ fixture, mở Vé của tôi hoặc Header → Tra cứu → nhậpV1. Đối chiếu phim/rạp/phòng/19:30, F08 của vé, F08/F09 trong đơn,315.270đ và combo. Thử mã đầy đủ, alias8F9A hoặc quét ảnh QR; kết quả cùng một vé. Tra cứu từ nhân viên không đổi thời điểm check-in.
5. **TC-13:** Sau khi đang thấy V1, nhập FAKE123/V999/QR_INVALID_999/ABCXYZ/V999_FAKE. API404, data:null/found:false, không còn thẻ V1 hoặc bảng tổng. Đăng nhập khách khác và nhập mã V1 cũng404; gọi endpoint nhân viên bằng khách nhận403.

## Bằng chứng và phạm vi

| Ca yêu cầu | Kết quả | Đối chiếu chính                                                                                                                                                        |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_FR07_05 | PASS    | Admin khóa/sửa CANCELED trên UI; ghế giữ được trả, SOLD giữ nguyên; tạo đơn/thanh toán bị409, modal đúng câu, suất bị vô hiệu hóa. F5 sau khóa vẫn khôi phục cảnh báo. |
| TC_FR08_02 | PASS    | FAILED/PAYMENT_DECLINED,99_PAYMENT_FAILED, modal và badge riêng; trả ghế, không QR và chọn lại được.                                                                   |
| TC_FR08_03 | PASS    | CANCELLED/CUSTOMER_ABORTED,24_USER_CANCELLED, modal và badge riêng; trả ghế và chọn lại chính ghế cũ.                                                                  |
| TC-12      | PASS    | V1/mã đầy đủ/8F9A/QR cùng vé; dữ liệu/315.270đ/ghế khớp booking. Vé mới cũng lookup được, hai ghế có hai QR riêng. Lookup nhân viên không check-in.                    |
| TC-13      | PASS    | Mã giả và mã của khách khác đều404/found:false/data:null, không fallback; khách không có quyền gọi lookup nhân viên.                                                   |

- Backend: **117 unit + 258 HTTP/integration PASS**, typecheck/typed lint/build đạt; PostgreSQL/Redis native. Bao gồm race giữ ghế/check-in, RBAC, giá server, FAILED/CANCELLED, owner/staff lookup và alias quản trị.
- Node/RAM: **118 PASS**; frontend production build/lint đạt.
- Browser frontend production: lượt hồi quy cuối **23/23 PASS**; thêm hai ca CRUD phim/đối soát đã đạt ở lượt riêng, tổng **25 ca độc lập**. Sau khi ổn định setter bộ lọc và build lại, kiểm tra lại **3/3** ca F5/QR/khóa sau reload trên build bàn giao; **2/2** ca khóa/phục hồi cũng PASS trong Next dev. Không có pageerror hoặc cảnh báo React duplicate-key/hydration trong các ca được monitor; HTTP404/409 dự kiến không phải lỗi runtime. Giao diện Sandbox còn được kiểm tra375/768/1440px.
- Startup RAM: **PASS**,28 món, đăng ký/đăng nhập HttpOnly BFF, chọn suất/ghế, hold, signed Sandbox và QR. Lượt smoke bắt được cách truyền bộ lọc sai vào `apiList`; đã sửa dùng tham số riêng và chạy lại thành công.

Lượt browser rộng được chạy lại theo lỗi thực tế, không cộng số lần retry thành số ca độc lập. Các lỗi fixture đã sửa gồm chọn nhầm role button thay cho combobox và script khởi tạo Playwright chạy cả trong iframe email bị sandbox chặn storage. Giữ nguyên sandbox của email, không mở `allow-same-origin` để né lỗi test. Route Admin được làm ấm trước lúc giữ ghế trong test dev; các test vẫn giữ đầy đủ assertion API, thời hạn và phân quyền.

Kiểm tra dev/reload phát hiện lỗi phục hồi thật: suất khóa không còn trong programme đang bán, và `/dat-ve` không lưu tham chiếu đơn vừa giữ. Nay URL chỉ lưu ID đơn, giữ nguyên router state; đọc lại danh sách đơn của chủ đang đăng nhập trước khi dựng ngữ cảnh từ API suất bị khóa. Không lưu JWT/QR, không tin giá/trạng thái từ URL, không reset deadline. Xóa tham chiếu khi khách đóng/hủy/đặt lại. Bổ sung test F5 ngay sau khi Admin khóa và test F5 giữ nguyên deadline. Giờ/phòng/ghế vẫn lấy từ backend; không dùng snapshot UI để cấp quyền đặt vé.

Chạy suite native tuần tự vì dùng chung DB/outbox test; SMTP fixture chỉ loopback. Không dùng database production cho fixture:

```bash
npm run test:backend
npm run test:unit
npm run lint
npm run build:frontend
npx playwright test tests/ticket-admission.spec.mjs tests/cinema-status.spec.mjs tests/booking.spec.mjs --grep 'FR09|FR07|TC-|TC_FR|two-column|Sandbox|failed completion|actual expired|a real API 409|refresh restores'
node scripts/check-fullstack-startup.cjs
```

PASS chỉ áp dụng các kịch bản và trình duyệt đã chạy; không tuyên bố mọi trình duyệt/thiết bị hay toàn dự án không còn lỗi, không suy ra đạt budget30ms từ kiểm thử chức năng. Giữ nguyên trạng thái Phase11–12.
