# Phase 4 validation evidence

Ngày kiểm tra: **15/10/2026**, giờ Việt Nam. Backend tiếp tục dùng Node.js24.19.0, NestJS11, Prisma6.19, PostgreSQL17.11 và Redis7.4. Schema/migration14 models, lockfile và dependencies được giữ nguyên. Phạm vi Phase4: Movie/Cinema/Room/Seat catalog CRUD, filters và pagination.

| Check                          | Result                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `npm run typecheck`            | Strict TypeScript pass                                     |
| `npm run lint`                 | Typed ESLint pass, zero warnings                           |
| `npm test`                     | 27 unit tests passed                                       |
| `npm run test:e2e`             | 52 HTTP e2e passed: 22 catalog +19 auth +11 infrastructure |
| `npm run test:db`              | 22 PostgreSQL constraints/seed tests passed                |
| `npm run build`                | Production Nest build passed                               |
| Compiled production HTTP smoke | Passed                                                     |

Tổng cộng **101 tests pass**. `npm run check` thực hiện typecheck/lint/unit/HTTP/build; database regression chạy riêng bằng `test:db`.

## Catalog acceptance

- Tất cả13 write operations được thử anonymous401, CUSTOMER403 và STAFF403. ADMIN thực hiện đầy đủ CRUD; public GET không yêu cầu token. Swagger phân biệt security của read/write và có đầy đủ22 operations/catalog DTOs/pagination schemas.
- Movie lifecycle create/read/PATCH/delete, UTC releaseDate normalization, nullable media links, default COMING_SOON. Invalid UUID/filter/pagination/enum/date/URL/duration/null/mass-assignment trả400; resource hợp lệ về ID nhưng không tồn tại trả404. Filter kết hợp status/age/keyword, pages không trùng IDs và total/meta đúng.
- Cinema CRUD, trim address, case-insensitive city/keyword filters. Rooms list theo cinema/generic filters, move/format update khi chưa tham chiếu, parent thiếu404. Concurrent duplicate room names trong một cinema: một201, hai409; cùng tên ở cinema khác được phép.
- Matrix3rows ×4columns tạo12ghế, IDs unique, STANDARD/VIP/SWEETBOX và multiplier strings1.00/1.20/1.50 đúng. Generate lại409 giữ nguyên IDs. Invalid/overlapping/out-of-scope/duplicate row labels, null arrays, columns sai hoặc client priceModifier đều400; DB không có partial seats/count.
- Manual seat CRUD, row normalization, unique coordinates, type→modifier update, physical seat filter/pagination và room.totalSeats derived. Client totalSeats/priceModifier bị chặn. Không trả status/availability giả cho physical seat.
- **Hai generate requests đồng thời: đúng một201, một409; DB12seats và room.totalSeats12.**
- **Tám seat additions đồng thời rồi tám deletions đồng thời: tất cả thành công, tổng từ8 về0 đúng actual count.** Bốn inserts trùng tọa độ: một201, ba409, tổng1.
- Failure injection duy nhất tại counter persistence sau INSERT seats: HTTP500 che private diagnostic, transaction rollback cả seats và room count; retry generate thành công. Không mock database/locks trong các concurrency tests.
- Movie có showtime: thay duration409, cùng duration/sửa metadata/status được phép; delete409 và endTime lịch cũ giữ nguyên. Room có showtime: venue/format/layout mutations409, rename được; cinema/room deletes không cascade referenced data.
- **Một showtime insert transaction giữ FK locks chưa commit; HTTP duration và seat mutation phải chờ. Sau commit, cả hai409; duration/layout giữ nguyên.** Kiểm tra này chứng minh catalog check đọc lại references sau row lock, không chỉ precheck ngoài transaction.
- Empty unreferenced seats/room/cinema được xóa qua API theo thứ tự explicit; room còn seats409, cinema còn rooms409. FK RESTRICT và unique indexes giữ vai trò ràng buộc cuối cùng.

## Compiled production smoke

Chạy `dist/main.js` trên một cổng localhost trống được cấp tự động, PostgreSQL/Redis test riêng, JWT secrets random và ADMIN fixture riêng. Health/login, ADMIN create movie/cinema/room, generate6seats, public seat list với Decimal modifier, protected room deletion409, xóa children và parents đúng thứ tự, movie PATCH/delete và OpenAPI đều pass. Script dừng đúng child process bằng SIGTERM, xóa owned user/session/catalog/Redis keys và không đụng listener có sẵn.

HTTP suites dùng dedicated test DB/Redis và BullMQ prefixes random. Cleanup chỉ fixtures có prefix của suite; không truncate hoặc sửa demo accounts/dev data. Các showtime fixtures trong catalog tests là dữ liệu trực tiếp dùng để thử FK/reference protection, không phải showtime API đã được triển khai.

## Reproduce

Từ `backend/`, setup dependencies/local services theo README rồi chạy:

```bash
npm run infra:up:test
npm run db:migrate:test
npm run check
npm run test:db
```

## Scope

Không có schema/dependency/env mới, không implement showtime CRUD/BR03/TC-02, availability theo showtime, giữ ghế, payment hoặc tickets ở Phase4. GET catalog là lựa chọn public đọc dữ liệu không có thông tin user/booking; writes ADMIN-only. Layout/room structure bị khóa ngay khi có bất kỳ showtime nào, kể cả quá khứ. Movie DELETE không áp dụng cho bản đang tham chiếu; PATCH status ENDED là lựa chọn ngừng quảng bá. Fresh Prisma engine download limitation từ Phase2 vẫn ghi trong README; không bypass TLS/checksum.
