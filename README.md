# NOVA Cinema — Infinity Experience

Website điện ảnh bằng **Next.js App Router, React, Tailwind CSS 3, Framer Motion, React Three Fiber và Lucide Icons**, giao diện **Obsidian #08090C, Crimson #E50914 và Amber #F59E0B**. Toàn bộ mã nguồn đã được triển khai trong repository, không cần API key để chạy demo.

## Ba điểm cốt lõi từ tài liệu

1. Tra cứu phim/rạp/ngày/giờ và tinh gọn luồng đặt vé; tích hợp Party Combo 69K và C’MEMBER trong một đơn hàng.
2. CR-01 / BR01, BR02, BR04: một ghế chỉ thuộc một giao dịch; giữ trong 5 phút và giải phóng khi hủy, thanh toán thất bại hoặc hết hạn.
3. Thanh toán Sandbox, tính tổng tiền trước khi xác nhận và phát hành vé điện tử QR duy nhất để tra cứu.

Nguồn phân tích: PDF **Báo cáo tổng quan yêu cầu đề tài.pdf**, báo cáo LAB03 của Nhóm 03, HCMUE. File này trình bày CR-01, Business Rules và tổng quan yêu cầu; không có một SRS riêng đầy đủ hoặc danh mục cụ thể sáu bộ phim. Sáu phim, Quick Booking 30s, giới hạn nhóm 20 ghế, slogan và phong cách giao diện được bổ sung theo yêu cầu trực tiếp của bạn. Các điểm đánh giá, giá ghế, rạp, suất chiếu và mức giảm C’MEMBER 5% là dữ liệu demo, không phải quy định được trích từ PDF. CR-01 trong PDF chưa ghi nhận quyết định phê duyệt; việc triển khai giao diện theo yêu cầu hiện tại của bạn.

## Chạy trên máy của bạn

Cài **Node.js 24 LTS** (hoặc Node.js từ 22.12 trở lên tương thích Next.js; tránh các bản Node lẻ). Mở Terminal trong thư mục dự án:

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

Mở **http://localhost:3000** trong trình duyệt. Next.js in địa chỉ truy cập khi khởi động. Nếu cổng 3000 đang được sử dụng, dùng địa chỉ Next.js hiển thị. Nhấn **Ctrl + K** (Windows/Linux) hoặc **⌘ + K** (macOS) để tìm phim/đạo diễn. Nhấn `Ctrl + C` trong Terminal để dừng server.

Trong cloud này, dùng cache npm tại thư mục được phép ghi:

```bash
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --port 5173
```

## Cách thử luồng đặt vé

1. Chọn thẻ rạp → thẻ phim kèm poster nhỏ → nút ngày → nút suất chiếu, thay cho thanh dropdown cũ. Chọn bước trước sẽ xóa lựa chọn không còn phù hợp ở các bước sau. Màu xanh lá, hổ phách và đỏ của suất chiếu dựa trên số ghế thực tế trong kho dữ liệu demo tại thiết bị. Các suất đã qua trong ngày hiện tại được ẩn theo múi giờ Việt Nam.
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

Bộ kiểm thử hiện có 13 ca nghiệp vụ, bao gồm cả xác thực biểu mẫu, nút mật khẩu, VN/EN, voucher NOVA10, đổi điểm, timeline lịch chiếu, đóng/mở dock, reduced-motion và trang 404.

Cloud đã có Chromium tại `/usr/bin/chromium`, nên không cần tải browser lần nữa. `playwright.config.mjs` tự nhận Chromium tại đường dẫn này. Có thể đặt biến `PLAYWRIGHT_CHROMIUM_PATH` nếu dùng trình duyệt ở vị trí khác. Các kiểm tra bao gồm reset lựa chọn, tìm kiếm, tính tổng, QR, Sweetbox, giới hạn 20 ghế, hủy/thất bại/hết hạn, đồng bộ tab và bố cục mobile.

## Tài khoản & ưu đãi mới

Modal tài khoản có tab đăng nhập/đăng ký, label nổi, kiểm tra email/mật khẩu/xác nhận, nút hiện/ẩn mật khẩu và ghi nhớ hồ sơ. Hồ sơ demo được lưu ở localStorage nếu chọn ghi nhớ, hoặc sessionStorage nếu không chọn. **Mật khẩu không được lưu**; không nhập mật khẩu thật. Google/Apple và quên mật khẩu thông báo cần dịch vụ OAuth/backend, không giả lập xác thực thành công.

Ở bước **Combo & Ưu đãi**, chọn một trong các phương án: không giảm; C’MEMBER giảm 5% tiền vé; đổi điểm demo (1 điểm = 100đ); hoặc mã `NOVA10` giảm 10% tiền vé, tối đa 30.000đ. Các ưu đãi không cộng chồng. Đăng ký hồ sơ demo nhận 100 điểm minh họa; đổi điểm được trừ và điểm mới được cộng sau thanh toán thành công (1 điểm / 1.000đ tổng tiền). Cần backend để bảo đảm số dư giữa nhiều người dùng/thiết bị.

## Những phần đã có

- Header kính mờ cố định, tìm kiếm phim/rạp có kết quả tức thì, phím tắt, VN/EN lưu trên thiết bị, menu mobile, hồ sơ demo và lịch sử vé.
- Hero carousel Dune / Oppenheimer / Godzilla x Kong, trailer YouTube, thông tin phim chi tiết. Nền 3D lazy-load với DPR giới hạn, dừng khi tab ẩn và không chạy khi bật reduced-motion.
- Wizard đặt vé trực quan bằng thẻ rạp/phim, nút ngày và suất chiếu có chỉ báo ghế trống. Công tắc xếp nhóm, nút chọn nhanh 3 ghế và stepper 4 bước trong checkout.
- Poster tỉ lệ 2:3, nghiêng nhẹ theo con trỏ chuột, tab phim, thông tin đạo diễn/diễn viên và hành động đặt vé. Timeline lọc phim/rạp/ngày, số ghế lấy cùng kho dữ liệu với checkout.
- Party Combo 69K, C’MEMBER, tab phim sắp chiếu (tái chiếu minh họa chưa mở bán), hệ thống rạp theo thành phố, suất chiếu đặc biệt, footer.
- Sơ đồ ghế cong, phân loại ghế, giữ ghế 5 phút, tổng tiền và thanh toán Sandbox.
- Font đóng gói cục bộ, responsive và hỗ trợ giảm chuyển động, focus bàn phím, dialog/ARIA.

## Phạm vi demo

Đây là **frontend mô phỏng**, không thu tiền thật và không phát hành vé hợp lệ tại rạp. localStorage lưu hồ sơ, trạng thái ghế và vé; Web Locks API tuần tự hóa cập nhật ở các tab cùng origin khi trình duyệt hỗ trợ. Dữ liệu được kiểm tra lại trước khi giữ hoặc bán ghế. Chưa có backend, xác thực, cơ sở dữ liệu, cổng thanh toán thật, quản trị lịch chiếu hoặc kiểm soát ghế giữa nhiều thiết bị. Không dùng bản demo để bảo đảm chống bán trùng trong hệ thống thực.

Đóng dialog hoặc hủy/thất bại giải phóng ghế ngay; đóng cả tab/trình duyệt thì ghế tự hết hạn sau 5 phút. Chỉ dữ liệu demo được lưu trên máy, không nhập thông tin nhạy cảm. Xóa dữ liệu site trong trình duyệt để bắt đầu lại.

Ứng dụng native và chứng nhận Bộ Công Thương chưa tồn tại; footer thể hiện đúng tình trạng đồ án. Phân hệ quản trị, chống trùng lịch chiếu BR03 và đối soát doanh thu thuộc giai đoạn backend tiếp theo, chưa được triển khai trong giao diện khách hàng này.

## Hình ảnh & mạng

Đường dẫn ảnh TMDB và ID trailer nằm trong `src/data.js`. Máy cloud hiện chặn `image.tmdb.org`; ảnh thật dự phòng cục bộ được đặt trong `public/images`. Nếu cả ảnh từ xa và ảnh dự phòng đều không có, poster dùng thẻ tiêu đề cùng tông màu. Mai dùng title art SVG tự dựng, không phải poster chính thức. Ảnh rạp Galaxy là ảnh tham khảo, không đại diện cho cơ sở NOVA thật. Trailer cần mạng YouTube; nhãn nút 4K không bảo đảm chất lượng video gốc.

Các miền cần cho ảnh/trailer từ xa: `image.tmdb.org`, `www.youtube-nocookie.com`, `www.youtube.com`, `i.ytimg.com`, `*.googlevideo.com`. Nếu bị chặn, chỉnh mạng trong environment settings; việc lưu draft không tự áp dụng thay đổi vào máy đang chạy.

Ảnh và các nhân vật phim thuộc chủ sở hữu tương ứng. Tài liệu nguồn ảnh cục bộ: [public/images/SOURCES.md](public/images/SOURCES.md). Cần kiểm tra quyền sử dụng trước khi đưa sản phẩm vào hoạt động thương mại.

## Cấu trúc mã nguồn

- `src/app/`: App Router layout/page và trang 404.
- `src/components/CinemaExperience.jsx`: client boundary cho dữ liệu trình duyệt.
- `src/components/CinematicCanvas.jsx`: point cloud Three.js và fallback WebGL.
- `src/components/ShowtimeTimeline.jsx`: lịch chiếu và số ghế còn lại.
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

## Nghiên cứu ba skill theo yêu cầu

Đã đọc trực tiếp Taste-Skill, UI/UX Pro Max và Three.js Skills. Nguồn/commit và quyết định áp dụng: [docs/design/skill-sources.md](docs/design/skill-sources.md). Hệ thiết kế: [docs/design/MASTER.md](docs/design/MASTER.md). Báo cáo kiểm chứng: [docs/design/validation.md](docs/design/validation.md).

Plus Jakarta Sans dùng cho nội dung có tiếng Việt; Space Grotesk dùng cho dữ liệu. Các yêu cầu kính mờ, Crimson/Amber và Next.js của bạn được ưu tiên khi khác mặc định của skill.

Để chạy bản production:

```bash
npm run build
npm run start
```

Đặt `NEXT_PUBLIC_SITE_URL` bằng URL thật trước khi build cho một deployment công khai. Không cần biến này để chạy local. Trang chủ prerender phần khung; trải nghiệm booking được tải phía client vì dùng localStorage.

## Backend NestJS — triển khai theo phase

Backend mới nằm trong [backend/](backend/README.md), dùng package/lockfile riêng. Phase 0 cung cấp kiến trúc và bootstrap HTTP TypeScript strict; Phase 1 đã có PostgreSQL, Prisma schema/migration/seed và kiểm thử DB thật. Frontend hiện chưa kết nối backend. Redis/auth/booking/payment sẽ triển khai lần lượt theo yêu cầu của bạn, dừng sau từng phase.

```bash
cd backend
npm ci
npm run db:configure
npm run db:up:test
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:test
npm run check
npm run test:db
npm run start:dev
```

Backend mặc định cổng 4000, endpoint kiểm tra `/api/v1`. Hướng dẫn và trạng thái thực tế: [backend/README.md](backend/README.md).
