# Rà soát độ ổn định và tối ưu frontend — 29/10/2026

Baseline đo và kiểm thử: `e48cc67`, nhánh `feat/nova-discovery-ui`. Khi chuẩn bị push, GitHub có thêm `3b93a10` chỉ bổ sung kiểu Express trong `bootstrap.ts` và đường dẫn kiểu Next.js sinh tự động. Bản sửa frontend được rebase lên commit mới đó; transpile xác nhận JavaScript runtime của bootstrap trước/sau giống hệt nhau và build cả hai workspace sau đồng bộ đạt. Không ghi đè thay đổi của nhóm. Phạm vi sửa là giao diện React/Next.js và kiểm thử; không đổi backend, database, BFF, API client, endpoint, request/response hoặc thư viện phụ thuộc. Giữ nguyên cấu trúc thư mục.

## Các điểm đã sửa

| Khu vực           | Vấn đề và bản sửa                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đặt vé            | Một phản hồi poll `HOLDING` đến muộn có thể ghi đè kết quả hủy đơn. Thêm phiên bản thao tác để bỏ phản hồi cũ và ngừng nhận cập nhật từ effect đã dọn. Backend vẫn quyết định trạng thái, giá và hạn giữ ghế.                                                                                                                                               |
| QR sau thanh toán | Dừng tải lại ví vé nền sau khi có định danh QR hợp lệ của server. Vé chưa sẵn sàng hoặc lỗi kết nối vẫn có thể được tải lại; không tạo QR từ mã đơn.                                                                                                                                                                                                        |
| Soát vé           | Memo hóa option và dùng Map tra phim/phòng + Intl formatter dùng chung. Gõ mã QR không định dạng lại toàn bộ lịch chiếu; vẫn lọc trùng ID và giữ giờ Việt Nam.                                                                                                                                                                                              |
| Bắp nước          | Memo hóa từng thẻ và bộ lọc; callback ổn định. Các click liên tiếp trong cùng một nhịp không làm mất số lượng. Chi tiết món đọc theo ID trong danh mục hiện tại. Nếu trình duyệt không xóa được bản nháp, báo đúng giới hạn lưu trữ thay vì hứa đã lưu.                                                                                                     |
| Lưu trữ bị chặn   | Bắt lỗi cả getter lẫn phương thức local/session storage khi nạp ngôn ngữ, xóa dữ liệu demo cũ và đóng ưu đãi. Xác thực vẫn dùng cookie HttpOnly; giao diện tiếp tục hoạt động khi không lưu được tùy chọn.                                                                                                                                                  |
| Danh mục          | Một trailer URL lỗi không còn làm mất cả danh mục. Hỗ trợ URL YouTube watch/short/embed/shorts hợp lệ, giữ fallback artwork hiện có. Hàm tra lịch và giá trị context có identity ổn định.                                                                                                                                                                   |
| Danh sách phim    | Lập chỉ mục suất theo phim/ngày một lần cho snapshot, thay việc quét hàng nghìn suất trên từng thẻ và mỗi lần lọc. Bộ lọc hôm nay loại suất đã bắt đầu; cập nhật tối đa mỗi 30 giây khi tab hiện, và ngay khi focus/hiện lại. Chọn/giữ ghế luôn kiểm tra backend theo thời gian thật. Xóa bộ lọc cũng bỏ checkbox hôm nay; tìm không dấu nhận được chữ `Đ`. |
| Tải trang         | Tách PortalPage và thực đơn bắp nước bằng `next/dynamic`; chỉ tải khi dùng. Dùng Next Image cho banner/poster cục bộ ở hero, thư viện phim và thumbnail lịch chiếu, có sizes riêng. Ảnh nguồn không bị ghi đè; URL ảnh bên ngoài vẫn được hiển thị theo cách không yêu cầu thêm hostname.                                                                   |
| Three.js          | Không tải/tạo WebGL khi Save-Data hoặc giảm chuyển động; trì hoãn khởi tạo khi tab ẩn. Đổi tùy chọn có hiệu lực trong phiên. Dọn context/listener/GSAP/RAF; hỗ trợ StrictMode replay, observer không có sẵn và lỗi WebGL lúc resize.                                                                                                                        |

## Số đo tài nguyên frontend

So sánh build production của baseline và bản sửa, Chromium 1440×1000, giảm chuyển động, cùng catalogue RAM 24 phim; ba browser context mới cho mỗi bản. Lấy Resource Timing sau một giây kể từ lúc có suất chiếu đầu tiên. Đây là tài nguyên đã tải xong trong cửa sổ khởi động, không phải tổng tải toàn trang; lazy loading chủ động hoãn ảnh ngoài vùng nhìn. Bộ đo không ghi payload/API token và không thay dữ liệu backend.

| Tài nguyên ban đầu                   |       Trước |         Sau |            Giảm |
| ------------------------------------ | ----------: | ----------: | --------------: |
| JavaScript giải nén                  |   928.074 B |   900.353 B |           2,99% |
| JavaScript body nén                  |   283.487 B |   278.937 B |           1,61% |
| Body ảnh đã hoàn tất trong cửa sổ đo | 8.471.379 B | 1.524.955 B |          82,00% |
| Thẻ phim trong DOM                   |          24 |          24 | Giữ đủ danh mục |
| Runtime error trong mỗi mẫu đo       |           0 |           0 |  Ba mẫu mỗi bản |

Dữ liệu gốc và giới hạn: [frontend-stability-resources.json](measurements/frontend-stability-resources.json). Không suy ra FPS, INP, độ trễ backend hoặc kết quả Safari từ các số byte này. Lượt đo dùng RAM để giữ cùng dữ liệu giữa hai build; bộ kiểm thử nghiệp vụ phía dưới dùng NestJS/PostgreSQL thật riêng biệt. Next frontend tạo và cache biến thể ảnh; không ghi đè ảnh gốc. Chi phí resize lần đầu chưa được đo thành SLA.

Kiểm tra cuộn toàn bộ thư viện mobile: [24/24 poster tải được, không có ảnh hỏng hoặc runtime error](measurements/frontend-stability-gallery.json).

Ảnh kiểm tra trực tiếp: [desktop](screenshots/frontend-stable-home-desktop.jpg), [mobile 375px](screenshots/frontend-stable-films-mobile.jpg).

## Kiểm chứng

**181 kiểm thử độc lập đạt:** 81 Node/RAM/codec/lifecycle và 100 trình duyệt. Lint và build frontend đạt; `npm test` cũng build backend hiện có thành công trước khi chạy browser. Không cộng lượt chạy lại vào tổng. Không chạy lại toàn bộ backend unit/schema suite trong lượt chỉ sửa frontend này; các kiểm thử trình duyệt vẫn nối NestJS/PostgreSQL thật và kiểm tra giữ ghế, tranh ghế, thanh toán, QR, phân quyền và quản trị.

| Kiểm thử mới                                                                                                            | Số ca | Kết quả cuối |
| ----------------------------------------------------------------------------------------------------------------------- | ----: | ------------ |
| `scripts/movie-presentation.test.mjs`: tìm không dấu, trailer lỗi/YouTube, ranh giới ngày Việt Nam và suất đã bắt đầu   |     4 | Đạt          |
| `scripts/cinematic-screen.test.mjs`: cleanup GPU/GSAP/RAF, pause khi ẩn/ngoài màn hình, observer fallback và resize lỗi |     4 | Đạt          |
| `frontend-booking-resilience`: phản hồi HOLDING cũ sau hủy; nhập QR không tính lại option                               |     2 | Đạt          |
| `frontend-catalogue-regression`: trailer lỗi + xóa bộ lọc hôm nay; tìm `Đà Nẵng` bằng `da nang` trên hộp thoại thật     |     2 | Đạt          |
| `frontend-food-regression`: nhiều click cùng nhịp, F5 và lỗi xóa bản nháp                                               |     1 | Đạt          |
| `frontend-motion`: Save-Data không tạo GPU; đổi reduced-motion và mất context WebGL thật                                |     2 | Đạt          |
| `frontend-resilience`: storage methods hoặc getters bị chặn, cookie đăng nhập vẫn hoạt động                             |     2 | Đạt          |

Bộ browser còn xác nhận các trang công khai/được bảo vệ, mobile 320–390px, cổng thanh toán responsive, phim đặt trước đến tháng sau, đồng hồ server, hủy/timeout trả ghế, QR/ICS, UC14 check-in một lần và thao tác quản trị. PostgreSQL test không còn movie/user của fixture sau teardown.

**Lịch sử kiểm chứng:** lượt browser đầu 98/100; hai ca danh mục mới giả lập URL có query không tồn tại và dùng ô tìm kiếm đang ẩn. Sau khi sửa cách giả lập và chuyển kiểm tra sang hộp thoại tìm kiếm thật, đồng bộ chuẩn hóa tìm kiếm ở modal/header/danh mục, lượt tập trung 2/2 và lượt đầy đủ cuối **100/100** đạt. Báo cáo không che các lượt thất bại hoặc cộng chúng thành số test mới.

[Kết quả tổng hợp](measurements/frontend-stability-validation.json). Log chi tiết được giữ riêng dưới `/tmp/nova-native`; không đưa token, mật khẩu, mã QR hoặc dữ liệu cá nhân vào báo cáo. Kết quả chỉ áp dụng các môi trường/kịch bản đã kiểm tra; chưa suy ra zero-error hay 60FPS trên mọi thiết bị.

## Chạy lại

```bash
npm run test:unit
npm run lint
npm run build:frontend
```

Sau khi cấu hình PostgreSQL/Redis test riêng theo README (không dùng database ứng dụng):

```powershell
$env:NOVA_QA_PRODUCTION="1"
npm test
```

`npm test` build backend rồi chạy trình duyệt Chromium với NestJS/PostgreSQL/Redis và SMTP fixture cục bộ. Test ghi dữ liệu phải chạy tuần tự với các suite khác dùng chung test database. Toàn bộ lượt này chạy native, không Docker.

Các kiểm thử tình huống dữ liệu lỗi trên browser chặn/sửa response ở riêng test, không sửa dữ liệu sản xuất và không thêm mock thành công vào ứng dụng.
