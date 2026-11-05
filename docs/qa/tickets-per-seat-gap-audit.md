# Khảo sát Vé của tôi → QR → check-in

Đây là khảo sát trước triển khai. Bản sửa và bằng chứng kiểm chứng sau đó nằm tại
[vé theo từng ghế và ví vé](per-seat-ticket-wallet.md); các giới hạn mô tả bên
dưới phản ánh thời điểm khảo sát, không phải schema hiện tại.

Yêu cầu nguồn: phần NOVA Cinema trong `Pasted text.txt` gửi ngày05/11/2026. Các đoạn mô phỏng quản lý bộ nhớ và kết quả commit của dự án khác là lịch sử tham khảo, không áp dụng vào NOVA.

## Hiện trạng xác định từ code

- Frontend Next.js trong `frontend/`, backend NestJS/Prisma/PostgreSQL trong `backend/`; có adapter RAM riêng, không dùng kết quả RAM để chứng minh lưu SQL.
- Đã có ví vé `LichSuVeKhachHang.jsx`, QR SVG, xác nhận email, ICS, API owner-only và API STAFF verify/check-in. Tái sử dụng các phần này.
- `ETicket.bookingId` đang có `@unique`: hiện một QR đại diện cả đơn, không phải một QR cho mỗi ghế. `TicketsRepository.byBooking` và quan hệ `Booking.ticket` cũng dựa vào ràng buộc này. Yêu cầu QR/check-in từng người cần migration và sửa đồng bộ phát hành, truy vấn, check-in; không được chỉ chia card trên frontend hoặc phát QR giả.
- Ví vé mới lọc all/holding/unused/used. Chưa có đủ tìm theo phim/mã, ngày xem và khoảng ngày xem; cần dùng `showtime.startTime`, không dùng ngày tạo đơn.
- QR hiện chứa hash tra cứu, chưa phải URL thông tin vé công khai. Cần đường tra cứu chỉ đọc và dữ liệu tối thiểu; khách không có quyền check-in.
- Phần soát vé vừa có cập nhật camera/jsQR từ nhóm. Bản vá đang làm giữ nguyên suất nhân viên đã chọn khi gặp vé sai suất, chống dữ liệu thiếu làm crash và sửa highlight ghế bị người khác giữ.

## Kiểm chứng và điều kiện tiếp theo

Đã kiểm tra kết nối bằng cấu hình hiện có, không in URL/mật khẩu: database ứng dụng có thể kết nối; `TEST_DATABASE_URL` hiện không kết nối được. Không chạy migrate/reset/test ghi dữ liệu vào database ứng dụng để thay cho test DB.

Chưa triển khai migration mỗi-ghế, chưa tuyên bố hoàn tất18 tình huống trong prompt. Cần khôi phục một PostgreSQL test riêng trước khi xác nhận migration, phát đúng số vé và tranh chấp check-in mức SQL. Các kiểm thử frontend/RAM trước đó được giữ phạm vi riêng, không cộng thành PASS cho yêu cầu per-seat mới.
