# Tối ưu catalogue và phát hành QR — 29/10/2026

Baseline: `b4d153c`, nhánh `feat/nova-discovery-ui`. Chạy PostgreSQL/Redis native; không dùng Docker. Giữ endpoint, payload và cấu trúc vé hiện hữu; không giảm phim, ngày, phòng hoặc suất để đạt chỉ số.

## Thay đổi thực tế

| Điểm nghẽn                                                | Bản sửa                                                                                                                                                                                                                      | Kiểm chứng                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Lịch đầy đủ hơn 2 MB được query/serialize/nén lại mỗi lần | Snapshot Redis dùng chung giữa các Nest instances; reuse 30 giây, giữ bản bất biến 120 giây. Ghi Admin thành công làm mới revision; không cache trạng thái ghế hoặc đơn hàng.                                                | Native test qua hai backend; sửa phim đổi snapshot; hold/cancel vẫn cập nhật ghế ngay.                             |
| Một response lịch quá lớn                                 | Endpoint manifest và chunk mới, mã hóa theo cột và từ điển chuỗi. Mỗi **response JSON thực tế**, gồm envelope, dưới 15 KiB. Frontend ghép lại đầy đủ mọi bản ghi/field/UUID; bốn request đồng thời và deadline chung 8 giây. | Đối chiếu cả năm collection với API cũ; 12.000 suất độc lập; chuỗi Unicode dài; thiếu/trộn/trùng chunk bị từ chối. |
| F5 tải lại những chunk không đổi                          | Chỉ chunk bất biến được cache trong trình duyệt, tối đa thời gian còn lại của snapshot và không quá 120 giây. Manifest, ghế, capacity, tài khoản và thanh toán vẫn `no-store`.                                               | Kiểm tra Resource Timing sau F5 và unit test phạm vi cache/TTL.                                                    |
| BFF nén lại cùng JSON nhiều lần                           | Dùng lại Brotli/gzip của **đúng byte vừa nhận từ upstream**; tối đa 64 entry/8 MiB/60 giây. Không bỏ qua upstream, xác thực hoặc rate limit.                                                                                 | So sánh giải nén byte-for-byte, coalesce, giới hạn bộ nhớ, eviction và lỗi nén.                                    |
| QR dùng raster RGBA tốn CPU                               | Giữ `qrcode` để mã hóa dữ liệu, dựng PNG grayscale 1-bit bằng zlib native. Vẫn 320 px, mức M, quiet zone 4.                                                                                                                  | CRC PNG, giải mã ảnh thực bằng jsQR; benchmark 40 cặp cùng input.                                                  |
| Sau thanh toán phải chờ poll 1 giây                       | Đánh thức fulfillment ngay **sau transaction commit**, không chờ SMTP. Outbox và poll phục hồi vẫn giữ nguyên.                                                                                                               | Test native trì hoãn poll đến 60 giây vẫn phát hành vé; callback lặp chỉ có một QR/email event.                    |
| Sinh vé tải lại quan hệ booking nhiều lần                 | Đọc một snapshot PAID/SOLD dưới khóa booking, tái dùng cùng quan hệ khi tạo hoặc trả vé cũ.                                                                                                                                  | Bộ kiểm thử payment/ticket/owner/check-in/rollback hiện hữu.                                                       |

## Kết quả thực thi

**547/547 bài độc lập đạt**: 112 backend unit + 248 native HTTP/Socket.IO + 23 DB schema + 73 Node/RAM/config/codec + 91 browser production. Có 44 bài mới so với baseline. Typecheck/lint/build, startup RAM và upstream failure/timeout smoke đều đạt; không cộng benchmark hoặc các lần chạy lại vào tổng.

[Summary pipeline](measurements/optimization-native-summary.json) · [Số ca/lịch sử](measurements/optimization-validation.json). Hai lượt đầu bắt lỗi fixture email/teardown và thiếu file trong workspace smoke; đã sửa và chạy lại toàn bộ. Lượt 543 ca đạt trước tối ưu Brotli được giữ riêng: [summary](measurements/optimization-pre-brotli-summary.json) và [số đo](measurements/optimization-pre-brotli-performance.json). Không bỏ assertion/skip test để có kết quả cuối.

### Giao thức lịch mới trên trình duyệt production

Dataset có 32 phim, 8 rạp, 105 phòng và 6422 suất thật, được ghép đầy đủ từ 46 chunk. Đối chiếu chính xác từng field của cả năm collection với API legacy, gồm giá, UUID và timestamp.

| Phép đo                                                 |    Kết quả | Ngưỡng                                       |
| ------------------------------------------------------- | ---------: | -------------------------------------------- |
| Manifest sau sửa Admin, lần tạo snapshot đầu            |  199.60 ms | <30 ms: chưa đạt                             |
| Manifest cache nóng, p95 / 10 mẫu                       |    8.10 ms | <30 ms: đạt                                  |
| Lượt tải chunk đầu, p95                                 |   19.70 ms | <30 ms: đạt                                  |
| Chunk cache nóng qua mạng, p95 / 10 mẫu                 |   12.70 ms | <30 ms: đạt                                  |
| Response chunk JSON lớn nhất, sau giải Content-Encoding | 14810 byte | <15.360 byte: đạt                            |
| Tải hết chunk (có Playwright orchestration)             |  587.40 ms | Không gọi đây là latency một request         |
| Chunk dùng lại HTTP cache sau F5                        |      46/46 | transferSize=0, không phải roundtrip backend |

Tổng body nén của manifest+chunks là 295.611 byte (Resource Timing encodedBodySize, chưa tính headers); tổng HTTP JSON sau giải Content-Encoding là 635.305 byte. Catalogue đầy đủ sau ghép là 2.144.929 byte. Mỗi response nhỏ không có nghĩa tổng catalogue dưới 15 KiB. [Toàn bộ mẫu và encoding thực tế](measurements/optimization-structured-performance.json).

### Luồng vé và ảnh QR

Với SMTP 451 thật, native checkout+webhook hoàn tất ở **31.06 ms**; cộng bước gọi TicketsService sau commit, QR sẵn sàng ở **38.90 ms**, n=1. Riêng TicketsService 7.70 ms, gồm PNG 1.41 ms. Mục tiêu service path 50 ms: **đạt ở mẫu này**. PAID/QR vẫn đúng khi email lỗi và retry bền; test tắt poll đến 60 s vẫn phát hành qua signal, không tạo thêm vé khi callback lặp. Baseline cùng ranh giới service từng là 669,10 ms; đây là hai lượt n=1, không phải p95.

Hành trình browser n=1: từ click Sandbox đến QR inline 2266.73 ms; từ click quay lại ứng dụng đến QR inline 1859.03 ms; đến QR trong ví sau thao tác mở tài khoản 2493.60 ms. Có điều hướng/automation; không suy diễn thành QR web dưới 50 ms. [Service](measurements/optimization-smtp-performance.json) · [Browser](measurements/optimization-journey-performance.json).

Benchmark PNG 40 cặp cùng input, thứ tự hai encoder luân phiên và giữ mẫu đầu: p95 **19.47 → 2.03 ms**, PNG trung bình **2625 → 839 byte**. Đây là encoding trên Node, không gồm DB/browser. [Tất cả mẫu](measurements/optimization-png-benchmark.json).

### CPU, nén và mục tiêu legacy còn lại

Năm cặp mã hóa trên cùng dataset read-only 13469 suất: median CPU codec **203.58 → 162.35 ms**. Giữ cả cặp chậm hơn; JSON nguồn và số chunk bằng nhau. Dataset này khác fixture browser, không dùng làm số đo frontend. [Từng cặp](measurements/optimization-codec-benchmark.json) · [Phân tách SQL/hydration/codec/Redis](measurements/optimization-cold-profile.json).

Phép đo cặp cùng các response RAM thực ghi gzip và Brotli: tổng body chunk 412.574 → 362.668 byte (giảm 12,1%). Dataset RAM này khác PostgreSQL fixture; không dùng tỷ lệ đó thay cho phép đo browser. Trên PostgreSQL fixture, chia trang vẫn có tổng body nén lớn hơn API legacy nén một khối. Lợi ích đã đạt là giới hạn từng response, cache sau F5 và latency đường lịch mới; chưa gọi tổng wire là đạt một mục tiêu giảm dung lượng. Các số đo CPU/byte được lưu đầy đủ, không ghi dữ liệu phim hoặc QR. [Benchmark đầy đủ](measurements/optimization-compression-benchmark.json). Lượt trước refinement có tổng chunk gzip 307.005 byte so với legacy gzip 280.503 byte; vì vậy đã bổ sung Brotli, không gọi việc chia nhỏ tự nó làm wire nhỏ hơn.

Số đo API cũ vẫn được giữ theo cách cũ, gồm mẫu đầu và p95 nearest-rank trên 10 mẫu:

| API legacy | p50 (ms) | p95 (ms) | HTTP JSON mẫu đầu (byte) | <30ms p95 / <15KiB JSON |
| ---------- | -------: | -------: | -----------------------: | ----------------------- |
| movies     |    27.50 |   218.10 |                    22384 | Chưa đạt / Chưa đạt     |
| cinemas    |    18.40 |    38.10 |                     1932 | Chưa đạt / Đạt          |
| programme  |    58.70 |   112.00 |                  2144967 | Chưa đạt / Chưa đạt     |
| seats      |    21.40 |    74.30 |                     9045 | Chưa đạt / Đạt          |

[Toàn bộ số đo legacy](measurements/optimization-legacy-performance.json). Summary tiếp tục ghi `performanceBudgets=NOT_MET` nếu các mục legacy chưa đạt; các budget mới ghi riêng và giữ cả giá trị false. Không cam kết mọi request/cache lạnh/đường truyền WAN dưới 30 ms hoặc toàn luồng browser dưới 50 ms.

## Đọc đúng các mục tiêu hiệu năng

- **15 KiB áp dụng cho từng response của giao thức chia trang mới.** Tổng JSON catalogue sau ghép vẫn lớn hơn 15 KiB vì chứa hàng nghìn UUID và lịch thật. Báo cáo ghi riêng kích thước từng chunk, tổng truyền và JSON đầy đủ; không dùng gzip hoặc bỏ dữ liệu để gọi JSON đầy đủ đã đạt.
- Tách lần tạo snapshot sau sửa Admin, các request cache nóng, lượt tải chunk đầu tiên và HTTP cache sau F5. Không gọi cache trình duyệt là thời gian roundtrip backend.
- Thời gian thanh toán/service tạo QR không bao gồm người dùng bấm các bước Sandbox, điều hướng trang hoặc camera thiết bị. Không suy ra toàn hành trình trình duyệt dưới 50 ms từ benchmark encoder.
- Chỉ endpoint chunk **mới** dùng tám bucket tài nguyên hữu hạn mỗi IP, mỗi bucket giữ nguyên cấu hình limit/TTL. Không tạo bucket tùy ý theo snapshot UUID, không `SkipThrottle`; API cũ vẫn giữ nguyên quota. Test qua hai backend xác nhận 61 lần cùng bucket có 60 thành công/1 lần 429; handler legacy cũng vậy.
- Snapshot được làm mới ngay khi mutation qua API thành công. SQL ghi ngoài ứng dụng hoặc lỗi Redis đúng lúc invalidation có thể khiến catalogue cũ còn được dùng tối đa 30 giây. Giữ ghế, giá thanh toán, hạn đơn và check-in luôn đọc/ghi dữ liệu nghiệp vụ thật.
- Giao thức mới giới hạn source JSON 16 MiB và tối đa 4.096 chunk để giới hạn kích thước một snapshot. Nếu một catalogue hợp lệ lớn hơn giới hạn này, API cũ vẫn trả dữ liệu đầy đủ; client chỉ fallback khi nhận 404 chưa hỗ trợ hoặc mã 422 `PROGRAMME_TRANSPORT_TOO_LARGE`. Lỗi mạng/503 không tạo dữ liệu thay thế. Trường hợp fallback lớn này không đạt giới hạn response 15 KiB.
- Redis lưu các snapshot với TTL, không có cam kết một mức tổng RAM cho mọi số người dùng/lần sửa. Bộ cache Brotli/gzip dùng chung có giới hạn 8 MiB; adapter RAM giữ tối đa 16 snapshot và bỏ bản JSON source không dùng.

## Chạy kiểm chứng

Sau khi cấu hình PostgreSQL/Redis native và `TEST_DATABASE_URL` riêng trong `backend/.env`:

```powershell
npm run qa:native
```

Runner chạy các bộ ghi DB tuần tự, ghi log riêng trong `.runtime/qa-native/<run-id>/`. Giữ số đo legacy trong `performance.json`, thêm `optimization-performance.json`, tách thời gian PNG/DB trong `smtp-performance.json`. Summary giữ cả mục tiêu đạt và chưa đạt. Không đưa `.env`, token, hash vé hoặc hình QR vào evidence công khai.

[Script kiểm thử](../../scripts/qa-native.cjs) · [Báo cáo/ma trận nghiệp vụ gốc](ultra-expanded-audit.md)
