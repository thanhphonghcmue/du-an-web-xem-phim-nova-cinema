# Ảnh món và giao diện thực đơn — 28/10/2026

Yêu cầu: bỏ cảm giác ảnh tạo sinh ở combo, rà toàn bộ nơi dùng ảnh đó; tham khảo ảnh Cinestar người dùng gửi về cách đặt sản phẩm, giá lớn và bố cục khuyến mãi trên điện thoại.

## Thay đổi đã thực hiện

- Xóa bốn file tạo sinh khỏi `public`: sprite 24 món, banner chia sẻ bắp nước, thành phố giấc mơ và chiến dịch bắp nước. Không tạo thêm ảnh bằng công cụ sinh ảnh.
- Thay bằng **18 ảnh tham khảo có sẵn**, lưu tại [food-photography](../../public/images/food-photography). Nguồn, commit gốc, kích thước và checksum từng ảnh nằm trong [sources.json](../../public/images/food-photography/sources.json); xem [ghi chú nguồn ảnh](../../public/images/SOURCES.md).
- [MenuImage](../../src/components/MenuImage.jsx) dùng cùng bộ ảnh cho thực đơn, chi tiết món, giỏ món, khuyến mãi và bước chọn combo khi đặt vé. Combo trình bày thành phần với nhãn số lượng ×2/×4, thay bao bì kim loại và ly neon dựng trong sprite cũ.
- [menuPhotography](../../src/menuPhotography.js) quản lý ảnh riêng với dữ liệu giao dịch. ID combo, giá, loại món, số lượng gửi API và phép tính của backend giữ nguyên. Ảnh quản trị tự đặt được ưu tiên; ảnh hỏng hiện trạng thái cập nhật và vẫn chọn món được, không đổi thành ảnh minh họa giả của một món khác.
- [FoodStore](../../src/components/FoodStore.jsx), [CSS thực đơn](../../src/food-studio.css): thẻ món nền sáng, tên và giá tương phản rõ, mô tả lớn hơn, nút số lượng 44 px ở điện thoại; bỏ lớp phủ banner cũ làm chìm chữ và cản nút khám phá thực đơn; bộ lọc ngang, giỏ món và thanh chọn vé hoạt động như cũ.
- Popup mở đầu dùng ảnh sản phẩm và chữ HTML. Giá 69K, thành phần, đường dẫn đặt món/đặt vé và lựa chọn ẩn hôm nay vẫn hoạt động. Không chép mascot hay nhận diện Cinestar sang NOVA.
- Rà ảnh tại splash, trang chi tiết phim, giới thiệu, hướng dẫn thanh toán và các thẻ khám phá; thay nền tạo sinh bằng ảnh không gian rạp đang có. Poster phim chính thức và logo SVG NOVA được giữ.
- Sửa lớp hiển thị hộp thoại: [HopThoaiModal](../../src/components/HopThoaiModal.jsx) đưa modal nổi qua portal lên body, tránh header che tiêu đề/nút đóng trên điện thoại; phần quản trị nhúng vẫn nằm trong trang. Focus, Escape và trả focus được kiểm tra lại.
- Đường dẫn tương thích [BapNuocCombo](../../src/components/BapNuocCombo.jsx) cũng dùng ảnh mới thay hình bắp nước vẽ bằng CSS.

Đây là ảnh **tham khảo món**, không phải ảnh chụp sản phẩm do NOVA tự sản xuất. Không sửa logo, đổi màu món hoặc tạo lại bao bì bằng AI. Ảnh gà dùng CSS để lấy phần gà ở góc dưới của ảnh thực đơn gốc; file gốc không bị chỉnh sửa. Một số ảnh phản ánh loại món/hương vị tham khảo, không phải công thức hay bao bì thực tế của NOVA; thành phần và số lượng được ghi bằng chữ trong thực đơn. Quyền ảnh và thương hiệu thuộc bên gốc; tính công khai của repository không tự cấp quyền thương mại cho ảnh.

Tham khảo mã nguồn giao diện: Radix UI đang có trong dự án và cấu trúc card/spacing của shadcn/ui; ảnh được đối chiếu trong các repository ghi ở SOURCES.md. Không nhập backend hoặc chạy script cài đặt của các dự án bên ngoài.

## Rà soát và kiểm tra

- Kiểm tra từng món trong 24 món có ảnh raster tại local và bản ghi nguồn; không còn yêu cầu mạng đến bốn file tạo sinh cũ.
- Bộ duyệt tất cả trang công khai chạy tại 1440 và 390 px có thêm chặn tái sử dụng ảnh tạo sinh cũ.
- Thực đơn/chi tiết/giỏ món được kiểm tra tại 320, 390 và 768 px: không tràn ngang, nút đóng bấm được và trả focus đúng.
- Kiểm tra tải ảnh thật, ảnh quản trị bị hỏng, tìm kiếm/lọc/sắp xếp, số lượng và lưu giỏ món; kiểm tra combo mới giữ đúng UUID và số tiền qua giữ ghế → Sandbox → QR.
- Có smoke độc lập cho tự chuyển RAM → BFF → đăng nhập → giữ ghế → Sandbox → QR; các suite dùng chung test PostgreSQL/outbox chạy tuần tự.

Khối lượng bốn file cũ: **5.006.941 byte**. Tổng 18 ảnh mới: **3.195.568 byte**. Đây là tổng dung lượng file, không phải số đo thời gian tải trang; ảnh ngoài khung nhìn được lazy-load và nhiều món tái sử dụng cùng ảnh thành phần.

Kết quả: **44 kiểm thử Node đạt** và **70 ca giao diện khác nhau đạt**. Lượt chạy toàn bộ có 69 ca đạt và một ca sai giả định số món: test đếm cứng 24 nhưng API có thêm món quản trị hợp lệ. Đã sửa test để kiểm tra đủ 24 món mẫu đồng thời giữ các món quản trị theo API; chạy lại toàn bộ file thực đơn **7/7 đạt**. Sau khi sửa lớp phủ banner, chạy lại thêm nhóm 7 ca thực đơn và kiểm tra link “Khám phá thực đơn” bấm được; **7/7 tiếp tục đạt**. Không cộng các ca trùng giữa hai lượt.

Smoke tự chuyển RAM đã đạt: đăng ký/đăng nhập qua BFF, 24 món, giữ ghế, Sandbox và QR. **Lint và production build cuối đều đạt**. Đã chạy lại `npm run dev:full` và xác nhận health backend 200 với PostgreSQL. Không có thay đổi NestJS, DTO, giá hoặc giao dịch trong đợt ảnh này.

Lệnh kiểm tra:

```bash
npm run lint
npm run build
npm test
npx playwright test tests/food-studio.spec.mjs
node --test scripts/ticket-qr.test.mjs scripts/unique-records.test.mjs scripts/food-cart.test.mjs scripts/memory-contract.test.cjs scripts/request-budget.test.mjs scripts/catalog-index.test.mjs scripts/menu-photography.test.mjs
node scripts/check-fullstack-startup.cjs
```

## Ảnh kiểm tra trực quan

- [Đầu trang bắp nước](screenshots/photography/hero-desktop.jpg)
- [Khuyến mãi điện thoại](screenshots/photography/offers-mobile.jpg)
- [Thực đơn desktop](screenshots/photography/menu-desktop.jpg)
- [Thực đơn điện thoại](screenshots/photography/menu-mobile.jpg)
- [Popup điện thoại](screenshots/photography/welcome-mobile.jpg)
- [Chi tiết món, nút đóng trên điện thoại](screenshots/photography/nuggets-mobile.jpg)
