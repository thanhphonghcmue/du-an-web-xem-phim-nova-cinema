# Chuẩn bị giao diện LAB04 để đưa sang Figma

[Danh sách trang, trạng thái và dây nối prototype](figma-lab04-capture.json) bao gồm 20 trang/nhóm trang hiện có (kèm 6 URL alias cũ) và 16 trạng thái cần capture thêm. Đây là tài liệu bàn giao từ web; chưa có file Figma được tạo hoặc phép import html.to.design được thực hiện trong lượt này.

## Mở website native trên Windows

Với Node.js phù hợp `.nvmrc`, từ root repository:

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`. Nếu dùng PostgreSQL, máy cần có PostgreSQL/Redis native và `backend/.env` hợp lệ sẵn (DB UTF8/locale Unicode, JWT/payment secrets, seed password); launcher chuẩn bị Prisma, migration/seed và build backend trước khi khởi chạy. Hai lệnh trên không cài đặt dịch vụ PostgreSQL/Redis hoặc cung cấp bí mật thay bạn.

Khi chưa cấu hình/kết nối được PostgreSQL, giữ RAM fallback đã chọn: API vẫn chạy qua HTTP, dữ liệu mất khi restart. Không gọi chế độ này là PostgreSQL bền vững. `NOVA_REFRESH_PROGRAMME=false` bỏ seed/migration tự động và yêu cầu schema đã sẵn; backend vẫn được build lại.

## Capture theo từng trang và trạng thái

1. Dùng extension html.to.design trong trình duyệt đang mở website local; dịch vụ import ở máy khác không truy cập được `localhost` của bạn.
2. Đặt viewport 375×812, 768×1024 hoặc 1440×1000. Đợi danh mục và ảnh hoàn tất, đóng ưu đãi mở màn nếu đang capture trang nền. Cuộn qua trang để ảnh lazy loading được tải trước capture full-page.
3. Capture từng URL canonical trong JSON. Với `/phim/:movieId`, chọn UUID thật qua danh mục; không dùng nguyên ký hiệu `:movieId` làm URL.
4. Đăng nhập đúng vai trò khi capture tài khoản, quản trị, soát vé. Với đặt ghế/thanh toán, tạo đơn kiểm thử thật và capture riêng từng trạng thái. Không dùng bản xem trước để minh họa là đã thanh toán.
5. Trong Figma, kiểm tra Auto Layout của form/grid, font Việt, clipping của khung cuộn và overlay. Thêm liên kết giữa frame theo `prototypeLinks`; đặt trạng thái khởi đầu theo từng vai trò.

HTML capture không mang theo code React, JWT/cookie, API, đồng hồ server hoặc nghiệp vụ check-in. Vì vậy prototype có dây nối frame là bước riêng, không tự biến thành ứng dụng đặt vé. Các ảnh/QR của vé thực không cần đưa vào tài liệu thiết kế công khai; dùng phiên kiểm thử dùng một lần cho trạng thái riêng tư.

## Các bố cục đã chỉnh và kiểm tra trên web

- Form đăng nhập/đăng ký: icon, input và nút hiện mật khẩu là các ô Grid, không chồng bằng `absolute`; lỗi từng trường nằm trong luồng, có `aria-describedby`.
- Thanh đặt vé nhanh nằm sau hero, không dùng margin âm để phủ lên banner.
- Khung nội dung nhúng dùng Grid ba cột (padding/content/padding), header trải cột; không dùng margin âm để kéo header.
- Cổng thanh toán, sơ đồ ghế và thanh tổng kết tiếp tục dùng Grid/Flex/scroll/sticky; giữ công thức giá và hạn giữ từ server.
- Nền ảnh, badge poster, tooltip/overlay, SVG và WebGL vẫn có lớp vị trí riêng khi cần. Không bỏ các lớp đó chỉ để đạt một số đếm `absolute=0`; margin của phần tử chỉ dành cho screen reader cũng được giữ để bảo toàn trợ năng.

[Test bố cục và lỗi thật trên 3 viewport](../../tests/lab04-readiness.spec.mjs) xác nhận web không bị đè/tràn ở các vùng đã sửa. Kết quả đó không thay thế kiểm tra file Figma sau import, vì plugin có thể chuyển đổi CSS khác trình duyệt.
