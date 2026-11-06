# Đối soát FR07 / FR08 / FR12 — 07/11/2026

Phạm vi: sáu mã TC trong yêu cầu (dù phần mô tả ghi “5 lỗi”). Vá trên NestJS/PostgreSQL, Next.js hiện tại và adapter RAM đã được người dùng chấp thuận; không Docker, không đổi endpoint cũ, không reset dữ liệu. Một ghế đã thanh toán tiếp tục có một vé/QR riêng và được check-in độc lập.

## Nguyên nhân và thay đổi theo tầng

| Ca         | Database                                                                                                                                                                        | Backend/API                                                                                                                                                                                                    | Frontend                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_FR07_05 | Đã có migration trạng thái suất ở commit 824ad29; không xóa suất/FK. Khóa suất giải phóng HOLDING/PENDING trong transaction, giữ PAID/SOLD.                                     | Đã có kiểm tra ACTIVE ở giữ ghế/tạo URL/xác nhận thanh toán; không chỉ tin danh sách ghế do trình duyệt gửi.                                                                                                   | Giữ modal đỏ và làm mới sơ đồ khi SHOWTIME_UNAVAILABLE. Kiểm thử lại cả suất có đơn đã trả và chưa trả.                                                                                               |
| TC_FR08_04 | Đã có deadline server, expiry/release nguyên tử.                                                                                                                                | JSON confirm dùng payload có chữ ký; trả 409 ORDER_EXPIRED_TIMEOUT sau khi commit EXPIRED/release, không phát QR. Cờ ép hạn chỉ dành môi trường kiểm thử, bị chặn ở production.                                | Giữ Sandbox trong React, bắt lỗi JSON và hiện modal cam còn CSS; không chuyển sang trang HTML lỗi.                                                                                                    |
| TC_FR08_02 | BookingStatus trước đây thiếu FAILED; thêm FAILED và failure_reason bằng migration additive. Không suy diễn/relabel đơn CANCELLED lịch sử.                                      | Trước đây callback FAILED giải phóng đơn dưới tên CANCELLED. Nay ghi FAILED/PAYMENT_DECLINED; thanh toán, đơn, ghế, outbox vẫn trong transaction cũ. Gọi hủy sau FAILED trả lại trạng thái cuối, không ghi đè. | Modal đỏ “Thanh toán không thành công”; lịch sử khách và bảng quản trị phân biệt thất bại với hủy. Thử lại phải tạo phiên giữ mới.                                                                    |
| TC_FR08_03 | Lưu CANCELLED/CUSTOMER_ABORTED cho hành vi hủy còn hạn; timeout vẫn EXPIRED.                                                                                                    | Giải phóng ghế, không tạo QR. Replay không thay đổi kết quả; không giải phóng SOLD.                                                                                                                            | Giữ “Giao dịch đã được hủy bỏ”, có quay về/chọn lại ghế. Sandbox chỉ mô phỏng, không khẳng định trạng thái tài khoản ngân hàng thật.                                                                  |
| TC_FR12_01 | Bảng combos **đã tồn tại**, không tạo lại. Thiếu metadata gợi ý/khẩu vị: bổ sung 5 cột, constraint enum/range và 4 combo theo đặc tả. Migration ảnh dùng ảnh chụp local có sẵn. | Serialize Decimal giá; DTO kiểm tra tag, badge, min/max và null. Giá/khả dụng luôn kiểm tra ở server; gợi ý UI không can thiệp tổng đơn.                                                                       | Gợi ý Solo/Couple/Party theo ghế và khoảng áp dụng, Party 69K ưu tiên nhóm; chip lọc tại client. Menu không chứa món đã ẩn.                                                                           |
| TC_FR12_02 | Metadata được lưu PostgreSQL, is_active là trạng thái bán; ẩn không xóa lịch sử combo của đơn.                                                                                  | Bổ sung alias REST ADMIN, danh sách quản trị gồm cả món ẩn, danh sách công khai chỉ active. Toggle là UPDATE nguyên tử và làm mất hiệu lực cache catalogue.                                                    | /admin/combos mở tab combo; modal thêm/sửa, giá/khẩu vị/nhóm người, nút ẩn/hiện. Trong vòng kiểm thử phát hiện và sửa nút toggle gửi nhầm POST thay vì PATCH; đặt giá trị mặc định cho form thêm mới. |

Không coi các giả thuyết FK/CSS trong prompt là lỗi đã tái hiện ở HEAD: hai ca đầu đã có bản vá trong commit trước và được kiểm thử hồi quy ở lượt này.

## Tệp chính

- DB: `backend/prisma/schema.prisma`, migrations `20261107000200_failed_combos`, `20261107000300_combo_photographs`.
- Trạng thái đơn: `backend/src/modules/bookings/{bookings.repository,seat-booking.service,bookings.service,booking.dto}.ts`, `backend/src/modules/payments/payments.service.ts`.
- Combo REST: `backend/src/modules/combos/{combo.dto,combos.controller,combos.service,combos.repository,combos.module}.ts`; invalidation tại `backend/src/modules/showtimes/programme-invalidation.interceptor.ts`.
- Adapter RAM: `backend/standalone/{runtime,admin}.cjs`, `content/combo-recommendations.json`. RAM có cùng contract trạng thái, không phải storage bền vững sau restart.
- UI: `frontend/src/components/{BookingConsole,FoodStore,QuanLyDanhMucPhimRap,QuanTriHeThong,LichSuVeKhachHang}.jsx`, `frontend/src/comboRecommendations.js`, `frontend/src/app/admin/combos/page.jsx`. CSS chỉ thêm alias badge FAILED vào màu đỏ hiện có.
- Kiểm chứng: `backend/test/payments.e2e-spec.ts`, `tests/{booking,cinema-status}.spec.mjs`, `scripts/{memory-contract.test.cjs,combo-recommendations.test.mjs,check-fullstack-startup.cjs,measure-combo-queries.cjs}`.

## Contract và cập nhật menu

Prefix thực của dự án là `/api/v1` (BFF cùng origin), không thay thành `/api` làm gãy client cũ:

- Public GET `/api/v1/combos` chỉ active.
- ADMIN GET/POST `/api/v1/admin/combos`.
- ADMIN PUT `/api/v1/admin/combos/:id`.
- ADMIN PATCH `/api/v1/admin/combos/:id/toggle-status`.
- POST `/api/v1/combos` và PATCH `/api/v1/combos/:id` cũ vẫn giữ RBAC và validation.

Admin cùng phiên gọi reload sau mutation. Phiên khách khác đồng bộ danh sách combo mỗi 5 giây và khi focus, bỏ poll lúc tab ẩn, chống request chồng và cleanup khi unmount. Đây **không phải push tức thời/0ms qua mạng**. Checkout và trang bắp nước loại món ẩn khỏi giỏ chưa giữ; đơn đang HOLDING/PENDING/PAID giữ snapshot và giá server. Khi mạng lỗi, giữ menu đã tải; giữ ghế vẫn kiểm tra khả dụng tại backend. Các combo cũ được mặc định MIX/PARTY để tương thích; admin có thể khai báo lại metadata chính xác. Bốn combo mới có đầy đủ tag/range theo đặc tả.

## Ma trận kiểm thử

| Mã         | Kết quả | Bằng chứng được assert                                                                                                                                                                                                                     |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC_FR07_05 | PASS    | ADMIN khóa/mở, CUSTOMER bị403, HOLDING được trả, PAID/SOLD giữ nguyên, hold/payment bị409, modal đỏ có CSS.                                                                                                                                |
| TC_FR08_04 | PASS    | Ép hạn bằng capability test có chữ ký, JSON409, EXPIRED/AVAILABLE, không có QR, modal cam và không pageerror.                                                                                                                              |
| TC_FR08_02 | PASS    | FAILED/PAYMENT_DECLINED, trả ghế, không QR, callback replay/hủy sau FAILED không ghi đè; modal và lịch sử hiển thị thất bại.                                                                                                               |
| TC_FR08_03 | PASS    | CANCELLED/CUSTOMER_ABORTED, trả ghế, không QR; modal/lịch sử hiển thị hủy, chọn lại cùng ghế.                                                                                                                                              |
| TC_FR12_01 | PASS    | Đổi 1→2→3 ghế đổi badge, Party69 đứng đầu, chip phô mai lọc client, trở về tất cả.                                                                                                                                                         |
| TC_FR12_02 | PASS    | Modal thêm/sửa giá và metadata, ẩn/hiện vẫn còn trong admin list; CUSTOMER403; REST alias create/PUT/toggle; range sai/null tag400, max null hợp lệ; phiên khách khác cập nhật checkout/trang bắp nước và loại combo ẩn khỏi giỏ chưa giữ. |

Các lệnh cuối và phạm vi:

| Nhóm             | Kết quả                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Backend check    | Typecheck, typed lint, build PASS; 116 unit +254 HTTP/integration PASS (PostgreSQL/Redis native). |
| Schema           | 26 PostgreSQL tests PASS; hai migration mới deploy được trên DB test.                             |
| Node/RAM/helpers | 112 tests PASS.                                                                                   |
| Browser chọn lọc | 13/13 PASS, một worker, 4.2 phút; không phải toàn bộ Playwright suite của repo.                   |
| Startup fallback | PASS trên bản sao dùng RAM tạm: 28 món, BFF HttpOnly, giữ ghế, signed Sandbox, SVG QR.            |
| Frontend         | Production build và lint PASS.                                                                    |

Browser hồi quy còn kiểm tra 375/768/1440px, dialog Escape giữ nguyên hold, request thanh toán lỗi không tự suy ra PAID, seat conflict409, QR riêng cho 2 ghế, public lookup, ICS và check-in độc lập. Golden path dùng thời hạn chờ điều hướng 15s để bao phủ cold navigation/API tối đa8s; không tăng timeout8s của API. SMTP fixture chỉ chạy loopback; không gửi email người dùng thật.

## Hiệu năng đo được và giới hạn

`scripts/measure-combo-queries.cjs` chạy EXPLAIN ANALYZE read-only trên PostgreSQL test, 15 mẫu/query, 6 combo ở lần đo đầu:

| Truy vấn mẫu                     | SQL execution p50 (ms) | SQL execution p95 (ms) |
| -------------------------------- | ---------------------: | ---------------------: |
| active, sort name/id, limit25    |                  0.017 |                  0.067 |
| admin all, sort name/id, limit25 |                  0.015 |                  0.018 |

Đây là SELECT mẫu với một phần cột, dữ liệu nhỏ và cache ấm. Không bao gồm planning, COUNT, transaction, lock wait, pool, mạng hoặc BFF/HTTP. Chỉ hai phép đo này dưới30ms; **chưa chứng minh toàn bộ truy vấn/API đạt <30ms ở tải thực tế**. Không bỏ khóa, HMAC, Decimal hoặc validation để đạt số đo đẹp. Số đo HTTP trước được lưu riêng tại `showtime-lock-expiry-2026-11-07.md` và vẫn chưa đạt budget toàn hệ thống.

## Chạy lại native

Cài bằng lockfile ở root; chuẩn bị PostgreSQL/Redis test riêng theo `backend/README.md`. Không dùng dữ liệu production để chạy bộ fixture.

```bash
npm ci
npm run db:migrate --workspace backend
npm run prisma:generate --workspace backend
npm run db:migrate:test --workspace backend
npm run test:backend
npm run test:db
npm run test:unit
npm run build
npx playwright test tests/cinema-status.spec.mjs tests/booking.spec.mjs --grep 'TC_FR|two-column|Sandbox|failed completion|actual expired|a real API 409'
node scripts/check-fullstack-startup.cjs
node scripts/measure-combo-queries.cjs
```

Migrations chỉ thêm trạng thái/cột/ràng buộc/seed; ảnh chỉ cập nhật seed mới khi image_url còn NULL. Nếu chạy chung launcher `npm run dev` hoặc `npm run dev:full`, luồng chuẩn bị native hiện có vẫn được giữ. Không sửa migration đã triển khai và không tự sửa nghĩa các đơn cũ. Không đánh dấu Phase11–12 hoàn tất từ đợt vá này.
