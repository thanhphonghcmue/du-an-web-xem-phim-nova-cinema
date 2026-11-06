# TC_FR07_05 / TC_FR08_04 — 07/11/2026

## Bản vá

- Migration `20261107000100_showtime_status`: thêm cột status ACTIVE/LOCKED/CANCELED, mặc định ACTIVE và CHECK constraint. Không xóa bản ghi, ghế SOLD hoặc vé cũ. PostgreSQL đang dùng; SQLite/WAL không áp dụng.
- `PATCH /api/v1/showtimes/:id/status`: chỉ ADMIN. Khóa suất FOR UPDATE trước khi khóa các đơn theo ID; giải phóng các đơn HOLDING/PENDING trong cùng transaction và phát outbox sự kiện ghế. Đơn PAID/SOLD giữ nguyên. Mở suất không hồi sinh đơn đã hủy. Giữ nguyên bảo vệ sửa cấu trúc phòng/giờ chiếu cũ.
- Catalogue tương lai chỉ đưa suất ACTIVE; sơ đồ ghế và lệnh giữ ghế kiểm tra lại trạng thái. BookingConsole mở modal đỏ “Thông báo thay đổi suất chiếu”; chọn lại sẽ làm mới catalogue. Admin có nút Khóa suất/Mở suất trên lịch.
- Kiểm tra lại suất và trạng thái phim khi tạo URL/thực thi thanh toán. Chuỗi khóa showtime→booking→payment giữ nguyên để serialize khóa suất và thanh toán. Không bỏ HMAC, giá server, quyền sở hữu hoặc thời hạn300s để tối ưu.
- `POST /api/v1/payments/sandbox/confirm`: dùng nguyên payload có chữ ký của Sandbox cũ nhưng trả JSON. Sau khi expiry/release đã commit, trả409 ORDER_EXPIRED_TIMEOUT; suất bị khóa trả409 SHOWTIME_UNAVAILABLE. Hai lỗi có cả trường error cũ và alias errorCode; không redirect sang HTML/trang lỗi. Endpoint HTML legacy vẫn giữ cho client cũ.
- Frontend giữ modal và CSS neon; chỉ xác nhận EXPIRED sau đọc lại trạng thái server. Mất mạng không bị suy diễn thành hết hạn hoặc PAID. Đồng hồ vẫn là HoldCountdown độc lập, không tick lại toàn bộ sơ đồ ghế.
- RAM adapter có cùng trạng thái/guard/release và route JSON; suất mới do Admin tạo mặc định ACTIVE.

## Nút kiểm thử nhanh

`POST /api/v1/payments/sandbox/test-expire` yêu cầu capability có chữ ký hợp lệ, chỉ chấp nhận đơn đang giữ. Bị chặn ở production, kể cả khi đặt NOVA_TEST_CONTROLS=true. Môi trường test bật sẵn; development cần bật rõ biến NOVA_TEST_CONTROLS=true. Response tạo URL chỉ trả cờ boolean để hiện nút, không đưa secret ra frontend.

Trong môi trường kiểm thử, endpoint đưa deadline về quá khứ và điều chỉnh createdAt của chính đơn thử để giữ constraint expiredAt > createdAt, rồi chạy expiry nghiệp vụ thật. Không sửa clock toàn cục, không tác động đơn khác, không giả timer hoặc tạo QR cục bộ.

Windows PowerShell, sau khi dừng phiên cũ:

```powershell
$env:NODE_ENV="development"
$env:NOVA_TEST_CONTROLS="true"
npm run dev:full
```

Mở một đơn ở Sandbox rồi bấm “Test: Hết hạn 5p ngay”. Giao diện gọi xác nhận thật, nhận409 và mở modal cam. Khi không bật cờ, nút không xuất hiện. Thông tin này cũng được ghi trong backend/.env.example.

## Kiểm chứng

- 116 backend unit và254 HTTP/Socket.IO/SMTP đạt; typecheck, typed lint và backend build đạt.
- 26 database/schema/migration đạt trên database test riêng, đã áp dụng migration mới.
- 107 Node/RAM/config/planner đạt, gồm hai ca RAM mới. Kiểm tra bổ sung21 ca RAM đạt với production-mode test controls bị chặn.
- 9 ca browser độc lập đã xác minh qua các lượt:7 trong cinema-status, hành trình hai QR/ICS/email/check-in độc lập, và đo BFF thực. Không cộng trùng các lần chạy lại TC_FR07_05.
- Tổng512 ca trong phạm vi lượt này; không tuyên bố đã chạy lại toàn bộ116 ca browser của dự án.
- Frontend lint/build đạt. Không Docker; chỉ PostgreSQL/Redis test riêng, SMTP loopback và RAM fixture. Không migrate database ứng dụng hoặc ghi dữ liệu người dùng trong quá trình QA.

TC_FR07_05: Admin khóa một suất có cả đơn chưa trả và đơn PAID; giữ nguyên PAID/SOLD, trả ghế chưa trả, POST giữ ghế và JSON xác nhận thanh toán cùng bị409, frontend hiển thị modal đúng thông báo. Mở lại suất bằng API được kiểm chứng cùng quyền CUSTOMER bị403.

TC_FR08_04: ép deadline của đơn thử qua API có chữ ký, xác nhận Sandbox trả JSON409 ORDER_EXPIRED_TIMEOUT; đơn EXPIRED, ghế AVAILABLE, không có vé cho đơn, modal cam còn CSS, không pageerror.

Lệnh chạy lại:

```bash
npm run test:backend
npm run test:db
npm run test:unit
npm run build
npx playwright test tests/cinema-status.spec.mjs
```

Cần cấu hình TEST_DATABASE_URL/Redis test theo tài liệu backend. Khi lấy code mới, `npm run dev:full` chuẩn bị migration ở nhánh native như trước; nếu chạy backend riêng thì chạy `npm run db:migrate --workspace backend` trước khi start. Không reset database.

## Hiệu năng: chưa đạt budget

Đã bỏ navigation/HTML trong luồng Sandbox mới, giữ pool PostgreSQL hiện có và tách state timer. Phép đo BFF thực ở lượt này:

| API                     | p95 ms | Wire bytes |
| ----------------------- | -----: | ---------: |
| movies                  |  255.2 |       2833 |
| cinemas                 |  619.8 |        730 |
| programme legacy đầy đủ |  220.4 |     307792 |
| seats                   |   74.8 |       1839 |

**Chưa đạt yêu cầu mọi API dưới30ms.** Chưa có bằng chứng mọi transaction dưới10ms; không khẳng định đạt bằng cách bỏ khóa, bỏ validation hoặc đổi sang mock. Số đo qua BFF/HTTP không phải riêng thời gian transaction SQL. Các test chức năng PASS không đại diện cho performance PASS. Khóa một suất có nhiều đơn cần thời gian tùy số đơn/lock contention; không đặt timeout10ms rồi rollback ngẫu nhiên nghiệp vụ hợp lệ.
