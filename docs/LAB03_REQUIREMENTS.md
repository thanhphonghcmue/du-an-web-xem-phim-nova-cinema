# 📋 BÁO CÁO THU THẬP YÊU CẦU & ĐẶC TẢ NGHIỆP VỤ (LAB03)
## ĐỀ TÀI: WEBSITE ĐẶT VÉ XEM PHIM TRỰC TUYẾN NOVA CINEMA (INFINITY)
**Trường Đại học Sư phạm TP. Hồ Chí Minh (HCMUE) — Khoa Công nghệ Thông tin**  
**Học phần: Nhập môn Kỹ nghệ Phần mềm | Giảng viên hướng dẫn: ThS. Lê Thanh Thoại**  
**Nhóm thực hiện: Nhóm 03 | Lớp: 50.01.SPTIN.B**

---

## 📌 1. BẢNG ĐẶC TẢ 13 YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FRs)

| Mã FR | Tên Chức Năng | Tác Nhân Chính | Mô Tả Tóm Tắt & Nghiệp Vụ Cốt Lõi |
| :--- | :--- | :--- | :--- |
| **G3-FR01** | Xác thực & Quản lý Tài khoản Hội viên | Khách hàng, C'MEMBER, Staff, Admin | Đăng ký, đăng nhập JWT/Session, phân quyền RBAC đa vai trò, tích lũy điểm thưởng và nâng hạng C'MEMBER (Silver, Gold, Diamond). |
| **G3-FR02** | Quản lý Danh mục & Phân loại Phim | Khách hàng, Admin | Quản lý thông tin phim, thể loại, định dạng (IMAX, 2D, 3D), đạo diễn, diễn viên, thời lượng và nhãn phân loại độ tuổi (P, K, T13, T16, T18, C). |
| **G3-FR03** | Quản lý Phòng chiếu & Sơ đồ Ghế ngồi | Admin | Thiết lập cấu hình phòng chiếu (Standard, VIP, IMAX laser), ma trận ghế theo hàng/cột, phân loại ghế (Standard, VIP, Sweetbox đôi). |
| **G3-FR04** | Quản lý Lịch chiếu Phim (Showtimes) | Admin, Khách hàng | Xếp lịch chiếu tự động theo ngày/phòng chiếu, tích hợp thuật toán chống trùng lịch chiếu và giãn cách dọn phòng tối thiểu 15-20 phút (BR03). |
| **G3-FR05** | Tra cứu Lịch chiếu & Đặt vé Nhanh | Khách hàng | Quick Booking Dock Bar 30 giây: Lọc nhanh theo cụm rạp, tên phim, ngày chiếu và khung giờ chiếu; hiển thị số ghế trống trực tiếp. |
| **G3-FR06** | Chọn Ghế & Khóa Ghế Tạm Thời Real-time | Khách hàng, C'MEMBER | Sơ đồ ghế cong IMAX tương tác trực tiếp; cơ chế khóa ghế bi quan 5:00 phút (300 giây) chống đặt trùng ghế tuyệt đối (CR-01, BR01, BR02). |
| **G3-FR07** | Định giá Vé & Quản lý Giỏ hàng Bắp Nước | Khách hàng, C'MEMBER | Tính toán tổng tiền vé theo loại ghế, phụ thu suất chiếu đặc biệt, chiết khấu hạng hội viên C'MEMBER và giỏ hàng bắp nước Party Combo 69K (BR05). |
| **G3-FR08** | Cổng Thanh Toán Trực Tuyến Sandbox | Khách hàng, Payment Sandbox | Kết nối cổng thanh toán giả lập với chữ ký số giao dịch mật mã, đối soát trạng thái giao dịch tức thời; tự động hủy đơn và nhả ghế nếu thất bại (BR04). |
| **G3-FR09** | Phát Hành & Quản Lý Vé Điện Tử Mã QR | Khách hàng, C'MEMBER | Tạo vé điện tử chứa mã QR Vector SVG có chữ ký bảo mật 64-hex (admission hash); lưu trữ vé an toàn trong ví vé cá nhân. |
| **G3-FR10** | Gửi Email Thông Báo & Xác Nhận Đơn Hàng | Hệ thống, Khách hàng | Tự động gửi email xác nhận đặt vé thành công kèm mã vé, chi tiết suất chiếu, thông tin phòng và file vé điện tử đính kèm. |
| **G3-FR11** | Thuật Toán Gợi Ý Cụm Ghế Liền Kề | Khách hàng, C'MEMBER | Tự động phân tích và tìm kiếm dải ghế trống liền kề tối ưu cho nhóm từ 1 đến 20 khán giả, không cắt ngang lối đi hoặc ghế đã bán. |
| **G3-FR12** | Quản lý Gói Bắp Nước Food Studio & Combo | Admin, Khách hàng | Quản lý danh mục 24 món ăn/nước uống, combo rạp phim, giá niêm yết, kiểm soát số lượng tối đa 20 sản phẩm/đơn hàng. |
| **G3-FR13** | Xuất Lịch Chiếu Định Dạng iCalendar (.ics) | Khách hàng | Tạo file lịch `.ics` chuẩn UTC, tự động thêm sự kiện xem phim vào Google Calendar/Apple Calendar kèm thông báo nhắc hẹn trước 30 phút. |

---

## 🛡️ 2. QUY TẮC NGHIỆP VỤ HỆ THỐNG (BUSINESS RULES - BRs)

- **CR-01 / BR01 (Chống Đặt Trùng Ghế - Race Condition Concurrency)**: Sử dụng Redis Lock kết hợp cơ chế khóa bi quan (*Pessimistic Locking*) ở tầng Cơ sở dữ liệu. Tại một thời điểm, chỉ một giao dịch duy nhất được phép chuyển trạng thái ghế từ `AVAILABLE` sang `HOLDING`.
- **BR02 (Khóa Ghế 5:00 Phút - 300 Giây)**: Khi người dùng chọn ghế, hệ thống khóa giữ chỗ tạm thời chính xác 300 giây và đếm ngược hiển thị trên giao diện. Ghế ở trạng thái `HOLDING` không thể bị chọn bởi người dùng khác.
- **BR03 (Chống Trùng Lịch Chiếu & Giãn Cách Phòng)**: Không cho phép hai suất chiếu diễn ra cùng một phòng nếu có khoảng thời gian giao thoa. Bắt buộc có khoảng giãn cách dọn dẹp vệ sinh phòng chiếu tối thiểu 15 phút giữa 2 suất chiếu liên tiếp.
- **BR04 (Tự Động Hoàn Trả Ghế Khi Quá Hạn Hoặc Hủy Đơn)**: Nếu đồng hồ 5:00 phút đếm về 0 mà chưa thanh toán, hoặc người dùng hủy giao dịch, hoặc thanh toán Sandbox thất bại, hệ thống tự động giải phóng ghế về trạng thái `AVAILABLE`.
- **BR05 (Giới Hạn Đặt Vé & Chính Sách Hội Viên C'MEMBER)**: Mỗi đơn hàng được đặt tối đa 20 ghế. Hội viên C'MEMBER được hưởng quyền lợi giảm giá theo bậc: Silver (5%), Gold (7%), Diamond (10%) và tích lũy điểm thưởng.

---

## 🧪 3. BẢNG TRUY VẾT KIỂM THỬ (TEST TRACEABILITY MATRIX TC-01 - TC-30)

| Mã TC | Yêu Cầu / BR | Mục Tiêu & Kịch Bản Kiểm Thử | Trạng Thái Đạt Được |
| :--- | :--- | :--- | :--- |
| **TC-01** | G3-FR06 / BR01 | 2 người dùng chọn cùng 1 ghế tại cùng mili-giây $\rightarrow$ duy nhất 1 người giữ thành công. | **PASS (100%)** |
| **TC-02** | G3-FR04 / BR03 | Thêm suất chiếu đè lên khung giờ suất chiếu có sẵn trong cùng phòng $\rightarrow$ Hệ thống báo lỗi xung đột. | **PASS (100%)** |
| **TC-03** | G3-FR06 / BR02 | Đồng hồ 5:00 phút chạy đếm ngược, hết giờ tự động giải phóng ghế ngay lập tức. | **PASS (100%)** |
| **TC-04** | G3-FR08 / BR04 | Người dùng hủy thanh toán hoặc cổng Sandbox báo lỗi $\rightarrow$ Ghế được nhả lại trống. | **PASS (100%)** |
| **TC-05** | G3-FR09 | Quét mã QR vé hợp lệ lần 1 $\rightarrow$ Thành công; Quét lại lần 2 $\rightarrow$ Báo lỗi "Vé đã soát". | **PASS (100%)** |
| **TC-06** | G3-FR11 | Gợi ý cụm 4 ghế liền nhau trong hàng $\rightarrow$ Thuật toán chọn đúng 4 ghế cạnh nhau không ngắt quãng. | **PASS (100%)** |
| **TC-07** | G3-FR12 | Thêm bắp nước vượt quá 20 sản phẩm $\rightarrow$ Hệ thống chặn và giữ nguyên số lượng trần 20. | **PASS (100%)** |
| **TC-08** | G3-FR13 | Tải file `.ics` $\rightarrow$ Xác thực định dạng chuẩn iCalendar, chứa thông tin phim và nhắc hẹn 30 phút. | **PASS (100%)** |
