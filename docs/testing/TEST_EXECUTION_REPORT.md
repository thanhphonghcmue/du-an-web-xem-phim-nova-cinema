# TEST EXECUTION REPORT – NOVA CINEMA

## 1. Thông tin chung

- **Dự án:** NOVA Cinema – Website đặt vé xem phim trực tuyến
- **Phạm vi:** Kiểm thử tích hợp Frontend, Backend và PostgreSQL
- **Người phụ trách:** Phùng Thị Mỹ Quyên
- **Nhánh Git:** test/integration-frontend-backend-sql
- **Tài liệu liên quan:** TEST_PLAN.md, TEST_CASES.md, BUG_LOG.md, RTM.md
- **Tổng số test case:** 21
- **Trạng thái báo cáo:** Bản khởi tạo, chưa ghi nhận kết quả thực thi chính thức

## 2. Mục tiêu kiểm thử

Kiểm tra khả năng phối hợp giữa giao diện người dùng, Backend API và cơ sở dữ liệu PostgreSQL trong các chức năng chính của hệ thống NOVA Cinema.

Các chức năng cần kiểm thử gồm đăng ký, đăng nhập, phân quyền, quản lý phim, phòng chiếu, suất chiếu, giữ ghế, thanh toán, vé điện tử và xử lý lỗi.

## 3. Môi trường kiểm thử

| Thành phần | Thông tin |
|---|---|
| Hệ thống | NOVA Cinema |
| Frontend | Next.js |
| Backend | NestJS |
| Cơ sở dữ liệu | PostgreSQL |
| Bộ nhớ tạm / dịch vụ phụ trợ | Redis |
| Cơ sở dữ liệu kiểm thử riêng | nova_cinema_tester |
| Địa chỉ Backend dự kiến | localhost:4000 |
| Công cụ kiểm thử | Trình duyệt, DevTools, Terminal và công cụ truy vấn SQL |
| Trạng thái môi trường | Chưa sẵn sàng để chạy kiểm thử tích hợp đầy đủ |

### 3.1. Tình trạng chuẩn bị

Đã chuẩn bị cơ sở dữ liệu PostgreSQL dành riêng cho kiểm thử và thực hiện migration, seed dữ liệu.

Trong lần kiểm tra môi trường trước đó, Backend chưa khởi động hoàn chỉnh do không kết nối được Redis tại 127.0.0.1:6380. Vì vậy, chưa thể xác nhận các API hoạt động thông qua kiểm thử thực tế.

Tình trạng này được ghi nhận là trở ngại của môi trường kiểm thử, chưa đủ cơ sở kết luận là lỗi chức năng của sản phẩm.

## 4. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| Not Run | Chưa thực hiện kiểm thử |
| Pass | Kết quả thực tế phù hợp kết quả mong đợi |
| Fail | Kết quả thực tế khác kết quả mong đợi |
| Blocked | Không thể thực hiện do điều kiện hoặc môi trường chưa đáp ứng |

Chỉ cập nhật Pass, Fail hoặc Blocked sau khi thực hiện hoặc thử thực hiện test case và có bằng chứng phù hợp.

## 5. Danh sách kết quả thực thi

| Mã TC | Mã yêu cầu | Nội dung kiểm thử | Trạng thái | Mã lỗi | Minh chứng |
|---|---|---|---|---|---|
| TC-001 | REQ-01 | Frontend lấy và hiển thị danh sách phim từ API | Not Run | — | — |
| TC-002 | REQ-02 | Backend truy vấn dữ liệu phim từ PostgreSQL | Not Run | — | — |
| TC-003 | REQ-03 | Đăng ký tài khoản và kiểm tra dữ liệu lưu | Not Run | — | — |
| TC-004 | REQ-04 | Đăng nhập bằng tài khoản hợp lệ | Not Run | — | — |
| TC-005 | REQ-04 | Đăng nhập bằng mật khẩu sai | Not Run | — | — |
| TC-006 | REQ-04 | Kiểm tra quyền truy cập theo vai trò | Not Run | — | — |
| TC-007 | REQ-05 | Thêm phim và kiểm tra dữ liệu | Not Run | — | — |
| TC-008 | REQ-05 | Chỉnh sửa thông tin phim | Not Run | — | — |
| TC-009 | REQ-05 | Xóa phim và kiểm tra trạng thái dữ liệu | Not Run | — | — |
| TC-010 | REQ-06 | Tạo phòng chiếu | Not Run | — | — |
| TC-011 | REQ-06 | Tạo suất chiếu và kiểm tra dữ liệu | Not Run | — | — |
| TC-012 | REQ-07 | Chọn, giữ ghế và cập nhật trạng thái | Not Run | — | — |
| TC-013 | REQ-08 | Ngăn hai người giữ trùng một ghế | Not Run | — | — |
| TC-014 | REQ-09 | Tự giải phóng ghế khi hết hạn giữ | Not Run | — | — |
| TC-015 | REQ-09 | Hủy đơn chưa thanh toán và giải phóng ghế | Not Run | — | — |
| TC-016 | REQ-10 | Thanh toán sandbox thành công | Not Run | — | — |
| TC-017 | REQ-11 | Xử lý thanh toán sandbox thất bại | Not Run | — | — |
| TC-018 | REQ-12 | Kiểm tra vé điện tử, mã QR và thông tin vé | Not Run | — | — |
| TC-019 | REQ-13 | Kiểm tra dữ liệu sau tải lại trang hoặc đăng nhập lại | Not Run | — | — |
| TC-020 | REQ-14 | Kiểm tra giao diện khi API gặp lỗi | Not Run | — | — |
| TC-021 | REQ-15 | Kiểm tra Backend khi PostgreSQL gián đoạn | Not Run | — | — |

## 6. Tổng hợp kết quả

| Chỉ tiêu | Số lượng |
|---|---:|
| Tổng test case | 21 |
| Pass | 0 |
| Fail | 0 |
| Blocked | 0 |
| Not Run | 21 |
| Lỗi sản phẩm đã xác nhận | 0 |

**Lưu ý:** Đây là số liệu của bản báo cáo khởi tạo, không phải kết quả kiểm thử hoàn tất. Chưa có đủ dữ liệu để đánh giá tỷ lệ thành công hoặc chất lượng thực tế của hệ thống.

## 7. Ghi nhận vấn đề và trở ngại

### ENV-001 – Backend chưa kết nối được Redis

- **Loại:** Vấn đề môi trường kiểm thử
- **Thành phần liên quan:** Backend, Redis
- **Thông tin đã quan sát:** Backend chưa hoàn tất khởi động khi Redis tại 127.0.0.1:6380 không khả dụng.
- **Ảnh hưởng:** Chưa thể thực hiện đầy đủ các test case cần API đang hoạt động.
- **Trạng thái:** Chưa xử lý trong phạm vi báo cáo hiện tại.
- **Ghi chú:** Không tự động ghi nhận ENV-001 thành lỗi sản phẩm trong BUG_LOG.md.

## 8. Hướng dẫn ghi nhận minh chứng

Khi thực hiện từng test case, cần lưu:
- Thời điểm kiểm thử.
- Các bước thao tác và dữ liệu đầu vào.
- Kết quả mong đợi và kết quả thực tế.
- Ảnh chụp màn hình hoặc phản hồi API khi phù hợp.
- Dữ liệu PostgreSQL liên quan nếu cần đối chiếu.
- Mã BUG trong BUG_LOG.md nếu phát hiện lỗi sản phẩm.

Không đưa mật khẩu, token truy cập, API key hoặc dữ liệu nhạy cảm vào ảnh minh chứng và GitHub.

## 9. Công việc tiếp theo

1. Khôi phục môi trường Backend và Redis trong phạm vi kiểm thử riêng.
2. Thực hiện lần lượt TC-001 đến TC-021 theo TEST_CASES.md.
3. Cập nhật trạng thái, kết quả thực tế và minh chứng.
4. Ghi nhận lỗi xác thực vào BUG_LOG.md.
5. Kiểm thử lại sau khi lỗi được sửa.
6. Cập nhật RTM và báo cáo tổng kết.

## 10. Kết luận hiện tại

Đã xây dựng bộ tài liệu thiết kế kiểm thử tích hợp gồm 21 test case cho 15 yêu cầu của NOVA Cinema.

Tại thời điểm lập báo cáo này, chưa ghi nhận kết quả thực thi chính thức cho các test case. Do đó, chưa thể kết luận các chức năng tích hợp Frontend, Backend và PostgreSQL đạt hay không đạt yêu cầu.

Báo cáo sẽ được cập nhật khi môi trường sẵn sàng và có kết quả kiểm thử thực tế.
