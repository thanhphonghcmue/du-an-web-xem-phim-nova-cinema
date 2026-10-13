# NOVA Cinema — Infinity Experience

Website điện ảnh bằng **React, Vite, Tailwind CSS 3 và Lucide Icons**, giao diện tối obsidian với màu **Electric Cyan #00F2FE, Hot Coral #FF3366 và Emerald #10B981**. Toàn bộ mã nguồn đã được triển khai trong repository, không cần API key để chạy demo.

## Ba điểm cốt lõi từ tài liệu

1. Tra cứu phim/rạp/ngày/giờ và tinh gọn luồng đặt vé; tích hợp Party Combo 69K và C’MEMBER trong một đơn hàng.
2. CR-01 / BR01, BR02, BR04: một ghế chỉ thuộc một giao dịch; giữ trong 5 phút và giải phóng khi hủy, thanh toán thất bại hoặc hết hạn.
3. Thanh toán Sandbox, tính tổng tiền trước khi xác nhận và phát hành vé điện tử QR duy nhất để tra cứu.

Nguồn phân tích: PDF **Báo cáo tổng quan yêu cầu đề tài.pdf**, báo cáo LAB03 của Nhóm 03, HCMUE. File này trình bày CR-01, Business Rules và tổng quan yêu cầu; không có một SRS riêng đầy đủ hoặc danh mục cụ thể sáu bộ phim. Sáu phim, Quick Booking 30s, giới hạn nhóm 20 ghế, slogan và phong cách giao diện được bổ sung theo yêu cầu trực tiếp của bạn. Các điểm đánh giá, giá ghế, rạp, suất chiếu và mức giảm C’MEMBER 5% là dữ liệu demo, không phải quy định được trích từ PDF. CR-01 trong PDF chưa ghi nhận quyết định phê duyệt; việc triển khai giao diện theo yêu cầu hiện tại của bạn.

## Chạy trên máy của bạn

Cài **Node.js 24 LTS** (hoặc Node.js từ 22.12 trở lên tương thích Vite; tránh các bản Node lẻ). Mở Terminal trong thư mục dự án:

```bash
npm ci
npm run dev
```

Nếu lấy từ GitHub:

```bash
git clone https://github.com/thanhphonghcmue/nova-cinema-skills-thanh-phong.git
cd nova-cinema-skills-thanh-phong
npm ci
npm run dev
```

Vite in địa chỉ truy cập khi khởi động. Mở địa chỉ đó trong trình duyệt. Nhấn **Ctrl + K** (Windows/Linux) hoặc **⌘ + K** (macOS) để tìm phim/đạo diễn. Nhấn `Ctrl + C` trong Terminal để dừng server.

Trong cloud này, dùng cache npm tại thư mục được phép ghi:

```bash
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

## Cách thử luồng đặt vé

1. Chọn thẻ rạp → thẻ phim kèm poster nhỏ → nút ngày → nút suất chiếu, thay cho thanh dropdown cũ. Chọn bước trước sẽ xóa lựa chọn không còn phù hợp ở các bước sau. Màu xanh/xanh lá, cam và coral của suất chiếu dựa trên số ghế thực tế trong kho dữ liệu demo tại thiết bị. Các suất đã qua trong ngày hiện tại được ẩn theo múi giờ Việt Nam.
2. Bật **Xếp cụm nhóm** nếu đi cùng nhóm, rồi nhấn **Tìm ghế đẹp**.
3. Chọn ghế thường/VIP/Sweetbox. Sweetbox luôn được chọn hoặc bỏ theo cặp. Với nhóm, chọn 2–20 người và nhấn **Xếp ghế** để tự tìm dải ghế trống trong một hàng. Nếu không có dải ghế phù hợp, giao diện thông báo rõ.
4. Ghế được giữ trong 5 phút tính từ lựa chọn đầu tiên; thêm ghế hoặc thay cụm không gia hạn thời gian này. Thêm/bớt Party Combo 69K ngay trong tóm tắt đơn.
5. Chọn **Tiếp tục chọn combo** để tới bước 3, tùy chỉnh combo/ưu đãi, sau đó **Tiếp tục thanh toán** để tới bước 4. Chọn MoMo, ZaloPay hoặc Visa/Mastercard Sandbox rồi **Thanh toán mô phỏng**. QR thực được tạo bằng thư viện `qrcode` với UUID riêng cho mỗi giao dịch. Có thể tải QR PNG và tra cứu vé trong tài khoản hoặc footer.
6. Thử **Hủy đặt vé**, nút mô phỏng thanh toán thất bại hoặc đợi hết thời gian để kiểm tra ghế được giải phóng. Ghế đã thanh toán sẽ bị khóa ở lần đặt tiếp theo.
7. Mở cùng suất chiếu trong một tab khác trên cùng trình duyệt để kiểm tra ghế đang giữ. Hồ sơ C’MEMBER demo mặc định giảm 5% tiền vé, không giảm giá combo; có thể đổi sang điểm hoặc voucher ở bước 3.

## Kiểm tra & build

```bash
npm run lint
npm run build
npm run preview
```

Kiểm thử bằng trình duyệt:

```bash
npx playwright install chromium
npm test
```

Bộ kiểm thử hiện có 10 ca nghiệp vụ, bao gồm cả xác thực biểu mẫu, nút mật khẩu, VN/EN, voucher NOVA10 và đổi điểm.

Cloud đã có Chromium tại `/usr/bin/chromium`, nên không cần tải browser lần nữa. `playwright.config.mjs` tự nhận Chromium tại đường dẫn này. Có thể đặt biến `PLAYWRIGHT_CHROMIUM_PATH` nếu dùng trình duyệt ở vị trí khác. Các kiểm tra bao gồm reset lựa chọn, tìm kiếm, tính tổng, QR, Sweetbox, giới hạn 20 ghế, hủy/thất bại/hết hạn, đồng bộ tab và bố cục mobile.

## Tài khoản & ưu đãi mới

Modal tài khoản có tab đăng nhập/đăng ký, label nổi, kiểm tra email/mật khẩu/xác nhận, nút hiện/ẩn mật khẩu và ghi nhớ hồ sơ. Hồ sơ demo được lưu ở localStorage nếu chọn ghi nhớ, hoặc sessionStorage nếu không chọn. **Mật khẩu không được lưu**; không nhập mật khẩu thật. Google/Apple và quên mật khẩu thông báo cần dịch vụ OAuth/backend, không giả lập xác thực thành công.

Ở bước **Combo & Ưu đãi**, chọn một trong các phương án: không giảm; C’MEMBER giảm 5% tiền vé; đổi điểm demo (1 điểm = 100đ); hoặc mã `NOVA10` giảm 10% tiền vé, tối đa 30.000đ. Các ưu đãi không cộng chồng. Đăng ký hồ sơ demo nhận 100 điểm minh họa; đổi điểm được trừ và điểm mới được cộng sau thanh toán thành công (1 điểm / 1.000đ tổng tiền). Cần backend để bảo đảm số dư giữa nhiều người dùng/thiết bị.

## Những phần đã có

- Header kính mờ cố định, tìm kiếm phim/rạp có kết quả tức thì, phím tắt, VN/EN lưu trên thiết bị, menu mobile, hồ sơ demo và lịch sử vé.
- Hero carousel Dune / Oppenheimer / Godzilla x Kong, trailer YouTube, thông tin phim chi tiết.
- Wizard đặt vé trực quan bằng thẻ rạp/phim, nút ngày và suất chiếu có chỉ báo ghế trống. Công tắc xếp nhóm, nút chọn nhanh 3 ghế và stepper 4 bước trong checkout.
- Poster tỉ lệ 2:3, tab phim, thông tin đạo diễn/diễn viên và hành động đặt vé.
- Party Combo 69K, C’MEMBER, tab phim sắp chiếu (tái chiếu minh họa chưa mở bán), hệ thống rạp theo thành phố, suất chiếu đặc biệt, footer.
- Sơ đồ ghế cong, phân loại ghế, giữ ghế 5 phút, tổng tiền và thanh toán Sandbox.
- Font đóng gói cục bộ, responsive và hỗ trợ giảm chuyển động, focus bàn phím, dialog/ARIA.

## Phạm vi demo

Đây là **frontend mô phỏng**, không thu tiền thật và không phát hành vé hợp lệ tại rạp. localStorage lưu hồ sơ, trạng thái ghế và vé; Web Locks API tuần tự hóa cập nhật ở các tab cùng origin khi trình duyệt hỗ trợ. Dữ liệu được kiểm tra lại trước khi giữ hoặc bán ghế. Chưa có backend, xác thực, cơ sở dữ liệu, cổng thanh toán thật, quản trị lịch chiếu hoặc kiểm soát ghế giữa nhiều thiết bị. Không dùng bản demo để bảo đảm chống bán trùng trong hệ thống thực.

Đóng dialog hoặc hủy/thất bại giải phóng ghế ngay; đóng cả tab/trình duyệt thì ghế tự hết hạn sau 5 phút. Chỉ dữ liệu demo được lưu trên máy, không nhập thông tin nhạy cảm. Xóa dữ liệu site trong trình duyệt để bắt đầu lại.

Ứng dụng native và chứng nhận Bộ Công Thương chưa tồn tại; footer thể hiện đúng tình trạng đồ án. Phân hệ quản trị, chống trùng lịch chiếu BR03 và đối soát doanh thu thuộc giai đoạn backend tiếp theo, chưa được triển khai trong giao diện khách hàng này.

## Hình ảnh & mạng

Đường dẫn ảnh TMDB và ID trailer nằm trong `src/data.js`. Máy cloud hiện chặn `image.tmdb.org`; ảnh thật dự phòng cục bộ được đặt trong `public/images`. Nếu cả ảnh từ xa và ảnh dự phòng đều không có, poster dùng thẻ tiêu đề cùng tông màu. Poster Mai chưa có bản dự phòng cục bộ. Trailer cần mạng YouTube; nhãn nút 4K không bảo đảm chất lượng video gốc.

Các miền cần cho ảnh/trailer từ xa: `image.tmdb.org`, `www.youtube-nocookie.com`, `www.youtube.com`, `i.ytimg.com`, `*.googlevideo.com`. Nếu bị chặn, chỉnh mạng trong environment settings; việc lưu draft không tự áp dụng thay đổi vào máy đang chạy.

Ảnh và các nhân vật phim thuộc chủ sở hữu tương ứng. Tài liệu nguồn ảnh cục bộ: [public/images/SOURCES.md](public/images/SOURCES.md). Cần kiểm tra quyền sử dụng trước khi đưa sản phẩm vào hoạt động thương mại.

## Cấu trúc mã nguồn

- `src/App.jsx`: trang chủ, tìm kiếm, chi tiết phim, trailer, hồ sơ và lịch sử.
- `src/components/QuickBooking.jsx`: wizard thẻ rạp/phim và ngày/suất có số ghế còn lại.
- `src/components/AuthForm.jsx`: biểu mẫu tài khoản demo và kiểm tra lỗi.
- `src/components/HeaderSearch.jsx`: tìm kiếm phim/rạp tức thì.
- `src/i18n.js`: chuỗi VN/EN và context ngôn ngữ.
- `src/components/SeatBooking.jsx`: sơ đồ ghế, combo, tính tiền, thanh toán và QR.
- `src/components/Modal.jsx`: dialog, focus bàn phím và phím Escape.
- `src/bookingStore.js`: trạng thái ghế, thời hạn giữ, Web Locks và thuật toán xếp nhóm.
- `src/data.js`: danh mục phim/rạp, ngày và suất chiếu demo.
- `src/styles.css`: thiết kế cinematic và responsive, cùng Tailwind directives.
- `tests/booking.spec.mjs`: các kiểm thử nghiệp vụ bằng Playwright.

Mã sử dụng Tailwind 3 qua PostCSS, không dùng CDN runtime. `package-lock.json` khóa các phiên bản để `npm ci` cài lại nhất quán.
