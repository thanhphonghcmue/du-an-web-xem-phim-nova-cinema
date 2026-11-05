# KẾ HOẠCH KIỂM THỬ TÍCH HỢP – NOVA CINEMA

## 1. Thông tin chung
- Dự án: NOVA Cinema – Website đặt vé xem phim trực tuyến
- Người phụ trách: Phùng Thị Mỹ Quyên
- Vai trò: Tester tích hợp Frontend, Backend và SQL
- Nhánh làm việc: test/integration-frontend-backend-sql
- Mục tiêu: Kiểm tra luồng dữ liệu giữa giao diện, API và cơ sở dữ liệu; phát hiện, ghi nhận và kiểm thử lại lỗi.

## 2. Phạm vi kiểm thử
| Mã yêu cầu | Nội dung kiểm thử |
| --- | --- |
| REQ-01 | Frontend gọi API và hiển thị dữ liệu chính xác |
| REQ-02 | Backend kết nối và truy xuất PostgreSQL |
| REQ-03 | Đăng ký tài khoản và lưu dữ liệu |
| REQ-04 | Đăng nhập, xác thực và phân quyền |
| REQ-05 | Thêm, sửa, xóa phim và kiểm tra dữ liệu |
| REQ-06 | Tạo phòng chiếu, suất chiếu và kiểm tra dữ liệu |
| REQ-07 | Chọn ghế và cập nhật trạng thái ghế |
| REQ-08 | Hai tài khoản không được giữ hoặc mua trùng một ghế |
| REQ-09 | Hủy đơn hoặc hết hạn giữ ghế phải giải phóng ghế |
| REQ-10 | Thanh toán thành công phải cập nhật đơn và ghế |
| REQ-11 | Thanh toán thất bại không được phát hành vé |
| REQ-12 | Mã QR và thông tin vé phải chính xác |
| REQ-13 | Tải lại trang không làm mất dữ liệu đã lưu |
| REQ-14 | Frontend xử lý lỗi API phù hợp, không bị crash |
| REQ-15 | Xử lý lỗi kết nối, dữ liệu và truy vấn SQL |

## 3. Môi trường kiểm thử
- Hệ điều hành: Windows
- Frontend: Website NOVA Cinema
- Backend: NestJS
- Cơ sở dữ liệu: PostgreSQL 18
- ORM: Prisma 6.19.0
- Trình duyệt: Google Chrome
- Database kiểm thử: nova_cinema_tester
- Nhánh Git: test/integration-frontend-backend-sql

### Trạng thái môi trường
- Prisma Migration: Đã thực hiện thành công.
- Prisma Seed: Đã thực hiện thành công.
- Dữ liệu đã kiểm tra bằng SQL: 7 users, 6 movies, 4 cinemas, 3 rooms, 480 seats, 54 showtimes.
- Backend: Chưa xác nhận khởi động hoàn tất và phản hồi HTTP.
- Redis: Chưa có dịch vụ lắng nghe tại 127.0.0.1:6380 ở thời điểm kiểm tra.
- Frontend: Chưa kiểm thử kết nối trong môi trường hiện tại.

## 4. Phương pháp kiểm thử
1. Thực hiện thao tác trên giao diện website.
2. Quan sát yêu cầu và phản hồi API bằng Developer Tools hoặc công cụ kiểm thử API.
3. Truy vấn PostgreSQL để đối chiếu dữ liệu thực tế.
4. So sánh kết quả thực tế với kết quả mong đợi.
5. Ghi nhận trạng thái Pass, Fail, Blocked hoặc Not Run.
6. Với trường hợp Fail, tạo Bug Log, sửa lỗi đúng phạm vi được phân công và kiểm thử lại.

## 5. Sản phẩm bàn giao
- Tối thiểu 20 test case.
- Bug Log theo dõi lỗi phát hiện thực tế.
- Kết quả kiểm thử lại (Retest).
- RTM liên kết 15 yêu cầu với test case.
- Minh chứng kiểm thử Frontend, Backend và SQL.
- 10–15 commit có nội dung thay đổi thực tế.

## 6. Nguyên tắc an toàn
- Không sử dụng dữ liệu giả làm kết quả kiểm thử thực tế.
- Không xóa hoặc reset database của nhóm.
- Không commit file .env, mật khẩu, JWT secret hoặc dữ liệu nhạy cảm.
- Không thay đổi giao diện hoặc chức năng ngoài phạm vi khi chưa cần thiết.
- Không đánh dấu Pass nếu chưa thực hiện kiểm thử.
- Chỉ commit tài liệu và thay đổi đã kiểm tra.

## 7. Tiêu chí hoàn thành
- Có tối thiểu 20 test case liên kết với yêu cầu.
- Các lỗi thực tế được ghi nhận và theo dõi kiểm thử lại.
- Các chức năng quan trọng được kiểm tra từ Frontend đến API và SQL khi môi trường hoạt động.
- Các trường hợp chưa thể chạy được đánh dấu Blocked, kèm lý do.
- Tài liệu và thay đổi được lưu trên nhánh riêng và sẵn sàng gửi nhóm xem xét.