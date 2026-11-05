# BUG LOG – NOVA CINEMA

## 1. Thông tin chung

- **Dự án:** NOVA Cinema – Website đặt vé xem phim trực tuyến
- **Phạm vi:** Kiểm thử tích hợp Frontend, Backend và PostgreSQL
- **Người phụ trách:** Phùng Thị Mỹ Quyên
- **Tài liệu liên quan:** TEST_PLAN.md, TEST_CASES.md
- **Trạng thái:** Đang chuẩn bị kiểm thử
- **Số lỗi đã xác nhận:** 0

## 2. Mục đích

Tài liệu này dùng để ghi nhận, theo dõi và quản lý các lỗi thực tế phát hiện trong quá trình kiểm thử tích hợp hệ thống NOVA Cinema.

Mỗi lỗi phải có thông tin rõ ràng để thành viên phụ trách có thể tái hiện, xác định nguyên nhân, sửa lỗi và kiểm thử lại.

Không ghi lỗi giả định thành lỗi đã xảy ra. Những test case chưa chạy hoặc bị chặn bởi môi trường kiểm thử phải được ghi nhận đúng trạng thái trong TEST_CASES.md.

## 3. Quy ước mã lỗi

Mỗi lỗi sử dụng mã duy nhất theo định dạng:

- BUG-001
- BUG-002
- BUG-003
- ...

Mã lỗi được đánh số tăng dần theo thứ tự ghi nhận.

## 4. Mức độ nghiêm trọng

| Mức độ | Ý nghĩa | Ví dụ |
|---|---|---|
| Critical | Lỗi nghiêm trọng, có thể làm mất dữ liệu hoặc phá vỡ chức năng cốt lõi | Hai khách hàng được xác nhận mua thành công cùng một ghế |
| High | Chức năng quan trọng không hoạt động đúng | Thanh toán thành công nhưng không tạo vé |
| Medium | Chức năng hoạt động chưa chính xác nhưng có thể có cách xử lý khác | Thông tin trạng thái ghế cập nhật chậm |
| Low | Lỗi nhỏ, ít ảnh hưởng đến chức năng chính | Thông báo lỗi khó hiểu hoặc sai chính tả |

Các ví dụ trên chỉ minh họa cách phân loại, không phải lỗi đã phát hiện trong dự án.

## 5. Trạng thái xử lý lỗi

| Trạng thái | Ý nghĩa |
|---|---|
| Open | Lỗi đã được xác nhận và đang chờ xử lý |
| In Progress | Thành viên phụ trách đang sửa lỗi |
| Fixed | Đã có thông báo hoặc thay đổi mã nguồn nhằm sửa lỗi, chưa xác nhận bằng kiểm thử lại |
| Retest | Tester đang kiểm tra lại lỗi sau khi sửa |
| Closed | Tester xác nhận lỗi đã được khắc phục |
| Reopened | Lỗi vẫn còn hoặc xuất hiện lại sau khi kiểm thử lại |

## 6. Danh sách lỗi

| Mã lỗi | Test case liên quan | Chức năng | Mô tả ngắn | Mức độ | Trạng thái | Người xử lý |
|---|---|---|---|---|---|---|
| Chưa có | — | — | Chưa ghi nhận lỗi thực tế | — | — | — |

**Lưu ý:** Dòng trên là thông báo danh sách đang trống, không phải một lỗi.

## 7. Mẫu ghi nhận chi tiết một lỗi

Chỉ sao chép mẫu dưới đây thành một mục BUG-xxx khi thực sự phát hiện và xác nhận lỗi.

### BUG-XXX – [Tên lỗi]

- **Test case liên quan:** TC-XXX
- **Mã yêu cầu:** REQ-XX
- **Chức năng:** [Tên chức năng]
- **Ngày phát hiện:** [Ngày thực tế]
- **Môi trường kiểm thử:** [Trình duyệt, Frontend, Backend, PostgreSQL và phiên bản liên quan]
- **Mức độ nghiêm trọng:** [Critical / High / Medium / Low]
- **Trạng thái:** Open
- **Người phát hiện:** [Tên người kiểm thử]
- **Người xử lý:** Chưa phân công

**Điều kiện trước:**

[Mô tả trạng thái hệ thống và dữ liệu cần có trước khi tái hiện lỗi.]

**Các bước tái hiện:**

1. [Bước thực hiện thứ nhất]
2. [Bước thực hiện thứ hai]
3. [Bước thực hiện thứ ba]

**Kết quả mong đợi:**

[Mô tả kết quả hệ thống phải thực hiện.]

**Kết quả thực tế:**

[Mô tả chính xác lỗi đã quan sát được.]

**Minh chứng:**

- [Ảnh chụp màn hình hoặc đường dẫn ảnh]
- [Mã HTTP, phản hồi API hoặc log liên quan đã che thông tin nhạy cảm]
- [Kết quả truy vấn PostgreSQL nếu cần]

**Thông tin sửa lỗi:**

- Commit hoặc Pull Request sửa lỗi: Chưa có
- Ngày sửa: Chưa có
- Ghi chú: Chưa có

**Kết quả kiểm thử lại:**

- Ngày kiểm thử lại: Chưa thực hiện
- Kết quả: Not Run
- Người kiểm thử lại: Chưa có

## 8. Nguyên tắc ghi nhận và kiểm thử lại

1. Chỉ tạo BUG-001, BUG-002,... khi có lỗi thực tế được xác nhận.
2. Mỗi lỗi phải liên kết với test case hoặc yêu cầu tương ứng.
3. Ghi rõ các bước tái hiện để người sửa có thể kiểm tra.
4. Phân biệt kết quả mong đợi với kết quả thực tế.
5. Không tự chuyển trạng thái sang Closed nếu chưa kiểm thử lại thành công.
6. Không đưa mật khẩu, token, chuỗi kết nối database hoặc dữ liệu nhạy cảm lên GitHub.
7. Nếu chưa thể chạy kiểm thử do thiếu dịch vụ hoặc cấu hình, ghi Blocked trong TEST_CASES.md và nêu rõ lý do.
8. Sau khi sửa lỗi, cập nhật kết quả Retest và liên kết commit hoặc Pull Request liên quan nếu có.
