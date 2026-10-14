# NOVA Cinema — Cinematic Design System

## Ý tưởng

Tấm vé **Infinity** nối trải nghiệm phim với vị trí thực sự của khán giả: một khung hình lớn để khám phá, dock chọn từng bước để tìm suất, timeline để thấy ghế trống và đồng hồ giữ chỗ 5 phút để quyết định. Nội dung nào không giúp hiểu phim, chọn suất hoặc hoàn tất trải nghiệm được giảm độ nhấn.

Danh mục riêng của sản phẩm: tên Infinity; giữ ghế 300 giây; nhóm tối đa 20 ghế trong một hàng; Party Combo 69K; C’MEMBER; QR theo từng giao dịch; IMAX 70mm; bộ sáu phim chính; bốn rạp demo tại ba thành phố; ngôn ngữ Việt/Anh. Các giá trị rạp và ưu đãi là dữ liệu minh họa của đồ án.

## Cấu trúc và chứng cứ

- Hero: phim và thế giới hình ảnh của phim → ảnh lớn, trailer và CTA đặt vé.
- Dock: đặt vé không cần đọc toàn bộ danh mục → chỉ mở một nhóm lựa chọn, cho phép quay lại và xóa dữ liệu phụ thuộc.
- Lưới phim: lựa chọn bằng poster → ảnh 2:3, tuổi, điểm đánh giá minh họa, chi tiết, trailer và đặt vé.
- Timeline: biết suất phù hợp còn chỗ → ngày, rạp, phim, thời gian và `còn n/160 ghế` lấy từ cùng kho ghế với checkout.
- Bắp nước/nhóm: một đơn có thể trọn trải nghiệm → giá 69K và thao tác đặt ghế liền nhau.
- Hội viên: ưu đãi có tác động rõ vào giá → giảm vé, điểm, voucher loại trừ lẫn nhau.
- Rạp: hiểu không gian trải nghiệm → ảnh rạp có ghi nguồn tham khảo, địa chỉ và công nghệ demo.
- Vé: hoàn tất việc đặt → QR thật chứa UUID, hiển thị rõ là vé mô phỏng.

## Token

| Vai trò | Giá trị |
|---|---|
| Nền | `#08090C` |
| Surface | `#101217`, `#191C22` |
| Kính | trắng 2.5%; active trắng 5.5% |
| Viền | trắng 10%; active trắng 20% |
| CTA | `#E50914`; hover `#F51B27` |
| Rating | `#F59E0B` |
| Chữ chính | `#F8FAFC` |
| Chữ phụ | `#94A3B8` |
| Xác nhận/ghế trống | xanh lá dịu `#61B99B` |
| Prose | Plus Jakarta Sans 400/500/600/700/800, có glyph tiếng Việt |
| Dữ liệu | Space Grotesk 500/600/700, tabular figures |

Toàn bộ giao diện dùng một stylesheet và các token tại `:root`; bỏ chuỗi ghi đè cyan/coral từ phiên bản trước. Font đóng gói cục bộ, không cần gọi Google Fonts.

## Motion và hiệu năng

- Navigation: vệt sáng `layoutId="nav-glow"`, spring 300/28.
- Dock: pill tab và panel spring; dùng transform/opacity, phản hồi ngay.
- Poster: hai motion values và spring, góc nghiêng tối đa khoảng 3 độ; không setState theo mỗi pointer move; touch không nghiêng.
- Canvas: 80 hạt trên mobile, 220 trên desktop; opacity 15%, DPR tối đa 1.35, một draw call, không ánh sáng/postprocessing nặng. Lazy load sau idle; tạm dừng khi tab ẩn; fallback khi mất WebGL; reduced-motion không khởi tạo canvas.
- Next.js: App Router page/layout ở server, trải nghiệm cần localStorage nằm trong client dynamic boundary để tránh truy cập dữ liệu trình duyệt lúc prerender. Không khẳng định toàn bộ ứng dụng được SSR.

## Responsive và truy cập

Mốc desktop/tablet/mobile dùng cấu trúc riêng. Hero có CTA trong màn hình đầu. Ngày/suất dùng nút thật; trạng thái ghế có nhãn và tỷ lệ, không chỉ màu. Có skip link, focus rõ, Escape/focus trap cho dialog, đường quay lại trong checkout và trang 404 riêng. Sơ đồ 20 ghế cho phép pan nội bộ trên mobile; trang không được tràn ngang.

## Giới hạn

Đây là frontend Sandbox. Xác thực/OAuth, đồng bộ ghế đa thiết bị, thanh toán thật, kiểm soát lịch chiếu và quyền sử dụng ảnh thương mại cần các tích hợp riêng. Ảnh không gian Galaxy Cinema chỉ là ảnh tham khảo, không tự nhận là cơ sở NOVA thật. Bìa Mai là title art tự dựng, không phải poster chính thức.
