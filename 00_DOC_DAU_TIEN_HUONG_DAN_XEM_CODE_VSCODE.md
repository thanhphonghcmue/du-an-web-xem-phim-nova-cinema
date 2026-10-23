# 📍 HƯỚNG DẪN XEM MÃ NGUỒN THEO TÊN CHỨC NĂNG & TIẾNG VIỆT TRONG VS CODE

> 👋 **Chào bạn!** Nếu bạn mở thư mục dự án bằng **Visual Studio Code (VS Code)**, bạn hãy nhìn sang cột bên trái (**File Explorer**) và làm theo hướng dẫn dưới đây để xem toàn bộ mã nguồn đã được đặt tên theo chức năng tiếng Việt cực kỳ dễ hiểu nhé!

---

## 🗂️ 1. CÁC FILE ĐƯỢC ĐẶT TÊN TRỰC TIẾP BẰNG TIẾNG VIỆT

Bạn mở thư mục: **`src/`** 👉 **`components/`** (ở cột bên trái VS Code), bạn sẽ thấy ngay danh sách các file chức năng sau:

| Tên File Trong VS Code         | Chức Năng & Nhiệm Vụ Cụ Thể                                            | Bạn Bấm Vào Xem Sẽ Thấy Gì?                                                                                                                 |
| :----------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **`ChonGhe_Va_ThanhToan.jsx`** | Sơ đồ ghế từ API, giữ ghế 5 phút, thanh toán Sandbox, kiểm tra độ tuổi | Chọn ghế, cảnh báo ghế lẻ, đồng hồ 5 phút, combo, ưu đãi backend và thanh toán Sandbox.                                                     |
| **`DatVeNhanh.jsx`**           | Thanh đặt vé nhanh 4 bước                                              | Giao diện 4 bước: Chọn rạp $\rightarrow$ Chọn phim $\rightarrow$ Chọn ngày $\rightarrow$ Chọn suất chiếu (hiển thị số ghế trống trực tiếp). |
| **`SoatVeNhanVien.jsx`**       | Bàn soát vé quét mã QR cho Nhân viên                                   | Màn hình bật camera WebRTC tự động quét mã QR vé xem phim, kiểm tra giờ chiếu và chống soát vé 2 lần.                                       |
| **`QuanTriHeThong.jsx`**       | Bảng quản trị doanh thu & vận hành cho Admin                           | Biểu đồ doanh thu, số vé bán, lọc ngày theo giờ Việt Nam, nút xuất file CSV tải về máy tính.                                                |
| **`LichSuVeKhachHang.jsx`**    | Ví vé điện tử của khách hàng                                           | Vé QR, email xác nhận từ backend, lịch `.ics` có nhắc 30 phút và tiếp tục đơn đang giữ.                                                     |
| **`DangNhap_DangKy.jsx`**      | Hộp thoại đăng nhập & đăng ký thành viên                               | Biểu mẫu đăng ký C'MEMBER, đăng nhập bảo mật và các nút bấm điền nhanh tài khoản demo cho giảng viên nghiệm thu.                            |
| **`LichChieuPhim.jsx`**        | Ma trận lịch chiếu phim theo ngày & rạp                                | Bảng hiển thị các khung giờ chiếu (10:00, 13:30, 16:45, 19:30, 22:30) của từng rạp kèm định dạng IMAX / 2D.                                 |
| **`TimKiemPhim.jsx`**          | Thanh tìm kiếm phim trực tiếp trên Header                              | Ô tìm kiếm thông minh tự động bỏ dấu tiếng Việt (gõ "quat mo" vẫn tìm ra "Quật Mộ Trùng Ma").                                               |
| **`BapNuocCombo.jsx`**         | Hình ảnh bắp nước rạp chiếu phim                                       | Tranh minh họa hộp bắp rang bơ và ly nước mát lạnh dựng 100% bằng mã CSS không lo bị lỗi mạng.                                              |
| **`HopThoaiModal.jsx`**        | Khung popup đa năng dùng chung                                         | Hộp thoại chuẩn trợ năng: khóa cuộn chuột nền và bấm phím `Esc` để đóng an toàn.                                                            |
| **`MenuDieuHuong.jsx`**        | Thanh Menu Header kính mờ                                              | Menu điều hướng với hiệu ứng vệt sáng lướt chuyển động theo chuột.                                                                          |
| **`PosterNghieng3D.jsx`**      | Poster phim hiệu ứng 3D                                                | Hiệu ứng poster nghiêng theo con trỏ chuột bằng lò xo vật lý Framer Motion.                                                                 |
| **`NenDienAnh.jsx`**           | Nền ánh sáng máy chiếu rạp phim                                        | Nạp hiệu ứng hạt bụi máy chiếu 3D lơ lửng khi trình duyệt nhàn rỗi.                                                                         |
| **`QuanLyDanhMucPhimRap.jsx`** | Phân hệ quản trị CRUD phim & rạp                                       | Thêm/sửa phim, cụm rạp, phòng chiếu (tự động sinh sơ đồ 160 ghế chuẩn) và combo bắp nước.                                                   |

---

## 🎯 2. FILE ĐIỀU PHỐI CHÍNH: `src/App.jsx`

Khi bạn bấm mở file **[`src/App.jsx`](file:///d:/study%20hcmue/Nh%E1%BA%ADp%20m%C3%B4n%20c%C3%B4ng%20ngh%E1%BB%87%20ph%E1%BA%A7n%20m%C3%AAm%20f/src/App.jsx)** lên, bạn sẽ thấy ngay:

1. **Ngay đầu file (Dòng 60 - 80):** Khai báo và import trực tiếp các component tiếng Việt:
   ```javascript
   import ChonGhe_Va_ThanhToan from "./components/ChonGhe_Va_ThanhToan.jsx";
   import DatVeNhanh from "./components/DatVeNhanh.jsx";
   import SoatVeNhanVien from "./components/SoatVeNhanVien.jsx";
   import QuanTriHeThong from "./components/QuanTriHeThong.jsx";
   import LichSuVeKhachHang from "./components/LichSuVeKhachHang.jsx";
   import DangNhap_DangKy from "./components/DangNhap_DangKy.jsx";
   import LichChieuPhim from "./components/LichChieuPhim.jsx";
   import TimKiemPhim from "./components/TimKiemPhim.jsx";
   import MenuDieuHuong from "./components/MenuDieuHuong.jsx";
   import NenDienAnh from "./components/NenDienAnh.jsx";
   ```
2. **Trong cấu trúc giao diện JSX:** Gọi trực tiếp các thẻ component tiếng Việt:
   - `<MenuDieuHuong />`: Thanh điều hướng trên đỉnh trang.
   - `<TimKiemPhim />`: Ô tìm kiếm phim nhanh.
   - `<DatVeNhanh />`: Thanh chọn vé 4 bước.
   - `<LichChieuPhim />`: Lịch chiếu các suất chiếu.
   - `<ChonGhe_Va_ThanhToan />`: Màn hình chọn ghế và thanh toán.
   - `<DangNhap_DangKy />`: Popup đăng nhập tài khoản.
   - `<SoatVeNhanVien />`: Màn hình camera soát vé của nhân viên.
   - `<QuanTriHeThong />`: Bảng điều khiển quản trị viên Admin.

---

## ⚙️ 3. CÁC TỆP TIN XỬ LÝ DỮ LIỆU & GỌI API

- **`src/bookingStore.js`**: mã demo cũ để tham khảo, không phải nguồn ghế/tiền/vé của luồng NestJS. Giao diện dùng `src/api/client.js`; backend xác nhận giữ ghế, giá và QR.

- **[`src/api/client.js`](file:///d:/study%20hcmue/Nh%E1%BA%ADp%20m%C3%B4n%20c%C3%B4ng%20ngh%E1%BB%87%20ph%E1%BA%A7n%20m%C3%AAm%20f/src/api/client.js)**: Chứa tất cả các hàm gọi API được đặt tên tiếng Việt song song:
  - `apiDangNhap`: Đăng nhập tài khoản.
  - `apiDangKy`: Đăng ký thành viên mới.
  - `apiDangXuat`: Đăng xuất và xóa sạch cookie.
  - `apiGiuGhe5Phut`: Khóa ghế 5 phút chống tranh chấp.
  - `apiThanhToanSandboxTuDong`: Thanh toán mô phỏng 1 chạm.
  - `apiLayBaoCaoDoanhThuAdmin`: Lấy số liệu doanh thu tài chính.
- **[`src/catalog.js`](file:///d:/study%20hcmue/Nh%E1%BA%ADp%20m%C3%B4n%20c%C3%B4ng%20ngh%E1%BB%87%20ph%E1%BA%A7n%20m%C3%AAm%20f/src/catalog.js)**: Định dạng ngày giờ chuẩn Việt Nam (`formatVietnamDateKey`, `formatVietnamTimeLabel`).
- **[`src/data.js`](file:///d:/study%20hcmue/Nh%E1%BA%ADp%20m%C3%B4n%20c%C3%B4ng%20ngh%E1%BB%87%20ph%E1%BA%A7n%20m%C3%AAm%20f/src/data.js)**: Danh mục phim, cụm rạp và hàm đổi tiền VNĐ (`formatVNDCurrency`: ví dụ "120.000 ₫").

---

## 🔑 4. TÀI KHOẢN ĐĂNG NHẬP & CHẾ ĐỘ DỰ PHÒNG NGOẠI TUYẾN (KHÔNG LO LỖI MÁY CHỦ)

Chế độ demo độc lập tại `src/app/api/v1/[...path]/resilientFallback.js` dùng bộ nhớ tạm,
chỉ dành cho development chưa cấu hình `BACKEND_API_URL`, hoặc chọn `NOVA_STANDALONE=true`.
Có nhãn demo trên web. Khi dùng `dev:full` hoặc API đã cấu hình, toàn bộ đơn/vé đi vào
NestJS; kết nối lỗi trả thông báo và không chuyển sang kho demo. Production dùng NestJS.
Phần soát vé hai bước, email preview và kiểm thử concurrency cần backend thật.

### Các tài khoản kiểm thử có sẵn:

1. **👑 Quản trị viên (ADMIN):**
   - **Email:** `admin@nova.local`
   - **Mật khẩu:** `nova@12345`
   - **Quyền hạn:** Mở Bảng Quản Trị Hệ Thống (`QuanTriHeThong.jsx`), xem biểu đồ doanh thu tài chính, báo cáo khách hàng và kiểm tra sức khỏe hạ tầng.

2. **🎫 Nhân viên soát vé (STAFF):**
   - **Email:** `staff@nova.local`
   - **Mật khẩu:** `nova@12345`
   - **Quyền hạn:** Mở Bàn Soát Vé (`SoatVeNhanVien.jsx`), bật camera quét mã QR hoặc chọn vé mẫu để duyệt vé vào rạp.

3. **👤 Khách hàng thân thiết (CUSTOMER):**
   - **Email:** `customer@nova.local`
   - **Mật khẩu:** `nova@12345`
   - **Quyền hạn:** Đặt vé, chọn sơ đồ ghế, giữ vé 5 phút, thanh toán giả lập Sandbox 1 chạm, xem ví vé điện tử QR.

_(Bạn cũng có thể bấm sang tab **Đăng ký** để tạo tài khoản mới với email và mật khẩu riêng của bạn)._

---

## 📘 5. TÀI LIỆU CẨM NANG TOÀN DIỆN

Để xem phân tích kiến trúc, quy trình nghiệp vụ và sơ đồ luồng hoạt động từng bước có hình vẽ:
👉 Mở file: **[`docs/BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md`](file:///d:/study%20hcmue/Nh%E1%BA%ADp%20m%C3%B4n%20c%C3%B4ng%20ngh%E1%BB%87%20ph%E1%BA%A7n%20m%C3%AAm%20f/docs/BAN_DO_CHUC_NANG_VA_TIEN_TRINH_CODE.md)**
