# Kiểm tra và sửa tích hợp NOVA Cinema

Ngày kiểm tra: 15/10/2026. Nhánh: `fix/fullstack-productization`.
Nguồn trước sửa: `c48d84e`, gồm audit trên `7351d2c`.
Yêu cầu lần này là kiểm tra, sửa luồng frontend–backend, thử chạy web và push GitHub.
Đây là bản sửa luồng vận hành hiện có, không đánh dấu hoàn thành mọi phase mở rộng
trong master prompt. Audit cũ trong `docs/audit/` là bằng chứng trước sửa.

## Lỗi và thay đổi

| Vấn đề trước sửa                                                  | Cách xử lý                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ghế, tiền và QR do trình duyệt tự tạo, hai phiên có thể mua trùng | Catalog UUID, seat map, hold, cancel, pricing snapshots, Sandbox và ticket APIs là nguồn chính thức. Bỏ checkout/QR/VietQR chuyển tiền giả khỏi luồng vận hành.                                                                                                                |
| Đăng ký tạo account nhưng UI đọc sai `data.user`                  | Đăng ký nhận profile rồi đăng nhập thật; mật khẩu đăng ký tối thiểu 12 ký tự, điểm mới là 0. Bỏ nút mật khẩu mẫu không khớp cấu hình seed.                                                                                                                                     |
| Token localStorage, logout thiếu refresh token, chưa có refresh   | Same-origin Next.js BFF giữ access/refresh trong cookie HttpOnly/SameSite=Lax; Secure trên HTTPS. Login/rotation không trả tokens cho JavaScript; Web Locks điều phối refresh giữa các tab trên secure context. Logout gửi refresh đúng định dạng và xóa cookies sau phản hồi. |
| API cố định localhost ở browser, sai `groupSize`                  | Một client `/api/v1`, server-only `BACKEND_API_URL`; đúng `quantity`, errors/timeouts và retry sau refresh. Origin khác bị chặn cho mutation.                                                                                                                                  |
| Tải lại mất chủ sở hữu ghế                                        | Đọc booking của tài khoản từ backend, khôi phục đơn/deadline cũ, có nút tiếp tục trong tài khoản. Không gia hạn khi reload.                                                                                                                                                    |
| Mất đồng bộ hoặc bỏ lỡ sự kiện                                    | BFF bridge Socket.IO → SSE, đọc snapshot khi join/reconnect/event; polling 5 giây dự phòng, server expiry vẫn quyết định. Không hứa exactly-once hoặc event ordering.                                                                                                          |
| Sweetbox chỉ là quy tắc ở browser                                 | Backend giải quyết cặp cùng hàng, cột lẻ/chẵn 1–2, 3–4…; khóa/giá/giới hạn 20 tính sau resolve. Thiếu partner hoặc một nửa không khả dụng thì không giữ cặp. Layout không sửa được sau khi có lịch.                                                                            |
| Phim ENDED vẫn bán vì suất ở tương lai                            | Chặn tạo/đổi lịch sang phim ENDED, chặn hold mới và `canBook=false`. Booking đã giữ trước đó giữ snapshot của nó; trạng thái phim vẫn do admin quản lý, chưa có presale window theo release date.                                                                              |
| Health lỗi vẫn hiện UP và số liệu mẫu                             | UNKNOWN và lỗi rõ ràng; bỏ fallback đếm phim/rạp/phòng/suất. Money formatter giữ nguyên số thập phân backend, không chuyển tổng doanh thu lớn sang Number.                                                                                                                     |
| Thiếu màn hình vận hành                                           | ADMIN tạo/sửa/xóa danh mục theo API hiện có, sửa combo, sinh ghế cho phòng trống. STAFF/ADMIN nhập kết quả đọc QR để check-in; API giữ RBAC, ownership và single-use.                                                                                                          |
| Ngày của rạp khác xuất hiện trong lựa chọn                        | Lọc ngày theo rạp/phim; timeline chọn ngày hợp lệ khi đổi rạp. Giữ timezone Việt Nam cho ngày/suất.                                                                                                                                                                            |
| Test tái dùng Next production preview có manifest cũ              | Playwright khởi động API/Next/SMTP fixture riêng, không reuse server, cổng riêng và dữ liệu/Redis namespace riêng; cleanup chỉ dữ liệu do lần test sở hữu.                                                                                                                     |

Không thay schema/migration; giữ nguyên Decimal, active-seat unique index, showtime
GiST exclusion `[)`, composite FKs, refresh-token rotation, payment signature,
transaction/outbox và QR/check-in constraints. `bookingStore.js` còn là mã demo cũ,
không được luồng app hiện hành import làm nguồn ghế/tiền/vé.

## Kiểm chứng

Các lệnh chạy trong đúng package, PostgreSQL/Redis test và SMTP fixture thật.
Không dùng mock API để chứng minh thanh toán/giữ ghế. Fault injection chỉ dùng để
kiểm tra UI xử lý lỗi health/catalog, không dùng làm kết quả thành công.

| Kiểm tra                                            | Kết quả                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm --cache /workspace/.npm-cache run setup:local` | PASS: cài backend, compose, generate, migrations dev/test, seed và build           |
| Root `npm run lint`, `npm run build`                | PASS                                                                               |
| Backend `npm run check`                             | PASS: strict typecheck, typed lint, 67 unit + 195 HTTP/Socket.IO tests, build      |
| Backend `npm run test:db`                           | PASS: 22 PostgreSQL/seed tests                                                     |
| Backend `node scripts/smoke-booking.cjs`            | PASS: compiled booking/payment/realtime/QR/SMTP/check-in/ADMIN revenue và cleanup  |
| Root `npm test`                                     | PASS: 16/16, không skip; cộng backend/DB là 300 kiểm thử                           |
| `npm run dev:full`                                  | PASS: startup + đăng ký/đăng nhập/hold/cancel trên dev DB; mobile không tràn trang |

Các ca trình duyệt dùng tài khoản/DB thực: đăng ký/đăng xuất/refresh, guest gate,
tranh một ghế giữa hai context, refresh hai tab dùng chung phiên, Sweetbox, nhóm 20 + combo + discount chính thức,
khôi phục hold không đổi hạn, giữ đúng đơn vừa thanh toán khi còn đơn khác, failed/cancelled/SUCCESS Sandbox, giải mã PNG QR,
tải ICS, staff check-in đúng một lần, CUSTOMER bị chặn ADMIN, health UNKNOWN,
CRUD phim ADMIN, mobile emulation/keyboard/ngôn ngữ, backend mất kết nối và
limiter/cross-origin rejection. Giới hạn đăng nhập thật vẫn bật; test xóa riêng
namespace limiter của chính fixture giữa những ca độc lập.

Bộ 13 test demo cũ được thay bằng acceptance cho API thật vì browser store đã
ngừng là nguồn nghiệp vụ. Các tính năng demo voucher/đổi điểm bị gỡ khỏi checkout;
không đổi tên test để coi chức năng chưa có là đã qua. Không có test bị skip để
che lỗi. Tổng số test không phải phần trăm bao phủ nghiệp vụ hoặc bảo đảm hết lỗi.

## Phạm vi còn thiếu

Luồng chính đặt vé đã được nối backend; **chưa đủ toàn bộ master roadmap**:

- Chưa có domain voucher/quota/reservation và đổi điểm để thanh toán. Điểm tích
  sau PAID, hạng và discount 5/7/10% dùng policy backend hiện có.
- Genre/slug/ngôn ngữ phim chưa thành domain có migration/filter. Một số metadata
  quảng bá/ảnh minh họa dùng artwork cũ; phim/giá/lịch/ghế/đơn/vé lấy từ API.
- Không có thanh toán ngân hàng thật hoặc provider ngoài, không có hoàn tiền thật.
  Refund là hạng mục tùy chọn riêng; không lưu thẻ/CVV/OTP.
- Outbox có manual purge hiện có, chưa có scheduler retention/batch/metrics đầy đủ.
  Chưa có DOCS mode hoạt động không cần PostgreSQL/Redis.
- STAFF nhập mã từ thiết bị đọc QR; chưa có camera scanner trên web. Trang người
  dùng quản trị đang dùng API list hiện có, chưa có pagination cho danh sách này.
- Chưa xác minh triển khai public, load test, thiết bị vật lý hoặc production
  security audit. Reverse proxy cần bảo toàn Host, HTTPS, giới hạn request phù
  hợp, cấu hình return origins và không buffer SSE. BFF dùng chung địa chỉ API;
  không tự tin vào X-Forwarded-For do người gọi cung cấp để né rate limit.
- Audit dependency trước sửa có advisories backend; bản này không nâng major hoặc
  chạy `npm audit fix --force`. Các kiểm thử chức năng qua không đồng nghĩa đã
  xử lý hết dependency advisories hoặc SMTP giao thư vào inbox.

SMTP chỉ được xác nhận acceptance; retry có thể gửi lại cùng QR. Không gửi email
qua nhà cung cấp ngoài khi test. Không có giao dịch tiền thật.

Bản Next.js production được khởi động mới trên cổng riêng và đọc catalog qua BFF
thành công (HTTP200); không thiếu static chunks hoặc lỗi JavaScript trong probe.
Màn hình ghế desktop và mobile đã được xem trực tiếp, có cuộn ngang sơ đồ trong
popup và tổng tiền/hạn giữ từ server. Không tái dùng preview production cũ.

Bộ setup chạy lại thành công sau khi đặt `XDG_CACHE_HOME` vào `.runtime/cache`.
Cloud cần npm cache `/workspace/.npm-cache`; không thay HOME, không tắt kiểm tra
integrity/TLS/Prisma checksum. Helper gọi npm CLI bằng Node để tránh shell/npm.cmd
khi đường dẫn có khoảng trắng hoặc chạy trên Windows; kiểm chứng hiện tại là Linux.
