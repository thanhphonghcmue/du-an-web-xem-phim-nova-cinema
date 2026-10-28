# Xem và sửa code đúng thư mục trong VS Code

Mở **toàn bộ thư mục repository** trong VS Code. Sau khi tách workspace, mã giao diện đang chạy nằm ở **`frontend/src/`**, ảnh ở **`frontend/public/`**, API và database ở **`backend/`**. Các bản `src/`/`public/` cũ ở gốc được giữ tương thích; sửa chúng sẽ không cập nhật giao diện hiện tại.

## 1. Các file giao diện chính

Đường dẫn dưới đây tương đối với repository, bấm được trên GitHub và VS Code, không phụ thuộc ổ đĩa Windows của một người trong nhóm.

| Luồng                         | File triển khai đang dùng                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bố cục/trang chủ              | [frontend/src/App.jsx](../frontend/src/App.jsx), [CinemaExperience.jsx](../frontend/src/components/CinemaExperience.jsx)                                                                           |
| Chọn rạp → phim → ngày → suất | [DatVeNhanh.jsx](../frontend/src/components/DatVeNhanh.jsx), [CinemaPicker.jsx](../frontend/src/components/CinemaPicker.jsx), [QuickChoice.jsx](../frontend/src/components/QuickChoice.jsx)        |
| Chọn ghế, hold, thanh toán    | [BookingConsole.jsx](../frontend/src/components/BookingConsole.jsx), [HoldCountdown.jsx](../frontend/src/components/HoldCountdown.jsx)                                                             |
| Ví vé và mã QR                | [LichSuVeKhachHang.jsx](../frontend/src/components/LichSuVeKhachHang.jsx), [ETicketQr.jsx](../frontend/src/components/ETicketQr.jsx)                                                               |
| Soát vé nhân viên             | [SoatVeNhanVien.jsx](../frontend/src/components/SoatVeNhanVien.jsx)                                                                                                                                |
| Đăng nhập/đăng ký             | [DangNhap_DangKy.jsx](../frontend/src/components/DangNhap_DangKy.jsx)                                                                                                                              |
| Quản trị và danh mục          | [QuanTriHeThong.jsx](../frontend/src/components/QuanTriHeThong.jsx), [OperationalCatalog.jsx](../frontend/src/components/OperationalCatalog.jsx)                                                   |
| Đối soát thanh toán           | [AdminReconciliation.jsx](../frontend/src/components/AdminReconciliation.jsx)                                                                                                                      |
| Nhật ký thay đổi phim         | [AdminAudit.jsx](../frontend/src/components/AdminAudit.jsx)                                                                                                                                        |
| Danh mục bắp nước/ảnh thật    | [FoodStore.jsx](../frontend/src/components/FoodStore.jsx), [MenuImage.jsx](../frontend/src/components/MenuImage.jsx)                                                                               |
| Nhận diện và màn chiếu        | [NovaLogo.jsx](../frontend/src/components/NovaLogo.jsx), [CinematicScreen3D.jsx](../frontend/src/components/CinematicScreen3D.jsx), [three/cinemaScreen.js](../frontend/src/three/cinemaScreen.js) |

Một số tên cũ chỉ là entry point/re-export để tương thích, ví dụ `ChonGhe_Va_ThanhToan.jsx`, `DatVeBackend.jsx` và `AdminDashboard.jsx`. Dùng “Go to Definition” để đi đến implementation, không tạo thêm luồng giữ ghế/thanh toán khác bên cạnh BookingConsole.

## 2. Định tuyến và kết nối API

- [frontend/src/app/](../frontend/src/app/): Next App Router. Các trang tiếng Việt là luồng canonical; các trang `/movies`, `/booking`, `/checkout`, `/tickets`, `/staff`, `/admin` chuyển hướng qua [next.config.mjs](../frontend/next.config.mjs), giữ query của đơn.
- [frontend/src/api/client.js](../frontend/src/api/client.js): client dùng chung, timeout hữu hạn, refresh phiên và thông báo lỗi. Không lưu JWT vào localStorage.
- [BFF route](../frontend/src/app/api/v1/%5B...path%5D/route.js): browser gọi `/api/v1`, Next chuyển tiếp server-side đến backend, token nằm trong cookie HttpOnly.
- [frontend/src/catalog.js](../frontend/src/catalog.js): đồng bộ catalogue; [useShowtimeCapacity.js](../frontend/src/useShowtimeCapacity.js) tải số ghế theo batch thực tế.
- Alias `@/` trỏ vào `frontend/src/` qua [jsconfig.json](../frontend/jsconfig.json). Không dùng absolute import đường dẫn ổ đĩa hoặc đổi UUID từ backend để làm React key.

## 3. Nơi sửa nghiệp vụ/backend/database

| Nghiệp vụ                        | Thư mục                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| Đăng ký/đăng nhập/refresh        | [backend/src/modules/auth](../backend/src/modules/auth/)           |
| Tài khoản, trạng thái, hội viên  | [backend/src/modules/users](../backend/src/modules/users/)         |
| Phim/rạp/phòng/sơ đồ vật lý      | `backend/src/modules/{movies,cinemas,rooms,seats}/`                |
| Lịch chiếu +15 phút dọn phòng    | [backend/src/modules/showtimes](../backend/src/modules/showtimes/) |
| Giữ ghế, giá server, hết hạn/hủy | [backend/src/modules/bookings](../backend/src/modules/bookings/)   |
| Sandbox/đối soát                 | [backend/src/modules/payments](../backend/src/modules/payments/)   |
| Vé/ICS/soát vé                   | [backend/src/modules/tickets](../backend/src/modules/tickets/)     |
| Email/outbox/worker              | `backend/src/modules/notifications/`, `backend/src/queues/`        |
| Schema/migration                 | [backend/prisma](../backend/prisma/)                               |

Giữ kiến trúc Controller → Service → Repository → Prisma. Không cập nhật PAID hoặc tạo QR thành công giả ở frontend. Tiền/ưu đãi/ghế và quyền truy cập phải được backend xác nhận.

## 4. Chạy ở Windows

Node24, mở terminal PowerShell tại **root repository**:

```powershell
npm install
npm run seed
npm run dev
```

Mở `http://localhost:3000`. `dev` chạy cả frontend/backend. Tài khoản seed có customer/cmember/staff/admin tại `@nova.vn`, giữ các tài khoản `.local` cũ. Password lấy từ cấu hình development riêng, không lấy mật khẩu cố định trong tài liệu cũ làm mật khẩu SQL mặc định. Bạn có thể tự đăng ký tài khoản khách hàng.

Chưa cấu hình PostgreSQL: launcher dùng [backend/standalone/runtime.cjs](../backend/standalone/runtime.cjs), một API RAM thực trong process. RAM hỗ trợ hold/Sandbox/QR nhưng reset khi restart, không bảo đảm lưu bền và không gửi email SMTP như PostgreSQL mode. **Không có fallback giả trong BFF khi một request thanh toán đang lỗi**.

Đã có PostgreSQL/Redis native: tạo `backend/.env` từ example, giữ database UTF8/Unicode và secret riêng; sau mỗi pull có schema/backend mới, chạy `npm run setup:local` để generate/migrate/seed additive/build rồi `npm run dev`. Không reset database đang có dữ liệu.

Cấu hình Next mới ở `frontend/.env.local` theo [frontend/.env.example](../frontend/.env.example). Hai biến upstream/origin cũ ở root vẫn được đọc làm fallback, nhường ưu tiên cho frontend/shell. JWT signing secret và DATABASE_URL thuộc backend, không đưa vào biến NEXT_PUBLIC.

## 5. Kiểm thử và báo cáo

- [Kiểm toán LAB04 mới](qa/fullstack-lab04-audit.md): file sửa,14 UC, TC-01…TC-05, ma trận soát vé và giới hạn.
- [Native/backend](qa/backend-native-audit.md): các mốc299/300/301 giây,14/15/16 phút và đo hiệu năng baseline.
- [Frontend/network](qa/frontend-performance-audit.md): responsive, số ghế thật, payment layout, ảnh và giới hạn số đo.

`npm run test:business` chạy4 suite nghiệp vụ cốt lõi. HTTP/DB/browser tests cần database test và Redis test riêng; chạy tuần tự khi cùng dùng TEST_DATABASE_URL/outbox. Xem cấu hình và lệnh đầy đủ trong báo cáo trước khi chạy test.
