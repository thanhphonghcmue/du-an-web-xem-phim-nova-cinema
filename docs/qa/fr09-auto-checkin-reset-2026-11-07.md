# Đối chiếu prompt FR09 mới — 07/11/2026

## Những gì đã có và phần còn thiếu

Trên main 7d88d4d, nhập mã/alias/JSON/URL, giải mã ảnh QR thật qua jsQR, camera fallback, USED409/giờ soát cũ, mã giả404, tra cứu chủ vé và bảo vệ QR từng ghế đã có kiểm thử đạt. Không có HTML pattern/minLength/maxLength ở ô nhập mã.

Prompt mới yêu cầu hai hành vi khác bản trước: **bấm Kiểm tra vé phải check-in ngay** và **reset V1 để chấm lại**. Trước bản vá này, giao diện mặc định xem trước rồi yêu cầu xác nhận; seed lại không reset vé đã dùng. Vì vậy không thể khẳng định bản cũ đã đáp ứng đủ file mới chỉ dựa trên báo cáo test cũ.

## Bản vá

- `backend/src/modules/tickets/staff.controller.ts`: POST `/api/v1/staff/verify-ticket` mặc định autoCheckin=true; vẫn nhận false nếu muốn preview. API `/staff/verify` cũ tiếp tục chỉ xem trước. Thêm POST `/staff/demo-fixtures/reset` có DTO, JWT và role STAFF/ADMIN.
- `tickets.service.ts` và `tickets.repository.ts`: metadata nút mẫu lấy từ các bản ghi demo thật trong DB. Reset khóa cùng thứ tự với soát vé, chỉ chọn đúng shortCode=V1, demoOnly=true, booking PAID. Cập nhật đồng thời isCheckedIn=false, checkedInAt=null, checkedInByStaffId=null. Giữ nguyên ID/code/hash/QR, ghế SOLD, đơn và tiền. Không nhận ID vé tùy ý; không reset V1B/V2/vé thật. Production trả404 và không mở công cụ demo.
- `ticket.dto.ts`: DTO reset chỉ chấp nhận code V1 hoặc bỏ trống. Giới hạn4096 ở API vẫn là giới hạn tài nguyên, không phải lọc định dạng mã. Mọi chuỗi không rỗng trong ô nhập vẫn đi xuống API.
- `backend/standalone/runtime.cjs`: cùng default auto, metadata DB RAM, giới hạn DTO và reset chỉ V1 trong non-production. Giữ tính chất RAM mất dữ liệu sau restart đã được chấp thuận.
- `frontend/src/components/SoatVeNhanVien.jsx`: mặc định bật “Tự động check-in khi kiểm tra vé”. Thành công hiện ngay USED/giờ soát, không yêu cầu bấm xác nhận thêm. Có thể bỏ chọn để dùng luồng preview cũ. Thêm nút reset mẫu và thông báo kết quả; ngăn request chồng, mở khóa nút trong finally.
- `QrCapture.jsx`: nút mẫu lấy code từ metadata backend, một nút mã giả cố ý, hiệu ứng300ms rồi gửi mã; nút quét lại dùng đúng mã vừa soát. Timeout mô phỏng được hủy khi đóng/disabled/unmount, giữ bảo vệ ảnh/camera cũ trả chậm. Camera vẫn getUserMedia try/catch + fallback; ảnh giải mã pixel thật, không đoán mã từ tên file.
- `AdmissionStatus.jsx`, `frontend/src/styles.css`: giữ thẻ neon, bổ sung nhãn “Thời gian soát vé lần trước”; reset/checkbox co giãn và xuống dòng ở375px.

Không dùng LIKE hậu tố chung vì có thể nhận nhầm hoặc khớp nhiều vé. `8F9A` đã là alias đăng ký chính xác của V1; mã khác không tồn tại phải404, không trả vé mặc định. Không bỏ kiểm tra quyền sở hữu, PAID/SOLD, suất/ngày hoặc giờ vào rạp của vé thật.

## Dữ liệu mẫu

Chạy `npm run dev:full` với seed mặc định: native chuẩn bị schema/seed/build và vé mẫu; RAM tạo mẫu khi mở công cụ staff. Nếu chủ động tắt NOVA_REFRESH_PROGRAMME, có thể chạy `npm run seed:admission` riêng. Cần tài khoản STAFF/ADMIN và backend đang chạy; không thể giả kết quả thành công khi chỉ mở frontend mà API chưa hoạt động.

V1/8F9A/NOVA-20261102-8F9A là một vé cho F8; F9 cùng đơn có V1B/QR riêng. V2 đã dùng từ16 phút trước lúc seed, V3 khác suất. Số phút tăng theo thời gian thực. Không hardcode trạng thái hoặc thời gian từ frontend. Reset là công cụ chỉ dành vé demo, không phải tính năng mở lại quyền vào rạp cho vé thật.

## Tester bấm ba bước

1. Đăng nhập nhân viên → mở `/staff` → bấm **“🔄 Reset trạng thái vé mẫu (Để test lại từ TC_FR09_02)”** → nhập `V1`/`8F9A` và bấm **“Kiểm tra vé”**, hoặc bấm nút quét V1. Giữ checkbox tự động được chọn. Kỳ vọng thẻ xanh **“Soát vé thành công - Hợp lệ”**, **“Trạng thái vé: Đã sử dụng / Đã check-in”**, đúng phim/phòng/ghế/mã vé.
2. Bấm **“📲 Quét lại QR Vé Đã Soát (Test Lần 2 - TC_FR09_03)”** hoặc kiểm tra lại V1. Kỳ vọng409, thẻ đỏ **“Vé đã được sử dụng!”**, giờ soát đầu không đổi, không có nút cho phép check-in lại.
3. Nhập `QR_INVALID_999` và bấm kiểm tra, hoặc bấm nút QR giả. Kỳ vọng404, thẻ đỏ **“Mã vé không tồn tại hoặc không hợp lệ!”**. Muốn chấm lại từ bước1 thì bấm reset V1; không cần sửa DB hay tạo vé mới.

Có thể chọn ảnh QR thực tế hoặc dùng camera. Máy không webcam/bị từ chối quyền có viewport mô phỏng và đường nhập tay/file; không hiện lỗi “trình duyệt chưa hỗ trợ quét QR trực tiếp”.

## Kiểm chứng

- Backend typecheck/typed lint/build: PASS,116 unit +255 HTTP/integration. Test mới kiểm chứng mặc định auto, replay giữ usedAt, auth401/403, body sai400, reset chỉ V1, không đổi hash/SOLD/vé thật, production404 và metadata disabled.
- PostgreSQL schema:26 PASS; không có migration mới trong đợt này.
- Node/helpers/RAM:115 PASS, gồm preview=false, auto mặc định, reset V1, mã khác400, production đóng công cụ.
- Browser integration:10/10 PASS (2.3 phút): golden QR từng ghế/ICS/check-in, staff camera/mobile, hành trình GOLD và7 ca FR09. Luồng preview cũ được kiểm thử bằng cách chủ động tắt checkbox auto.
- Frontend lint không warning và production build PASS; smoke tự chuyển RAM28 món → BFF login → hold → signed Sandbox → QR PASS.
- Vòng FR09/mobile cuối: **7/7 PASS (48.4 giây)** sau cập nhật CSS, bao gồm kiểm tra toàn bộ nút reset nằm trong viewport375/768/1440px.

Lệnh chạy lại:

```bash
npm run test:backend
npm run test:db
npm run test:unit
npm run lint
npm run build
npx playwright test tests/ticket-admission.spec.mjs tests/booking.spec.mjs tests/business-audit.spec.mjs --grep 'FR09|TC_FR09|Sandbox success|staff date lookup|E2E-01 GOLD'
node scripts/check-fullstack-startup.cjs
```

HTTP/browser test dùng PostgreSQL/Redis riêng; SMTP chỉ loopback. Đã chạy Chromium thực tế trong môi trường này, bao gồm camera bị từ chối và upload PNG QR thật; chưa có bằng chứng chạy Firefox/WebKit/Safari hoặc mọi webcam/thiết bị. Không suy diễn “100% mọi trình duyệt” từ test Chromium. Không benchmark lại latency/tải production trong đợt này.
