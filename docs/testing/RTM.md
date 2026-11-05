# REQUIREMENT TRACEABILITY MATRIX (RTM) – NOVA CINEMA

## 1. Thông tin chung

- **Dự án:** NOVA Cinema – Website đặt vé xem phim trực tuyến
- **Phạm vi:** Kiểm thử tích hợp Frontend, Backend và PostgreSQL
- **Người phụ trách:** Phùng Thị Mỹ Quyên
- **Tài liệu liên quan:** TEST_PLAN.md, TEST_CASES.md, BUG_LOG.md
- **Tổng số yêu cầu:** 15
- **Tổng số test case:** 21
- **Trạng thái:** Đã thiết kế test case, chưa xác nhận kết quả thực thi

## 2. Mục đích

Tài liệu RTM dùng để liên kết các yêu cầu kiểm thử tích hợp của hệ thống NOVA Cinema với những test case tương ứng.

Bảng này giúp kiểm tra mức độ bao phủ yêu cầu, xác định các test case cần thực hiện và theo dõi kết quả kiểm thử.

Việc một yêu cầu có test case tương ứng chỉ chứng minh yêu cầu đã được đưa vào kế hoạch kiểm thử, không có nghĩa chức năng đã hoạt động đúng.

## 3. Ma trận truy vết yêu cầu

| Mã yêu cầu | Nội dung yêu cầu | Test case liên quan | Số TC | Trạng thái thiết kế | Kết quả thực thi |
|---|---|---|---|---|---|
| REQ-01 | Kết nối Frontend với Backend API | TC-001 | 1 | Đã thiết kế | Not Run |
| REQ-02 | Backend truy xuất dữ liệu PostgreSQL | TC-002 | 1 | Đã thiết kế | Not Run |
| REQ-03 | Đăng ký tài khoản | TC-003 | 1 | Đã thiết kế | Not Run |
| REQ-04 | Đăng nhập và phân quyền | TC-004, TC-005, TC-006 | 3 | Đã thiết kế | Not Run |
| REQ-05 | Quản lý phim: thêm, sửa, xóa | TC-007, TC-008, TC-009 | 3 | Đã thiết kế | Not Run |
| REQ-06 | Quản lý phòng chiếu và suất chiếu | TC-010, TC-011 | 2 | Đã thiết kế | Not Run |
| REQ-07 | Chọn ghế và cập nhật trạng thái ghế | TC-012 | 1 | Đã thiết kế | Not Run |
| REQ-08 | Ngăn hai khách hàng giữ trùng ghế | TC-013 | 1 | Đã thiết kế | Not Run |
| REQ-09 | Hết hạn giữ ghế và hủy đơn | TC-014, TC-015 | 2 | Đã thiết kế | Not Run |
| REQ-10 | Xử lý thanh toán thành công | TC-016 | 1 | Đã thiết kế | Not Run |
| REQ-11 | Xử lý thanh toán thất bại | TC-017 | 1 | Đã thiết kế | Not Run |
| REQ-12 | Phát hành vé điện tử và mã QR | TC-018 | 1 | Đã thiết kế | Not Run |
| REQ-13 | Lưu trữ dữ liệu sau tải lại trang | TC-019 | 1 | Đã thiết kế | Not Run |
| REQ-14 | Frontend xử lý lỗi API | TC-020 | 1 | Đã thiết kế | Not Run |
| REQ-15 | Backend xử lý sự cố PostgreSQL | TC-021 | 1 | Đã thiết kế | Not Run |

## 4. Tổng hợp mức độ bao phủ

| Chỉ tiêu | Số lượng |
|---|---:|
| Tổng số yêu cầu kiểm thử | 15 |
| Yêu cầu đã có test case | 15 |
| Yêu cầu chưa có test case | 0 |
| Tổng số test case đã thiết kế | 21 |
| Test case đã thực thi | 0 |
| Test case đạt (Pass) | 0 |
| Test case không đạt (Fail) | 0 |
| Test case bị chặn (Blocked) | 0 |
| Test case chưa chạy (Not Run) | 21 |

**Tỷ lệ bao phủ yêu cầu ở mức thiết kế:** 15/15 = 100%.

**Lưu ý:** Tỷ lệ này không phải tỷ lệ kiểm thử thành công. Kết quả thực thi sẽ được cập nhật sau khi chạy kiểm thử thực tế.

## 5. Quy ước cập nhật kết quả

- **Not Run:** Test case chưa được thực hiện.
- **Pass:** Kết quả thực tế phù hợp kết quả mong đợi.
- **Fail:** Kết quả thực tế không phù hợp kết quả mong đợi.
- **Blocked:** Không thể thực hiện test case do điều kiện hoặc môi trường chưa đáp ứng.

Khi một yêu cầu có nhiều test case, chỉ kết luận toàn bộ yêu cầu đạt khi tất cả test case bắt buộc liên quan đều đạt.

Nếu phát hiện lỗi, ghi mã BUG tương ứng trong BUG_LOG.md và cập nhật kết quả trong TEST_CASES.md.

## 6. Đánh giá hiện tại

Đã xây dựng 21 test case cho 15 yêu cầu kiểm thử tích hợp, bao gồm kết nối Frontend – Backend – PostgreSQL, xác thực người dùng, quản lý phim, suất chiếu, giữ ghế, thanh toán, vé điện tử và xử lý lỗi.

Các yêu cầu đều có ít nhất một test case tương ứng. Tuy nhiên, chưa có kết quả kiểm thử thực tế được xác nhận, vì vậy chưa thể kết luận các chức năng của hệ thống đạt yêu cầu.

Bảng RTM sẽ được cập nhật theo kết quả thực thi và kiểm thử lại trong các giai đoạn tiếp theo.
