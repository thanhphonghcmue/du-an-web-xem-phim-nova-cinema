# Phase10 validation evidence

Ngày15/10/2026. Node24.19.0/Nest11/Prisma6.19/PostgreSQL17.11/Redis7.4. Scope: ADMIN revenue report cho PAID booking snapshots, inclusive Vietnam creation dates và cinema/movie filters. Không schema/migration/index/dependency/env mới; frontend vẫn độc lập.

| Check                            | Result                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`              | Strict TypeScript pass                                                                                                              |
| `npm run lint`                   | Typed ESLint pass, zero warnings                                                                                                    |
| `npm test`                       | 66 unit tests, gồm5 Phase10 range/Decimal/count cases                                                                               |
| `npm run test:e2e`               | 192 HTTP/Socket.IO tests:19 report +27 ticket/SMTP +28 payment +29 booking +16 realtime +21 showtime +22 catalog +19 auth +11 infra |
| `npm run test:db`                | 22 real PostgreSQL constraint/regression tests                                                                                      |
| `npm run build`                  | Production Nest build pass                                                                                                          |
| `node scripts/smoke-booking.cjs` | Compiled NODE_ENV=production full workflow + ADMIN filtered revenue pass; owned cleanup pass                                        |

**280 automated tests pass**, không skip/disable. Stateful suites và smoke chạy nối tiếp với test PostgreSQL/Redis riêng; HTTP/Socket.IO listeners dùng free persistent ports. Full check chạy lại sau khi sửa validation biên năm; typecheck/lint/tests/build cuối đều pass. Ban đầu fixture email chưa lowercase bị CHECK reject; đã sửa fixture và cleanup theo owned user IDs (empty list an toàn), không đổi DB constraint.

## Hợp đồng được kiểm chứng

GET `/api/v1/admin/reports/revenue?from=2026-10-01&to=2026-10-31` cần ADMIN Bearer token. from/to bắt buộc, strict real YYYY-MM-DD, inclusive ngày Việt Nam UTC+07 trên **Booking.createdAt**; optional cinemaId/movieId UUID kết hợp AND. Đặc tả không nêu date basis: lựa chọn ngày tạo và giới hạn cohort được ghi trong ADR/README/Swagger. Không suy ra thời điểm thu tiền từ Payment.createdAt hoặc ngày chiếu. Chỉ trạng thái PAID tại lúc query được tính.

Response data đúng6 fields: ticketRevenue/comboRevenue/discountAmount/netRevenue là SUM snapshots chuỗi fixed2 VND; paidBookingCount là số bookings, ticketCount là số SOLD BookingSeat rows thuộc cohort. Mỗi QR có thể đại diện nhiều ghế; ticketCount không phụ thuộc QR/email worker. Cả hai counts được kiểm tra safe JSON integer. Không trả PII/QR/transaction fields, no-store; database failure masked500 không lộ diagnostic.

## 19 integration cases và5 unit cases

- Empty cohort trả đúng6 tổng0; current DB role bắt buộc, anonymous401/CUSTOMER403/STAFF403, demote ADMIN vẫn dùng token cũ bị403.
- PAID được tính; PENDING/HOLDING/CANCELLED/EXPIRED không cộng tiền hoặc ghế. Unknown valid UUID và empty cinema/movie pair trả0; independent filters và AND, uppercase UUID hoạt động.
- Missing dates, sai format, date-time string, ngày không tồn tại/leap sai, năm0000, newline, reversed range, invalid UUID, repeated filters và field lạ bị400. Một ngày, năm0001/9999 và leap day hợp lệ200. ISO string parsing/round-trip calendar validation tránh lỗi numeric Date constructor diễn giải năm1–99 thành1901–1999.
- Biên Vietnam start−1ms bị loại; start và final-day16:59:59.999Z được tính; next-day17:00Z bị loại. Qua năm và leap day inclusive đúng. Payment/showtime thuộc kỳ khác không đổi creation-date cohort.
- Hai SOLD ghế, hai combo lines, nhiều payment attempts và AVAILABLE history không nhân monetary SUM hoặc ticketCount. Chưa có ETicket vẫn tính2SOLD. Thay base/combo price, line amounts hoặc membership hiện tại không tính lại booking snapshots.
- Fractional amounts cộng chính xác0.30+0.30−0.03=0.57.10.000 booking snapshots mỗi row999999999999.99 trả **9999999999999900.00** nguyên vẹn, vượt Number.MAX_SAFE_INTEGER; count10000. Đây là aggregation fixtures trực tiếp DB, không giả lập10.000 completed payment workflows.
- Writer transaction chuyển PAID/SOLD nhưng chưa commit: report vẫn0; sau commit report đúng1/2. Rollback không tăng doanh thu. Một SQL statement dùng cùng MVCC snapshot cho cả money vàcounts.
- Swagger có đủ4 query params (from/to required), Bearer/403 và đúng6 response fields; monetary fields khai báo string.
- Unit kiểm tra UTC+07 leap/year boundaries, reversed range, large fractional fixed2 strings và reject unsafe/negative/fractional/NaN count.

## SQL và index evidence

Repository dùng Prisma.sql parameterized, matching_bookings materialized CTE chọn PAID+created_at và optional cinema/movie. Money SUM không join seat/combo/payment 1:N; scalar subquery đếm SOLD trên cùng cohort. Không dùng JS để tải rồi cộng toàn bộ rows.

Catalog có `bookings_status_created_at_showtime_id_idx(status,created_at,showtime_id)` và `booking_seats_booking_id_idx`; parent joins có FK indexes. Test chạy EXPLAIN FORMAT JSON đúng truy vấn đã parameterize trong transaction với **SET LOCAL enable_seqscan=off**, xác nhận booking composite index và seat index path đủ điều kiện sử dụng. Setting kết thúc cùng transaction, không sửa global/session configuration của application.

Forced EXPLAIN là bằng chứng eligibility; không chứng minh tự nhiên planner luôn chọn index hoặc đạt SLA production. Fixture10.000 rows dùng kiểm tra exact aggregate, không coi là load benchmark. Deployment lớn cần đo EXPLAIN ANALYZE/cardinality/selectivity để quyết định index bổ sung; hiện giữ index đã có thay vì thêm trùng.

## Production smoke

Chạy actual `dist/main.js` với NODE_ENV=production, test PG/Redis, free HTTP/SMTP ports và ephemeral signing keys. Giữ/release/expiry qua actual worker, HMAC Sandbox success/fail/duplicate, seat_sold/QR issuance/SMTP MIME+PNG+ICS/owner APIs và concurrent STAFF check-in vẫn pass.

Thêm ADMIN user với actual Argon2 login; từ PAID booking lấy ngày Việt Nam và lọc đúng cinema/movie. Anonymous401, CUSTOMER403, STAFF403; ADMIN200 với bốn totals bằng đúng booking snapshots, paidBookingCount1, ticketCount2. Các cancelled/expired holds cùng fixture không tăng report. Swagger bản build có Bearer report route; root báo phase10. SMTP acceptance không được diễn giải thành external inbox delivery.

Cleanup đóng đúng owned child/socket/SMTP server và xóa owned PG fixtures/Redis namespace; không truncate, không sửa dev/demo data hoặc stop services khác. Frontend build/test không chạy lại vì không thay frontend.

## Reproduce

```bash
cd backend
npm ci
npm run infra:up:test
npm run mail:up
npm run check
npm run test:db
node scripts/smoke-booking.cjs
```

Fresh setup cần db:configure/infra:configure/auth:configure/payment:configure/generate/migrate/seed theo README. Nâng cấp Phase9 không có migration mới. Existing Prisma engines hoạt động; fresh checksum download limitation vẫn được ghi ở README, không bypass TLS/checksum. Dừng Phase10; Phase11–12 và frontend API wiring chưa triển khai.
