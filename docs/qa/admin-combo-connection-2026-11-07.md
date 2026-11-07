# Chẩn đoán Admin/Combo — 07/11/2026

Baseline: f4f8adf. Audit thực hiện trước khi sửa; không dùng Docker hoặc thêm driver DB.

## Bốn điểm kiến trúc đã đối chiếu

1. UI chính ở `frontend/src`. Next App Router BFF tại `frontend/src/app/api/v1/[...path]/route.js` chuyển cùng origin tới NestJS. Phim, suất, combo đều qua `/api/v1`; controller combo cùng `backend/src/modules/combos`, không tạo API hay database song song trong Next.
2. PostgreSQL/Prisma dùng `PrismaService` qua UnitOfWork/repository hiện hữu. Local fallback là `backend/standalone/runtime.cjs`, được launcher `npm run dev` chọn và thông báo. Kiểm tra cả hai chế độ, không dùng HTTP PostgreSQL thay cho kiểm chứng RAM.
3. `BookingConsole.jsx` đã hiển thị combo trước khi gọi hold để server snapshot giá. Bổ sung tiêu đề và nút **Tiếp tục: Chọn bắp nước →** đưa vào khối chọn combo; nút này không tạo đơn hoặc mở thanh toán. Sau khi chọn combo mới giữ ghế/tạo đơn rồi review/Sandbox. Gợi ý theo 1/2/≥3 ghế giữ nguyên.
4. Admin: `QuanTriHeThong.jsx` chứa top tabs; `QuanLyDanhMucPhimRap.jsx` chứa thanh danh mục Phim/Rạp/Phòng/Suất. Nay **🍿 Quản lý Party Combo** xuất hiện ngay trong thanh danh mục này, cạnh các mục đang dùng; top tab cũ vẫn giữ.

## Lỗi tái hiện và sửa

| Lỗi                                               | Bằng chứng / cách sửa                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đổi trạng thái phim RAM trả “Dữ liệu chưa hợp lệ” | Seed phim không có description, nhưng bộ kiểm tra PATCH kiểm tra cả record và bắt buộc description. `createDemoData()` nay cung cấp nội dung cho mẫu. Bộ kiểm tra trả fieldErrors tiếng Việt cho tên/nội dung/thời lượng/tuổi/trạng thái/ngày, thay vì lỗi chung. Không bỏ validation. |
| Nút Lưu phim không gửi request                    | Poster mẫu `/images/...` bị HTML input type=url chặn trước submit. Riêng ô poster dùng text để giữ đường dẫn ảnh local hiện hữu; PATCH chỉ gửi trường đã đổi, nên đổi trạng thái không gửi lại ảnh/ngày cũ. URL mới gửi xuống PostgreSQL vẫn phải qua DTO backend.                     |
| Admin thêm xong không thấy combo mới              | Alias GET Admin RAM chưa sắp xếp trước phân trang; món mới bị đẩy sau trang25. Nay sort tên/id trước chia trang như PostgreSQL.                                                                                                                                                        |
| Thiếu thao tác xóa                                | Thêm DELETE `/api/v1/admin/combos/:id`, chỉ ADMIN, và nút Xóa combo. Có lịch sử đặt combo thì FK/references chặn409, dùng Ẩn thay vì xóa để bảo toàn đơn/vé.                                                                                                                           |
| Combo mất khi restart RAM                         | Store file dùng ghi file tạm, fsync rồi rename. Lưu trước khi báo thành công; lỗi ghi trả503 và rollback trạng thái RAM. Đọc toàn bộ snapshot nên không tái sinh món đã xóa từ seed. Node tests đóng server, mở lại, kiểm tra ẩn/xóa còn nguyên.                                       |

## Lưu trữ và contract

- PostgreSQL vẫn là nguồn thật cho booking, giá và quyền. Không tự CREATE TABLE trong request; migration additive `20261107000700_salty_party_combo` thêm Party Combo Mặn Đặc Biệt119.000đ, 3–20 vé, giữ mọi combo cũ. IDs vẫn UUID hợp lệ của schema, không đổi sang CB_* làm gãy FK.
- RAM local lưu combo tại `.runtime/combos.json`, có thể đặt `NOVA_COMBO_STORE_PATH` trong backend/.env. Dùng một tiến trình cho mỗi file; không dùng file này thay PostgreSQL cho triển khai nhiều worker. File lỗi không bị lặng lẽ ghi đè/reset. Dữ liệu khác trong RAM vẫn mang tính tạm thời.
- Không thực hiện ghi SQL thất bại rồi giả báo200 bằng một bản file riêng: như vậy giá/cấu hình UI sẽ lệch nguồn dùng tính tiền. Lỗi quyền403, payload400, có lịch sử409, lưu file503 vẫn giữ đúng trạng thái. Không thể cam kết200 khi cả DB/ổ đĩa lỗi hoặc khi Admin đã ẩn hết món.
- GET combo có `Cache-Control: no-store`. Thêm top-level `combos` cho cả Nest và RAM; giữ nguyên `data.items` và `data.meta` để client hiện có không gãy: `{success:true, combos:[...], data:{items:[...],meta:{...}},message}`. Không đổi data thành array rồi phá apiList của web.
- Cập nhật client vẫn dùng request thật, notification giữa tab/focus và poll5 giây của phiên độc lập. Backend xác nhận giá/khả dụng; đơn đã giữ/đã trả giữ snapshot hiện hữu.

## Tệp chính

- `backend/standalone-server.cjs`, `standalone/admin.cjs`, `standalone/runtime.cjs`, `standalone/combo-file-store.cjs`, `backend/.env.example`.
- `backend/src/modules/combos/{combos.controller,combos.service,combos.repository}.ts`, `backend/src/common/interceptors/response.interceptor.ts`, migration mới và `content/combo-recommendations.json`.
- `frontend/src/components/{QuanLyDanhMucPhimRap,BookingConsole}.jsx`.
- Kiểm chứng: `scripts/admin-seed-storage.test.mjs`, `scripts/check-fullstack-startup.cjs`, `backend/test/catalog.e2e-spec.ts` và browser suite FR12 hiện có.

## Chạy và thao tác

Cập nhật main rồi dùng `npm run dev:full` từ root. Nếu chạy backend PostgreSQL riêng, chạy `npm run db:migrate --workspace backend` trước.

- Admin → **Rạp, Phim & Suất Chiếu** → **🍿 Quản lý Party Combo** → Thêm mới Combo. Điền tên, thành phần, mô tả, giá, khẩu vị/nhóm; lưu, sửa, ẩn/hiện hoặc xóa món chưa có lịch sử.
- Admin → Phim → Sửa phim mẫu → đổi trạng thái → Lưu phim. Poster local không chặn submit. Dữ liệu sai được chỉ rõ trường.
- Khách chọn1/2/4 ghế → **Tiếp tục: Chọn bắp nước →** → xem gợi ý/lọc khẩu vị/chọn số lượng → giữ ghế → review/thanh toán. Mẫu Party69K và Mặn119K dùng ảnh local có sẵn.

## Kết quả kiểm chứng

- NestJS/PostgreSQL/Redis native: typecheck, typed lint, build PASS; **117 unit + 259 HTTP/integration PASS**. Có test DELETE ADMIN, khách403 và root combos khớp data.items.
- Node/RAM: **120 PASS**, gồm phim seed thật đổi trạng thái, combo còn sau restart, ẩn/xóa không tái sinh, lỗi ghi503 và rollback dữ liệu cũ.
- Browser PostgreSQL/Next production: **6/6 PASS** cho tạo/sửa/xóa phim, CRUD/ẩn hiện combo, giá và thành phần cập nhật sang phiên khách khác, gợi ý1/2/4 vé, review và golden path QR từng ghế/ICS/check-in.
- Browser RAM qua launcher thật/BFF: **PASS** sửa phim mẫu với poster local, thêm/ẩn/xóa combo từ menu danh mục,29 món công khai và giữ ghế/thanh toán/QR. Chạy trên bản sao tạm; không ghi vào kho người dùng.
- Frontend production build và lint PASS; migration mới deploy thành công lên DB test. Lượt browser chạy lại sau khi dừng vòng dùng build đang được ghi lại; kết quả6/6 là trên build ổn định.

Chạy lại: `npm run test:unit`, `npm run test:backend`, `npm run lint`, `npm run build:frontend`; sau đó `npx playwright test tests/cinema-status.spec.mjs tests/booking.spec.mjs --grep 'TC_FR12|ADMIN creates, edits|Sandbox success|two-column'` và `node scripts/check-fullstack-startup.cjs`. Cấu hình DB/Redis test riêng theo backend/README, chạy tuần tự các bộ dùng chung outbox. Không chuyển trạng thái Phase11–12.
