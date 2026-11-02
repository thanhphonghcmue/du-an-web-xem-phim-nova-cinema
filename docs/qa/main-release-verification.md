# Bản chính thức trên main — 02/11/2026

Nguyên nhân tải nhầm giao diện: nhánh mặc định `main` còn ở `06a2289`, trong khi bản mới nằm ở `feat/nova-discovery-ui`. Cập nhật bằng fast-forward, giữ lịch sử và toàn bộ thay đổi của nhóm; không force-push hoặc ghi đè code. Runtime được kiểm tra là `22f2293`, đã bao gồm `38b8490` và bản sửa giới hạn lịch chiếu mới nhất.

README đặt ngay đầu trang link ZIP của `main`, Node.js24 và hai lệnh `npm install` / `npm run dev`. Entrypoint gốc chạy `frontend/` cùng `backend/`. Nhóm nên dừng server cũ và giải nén vào thư mục mới để mở đúng bản.

## Kiểm chứng trước khi cập nhật GitHub

| Phạm vi                                                                                     | Kết quả                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `qa:lab04` trên checkout main                                                               | 134 kiểm thử native PostgreSQL/Redis và4 hành trình trình duyệt đạt; generate/migrate test/lint/build hai workspace đạt |
| Bản giải nén sạch từ `git archive 22f2293`, không có `.env`, `node_modules` hoặc `.next` cũ | `npm ci` cài1012 package từ lockfile;87 kiểm thử Node/RAM đạt                                                           |
| Build frontend từ bản giải nén                                                              | Đạt                                                                                                                     |
| Smoke khởi chạy tự chuyển RAM từ bản giải nén                                               | Đạt24 món, đăng ký/đăng nhập qua HttpOnly BFF, chọn ghế, giữ ghế, Sandbox có chữ ký và QR SVG                           |
| Biên manifest mới                                                                           | 4 assertion đạt:50.000 hợp lệ;50.001, số âm và phân số bị chặn                                                          |

Tổng **225 bài độc lập đạt trong lượt phát hành**:134+4+87. Smoke và4 assertion biên được ghi riêng, không cộng lại bộ579 bài lịch sử. Thư mục build sạch và checkout có scope khác nhau: wrapper native chạy trên checkout chính, không gọi kết quả đó là PostgreSQL trong bản giải nén chưa cấu hình.

Ca smoke đầu chạy đồng thời với build chưa có đủ24 card sau5 giây. Lượt chẩn đoán riêng và lượt chạy lại script gốc đều đạt, giữ nguyên mã ứng dụng và timeout. Không tăng thời gian chờ hoặc sửa dữ liệu để làm xanh ca này.

Prisma generate riêng trong bản giải nén thử tải engine bị chính sách mạng cloud trả403 từ `binaries.prisma.sh`; kiểm tra native trên checkout dùng engine đã có trong môi trường QA. Không bỏ xác minh checksum/TLS hoặc sửa ứng dụng để vượt chính sách mạng. Fresh frontend build và RAM smoke không cần đường tải engine này.

## Phạm vi vận hành

Đã kiểm tra native trên cloud và Chromium; không thao tác trực tiếp trên máy Windows của thành viên. Khi chưa cấu hình PostgreSQL, launcher dùng RAM theo lựa chọn của dự án và dữ liệu reset khi restart. Kiểm thử PostgreSQL dùng database test riêng. Thanh toán vẫn là Sandbox; bản phát hành này không thay đổi mục tiêu hiệu năng hoặc trạng thái nghiệp vụ đã ghi trong audit trước.

[Bằng chứng tổng hợp](measurements/main-release-validation.json) · [Kiểm toán LAB04 trước đó](lab04-native-figma-audit.md) · [Tải ZIP main](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/archive/refs/heads/main.zip).
