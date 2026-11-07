# Hoàn thiện TC_FR12_01, TC_FR12_02, TC_FR08_04 — 07/11/2026

Đối chiếu trên `main` tại `c7fb70e`. Vá vào Next.js/NestJS/PostgreSQL hiện có, kiểm tra bằng PostgreSQL/Redis native; không Docker, không đổi API cũ. Mỗi ghế của đơn mới vẫn có vé/QR và trạng thái check-in riêng.

## Trước và sau

| Ca         | Trước khi nâng cấp                                                                                                                                                                                                              | Sau khi nâng cấp / tệp chính                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_FR12_01 | Đã có metadata và lọc khẩu vị, nhưng ba mẫu khác tên/thành phần trong đề; thiếu banner/áp dụng nhanh. PARTY mặc định của món cũ có thể được gợi ý nhầm; nhiều combo đủ điều kiện có cùng điểm nên mẫu chuẩn chưa chắc đứng đầu. | Chuẩn hóa ba mẫu; ưu tiên mẫu tương ứng 1/2/≥3 vé trong khoảng cấu hình, badge/glow và banner đúng số vé. Áp dụng nhanh thêm tối thiểu một combo, không tự tính thêm tiền khi chỉ xem gợi ý. `content/combo-recommendations.json`, migrations `00500`/`00600`, `frontend/src/comboRecommendations.js`, `BookingConsole.jsx`, `commerce.js`, `styles.css`.                                                                                                           |
| TC_FR12_02 | CRUD đã ghi DB, nhưng mục quản lý khó tìm, thiếu alias `/status`. Interceptor bỏ sót PUT nên sửa giá có thể giữ snapshot catalogue cũ; phiên khách chủ yếu chờ poll/focus.                                                      | Tab **🍿 Quản lý Party Combo (G3-FR12)** tại `/admin`; chọn nhóm tự điền khoảng 1–1/2–2/3–20, form giữ quyền sửa thủ công. PUT làm mất hiệu lực cache; GET no-store; `/status` hỗ trợ giá trị boolean rõ ràng, gửi lại không đảo trạng thái. Thêm thông báo giữa các tab và refresh khi mở/focus. `QuanTriHeThong.jsx`, `QuanLyDanhMucPhimRap.jsx`, `FoodStore.jsx`, `comboUpdates.js`, combo controller/DTO, `programme-invalidation.interceptor.ts`, adapter RAM. |
| TC_FR08_04 | Backend đã chặn hết hạn và trả ghế; thiếu câu chữ chính xác. Nút ép hạn cũ tự chạy luôn xác nhận, chưa cho tester bấm SUCCESS sau khi ép hạn.                                                                                   | Quy trình hai nút: ép hạn thật ở server → bấm SUCCESS → JSON409 `ORDER_EXPIRED_TIMEOUT`, không PAID/QR. Modal cam giữ CSS, tiêu đề **Đơn đã hết hạn, không còn thanh toán được**, nội dung dùng ghế thực tế và nút **Đặt lại vé / Chọn lại ghế**. `BookingConsole.jsx`, `SandboxGateway.jsx`, `tests/cinema-status.spec.mjs`; không nới lỏng state machine/chữ ký backend.                                                                                          |

## Dữ liệu và tương thích

| Tên mẫu             | Giá VND | Thành phần                        | Khẩu vị                   | Nhóm / số vé |
| ------------------- | ------: | --------------------------------- | ------------------------- | ------------ |
| Single / Solo Combo |  49.000 | 1 bắp nhỏ + 1 nước                | Ngọt Caramel              | SOLO / 1–1   |
| Couple Combo        |  89.000 | 1 bắp lớn + 2 nước                | Phô Mai Hoàng Kim         | COUPLE / 2–2 |
| Party Combo 69K     |  69.000 | 2 bắp lớn + 4 nước + snack đi kèm | Mix 2 Vị (Ngọt & Phô Mai) | PARTY / 3–20 |

Giữ schema/field hiện hữu: `suggestedMinSeats`, `suggestedMaxSeats`, `badgeLabel` tương ứng min/max vé và nhóm trong prompt. Không thêm các cột trùng nghĩa. Constraint/DTO chấp nhận cả mã khẩu vị cũ và ba nhãn mới; client chuẩn hóa khi lọc/sửa.

Hai migration mới chỉ nâng mẫu còn khớp dữ liệu mặc định, giữ ID, giá, trạng thái bán và tùy chỉnh Admin. Không sửa checksum migration cũ. Gói Party một bắp/hai nước cũ được đổi tên **Party Combo 69K (Classic)** khi còn nguyên mẫu để tránh nhầm với mẫu mới; không xóa món hoặc lịch sử đơn. Nếu Admin đã tùy chỉnh mẫu, migration giữ tùy chỉnh đó; kiểm tra ba giá mẫu trên DB test/fresh, không ép lại dữ liệu kinh doanh mỗi lần khởi động.

Contract thực qua BFF cùng origin:

- Public `GET /api/v1/combos`: active, `Cache-Control: no-store`.
- ADMIN `GET/POST /api/v1/admin/combos`, `PUT /api/v1/admin/combos/:id`.
- ADMIN `PATCH /api/v1/admin/combos/:id/status` với `{ "isActive": false }` hoặc `true`; lặp cùng giá trị không đảo trạng thái. Body rỗng vẫn hỗ trợ toggle để tương thích.
- Alias `/toggle-status`, endpoint `/combos` cũ giữ nguyên; CUSTOMER/STAFF không được quản trị.

Số ghế/khẩu vị được tính ngay tại client, không cần đợi request. Tab cùng trình duyệt nhận BroadcastChannel rồi đọc lại API; trang mới/focus/hiện lại đọc dữ liệu mới. Thiết bị hoặc phiên trình duyệt khác đang mở cập nhật bằng poll mỗi 5 giây khi tab hiển thị. Đây không phải server push hoặc cam kết mạng 0ms. Menu ẩn được bỏ khỏi giỏ chưa giữ; đơn HOLDING/PENDING/PAID giữ snapshot, giá và khả dụng vẫn do backend quyết định. Ảnh tiếp tục dùng tài nguyên local hiện hữu.

## Hướng dẫn đúng ba bước mỗi ca

Chuẩn bị PostgreSQL/Redis theo `backend/README.md`, chạy migration và seed; mở bằng `npm run dev` hoặc `npm run dev:full` tại root. Đăng nhập tài khoản tương ứng. Nút ép hạn chỉ xuất hiện trong test hoặc development có `NOVA_TEST_CONTROLS=true` trong `backend/.env` và đã khởi động lại backend; production chặn endpoint này. Không cần ép hạn để kiểm tra timeout tự nhiên sau 5 phút.

### TC_FR12_01 — gợi ý và khẩu vị

1. Mở một suất còn ghế, chọn **1 ghế**: Single / Solo Combo đứng đầu với 49.000đ, thành phần/khẩu vị và badge Solo; banner nhận diện 1 vé.
2. Chọn thành **2 rồi 4 ghế**: Couple rồi Party Combo 69K đứng đầu, badge/banner đổi theo số ghế; bấm **+ Áp dụng nhanh gợi ý này** một lần, số lượng gói được chọn là 1. Quay về 1 ghế, gợi ý trở lại Solo, không tự xóa lựa chọn combo.
3. Chọn chip **Phô Mai**, kiểm tra danh sách chỉ có khẩu vị phù hợp; **Tất cả** khôi phục danh sách. Gợi ý chỉ là đề xuất, tổng tiền chỉ đổi theo combo thực sự chọn và được server xác nhận.

### TC_FR12_02 — quản trị và đồng bộ

1. Đăng nhập Admin → `/admin` → **🍿 Quản lý Party Combo (G3-FR12)** → **Thêm mới Combo**. Nhập tên/giá/thành phần/khẩu vị, chọn **>= 3 vé - Party**, kiểm tra khoảng 3–20 rồi **Lưu bắp nước**; tải lại trang vẫn thấy dữ liệu.
2. Bấm **Sửa**, đổi giá/thành phần/khẩu vị rồi lưu. Mở hoặc focus trang đặt vé/bắp nước của khách: giá và mô tả mới xuất hiện; phiên độc lập đang mở cập nhật trong chu kỳ poll, cộng thời gian request.
3. Bấm **Ẩn combo**: Admin còn thấy dòng **Tạm ẩn**, khách không thấy món trong menu; **Hiện combo** đưa món trở lại. Tài khoản khách/nhân viên gọi API quản trị nhận403.

### TC_FR08_04 — hết hạn rồi xác nhận SUCCESS

1. Chọn và giữ ghế, mở xác nhận đơn rồi cổng Sandbox; ghi lại mã đơn và tên ghế.
2. Bấm **⚡ Giả lập đã qua 5 phút không phản hồi**, sau đó tự bấm **✓ Giả lập Thành công (Paid)**. API trả JSON409 `ORDER_EXPIRED_TIMEOUT`; modal cam hiện **Đơn đã hết hạn, không còn thanh toán được**, ghế nêu đúng đơn, không mất CSS/đổi sang trang lỗi.
3. Kiểm tra đơn EXPIRED, ghế AVAILABLE, không có vé/QR cho đơn đó; bấm **Đặt lại vé / Chọn lại ghế**, chọn và giữ lại ghế. Production không cung cấp nút ép hạn; SUCCESS sau deadline vẫn bị backend từ chối.

## Kết quả kiểm chứng

| Nhóm             | Kết quả / phạm vi                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend          | Typecheck, typed lint, build đạt; **117 unit + 256 HTTP/integration PASS** với PostgreSQL/Redis native, gồm CRUD lưu DB, no-store, status lặp và RBAC.                         |
| Database         | **26 tests PASS**; hai migration mới deploy thành công trên DB test.                                                                                                           |
| Node/RAM         | **118 tests PASS**: seed/launcher/adapter và helper; có hồi quy cạnh tranh thứ tự giữa nhiều combo đủ điều kiện.                                                               |
| Browser          | **13 ca độc lập đạt qua các lượt**: lượt đầu12/13, phát hiện sai thứ tự Solo; sửa rồi chạy lại **5/5** ca liên quan, gồm đồng bộ giá/thành phần/ẩn hiện sang phiên khách khác. Bổ sung assert toàn bộ ba mẫu từ API, câu lỗi JSON và tên ghế thực tế: chạy lại **2/2** đạt. |
| Frontend/startup | Production build/lint đạt; smoke fullstack RAM/BFF/HttpOnly/hold/signed Sandbox/QR đạt.                                                                                        |

Browser hồi quy còn bao phủ review ở375/768/1440px, lỗi thanh toán không tự suy ra PAID, hủy/thất bại, xung đột ghế409, khóa suất và golden path hai QR cho hai ghế/check-in độc lập/ICS. Các test này dùng Chromium, không thay cho kiểm tra toàn bộ trình duyệt/thiết bị. Không khẳng định toàn dự án hết mọi lỗi hoặc đạt mọi request dưới30ms; lượt này xác minh chức năng, không đo tải mới. Không thay trạng thái Phase11–12.

Chạy tuần tự các suite dùng chung DB/outbox, cấu hình DB test riêng; không trỏ fixture vào production:

```bash
npm run db:migrate --workspace backend
npm run db:migrate:test --workspace backend
npm run test:backend
npm run test:db
npm run test:unit
npm run lint
npm run build:frontend
npx playwright test tests/cinema-status.spec.mjs tests/booking.spec.mjs --grep 'TC_FR|two-column|Sandbox|failed completion|actual expired|a real API 409'
node scripts/check-fullstack-startup.cjs
```
