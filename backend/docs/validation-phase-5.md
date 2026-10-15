# Phase 5 validation evidence

Ngày kiểm tra: **15/10/2026**, giờ Việt Nam. Node.js24.19.0, NestJS11, Prisma6.19, PostgreSQL17.11, Redis7.4. Phạm vi:5 Showtime CRUD operations và BR03/TC-02. Schema14 models, migration, dependencies, lockfile, credentials và environment requirements không thay đổi.

| Check                                   | Result                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `npm run typecheck`                     | Strict TypeScript pass                                                   |
| `npm run lint`                          | Typed ESLint pass, zero warnings                                         |
| `npm test`                              | 27 unit tests passed                                                     |
| `npm run test:e2e`                      | 73 HTTP tests passed:21 showtime +22 catalog +19 auth +11 infrastructure |
| `npm run test:db`                       | 22 PostgreSQL constraints/seed regression tests passed                   |
| `npm run build`                         | Production Nest build passed                                             |
| `node dist/main.js` + actual HTTP smoke | Passed; dedicated test DB/Redis and free localhost port                  |

Tổng **122 automated tests pass**, không skipped/disabled. `npm run check` gồm typecheck/lint/unit/HTTP/build; `test:db` chạy riêng. Các concurrency assertions sử dụng actual API requests và PostgreSQL transactions, không mock DB/Redis hoặc thay tests bằng kiểm tra in-memory.

## BR03 và API acceptance

- Anonymous GET/list/detail200; mutations anonymous401, CUSTOMER/STAFF403. ADMIN create201, PATCH/DELETE200. Swagger mô tả5 operations, body/read schemas, pagination, Bearer cho writes và public reads.
- **TC-02:** phim120 phút, suất10:00 kết thúc12:15 với cleaning15 phút. Suất12:00 cùng room409 SHOWTIME_CONFLICT;12:15 đúng boundary201. Các overlap phía trước/trong/bao phủ/cùng mốc đều409; suất trước kết thúc đúng10:00 được phép; khác room không bị chặn.
- EndTime luôn server-derived; phim166 phút qua ngày trả đúng UTC/milliseconds. Giá999999999999.99 round-trip nguyên chuỗi;0.01 và số nguyên chuỗi được chấp nhận, trả fixed2. JSON number/zero/negative/exponent/leading zero/precision hoặc overflow sai400. Null, client endTime/ID/bookingSeats, timezone thiếu, ngày không tồn tại, năm0, timestamp precision >3 bị400; end vượt năm9999 cũng400.
- Missing movie/room/showtime404 với domain codes. Path/query UUID sai, unknown filters và pagination sai400. Failed mutations giữ nguyên lịch/giá và số rows.
- Filter movieId/cinemaId/roomId/date kết hợp, paginated totals đúng, UUID tie-breaker ổn định. Date dùng midnight Việt Nam inclusive, next midnight exclusive, không dùng ngày UTC. Không date chỉ upcoming starts; explicit historical date/detail cho phép xem lịch sử.
- PATCH exclude self, recalculate duration khi đổi movie/start, kiểm tra destination room; conflict rollback. Empty/equivalent PATCH giữ nguyên updatedAt và response. DELETE chỉ unreferenced schedule, sau xóa interval có thể được dùng lại.

## Concurrency và history

- **5 POST cùng room/cùng giờ với5 movie IDs khác nhau:1 HTTP201,4 HTTP409 SHOWTIME_CONFLICT, DB đúng1 showtime.** Kiểm tra room serialization, không chỉ movie chung.
- Concurrent adjacent POSTs và khác room đều201.
- **2 PATCH khác showtime tới cùng interval:1 HTTP200,1 HTTP409**, DB đúng1 row chiếm mốc đích.
- **2 concurrent moves của cùng showtime:** test giữ movie lock để cả2 request đã đọc snapshot cũ, quan sát2 PostgreSQL lock waits rồi release. Cả2 thành công sau reload/retry, final room thuộc một trong2 destinations, không500/deadlock hay dùng stale parents.
- Independent concurrent price/time PATCHs cùng row đều200; final row giữ cả2 thay đổi, endTime đúng.
- Giữ movie FOR UPDATE rồi start HTTP create, quan sát PostgreSQL wait, cập nhật duration120→150 trước commit. API sau đó tạo suất với duration150+15, không dùng duration đọc sớm.
- Fault injection **chỉ bỏ overlap precheck** cho1 INSERT và1 UPDATE. Actual PostgreSQL GiST constraint từ chối cả2; HTTP409 SHOWTIME_CONFLICT và không có partial write. Các concurrency tests còn lại không dùng mocks.
- Booking fixture trực tiếp trong test kiểm tra PENDING/HOLDING/PAID/CANCELLED/EXPIRED: mọi price mutation/DELETE đều409 SHOWTIME_IN_USE. No-op vẫn200, lịch giữ nguyên. Đây là history-guard test, không tuyên bố có booking API.
- Giữ booking INSERT transaction chưa commit rồi HTTP price PATCH: quan sát showtime FOR UPDATE phải chờ FK lock. Sau booking commit, PATCH đọc lại và409 SHOWTIME_IN_USE. Không sửa giá đã có reference sau precheck.

## Compiled production smoke

Chạy **built `dist/main.js`** với NODE_ENV=production, ephemeral JWT secrets, database/Redis test và BullMQ namespace riêng. Readiness thật, root phase5, login ADMIN, create schedule với maximum Decimal, conflict12:00/boundary12:15, Vietnam date/cinema/movie filtering, anonymous PATCH401, ADMIN price PATCH, DELETE/read404 và OpenAPI đều pass.

Script dừng đúng child process bằng SIGTERM, cleanup owned user/session/movie/cinema/room/showtimes và Redis namespace. Không dừng listeners có sẵn, truncate database, sửa development/demo data hoặc in credentials/tokens. Existing4 PostgreSQL/Redis containers vẫn healthy.

## Reproduce và scope

Từ `backend/`, sau setup theo README:

```bash
npm run infra:up:test
npm run db:migrate:test
npm run check
npm run test:db
npm run test:e2e -- --runTestsByPath test/showtime-conflict.e2e-spec.ts
```

GET history là public non-sensitive schedule data; điều kiện một suất còn đặt vé được sẽ do Phase6 kiểm tra. Seat layout cần được cấu hình trước schedule như Phase4. Chưa triển khai realtime seat map, giữ ghế/expiry, pricing snapshot, booking/payment/ticket APIs. TC-01/03/04/05 business acceptance chưa được đánh dấu pass. Fresh Prisma download limitation từ Phase2 vẫn ghi README; không bypass checksum/TLS. Dừng sau Phase5.
