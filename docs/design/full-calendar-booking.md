# Lịch đặt vé đầy đủ: 24 phim, nhiều phòng và cả tháng sau

Ngày 24/10/2026, tiếp nối `399f77b`. Yêu cầu: kiểm tra trường hợp chỉ thấy 6 phim,
3–4 ngày; mở lịch thật, kiểm thử chọn ngày/giờ và giữ kết nối NestJS/PostgreSQL.

## Nguyên nhân và cách sửa

- `resilientFallback.js` của chế độ standalone dùng `artwork.slice(0, 6)` và
  `[0, 1, 2, 3]`, mỗi phim chỉ một giờ/ngày. Đây là nguồn khớp chính xác triệu
  chứng được báo. Bộ nhớ demo nay có đủ danh mục, hai phòng/phim và bốn giờ/ngày.
  Nhãn demo vẫn hiện; dữ liệu này không được tính là bằng chứng backend thật.
- Trang chủ còn cắt sáu thẻ phim. Đã bỏ cắt và chọn mặc định “Tất cả phim” cho
  trang chủ/danh mục. Bộ chọn phim vẫn lọc theo lịch thực tế của rạp; seed đầy đủ
  làm cả 24 phim xuất hiện ở mỗi rạp mẫu, không chèn phim không có lịch vào bộ chọn.
- Seed PostgreSQL trước đây có 16 phim mở lịch 30 ngày; 8 phim sắp chiếu chỉ có
  một tuần theo ngày tái chiếu dự kiến. Giờ bổ sung hai phòng riêng cho mỗi phim
  còn thiếu, mở **suất chiếu sớm** từ hôm nay. Ngày tái chiếu dự kiến không bị sửa.
  Các phòng cũ, lịch/đơn đã có và số ghế admin đã chỉnh đều được giữ.
- Cửa sổ lịch ít nhất hôm nay + 30 ngày và bao gồm ngày cuối tháng sau. Với ngày
  24/10/2026 là đến **30/11/2026** (37 ngày tới, 38 ngày tính cả hôm nay). Ngày
  quá khứ hoặc không có suất chưa bắt đầu vẫn bị vô hiệu hóa; không tạo ngày giả.
- Mỗi phim có ít nhất bốn giờ khác nhau, trên ít nhất hai phòng, cho mỗi ngày
  tương lai trong cửa sổ. Suất đã qua trong hôm nay không được mở lại để đặt.
  Giờ/phòng/giá là bản ghi PostgreSQL thực và sơ đồ ghế lấy theo UUID suất.
- Lịch tháng thêm chấm vàng ở ngày có lịch. Phụ đề ngày hiển thị số ngày thực,
  không quảng cáo “không giới hạn” khi chưa có lịch ngoài cửa sổ mở bán.
- Programme API vẫn tải một snapshot đầy đủ, tăng ngưỡng kiểm soát từ 10.000 lên
  20.000 suất cho cửa sổ tối đa 60 ngày. Vượt ngưỡng trả lỗi rõ ràng, không cắt
  danh sách khiến ngày xa biến mất. Pagination của các API danh mục khác giữ nguyên.
- Frontend lập chỉ mục snapshot theo phim/rạp và tái sử dụng định dạng ngày Việt
  để tránh quét lại hàng nghìn suất/phòng mỗi lần đổi phim. Chỉ mục chứa bản ghi
  API, không sinh thêm suất hoặc giữ cache ghế thay thế máy chủ.
- Các lần tải đồng thời dùng chung một request đang chạy. Strict Mode không còn
  tải programme hai lần. Khôi phục đơn đợi danh mục sẵn sàng, giữ ưu tiên đơn
  được chỉ định trong URL và không tự thay kết quả thanh toán bằng đơn đang giữ
  khác khi hồ sơ/điểm được cập nhật.
- Nút con mắt nay điều khiển riêng mật khẩu và xác nhận mật khẩu, có
  `aria-controls`, `aria-pressed`, nhãn phân biệt và vùng bấm lớn/sáng hơn.

Không chạy Docker hoặc reset database trong đợt này. Tái sử dụng PostgreSQL/Redis
đã cấu hình. Không xóa `.runtime` hoặc `.env` để ép chuyển nguồn dữ liệu. Seed
bootstrap tối thiểu trong `backend/prisma/seed.ts` vẫn là fixture nền có ID ổn định;
`dev:full` thực hiện discovery + programme đầy đủ trước khi khởi động backend.
Giới hạn ba kết quả ở gợi ý tìm kiếm header chỉ là autocomplete, không cắt bộ chọn
phim hoặc chương trình chiếu.

## Kiểm chứng

| Kiểm tra                                 | Kết quả                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Backend typecheck / lint / build         | PASS                                                                                       |
| Unit                                     | 75/75 PASS                                                                                 |
| HTTP / Socket.IO / SMTP                  | 207/207 PASS                                                                               |
| PostgreSQL constraints / seed            | 22/22 PASS                                                                                 |
| Planner / timezone / standalone calendar | 5/5 PASS                                                                                   |
| Frontend lint / production build         | PASS                                                                                       |
| Programme verifier trên DB development   | 24 phim, 40 phòng/rạp, 37 ngày tới, 4 giờ khác nhau / 2 phòng / phim / ngày, 0 overlap     |
| Seed bổ sung                             | Lần đầu thêm 3.312 suất; lần hai thêm 0, xung đột 0, tổng 8.324 bản ghi lịch được giữ      |
| Production frontend → BFF → NestJS thật  | HTTP 200, `mode=backend`, 24 phim / 80 phòng / 8.245 suất tương lai tại thời điểm kiểm tra |
| Ảnh trình duyệt production               | Bộ chọn 24 phim, ngày 30/11 có 4 suất, desktop/mobile, không lỗi JavaScript                |

Kiểm tra riêng chế độ standalone trên trình duyệt mobile cũng đạt: runtime báo
`standalone`, 24 phim ở 4 rạp demo, 14.496 suất, chọn được phim cuối danh sách và
4 giờ ngày 30/11; không tràn ngang hoặc lỗi JavaScript. Đây chỉ là kiểm tra kho
demo độc lập, không cộng vào bằng chứng SQL/QR hoặc tổng số ca tự động.

**41/41 Playwright full stack PASS**, không skip, lượt cuối chạy toàn bộ trong
6,9 phút. Bao gồm kiểm tra mỗi rạp chọn lần lượt đủ 24 phim và chỉ tải một lần
programme, không có phản hồi 429/5xx từ các API lịch/ghế trong các ca này.
Tổng **350 ca tự động đạt** gồm 75 unit, 207 API/realtime/SMTP, 22 DB, 5 planner
và 41 trình duyệt. Không cộng các lần chạy lại hoặc thao tác kiểm tra thủ công.

Compiled backend smoke cũng PASS: giữ ghế → Sandbox → realtime → QR → SMTP →
check-in → báo cáo doanh thu ADMIN bằng Decimal; dọn đúng fixture/process/Redis
namespace thuộc smoke PASS. Không chạy smoke song song với Playwright trên DB test.

Đã khởi động lại bằng `npm run dev:full`: seed bổ sung 0 suất, 0 xung đột;
frontend 3000 và backend 4000 dùng cấu hình thật. Không triển khai host hoặc tunnel.

Bài kiểm tra quay lại thanh toán giữ nguyên kiểm tra PAID, QR, giá và cả trường
hợp còn một đơn đang giữ. Với snapshot vài nghìn suất, test đợi dialog xuất hiện
và trạng thái “Đang tải trạng thái ghế…” kết thúc trước khi kiểm tra kết quả.
Không nới assertion trạng thái, không bỏ qua soát vé hoặc thay API bằng dữ liệu giả.

Bộ trình duyệt bổ sung dùng hai rạp và 24 phim trong PostgreSQL test riêng, mỗi
phim hai phòng A–H / 20 cột. API, đăng nhập, giữ chỗ, Sandbox và QR đều chạy thật;
không mock endpoint. Kiểm tra cả chọn lần lượt 24 phim tại từng rạp, lịch tháng
desktop/mobile, và phim thứ 20 đặt trước 15 ngày. Cặp D10/D12 phải cảnh báo D11
trên giao diện và bị backend từ chối; sau đó ghế hợp lệ mới được thanh toán.

Các kiểm tra cũ về tranh chấp ghế, Sweetbox, giữ 300 giây, trả ghế khi hủy/thất bại,
Decimal/ưu đãi, email, `.ics`, ADMIN và soát vé vẫn được giữ. Không thay đổi nghiệp
vụ LAB04 để tạo lịch dày hơn, không tuyên bố hoàn thành các mục LAB04 còn thiếu.

Ảnh từ bản production nối DB development thật. Khi chụp riêng section, công cụ
chụp ẩn header sticky/skip-link để tránh lớp nổi che ảnh; giao diện thực giữ nguyên.

- [24 lựa chọn phim trên desktop](screenshots/full-calendar/24-movie-choices-desktop.jpg)
- [24 lựa chọn phim trên mobile](screenshots/full-calendar/24-movie-choices-mobile.jpg)
- [Toàn bộ lịch tháng 11](screenshots/full-calendar/november-calendar-desktop.jpg)
- [Bốn giờ chiếu ngày 30/11](screenshots/full-calendar/november-30-screenings-desktop.jpg)
- [Lịch ngày xa trên mobile](screenshots/full-calendar/november-30-screenings-mobile.jpg)
- [Tóm tắt phim/rạp/ngày trên mobile](screenshots/full-calendar/booking-summary-mobile.jpg)
- [24 phim trên trang chủ](screenshots/full-calendar/all-24-films-home.jpg)

## Cập nhật trên máy đã có backend

Tại thư mục dự án sau khi tải bản mới từ nhánh `feat/nova-discovery-ui`:

```bash
npm ci
npm --prefix backend run build
npm run dev:full
```

`dev:full` tự bổ sung dữ liệu còn thiếu, không xóa lịch cũ. Máy phải có Node.js 24,
PostgreSQL/Redis và cấu hình riêng `backend/.env` hoạt động. Không chạy
`setup:local` nếu muốn tránh Docker: helper đó dành cho hạ tầng Compose. Bản sửa
này giữ đường kết nối cơ sở dữ liệu và Redis mà bạn đã cấu hình.

Mở `http://localhost:3000`. Chạy `npm --prefix backend run db:verify:programme`
để kiểm tra dữ liệu lịch thật trên chính máy đang dùng. Nếu giao diện có nhãn
“DEMO ĐỘC LẬP”, đó là kho demo, không phải bản NestJS/PostgreSQL được kiểm chứng.
