# Rà soát lõi đặt vé và FR09 — 07/11/2026

Đối chiếu trên main sau d7c1ff7. Giữ NestJS/PostgreSQL/Redis và chế độ tự chuyển RAM đã được yêu cầu, chạy native. Không viết lại backend, đổi hợp đồng API hay sinh lại vé cũ.

## Lỗi tìm thêm và bản vá

`frontend/src/components/QrCapture.jsx` chưa loại kết quả `createImageBitmap()` cũ khi ảnh sau được chọn, khung quét đã đóng hoặc màn hình đang xử lý yêu cầu khác. Nếu ảnh cũ giải mã chậm, callback có thể tra nhầm mã hiện trên giao diện. Camera cũng thiếu kiểm tra lại lượt quét sau `video.play()`.

Bản vá dùng epoch hiện có cho cả ảnh lẫn camera, bỏ callback lỗi/thành công của lượt cũ, ngừng quét khi disabled; dừng track/RAF và bỏ video.srcObject khi kết thúc. Bitmap vẫn được đóng trong finally kể cả khi kết quả bị loại. Không đổi thời hạn giữ ghế, dữ liệu vé hoặc tự động check-in.

Regression test tại `tests/ticket-admission.spec.mjs` cố tình treo giải mã ảnh A, đọc ảnh B trước, rồi cho A hoàn thành. Chỉ B được tra cứu. Lượt ảnh thứ ba hoàn tất sau khi đóng scanner không được gửi request. Dùng QR PNG thật của hai ghế khác nhau, không dựa tên file.

## Đối chiếu các bất biến lõi

| Lõi                  | Kiểm tra                                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth/RBAC            | Hash mật khẩu, session/refresh, trạng thái tài khoản; CUSTOMER không mutation ADMIN/soát vé.                                                                                        |
| Phim/phòng/suất      | Validation, transaction, lịch có15 phút dọn phòng; lịch giao nhau bị409. Khóa suất trả unpaid holds, giữ nguyên PAID/SOLD.                                                          |
| Giữ ghế              | Giá/loại ghế/suất do DB quyết định; deadline300000ms từ server; giao dịch nhiều ghế atomic, Sweetbox đủ cặp, chống tranh ghế bằng khóa/constraint.                                  |
| Hủy/hết hạn/thất bại | AVAILABLE được giải phóng đúng chủ hold; FAILED/PAYMENT_DECLINED khác CANCELLED/CUSTOMER_ABORTED; không đổi trạng thái cuối hoặc giải phóng ghế SOLD.                               |
| Thanh toán           | Signed Sandbox, đối chiếu tiền/mã/hạn, callback replay idempotent; thành công PAID/SOLD và outbox trong transaction. Không tin giá client.                                          |
| Phát vé/hậu mãi      | N ghế SOLD mới → N QR riêng; vé nhóm cũ giữ nguyên; SMTP retry không chặn QR, ICS của chủ vé.                                                                                       |
| Tra cứu/soát vé      | Alias chính xác/fail closed, không wildcard suffix; mã ngắn owner-only; QR public chỉ thông tin tối thiểu. STAFF preview, xác nhận atomic, USED409/usedAt, sai suất không được vào. |
| UI phục hồi          | F5 giữ deadline cũ; lỗi mạng không suy diễn PAID, trả nút khỏi loading; không để QR/response cũ ghi đè lượt hiện tại.                                                               |

Backend integration sử dụng PostgreSQL/Redis test riêng và chạy tuần tự với schema/browser để không tranh outbox. SMTP chỉ fixture loopback. Smoke startup dùng workspace RAM tạm, không ghi database ứng dụng hoặc gửi email thật.

## Kết quả chạy lại

- Backend: typecheck, typed lint, build, 116 unit +254 HTTP/integration PASS.
- Schema PostgreSQL:26 PASS.
- Node/helpers/RAM:115 PASS.
- Frontend: lint không warning và production build PASS.
- Smoke tự chuyển RAM: PASS,28 món, đăng nhập BFF HttpOnly, giữ ghế, signed Sandbox, QR SVG.
- Browser: **35/35 PASS (7.3 phút)**, chạy trọn ba file booking/cinema-status/ticket-admission với một worker. Bao gồm test mới ảnh A giải mã muộn không ghi đè B và ảnh hoàn tất sau đóng scanner không gửi tra cứu.

Tổng các nhóm trên:546 kiểm thử tự động đạt, ngoài smoke startup. Nhóm browser còn xác nhận đăng ký/login/logout, hai phiên tranh ghế, Sweetbox, nhóm20 và giá combo/hội viên, F5/hủy, ba nhánh Sandbox, QR từng ghế/ICS, mobile375/768/1440, RBAC/giá giả, giới hạn đăng nhập, ADMIN CRUD, refresh hai tab, khóa suất/hết hạn/conflict409 và hai phiên đồng bộ món ẩn. FR09 kiểm chứng chủ vé/mã giả/ảnh thật và hai cửa soát cùng vé chỉ một winner.

Lệnh tái kiểm chứng (cần cấu hình TEST_DATABASE_URL/Redis riêng như README):

```bash
npm run test:backend
npm run test:db
npm run test:unit
npm run lint
npm run build:frontend
npx playwright test tests/booking.spec.mjs tests/cinema-status.spec.mjs tests/ticket-admission.spec.mjs
node scripts/check-fullstack-startup.cjs
```

Phạm vi là kiểm thử chức năng và lỗi hồi quy trong các luồng trên; chưa đo lại ngân sách latency <30ms hoặc tải production ở lượt này. Bộ browser này không thay toàn bộ kiểm thử giao diện của repository. Không đánh dấu Phase11–12 hoàn tất hoặc cam kết mọi thiết bị camera vật lý đã được kiểm tra. [Chi tiết FR09, seed và ánh xạ trường DB](ticket-admission-fr09-2026-11-07.md).
