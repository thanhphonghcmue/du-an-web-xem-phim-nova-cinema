# Kiểm chứng bản Next.js

Ngày kiểm tra: 14/10/2026. Node.js 24.19.0; Chromium tại `/usr/bin/chromium`.

## Chạy lại từ lockfile

- `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`: thành công.
- `npm run lint`: không lỗi.
- `npm run build`: Next.js 16.4.0 production build thành công bằng webpack; `/` và `/_not-found` được prerender.
- `npm run start -- --port 5173`: server production khởi động.
- `npm test`: **13/13 ca qua trên server production**, khoảng 1 phút.
- `git diff --check`: không lỗi whitespace.

Các ca kiểm thử kiểm tra reset dữ liệu phụ thuộc, tìm kiếm đạo diễn/rạp, Sweetbox theo cặp, nhóm 20/21 ghế, giữ ghế 5 phút, hủy/thất bại/hết hạn, hai tab không giữ cùng ghế, tính tiền/combo/ưu đãi/điểm, QR UUID và ghế đã bán, biểu mẫu tài khoản, VN/EN, mobile/menu, capacity timeline, dock đóng/mở và focus, reduced-motion và HTTP 404. Xác thực tài khoản ở đây là kiểm tra biểu mẫu demo.

## Kiểm tra giao diện bằng trình duyệt

Chạy Taste inspector trên production ở **1440×900, 768×1024 và 390×844**. Báo cáo dữ liệu: [inspector.json](inspector.json). Ảnh đầu trang: [desktop](screenshots/desktop-fold.jpg), [tablet](screenshots/tablet-fold.jpg), [mobile](screenshots/mobile-fold.jpg). Các ảnh ghép toàn trang trong cùng thư mục.

- **0 FAIL** với những ngoại lệ phong cách được ghi rõ trong [skill-sources.md](skill-sources.md).
- Không ảnh hỏng và không tràn ngang trang tại ba viewport.
- Body text 16px; chữ nội dung nhỏ đã nâng tối thiểu 13px; tiêu đề marketing tối đa hai dòng ở ba viewport. Chữ rất nhỏ trong hình minh họa đồ uống là artwork.
- Xem ảnh trực tiếp phát hiện va chạm dòng “Khám phá trải nghiệm” với shortcut hero và menu tablet bị chật; đã sửa rồi chụp lại production. Không chỉ dựa vào kết quả script.
- Bốn WARN còn lại: nhiều cỡ chữ, không video tự chạy, script đo ít chuyển động và một label trên thẻ hội viên phối hai font. Các cỡ logo/artwork/dữ liệu góp vào số cỡ chữ; trailer chỉ tải khi người dùng yêu cầu; nền hạt WebGL không được bộ đo chuyển động DOM đánh giá đầy đủ.

Đã bật WebGL phần mềm trong Chromium để kiểm tra canvas thật, không chỉ fallback: một canvas được tạo; không `pageerror`; mobile scrollWidth bằng viewport 390px. Chuyển reduced-motion khi trang đang chạy loại bỏ canvas. Giới hạn DPR 1.35, pause khi tab ẩn và một draw call là thiết kế trong mã; chưa đo FPS, pin hay Core Web Vitals trên thiết bị thật.

## Tự phê bình theo Taste-Skill

ROUND 4

Seen in one second: tên DUNE và cảnh phim, sau đó CTA đỏ.

Idea (one sentence): Infinity nối việc khám phá phim với một vị trí được giữ 300 giây, từ dock tới timeline và ghế.

Live thing: chọn suất/ngày/rạp thay đổi capacity, giữ ghế thay đổi trạng thái giữa tab và QR riêng xuất hiện sau giao dịch demo.

Layout words by section: hero=full-bleed / booking=dock / movies=poster grid / showtimes=timeline / offers=split / membership=statement+card / cinemas=photo grid / events=asymmetric / footer=menu.

Scores: design 7 · usability 8 · creativity 6 · content 7 → raw overall 7.1; **6.5 theo cap phong cách của Taste-Skill**. Đây là tự đánh giá, không phải điểm của tác giả skill hay giải thưởng.

Caps applied: headline labels, step numbering, glass/gradient/shadow có chủ đích theo brief khiến rubric nguyên bản giới hạn tổng 6.5; warning still-page giới hạn design 7. Hero phim vẫn là cách tiếp cận quen thuộc của ngành, creativity 6. Yêu cầu của bạn được ưu tiên thay vì xóa kính, bước và glow để nâng điểm.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Hero dùng ngôn ngữ banner phim quen thuộc (desktop-fold.jpg): tăng nét riêng bằng dock Infinity, capacity thật và thời hạn giữ ghế, nhưng không coi hero là sáng tạo độc quyền.
2. Mật độ timeline và danh mục khiến trang mobile dài (mobile-page-01.jpg): chỉ mở một bước dock, timeline phim hai cột/ngày wrap và lựa chọn trực tiếp; chưa có nghiên cứu người dùng để khẳng định tối ưu chuyển đổi.
3. Bộ ảnh rạp lặp nguồn Galaxy và Mai khác chất liệu poster (desktop-page-02.jpg): ghi rõ ảnh tham khảo/title art và đầy đủ nguồn; để dùng thương mại cần ảnh cơ sở thật và poster có quyền sử dụng.

## Giới hạn kiểm chứng

Không phải chứng nhận WCAG, kiểm tra bảo mật, benchmark hiệu năng hoặc hệ thống bán vé production. Booking/OAuth/thanh toán/QR đều trong phạm vi frontend Sandbox đã ghi rõ ở README. Canvas có thể dùng fallback trên môi trường không hỗ trợ WebGL.
