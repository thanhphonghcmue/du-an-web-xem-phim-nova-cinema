# NestJS bắt buộc, dữ liệu bền vững và header thống nhất

Ngày kiểm tra: 24/10/2026. Tiếp tục trên `feat/nova-discovery-ui`, sau bản mở lịch
`409e80e`. Báo cáo này thay thế mô tả chạy standalone trong các báo cáo lịch sử.

## Nguồn dữ liệu duy nhất

Next.js BFF chỉ chuyển yêu cầu tới NestJS. Đã xóa `resilientFallback.js`,
`DatVeDemo.jsx`, `bookingStore.js` và bộ sinh lịch standalone. Không còn kho
tài khoản, đơn, ghế hoặc QR trong RAM/localStorage; biến cũ `NOVA_STANDALONE=true`
không thể bật lại chế độ đó. `src/data.js` chỉ bổ sung ảnh/metadata cho phim thật
API đã trả về, không tạo phim hoặc lịch có thể đặt.

Tài khoản, Booking, BookingSeat SOLD và ETicket vẫn do các service/repository
NestJS ghi vào PostgreSQL. Giá, ownership, RBAC, idempotency và luật ghế lẻ vẫn
được backend kiểm tra. Cookie access/refresh tiếp tục HttpOnly. SessionStorage
chỉ giữ lựa chọn giao diện như giỏ bắp nước chưa xác nhận và ưu đãi đã đóng;
không phải nguồn xác nhận thanh toán hoặc phát hành vé.

Không kết nối được upstream: BFF trả HTTP 503, `BACKEND_UNAVAILABLE`; giao diện
báo lỗi và có nút thử lại, xóa danh mục có thể đặt thay vì thay bằng dữ liệu giả.
`/api/v1/runtime` chỉ mô tả cấu hình `mode: backend`, không xác nhận backend khỏe.
Lệnh `dev:full` đợi `/api/v1/health` HTTP 200, gồm DB/Redis và worker readiness,
trước khi mở frontend.

## Đồng bộ tài khoản, đơn và soát vé

- Đăng ký qua UI tạo CUSTOMER thật. ADMIN đọc `/admin/reports/users` từ DB;
  bảng khách hàng tự tải lại mỗi 15 giây khi đang hiển thị và khi cửa sổ được
  focus, có tìm theo email/tên, thời điểm cập nhật và lỗi tải rõ ràng.
- Playwright dùng hai browser context để xác nhận tài khoản mới xuất hiện bên
  ADMIN; đổi tên qua API của chủ tài khoản được phản ánh lại. CUSTOMER gọi API
  danh sách khách hàng nhận 403; response không chứa passwordHash/token.
- Production smoke đăng ký tài khoản qua API, thanh toán Sandbox và nhận QR;
  dừng backend, chạy tiến trình mới cùng PostgreSQL, xác nhận cùng tài khoản,
  đơn PAID/tổng tiền, hai ghế SOLD và **cùng hash/PNG QR**.
- Sau khi STAFF soát vé, smoke khởi động lại backend lần thứ hai, xác nhận
  `isCheckedIn=true` và quét lại nhận 409. Script chỉ dọn fixture nó tự tạo;
  không reset DB hoặc thay `.env`.

Kiểm tra trên chứng minh tồn tại qua hai lần khởi động lại ứng dụng. Sao lưu DB,
phục hồi sau hỏng ổ đĩa và thu tiền thật không thuộc phạm vi kiểm thử này.

## Lịch thật, đăng nhập tiếp tục và ghế lẻ

Verifier chỉ đọc development PostgreSQL trả kết quả:

| Mục | Kết quả |
| --- | --- |
| Rạp mẫu | Landmark và Westlake |
| Phim tại mỗi rạp | 24, gồm 8 phim sắp chiếu mở bán trước |
| Phòng mỗi rạp / tổng phòng | 40 / 80 |
| Lịch liên tục | Đến 30/11/2026, 37 ngày tới tại thời điểm kiểm tra |
| Tối thiểu mỗi phim/ngày | 4 giờ khác nhau, ít nhất 2 phòng |
| Tổng suất trong DB | 8.324 |
| Lịch phòng chồng nhau | 0 |

Programme BFF HTTP 200 trả đủ 24 phim và dữ liệu lịch thật. Playwright kiểm tra
24 lựa chọn ở **cả hai rạp**, mọi ngày có lịch qua hết tháng sau trên desktop và
mobile, đặt phim thứ 20 sau 15 ngày và đặt trước phim sắp chiếu. Số suất đang mở
trên API thay đổi theo giờ hiện tại; không lấy tổng DB làm số ghế còn trống.

Khách chọn đủ rạp → phim → ngày → giờ, bấm Đặt ngay: đăng nhập nếu cần rồi mở
đúng sơ đồ suất đã chọn. Test đối chiếu UUID và roomId từ API. D10/D12 để lại D11
bị chặn trên UI, backend tiếp tục kiểm tra độc lập; chọn hợp lệ mới giữ ghế,
thanh toán Sandbox, nhận một QR và đọc vé trong tài khoản.

## Header, ngôn ngữ và đăng nhập

Một header thay cho thanh utility + menu phụ. Dùng chung danh sách điều hướng
desktop/mobile; Tìm rạp NOVA dẫn `/rap`, Vé của tôi dẫn `/tai-khoan`. Search mở
dialog có nhãn truy cập. Nút VI/EN dịch header, hero, điều khiển đặt nhanh, lịch
tháng và đăng nhập; giữ lựa chọn khi điều hướng/tải lại. Nội dung biên tập,
tên rạp và một số công cụ quản trị vẫn dùng tiếng Việt.

Xóa nút điền tài khoản/mật khẩu mẫu và gợi ý mật khẩu công khai. Ba nút con mắt
cho đăng nhập, đăng ký và xác nhận được test riêng, không tự submit form.
Header được kiểm tra ở 1440, 820 và 390px, không tràn ngang.

Ảnh chụp từ Next production nối NestJS/PostgreSQL development thật, không đăng
nhập và không chứa QR hoặc dữ liệu cá nhân:

- [Header desktop VI](screenshots/server-only/header-desktop-vi.jpg)
- [Header desktop EN](screenshots/server-only/header-desktop-en.jpg)
- [Lịch tháng 11](screenshots/server-only/november-calendar.jpg)
- [Header mobile](screenshots/server-only/header-mobile-vi.jpg)

## Kiểm thử và cách chạy

| Bộ kiểm thử | Kết quả |
| --- | --- |
| Backend unit | 75 PASS |
| Backend HTTP/Socket.IO/SMTP | 207 PASS |
| PostgreSQL integration | 22 PASS |
| Backend programme planner | 4 PASS |
| Playwright UI nối backend thật | 45 PASS |
| **Tổng ca tự động** | **353 PASS** |

Frontend lint/build và backend typecheck/lint/build PASS. Bốn ca trình duyệt mới
kiểm tra đăng nhập tiếp tục, đồng bộ khách hàng sang ADMIN, VI/EN và header.
Ca planner dành riêng cho bộ sinh lịch standalone được xóa cùng code đó; các ca
planner/backend và đặt vé thật tiếp tục được chạy. Hai selector còn tìm tên nút
quản trị cũ đã được cập nhật, rồi **toàn bộ 45 ca UI chạy lại đạt**, không bỏ
assertion RBAC, lỗi health hoặc CRUD phim.

Hai kiểm tra độc lập ngoài con số 353:

- `node backend/scripts/smoke-booking.cjs`: compiled API, PostgreSQL/Redis,
  thanh toán/QR/SMTP/check-in, hai lần khởi động lại và dữ liệu còn nguyên: PASS.
- `node scripts/check-backend-only.cjs`: chạy Next cô lập, cố ý bật biến cũ
  `NOVA_STANDALONE=true` rồi làm upstream loopback ngắt kết nối thật, không dùng
  `page.route` để giả response. Đăng ký/đăng nhập/giữ ghế trả 503, không có data;
  UI lỗi rõ ràng, danh mục rỗng và chọn rạp bị khóa: PASS. Script không đọc `.env`
  hoặc ghi DB, tự dọn tiến trình/thư mục tạm nó tạo.

Toàn bộ fixture Playwright cũng cố ý đặt biến cũ thành `true`; vẫn phải đi qua
NestJS thật. Verifier DB chỉ đọc trả 0 overlap; ảnh chụp production ghi nhận
programme HTTP 200 với 24 phim, 2 rạp, 80 phòng, 8.241 suất đang mở và 0 lỗi JS.
Chênh lệch với tổng 8.324 suất trong DB là các suất đã qua/không còn mở tại thời
điểm tải; UI không tự cộng chúng vào lịch còn đặt được.

Các suite có outbox dùng chung DB test được chạy tuần tự. Không dùng Docker;
tái sử dụng kết nối PostgreSQL/Redis đang cấu hình, SMTP fixture loopback và DB
test riêng. Không migration hoặc dependency mới, không thay booking state machine
và không đánh dấu Phase 11–12/LAB04 còn thiếu là hoàn tất.

Máy đã cài Node/PostgreSQL/Redis/SMTP và cấu hình `backend/.env`: cập nhật code,
cài dependencies hai package nếu cần, build backend rồi `npm run dev:full`.
Xem [README](../../README.md) cho quy trình cài trực tiếp. `npm run dev` riêng
không tự bật backend và sẽ báo lỗi nếu NestJS chưa chạy.
