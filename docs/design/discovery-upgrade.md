# NOVA Discovery UI

Giao diện ngày 23/10/2026 giữ nền điện ảnh tối, đỏ NOVA và điểm nhấn vàng.
Ảnh người dùng gửi được dùng để tham khảo mật độ nội dung và bố cục ưu đãi;
không sao chép thương hiệu hoặc chương trình thương mại Cinestar.

## Phạm vi

| Đường dẫn                  | Nội dung                                                                      |
| -------------------------- | ----------------------------------------------------------------------------- |
| `/`                        | Hero điện ảnh, đặt vé nhanh, danh mục phim, ưu đãi, thực đơn, hội viên và rạp |
| `/phim`                    | Danh mục đầy đủ, tìm kiếm, lọc thể loại/độ tuổi, trailer và đặt vé            |
| `/sap-chieu`               | Phim sắp tái chiếu tháng sau, nhóm theo tuần, nhắc lịch `.ics`                |
| `/uu-dai`                  | Sáu nội dung ưu đãi, bộ lọc, chi tiết và liên kết tới luồng phù hợp           |
| `/bap-nuoc`                | 16 sản phẩm, sáu nhóm thực đơn, số lượng và giỏ mua kèm vé                    |
| `/rap`                     | Không gian rạp minh họa, địa chỉ và liên kết đặt vé                           |
| `/hoi-vien`                | Ba hạng SILVER/GOLD/DIAMOND theo chính sách thực tế 5/7/10%                   |
| `/dang-nhap`               | Đăng nhập/đăng ký và hình giới thiệu; không thay cơ chế xác thực              |
| `/tai-khoan`               | Thông tin thành viên, điểm, đơn đang giữ, vé QR và lịch `.ics`                |
| `/dat-ve`                  | Chọn rạp/phim/ngày/suất rồi mở chọn ghế, combo và thanh toán                  |
| `/quan-tri`                | Workspace Admin có sidebar; báo cáo, người dùng, danh mục và health           |
| `/soat-ve`                 | Workspace nhân viên, camera khi trình duyệt hỗ trợ và nhập mã QR              |
| `/api/v1/payments/sandbox` | Trang Sandbox cùng nhận diện NOVA và ba kịch bản kết quả                      |

Mọi trang con có banner hình ảnh; hộp thoại chi tiết/đặt ghế cũng có đầu trang hình ảnh.
Sơ đồ ghế và đơn giữ logic backend: 5 phút, chống đặt trùng, Sweetbox, giới hạn 20 ghế,
giá Decimal và trạng thái thanh toán. QR, giá và điểm không được tự tạo ở giao diện.

## Dữ liệu và trạng thái

`content/cinema.json` chứa artwork/metadata bổ sung và thực đơn dùng chung.
`backend/scripts/seed-discovery.cjs` thêm 18 phim ngoài sáu phim ban đầu, 15 món ngoài
Party Combo có sẵn, 80 ghế và 10 suất cho phim bổ sung trong phòng riêng. Seed không
xóa dữ liệu, thay mật khẩu, sửa nội dung admin hoặc dời suất đang tồn tại. Lặp lại
seed hai lần giữ tổng 24 phim, 8 sắp chiếu và 16 món. Không chạy seed demo trong production.

Trang có thể hiển thị danh mục tham khảo khi không kết nối được API, nhưng không sinh
suất giả hoặc cho thêm món chưa có ID backend vào giỏ. Hiển thị thông báo và nút thử lại.
Giỏ bắp nước chỉ là bản nháp trong `sessionStorage`; giá và tính khả dụng được kiểm tra
lại khi giữ ghế. Đây không phải luồng mua đồ ăn độc lập hoặc quản lý tồn kho/quà tặng.

Đã bỏ mã QR chuyển khoản ngân hàng bên ngoài và phần đổi điểm chỉ sửa số tiền trên UI
khỏi checkout. Thanh toán hiển thị `order.finalAmount` và chuyển tới Sandbox đã ký.
Không triển khai ngân hàng thật, hoàn tiền, trừ điểm hay tự nâng hạng mới.
Biểu đồ cơ cấu doanh thu lấy tỷ lệ từ giá trị báo cáo thay cho độ dài thanh cố định.

Refresh của khách chưa có cookie không còn xóa cookie của phiên đăng nhập vừa hoàn tất
trong một yêu cầu song song. Giữ nguyên HttpOnly, SameSite và việc ẩn token khỏi JavaScript.

## Kiểm chứng

Các kiểm tra được chạy với PostgreSQL/Redis riêng cho test và SMTP fixture cục bộ.
Không dùng dữ liệu development để thay fixture và không tắt assertion/quy tắc ghế.
Kiểm tra giao diện gồm điều hướng, lọc, giỏ bắp nước chuyển sang đặt vé, giữ ghế cạnh tranh,
Sweetbox, nhóm 20 người, khôi phục đơn, các kết quả Sandbox, QR/ICS, RBAC và phiên nhiều tab.

Toàn bộ suite backend hiện có 27 ca HTTP thất bại liên quan fixture không tuân thủ
quy tắc orphan-seat đã có trong repository. Phần service/quy tắc ghế không được sửa
trong đợt giao diện này. Không coi báo cáo kiểm thử cũ trong repo là kết quả hiện tại.
Kết quả thực thi cuối cùng được ghi trong phần validation của commit/trao đổi công việc.

Kết quả trên môi trường hiện tại:

| Kiểm tra                                                           | Kết quả                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Frontend lint và production build                                  | PASS                                                 |
| Playwright toàn bộ luồng cũ + ba ca Discovery mới                  | **19/19 PASS**, không skip                           |
| Backend typecheck, typed lint và build                             | PASS                                                 |
| Backend unit tests                                                 | **74/74 PASS**                                       |
| Backend payment HTTP suite sau đổi trang Sandbox                   | **28/28 PASS**                                       |
| PostgreSQL/seed suite                                              | **22/22 PASS**                                       |
| Smoke bản build: booking/payment/realtime/QR/SMTP/check-in/revenue | PASS                                                 |
| Backend toàn bộ HTTP suite hiện có                                 | **168 PASS / 27 FAIL**, fixture orphan-seat nêu trên |
| Kiểm tra trực quan desktop 1440px và mobile 390px                  | Đã xem; không tràn ngang trên các trang kiểm tra     |

Các ca trình duyệt đã điều chỉnh dữ liệu chọn ghế để tuân thủ orphan-seat, xác nhận
độ tuổi trước thanh toán và kiểm tra trạng thái khám phá vẫn hoạt động khi API lỗi.
Không bỏ hoặc skip ca kiểm thử để có kết quả PASS.
