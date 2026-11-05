# BỘ TEST CASE KIỂM THỬ TÍCH HỢP – NOVA CINEMA

## 1. Thông tin chung

- Dự án: NOVA Cinema – Website đặt vé xem phim trực tuyến
- Người phụ trách: Phùng Thị Mỹ Quyên
- Vai trò: Tester tích hợp Frontend – Backend – PostgreSQL
- Nhánh Git: `test/integration-frontend-backend-sql`
- Phạm vi: 15 yêu cầu kiểm thử REQ-01 đến REQ-15 trong `TEST_PLAN.md`
- Số lượng mục tiêu: Tối thiểu 20 test case

## 2. Quy ước mã Test Case

- `TC-001`, `TC-002`, ...: Mã định danh duy nhất cho từng test case.
- `REQ-01`, `REQ-02`, ...: Mã yêu cầu tương ứng trong kế hoạch kiểm thử.

## 3. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| Not Run | Chưa thực hiện kiểm thử. |
| Pass | Đã kiểm thử và kết quả thực tế đúng với mong đợi. |
| Fail | Đã kiểm thử và kết quả thực tế khác với mong đợi. |
| Blocked | Chưa thể thực hiện hoặc hoàn thành do điều kiện phụ thuộc hay lỗi môi trường. |

## 4. Thông tin cần ghi cho mỗi Test Case

1. Mã Test Case và mã yêu cầu.
2. Tên chức năng và mục đích kiểm thử.
3. Điều kiện trước khi kiểm thử.
4. Các bước thực hiện cụ thể.
5. Kết quả mong đợi.
6. Kết quả thực tế và minh chứng (sau khi chạy).
7. Trạng thái kiểm thử.

## 5. Nguyên tắc ghi kết quả

- Test case mới tạo mặc định có trạng thái `Not Run`.
- Chỉ đánh dấu `Pass` hoặc `Fail` sau khi thực hiện và quan sát kết quả.
- Nếu Backend hoặc dịch vụ phụ thuộc chưa hoạt động, đánh dấu `Blocked` khi tiến hành kiểm thử và ghi rõ lý do.
- Không tự tạo kết quả thực tế hoặc minh chứng khi chưa chạy.

## 6. Danh sách Test Case

### TC-001 – Kiểm tra hiển thị danh sách phim từ Backend

- **Mã yêu cầu:** REQ-01
- **Chức năng:** Xem danh sách phim
- **Mục đích:** Kiểm tra Frontend có gọi API lấy danh sách phim từ Backend và hiển thị dữ liệu đúng hay không.
- **Điều kiện trước:** Frontend và Backend đang chạy; PostgreSQL kết nối thành công; cơ sở dữ liệu có ít nhất một phim.
- **Dữ liệu kiểm thử:** Danh sách phim hiện có trong cơ sở dữ liệu.

**Các bước thực hiện:**

1. Mở Google Chrome và truy cập website NOVA Cinema.
2. Nhấn F12 để mở Developer Tools.
3. Chọn tab Network, sau đó chọn bộ lọc Fetch/XHR.
4. Tải lại trang bằng Ctrl + R.
5. Trên giao diện, mở trang hiển thị danh sách phim nếu trang này chưa được mở.
6. Quan sát yêu cầu API lấy danh sách phim trong Network.
7. Kiểm tra mã trạng thái HTTP và nội dung phản hồi của API.
8. Đối chiếu tên phim, hình ảnh hoặc thông tin phim trên giao diện với dữ liệu API trả về.

**Kết quả mong đợi:**

- Frontend gửi yêu cầu lấy danh sách phim đến đúng API.
- API trả về mã HTTP 200 và dữ liệu danh sách phim hợp lệ.
- Danh sách phim hiển thị trên giao diện tương ứng với dữ liệu API.
- Không xuất hiện lỗi làm trang web ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh giao diện và Network sau khi kiểm thử.

### TC-002 – Kiểm tra Backend truy xuất danh sách phim từ PostgreSQL

- **Mã yêu cầu:** REQ-02
- **Chức năng:** Truy xuất dữ liệu phim
- **Mục đích:** Kiểm tra Backend có kết nối PostgreSQL và trả về danh sách phim tương ứng với dữ liệu đã lưu hay không.
- **Điều kiện trước:** Backend đang chạy và có thể nhận yêu cầu HTTP; PostgreSQL đang hoạt động; cơ sở dữ liệu kiểm thử có dữ liệu phim.
- **Dữ liệu kiểm thử:** Các bản ghi phim hiện có trong database `nova_cinema_tester`.

**Các bước thực hiện:**

1. Mở pgAdmin và kết nối đến PostgreSQL.
2. Chọn cơ sở dữ liệu `nova_cinema_tester`.
3. Mở Query Tool và chạy câu lệnh:
   ```sql
   SELECT id, title FROM movies ORDER BY id;
   ```
4. Ghi lại mã phim và tên phim trong kết quả truy vấn.
5. Mở trình duyệt hoặc công cụ kiểm thử API.
6. Gửi yêu cầu GET đến `http://localhost:4000/api/v1/movies`.
7. Kiểm tra mã trạng thái HTTP và danh sách phim trong phản hồi.
8. Đối chiếu các phim được API trả về với các bản ghi đã truy vấn trong PostgreSQL. Nếu API có phân trang hoặc lọc, điều chỉnh phạm vi đối chiếu cho phù hợp.

**Kết quả mong đợi:**

- Backend nhận được yêu cầu GET và phản hồi thành công với mã HTTP 200.
- API trả về danh sách phim hợp lệ theo điều kiện truy vấn.
- Mã phim và tên phim trong phản hồi tương ứng với dữ liệu PostgreSQL.
- Không xuất hiện lỗi kết nối hoặc truy vấn cơ sở dữ liệu.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh kết quả truy vấn PostgreSQL và phản hồi API sau khi kiểm thử.


### TC-003 – Kiểm tra đăng ký tài khoản và lưu dữ liệu vào PostgreSQL

- **Mã yêu cầu:** REQ-03
- **Chức năng:** Đăng ký tài khoản
- **Mục đích:** Kiểm tra người dùng có thể đăng ký tài khoản mới và thông tin tài khoản được lưu chính xác trong PostgreSQL.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; chức năng đăng ký được kết nối với API; email kiểm thử chưa được đăng ký.
- **Dữ liệu kiểm thử:** Email thử nghiệm chưa tồn tại, họ tên hợp lệ và mật khẩu đáp ứng yêu cầu của hệ thống. Không sử dụng mật khẩu thật.

**Các bước thực hiện:**

1. Mở website NOVA Cinema trên Google Chrome.
2. Chọn chức năng Đăng ký tài khoản.
3. Nhập đầy đủ các thông tin bắt buộc theo biểu mẫu đăng ký.
4. Nhấn F12, mở tab Network và chọn Fetch/XHR.
5. Nhấn nút Đăng ký.
6. Quan sát thông báo trên giao diện và yêu cầu đăng ký được gửi đến Backend.
7. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API.
8. Mở pgAdmin và kết nối đến database `nova_cinema_tester`.
9. Truy vấn bảng người dùng theo email vừa đăng ký, sử dụng đúng tên bảng và tên cột trong Prisma schema thực tế.
10. Đối chiếu thông tin tài khoản đã lưu với dữ liệu đăng ký và phản hồi API.

**Kết quả mong đợi:**

- Frontend gửi yêu cầu đăng ký với dữ liệu hợp lệ.
- Backend xử lý thành công và trả về mã HTTP thành công phù hợp với API.
- Website hiển thị thông báo đăng ký thành công hoặc chuyển sang bước tiếp theo đúng thiết kế.
- PostgreSQL có bản ghi tài khoản mới với email và các thông tin phù hợp.
- Mật khẩu không được lưu dưới dạng văn bản thuần.
- Phản hồi API không để lộ mật khẩu hoặc thông tin xác thực nhạy cảm.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh giao diện, phản hồi API và kết quả truy vấn PostgreSQL sau khi kiểm thử. Che thông tin nhạy cảm trước khi lưu minh chứng.

### TC-004 – Kiểm tra đăng nhập và xác thực tài khoản hợp lệ

- **Mã yêu cầu:** REQ-04
- **Chức năng:** Đăng nhập tài khoản
- **Mục đích:** Kiểm tra Frontend gửi thông tin đăng nhập đến Backend, Backend xác thực tài khoản và cho phép người dùng truy cập đúng chức năng.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; tài khoản kiểm thử đã được tạo và đang ở trạng thái được phép đăng nhập.
- **Dữ liệu kiểm thử:** Email và mật khẩu hợp lệ của tài khoản kiểm thử. Không sử dụng tài khoản hoặc mật khẩu cá nhân.

**Các bước thực hiện:**

1. Mở website NOVA Cinema trên Google Chrome.
2. Chọn chức năng Đăng nhập.
3. Nhập email và mật khẩu hợp lệ của tài khoản kiểm thử.
4. Nhấn F12 để mở Developer Tools.
5. Chọn tab Network, sau đó chọn Fetch/XHR.
6. Nhấn nút Đăng nhập.
7. Quan sát yêu cầu đăng nhập được gửi đến Backend.
8. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API, không sao chép hoặc công khai token xác thực.
9. Quan sát thông báo hoặc trang được chuyển đến sau khi đăng nhập.
10. Truy cập một chức năng yêu cầu đăng nhập, chẳng hạn xem lịch sử đặt vé nếu website có hỗ trợ.
11. Kiểm tra chức năng đó có nhận diện đúng tài khoản vừa đăng nhập hay không.

**Kết quả mong đợi:**

- Frontend gửi thông tin đăng nhập đến đúng API.
- Backend xác thực thành công tài khoản có thông tin hợp lệ.
- API trả về mã HTTP thành công phù hợp với thiết kế.
- Website chuyển sang trạng thái đã đăng nhập và hiển thị thông tin người dùng phù hợp.
- Người dùng truy cập được các chức năng dành cho tài khoản của mình.
- Không hiển thị mật khẩu hoặc token xác thực trong giao diện hay thông báo lỗi.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh giao diện sau đăng nhập và trạng thái phản hồi API. Che email, token và thông tin nhạy cảm khi lưu minh chứng.

### TC-005 – Kiểm tra đăng nhập bằng mật khẩu không chính xác

- **Mã yêu cầu:** REQ-04
- **Chức năng:** Đăng nhập tài khoản
- **Mục đích:** Kiểm tra hệ thống có từ chối đăng nhập khi người dùng nhập đúng email nhưng sai mật khẩu, đồng thời không cấp quyền truy cập trái phép.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; có tài khoản kiểm thử hợp lệ; người dùng đã đăng xuất.
- **Dữ liệu kiểm thử:** Email của tài khoản kiểm thử đã tồn tại và một mật khẩu sai, không trùng với mật khẩu thật.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đảm bảo tài khoản kiểm thử đã đăng xuất.
3. Chọn chức năng Đăng nhập.
4. Nhập đúng email của tài khoản kiểm thử.
5. Nhập mật khẩu không chính xác.
6. Nhấn F12 để mở Developer Tools, chọn tab Network và bộ lọc Fetch/XHR.
7. Nhấn nút Đăng nhập.
8. Quan sát thông báo lỗi trên giao diện.
9. Kiểm tra mã trạng thái HTTP và nội dung phản hồi từ API đăng nhập.
10. Thử mở một chức năng chỉ dành cho người dùng đã đăng nhập, chẳng hạn lịch sử đặt vé.
11. Kiểm tra hệ thống có từ chối truy cập khi chưa xác thực hay không.

**Kết quả mong đợi:**

- Frontend gửi yêu cầu đăng nhập đến Backend.
- Backend từ chối xác thực vì mật khẩu không chính xác.
- API trả về mã lỗi xác thực phù hợp với thiết kế, thông thường là HTTP 401.
- Giao diện hiển thị thông báo đăng nhập không thành công, dễ hiểu và không làm lộ thông tin nhạy cảm.
- Người dùng vẫn ở trạng thái chưa đăng nhập.
- Hệ thống không cấp phiên đăng nhập hoặc token hợp lệ cho yêu cầu thất bại.
- Người dùng không thể truy cập chức năng yêu cầu xác thực.
- Tài khoản và mật khẩu đã lưu trong PostgreSQL không bị thay đổi bởi lần đăng nhập thất bại.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh thông báo đăng nhập thất bại, mã HTTP trong Network và kết quả kiểm tra quyền truy cập sau khi kiểm thử. Không chụp hoặc công khai mật khẩu, token.


### TC-006 – Kiểm tra phân quyền giữa khách hàng và quản trị viên

- **Mã yêu cầu:** REQ-04
- **Chức năng:** Phân quyền tài khoản
- **Mục đích:** Kiểm tra tài khoản khách hàng không thể sử dụng các chức năng quản trị, trong khi tài khoản quản trị viên được phép truy cập đúng quyền hạn.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; có một tài khoản khách hàng và một tài khoản quản trị viên hợp lệ; xác định được trang hoặc chức năng quản trị trong hệ thống.
- **Dữ liệu kiểm thử:** Hai tài khoản thử nghiệm có vai trò khác nhau, không sử dụng tài khoản cá nhân.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng.
3. Quan sát menu và các chức năng được hiển thị.
4. Kiểm tra khách hàng có nhìn thấy hoặc sử dụng được chức năng quản lý phim, phòng chiếu hoặc suất chiếu hay không.
5. Thử truy cập trực tiếp đường dẫn trang quản trị đã được xác định từ hệ thống.
6. Mở Developer Tools, chọn Network và quan sát phản hồi API khi khách hàng thử thực hiện thao tác quản trị không được phép.
7. Kiểm tra hệ thống có từ chối yêu cầu hay không.
8. Đăng xuất khỏi tài khoản khách hàng.
9. Đăng nhập bằng tài khoản quản trị viên.
10. Truy cập lại chức năng quản trị vừa kiểm tra.
11. Xác nhận tài khoản quản trị viên có thể truy cập chức năng theo quyền được cấp.
12. Đối chiếu dữ liệu hoặc vai trò tài khoản trong PostgreSQL nếu cần, dựa trên Prisma schema thực tế.

**Kết quả mong đợi:**

- Tài khoản khách hàng chỉ nhìn thấy và sử dụng các chức năng được cấp quyền.
- Khách hàng không thể thực hiện thao tác quản trị trái phép, kể cả khi truy cập trực tiếp URL hoặc gửi yêu cầu API.
- Backend trả về mã lỗi phân quyền phù hợp, thông thường là HTTP 403 đối với tài khoản đã xác thực nhưng không đủ quyền.
- Tài khoản quản trị viên có thể truy cập chức năng được cấp quyền.
- Không có dữ liệu quản trị nào bị thay đổi do yêu cầu trái phép của khách hàng.
- Website không bị lỗi hoặc ngừng hoạt động khi xảy ra yêu cầu không đủ quyền.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh giao diện khách hàng, phản hồi API bị từ chối và giao diện quản trị viên sau khi kiểm thử. Che token và thông tin nhạy cảm.


### TC-007 – Kiểm tra thêm phim mới và lưu dữ liệu vào PostgreSQL

- **Mã yêu cầu:** REQ-05
- **Chức năng:** Quản lý phim – Thêm phim mới
- **Mục đích:** Kiểm tra quản trị viên có thể thêm phim mới và thông tin phim được lưu chính xác vào PostgreSQL.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; tài khoản quản trị viên có quyền thêm phim; đã xác định được chức năng thêm phim trên website hoặc API tương ứng.
- **Dữ liệu kiểm thử:** Một bộ thông tin phim thử nghiệm hợp lệ, có tên dễ nhận biết, ví dụ "NOVA TEST MOVIE 007". Các trường còn lại điền theo yêu cầu thực tế của hệ thống.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản quản trị viên.
3. Truy cập trang quản lý phim.
4. Chọn chức năng Thêm phim nếu giao diện có hỗ trợ.
5. Nhập thông tin phim thử nghiệm vào các trường bắt buộc theo biểu mẫu.
6. Nhấn F12 để mở Developer Tools, chọn tab Network và bộ lọc Fetch/XHR.
7. Nhấn nút Lưu hoặc Thêm phim.
8. Quan sát thông báo trên giao diện và yêu cầu API được gửi đến Backend.
9. Kiểm tra mã trạng thái HTTP và dữ liệu phim trong phản hồi.
10. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
11. Truy vấn bảng phim theo tên hoặc mã phim vừa thêm, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
12. Đối chiếu thông tin phim trong PostgreSQL với dữ liệu đã nhập và phản hồi API.
13. Tải lại trang quản lý phim và kiểm tra phim mới có còn xuất hiện hay không.

**Kết quả mong đợi:**

- Tài khoản quản trị viên được phép sử dụng chức năng thêm phim.
- Frontend gửi yêu cầu tạo phim hợp lệ đến Backend.
- Backend xử lý thành công và trả về mã HTTP thành công phù hợp với thiết kế, thường là 201 khi tạo mới.
- Website hiển thị thông báo hoặc danh sách phim được cập nhật đúng.
- PostgreSQL có bản ghi phim mới với thông tin phù hợp.
- Phim vẫn tồn tại sau khi tải lại trang.
- Không tạo bản ghi trùng ngoài dự kiến khi chỉ gửi một yêu cầu.
- Không phát sinh lỗi khiến website ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh biểu mẫu thêm phim, phản hồi API, kết quả truy vấn PostgreSQL và danh sách phim sau khi tải lại trang.

**Lưu ý:** Nếu website chưa có giao diện thêm phim, kiểm thử API tạo phim theo tài liệu hoặc code thực tế và ghi rõ giới hạn kiểm thử Frontend. Không tự đánh dấu Pass cho luồng giao diện chưa tồn tại.


### TC-008 – Kiểm tra chỉnh sửa thông tin phim và cập nhật PostgreSQL

- **Mã yêu cầu:** REQ-05
- **Chức năng:** Quản lý phim – Chỉnh sửa phim
- **Mục đích:** Kiểm tra quản trị viên có thể chỉnh sửa thông tin phim và dữ liệu được cập nhật chính xác trong PostgreSQL.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; tài khoản quản trị viên có quyền chỉnh sửa phim; tồn tại phim thử nghiệm được phép thay đổi.
- **Dữ liệu kiểm thử:** Phim "NOVA TEST MOVIE 007" đã tạo ở TC-007 (nếu có). Thay đổi tên thành "NOVA TEST MOVIE 008" hoặc một trường thông tin được hệ thống cho phép chỉnh sửa.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản quản trị viên.
3. Truy cập trang quản lý phim.
4. Tìm phim thử nghiệm đã tạo trước đó.
5. Chọn chức năng Chỉnh sửa phim.
6. Thay đổi tên phim hoặc một thông tin được phép cập nhật.
7. Nhấn F12, mở tab Network và chọn Fetch/XHR.
8. Nhấn nút Lưu thay đổi.
9. Quan sát thông báo trên giao diện và yêu cầu API cập nhật phim.
10. Kiểm tra mã trạng thái HTTP và nội dung phản hồi từ Backend.
11. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
12. Truy vấn bản ghi phim theo mã ID đã ghi nhận trước khi chỉnh sửa, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
13. Đối chiếu thông tin phim trong PostgreSQL với nội dung vừa chỉnh sửa.
14. Tải lại trang quản lý phim và kiểm tra thông tin mới có tiếp tục hiển thị hay không.

**Kết quả mong đợi:**

- Quản trị viên được phép chỉnh sửa phim theo quyền hạn.
- Frontend gửi yêu cầu cập nhật phim đến đúng API.
- Backend xử lý thành công và trả về mã HTTP thành công phù hợp với thiết kế.
- PostgreSQL cập nhật đúng bản ghi phim theo ID.
- Thông tin được thay đổi đúng với dữ liệu đã nhập.
- Các trường không được chỉnh sửa vẫn giữ nguyên giá trị.
- Không phát sinh thêm bản ghi phim mới ngoài dự kiến.
- Sau khi tải lại trang, thông tin phim vẫn là dữ liệu đã cập nhật.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh thông tin phim trước và sau khi sửa, phản hồi API và kết quả truy vấn PostgreSQL.

**Lưu ý:** Nếu TC-007 chưa chạy hoặc chưa tạo được phim thử nghiệm, cần chuẩn bị một bản ghi phim thử nghiệm khác trước khi chạy TC-008. Không chỉnh sửa phim thật của nhóm.


### TC-009 – Kiểm tra xóa phim và cập nhật PostgreSQL

- **Mã yêu cầu:** REQ-05
- **Chức năng:** Quản lý phim – Xóa phim
- **Mục đích:** Kiểm tra quản trị viên có thể xóa phim thử nghiệm và hệ thống cập nhật dữ liệu chính xác theo cơ chế xóa được thiết kế.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; tài khoản quản trị viên có quyền xóa phim; có một phim thử nghiệm được phép xóa và không có dữ liệu liên quan gây cản trở thao tác.
- **Dữ liệu kiểm thử:** Phim "NOVA TEST MOVIE 008" đã chỉnh sửa ở TC-008 (nếu có), hoặc một phim thử nghiệm khác. Ghi lại ID phim trước khi xóa.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản quản trị viên.
3. Truy cập trang quản lý phim.
4. Tìm phim thử nghiệm cần xóa và ghi lại ID của phim.
5. Kiểm tra chắc chắn đây là phim thử nghiệm, không phải phim thật của nhóm.
6. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
7. Chọn chức năng Xóa phim nếu giao diện có hỗ trợ.
8. Xác nhận thao tác xóa nếu website hiển thị hộp thoại xác nhận.
9. Quan sát thông báo trên giao diện và yêu cầu API được gửi đến Backend.
10. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API.
11. Tải lại trang quản lý phim và kiểm tra trạng thái hiển thị của phim.
12. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
13. Truy vấn bản ghi theo ID phim đã ghi lại, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
14. Đối chiếu kết quả PostgreSQL với cơ chế xóa phim thực tế của hệ thống.

**Kết quả mong đợi:**

- Chỉ tài khoản có quyền quản trị phù hợp mới được phép xóa phim.
- Frontend gửi yêu cầu xóa đúng phim đã chọn.
- Backend xử lý yêu cầu và trả về mã HTTP phù hợp với kết quả.
- Nếu hệ thống xóa vĩnh viễn, bản ghi phim không còn trong PostgreSQL.
- Nếu hệ thống xóa mềm, bản ghi được cập nhật trạng thái theo thiết kế và không còn hiển thị trong danh sách phim đang hoạt động.
- Không xóa nhầm phim khác hoặc làm mất dữ liệu ngoài phạm vi dự kiến.
- Sau khi tải lại trang, giao diện phản ánh đúng kết quả xóa.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh danh sách phim trước và sau khi xóa, phản hồi API và kết quả truy vấn PostgreSQL.

**Lưu ý:** Chỉ thực hiện trên database `nova_cinema_tester`. Trước khi chạy cần xác nhận hệ thống sử dụng xóa mềm hay xóa vĩnh viễn và có ràng buộc dữ liệu liên quan hay không. Nếu giao diện chưa hỗ trợ xóa phim, ghi rõ giới hạn kiểm thử Frontend và chỉ kiểm thử API khi được phép.


### TC-010 – Kiểm tra tạo phòng chiếu và lưu dữ liệu vào PostgreSQL

- **Mã yêu cầu:** REQ-06
- **Chức năng:** Quản lý phòng chiếu – Tạo phòng chiếu
- **Mục đích:** Kiểm tra quản trị viên có thể tạo phòng chiếu mới và dữ liệu phòng chiếu được lưu chính xác trong PostgreSQL.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; tài khoản quản trị viên có quyền tạo phòng chiếu; đã có rạp chiếu phim thử nghiệm phù hợp trong database.
- **Dữ liệu kiểm thử:** Phòng chiếu có tên "NOVA TEST ROOM 010", thuộc một rạp thử nghiệm có sẵn. Các thông tin về số hàng, số ghế và loại phòng phải đáp ứng quy định thực tế của hệ thống.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản quản trị viên.
3. Truy cập trang quản lý phòng chiếu nếu giao diện có hỗ trợ.
4. Chọn chức năng Thêm phòng hoặc Tạo phòng chiếu.
5. Chọn rạp chiếu phim phù hợp.
6. Nhập tên phòng "NOVA TEST ROOM 010" và các thông tin bắt buộc theo biểu mẫu.
7. Nhấn F12 để mở Developer Tools, chọn tab Network và bộ lọc Fetch/XHR.
8. Nhấn nút Lưu hoặc Tạo phòng.
9. Quan sát thông báo trên giao diện và yêu cầu API được gửi đến Backend.
10. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API.
11. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
12. Truy vấn bảng phòng chiếu theo tên hoặc ID phòng vừa tạo, sử dụng đúng tên bảng và tên cột trong Prisma schema thực tế.
13. Đối chiếu tên phòng, rạp trực thuộc và các thông tin phòng chiếu với dữ liệu đã nhập.
14. Nếu hệ thống tự động tạo ghế khi tạo phòng, kiểm tra số lượng và cách bố trí ghế trong PostgreSQL.
15. Tải lại trang quản lý phòng chiếu và kiểm tra phòng mới có còn xuất hiện hay không.

**Kết quả mong đợi:**

- Quản trị viên được phép tạo phòng chiếu theo quyền hạn.
- Frontend gửi yêu cầu tạo phòng hợp lệ đến Backend.
- Backend xử lý thành công và trả về mã HTTP thành công phù hợp với thiết kế.
- PostgreSQL có bản ghi phòng chiếu mới với thông tin chính xác.
- Phòng chiếu được liên kết đúng với rạp đã chọn.
- Nếu hệ thống tự động tạo ghế, số ghế và sơ đồ ghế phải đúng theo cấu hình phòng.
- Không tạo phòng trùng ngoài dự kiến khi chỉ gửi một yêu cầu.
- Sau khi tải lại trang, phòng chiếu vẫn tồn tại.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh biểu mẫu tạo phòng, phản hồi API, kết quả truy vấn PostgreSQL và danh sách phòng sau khi tải lại trang.

**Lưu ý:** Nếu website chưa có giao diện quản lý phòng chiếu, cần ghi rõ giới hạn kiểm thử Frontend. Chỉ kiểm thử API tạo phòng khi đã xác nhận đúng cấu trúc yêu cầu và được phép sử dụng trên database kiểm thử.


### TC-011 – Kiểm tra tạo suất chiếu và lưu dữ liệu vào PostgreSQL

- **Mã yêu cầu:** REQ-06
- **Chức năng:** Quản lý suất chiếu – Tạo suất chiếu
- **Mục đích:** Kiểm tra quản trị viên có thể tạo suất chiếu mới và thông tin suất chiếu được lưu chính xác vào PostgreSQL.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; có tài khoản quản trị viên được cấp quyền; có phim và phòng chiếu hợp lệ trong database kiểm thử.
- **Dữ liệu kiểm thử:** Một phim thử nghiệm, một phòng chiếu hợp lệ, ngày giờ bắt đầu trong tương lai và các thông tin bắt buộc theo thiết kế. Chọn thời gian không trùng với suất chiếu khác của cùng phòng.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản quản trị viên.
3. Truy cập trang quản lý suất chiếu nếu giao diện có hỗ trợ.
4. Chọn chức năng Thêm suất chiếu hoặc Tạo suất chiếu.
5. Chọn phim cần chiếu.
6. Chọn rạp và phòng chiếu phù hợp.
7. Nhập ngày, giờ bắt đầu và các thông tin bắt buộc khác.
8. Kiểm tra lại thời gian và phòng chiếu đã chọn.
9. Nhấn F12 để mở Developer Tools, chọn tab Network và bộ lọc Fetch/XHR.
10. Nhấn nút Lưu hoặc Tạo suất chiếu.
11. Quan sát thông báo trên giao diện và yêu cầu API được gửi đến Backend.
12. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API.
13. Ghi lại ID suất chiếu được tạo nếu API có trả về.
14. Mở pgAdmin và kết nối đến database `nova_cinema_tester`.
15. Truy vấn bản ghi suất chiếu theo ID hoặc thông tin phim, phòng và thời gian vừa tạo, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
16. Đối chiếu dữ liệu PostgreSQL với thông tin đã nhập và phản hồi API.
17. Tải lại trang quản lý suất chiếu và kiểm tra suất chiếu vừa tạo có còn xuất hiện hay không.

**Kết quả mong đợi:**

- Quản trị viên được phép tạo suất chiếu theo quyền hạn.
- Frontend gửi yêu cầu tạo suất chiếu hợp lệ đến Backend.
- Backend xử lý thành công và trả về mã HTTP thành công phù hợp với thiết kế.
- PostgreSQL có bản ghi suất chiếu mới.
- Suất chiếu liên kết đúng với phim và phòng chiếu đã chọn.
- Ngày giờ được lưu và hiển thị chính xác theo múi giờ mà hệ thống quy định.
- Không tạo suất chiếu trùng ngoài dự kiến khi chỉ gửi một yêu cầu.
- Nếu hệ thống có quy tắc kiểm tra lịch phòng, không cho phép các suất chiếu xung đột thời gian.
- Sau khi tải lại trang, suất chiếu vẫn tồn tại.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh biểu mẫu tạo suất chiếu, phản hồi API, kết quả truy vấn PostgreSQL và danh sách suất chiếu sau khi tải lại trang.

**Lưu ý:** Chỉ tạo suất chiếu trên database kiểm thử. Trước khi chạy cần xác nhận các trường dữ liệu bắt buộc, cách xử lý múi giờ và quy tắc trùng lịch theo code thực tế. Nếu không có giao diện tạo suất chiếu, ghi rõ giới hạn kiểm thử Frontend và chỉ kiểm thử API khi được phép.


### TC-012 – Kiểm tra chọn ghế và cập nhật trạng thái giữ ghế

- **Mã yêu cầu:** REQ-07
- **Chức năng:** Đặt vé – Chọn ghế và giữ ghế
- **Mục đích:** Kiểm tra khách hàng chọn ghế trên giao diện, Frontend gửi đúng thông tin đến Backend và hệ thống ghi nhận trạng thái giữ ghế theo suất chiếu.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và các dịch vụ phụ thuộc cần thiết đang hoạt động; có tài khoản khách hàng hợp lệ; có suất chiếu trong tương lai với ít nhất một ghế trống.
- **Dữ liệu kiểm thử:** Một suất chiếu hợp lệ và một ghế đang trống, ví dụ A5 nếu ghế này thực sự tồn tại trong sơ đồ.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng kiểm thử.
3. Chọn một phim có suất chiếu trong tương lai.
4. Chọn rạp, ngày chiếu và giờ chiếu phù hợp.
5. Mở sơ đồ ghế của suất chiếu.
6. Quan sát và ghi lại trạng thái ban đầu của ghế cần kiểm thử.
7. Chọn một ghế đang trống trên sơ đồ, ví dụ A5 nếu có.
8. Kiểm tra giao diện có hiển thị đúng ghế đã chọn và thông tin đặt vé hay không.
9. Nhấn F12, mở Developer Tools, chọn Network và bộ lọc Fetch/XHR.
10. Thực hiện thao tác xác nhận chọn ghế hoặc giữ ghế theo quy trình thực tế của website.
11. Quan sát yêu cầu API giữ ghế được gửi đến Backend.
12. Kiểm tra mã trạng thái HTTP, ID suất chiếu, ID ghế và thông tin giữ ghế trong phản hồi API.
13. Kiểm tra hệ thống có ghi nhận ghế đang được giữ hay không bằng cách tải lại sơ đồ ghế hoặc truy vấn API trạng thái ghế.
14. Mở pgAdmin và kiểm tra các bản ghi liên quan trong database `nova_cinema_tester`, nếu trạng thái giữ ghế được lưu tại PostgreSQL.
15. Đối chiếu trạng thái ghế với cơ chế lưu trữ thực tế của hệ thống.

**Kết quả mong đợi:**

- Giao diện cho phép khách hàng chọn ghế đang trống.
- Ghế được chọn hiển thị đúng trên giao diện và trong thông tin đặt vé.
- Frontend gửi đúng thông tin ghế và suất chiếu đến Backend khi xác nhận giữ ghế.
- Backend chấp nhận yêu cầu giữ ghế hợp lệ và trả về phản hồi thành công theo thiết kế.
- Ghế được ghi nhận là đang giữ trong khoảng thời gian quy định.
- Trạng thái giữ ghế được thể hiện chính xác khi truy vấn lại.
- Không nhầm ghế giữa các suất chiếu hoặc phòng chiếu.
- Việc chọn hoặc giữ ghế chưa thanh toán không được tự động ghi nhận là vé đã thanh toán.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh sơ đồ ghế trước và sau khi giữ, phản hồi API và dữ liệu lưu trữ liên quan sau khi kiểm thử.

**Lưu ý:**
- Chỉ chọn ghế trên giao diện chưa đủ để kết luận Backend đã giữ ghế thành công.
- Trạng thái giữ ghế có thể được quản lý bằng Redis hoặc kết hợp PostgreSQL, tùy thiết kế thực tế.
- Không mặc định ghế đang giữ phải có trạng thái tương ứng trong bảng `seats`.
- Nếu dịch vụ giữ ghế chưa hoạt động, ghi trạng thái Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.


### TC-013 – Kiểm tra hai tài khoản không thể giữ trùng cùng một ghế

- **Mã yêu cầu:** REQ-08
- **Chức năng:** Đặt vé – Chống giữ ghế trùng
- **Mục đích:** Kiểm tra khi hai khách hàng cùng yêu cầu giữ một ghế của cùng suất chiếu, hệ thống chỉ cho phép một yêu cầu giữ ghế thành công.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và dịch vụ giữ ghế hoạt động; có hai tài khoản khách hàng thử nghiệm khác nhau; có một suất chiếu trong tương lai với ít nhất một ghế trống; chưa có giao dịch hoặc lượt giữ ghế nào đang chiếm ghế được chọn.
- **Dữ liệu kiểm thử:** Tài khoản A, tài khoản B, cùng một suất chiếu và cùng một ghế trống (ví dụ A5 nếu tồn tại).

**Các bước thực hiện:**

1. Mở Google Chrome ở cửa sổ thông thường và đăng nhập tài khoản khách hàng A.
2. Mở cửa sổ Ẩn danh hoặc một trình duyệt khác và đăng nhập tài khoản khách hàng B.
3. Trên cả hai cửa sổ, chọn cùng một phim, rạp, ngày chiếu và giờ chiếu.
4. Mở sơ đồ ghế của cùng một suất chiếu trên cả hai cửa sổ.
5. Kiểm tra ghế dự định thử nghiệm đang trống trước khi gửi yêu cầu giữ ghế.
6. Trên cả hai cửa sổ, chọn cùng một ghế, ví dụ A5.
7. Mở Developer Tools, chọn Network và bộ lọc Fetch/XHR ở cả hai cửa sổ.
8. Thực hiện thao tác xác nhận giữ ghế ở hai cửa sổ gần như đồng thời.
9. Quan sát kết quả trên giao diện của tài khoản A và tài khoản B.
10. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API giữ ghế của từng tài khoản.
11. Ghi nhận tài khoản nào được giữ ghế thành công và tài khoản nào bị từ chối.
12. Tải lại sơ đồ ghế hoặc gọi API trạng thái ghế để kiểm tra trạng thái cuối cùng.
13. Kiểm tra dữ liệu đặt vé và trạng thái giữ ghế trong PostgreSQL hoặc dịch vụ lưu trữ tương ứng theo thiết kế.
14. Xác nhận không tồn tại hai lượt giữ ghế còn hiệu lực của hai tài khoản khác nhau đối với cùng ghế và cùng suất chiếu.

**Kết quả mong đợi:**

- Backend xử lý đúng các yêu cầu giữ ghế cạnh tranh.
- Tối đa một tài khoản được giữ thành công cùng một ghế trong cùng suất chiếu tại một thời điểm.
- Tài khoản còn lại nhận được phản hồi từ chối phù hợp với thiết kế, có thể là HTTP 409 Conflict.
- Frontend hiển thị thông báo ghế không còn khả dụng hoặc yêu cầu chọn ghế khác.
- Trạng thái ghế được cập nhật nhất quán khi truy vấn lại.
- Không phát sinh hai lượt giữ ghế còn hiệu lực hoặc hai vé hợp lệ trùng ghế trong cùng suất chiếu.
- Không tạo dữ liệu đặt vé trùng ngoài dự kiến trong PostgreSQL.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh hai cửa sổ trình duyệt, phản hồi API của từng tài khoản và dữ liệu trạng thái ghế sau khi kiểm thử.

**Lưu ý:**
- Hai tài khoản phải có phiên đăng nhập độc lập.
- Phải sử dụng cùng một ID suất chiếu và cùng một ID ghế.
- Thao tác bằng tay gần như đồng thời chỉ là kiểm thử cạnh tranh cơ bản, chưa chứng minh hệ thống an toàn với nhiều yêu cầu đồng thời ở mức tải cao.
- Nếu cần kiểm thử đồng thời chính xác hơn, sử dụng công cụ gửi yêu cầu API song song sau khi xác nhận cấu trúc API thực tế.
- Nếu Redis hoặc dịch vụ giữ ghế chưa hoạt động, ghi Blocked khi thực hiện kiểm thử và nêu rõ lý do.


### TC-014 – Kiểm tra tự động giải phóng ghế khi hết thời gian giữ

- **Mã yêu cầu:** REQ-09
- **Chức năng:** Đặt vé – Hết hạn giữ ghế
- **Mục đích:** Kiểm tra hệ thống tự động giải phóng ghế khi thời gian giữ ghế kết thúc mà khách hàng chưa thanh toán thành công.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và dịch vụ quản lý giữ ghế hoạt động; có hai tài khoản khách hàng thử nghiệm; có suất chiếu trong tương lai với ghế còn trống.
- **Dữ liệu kiểm thử:** Tài khoản A, tài khoản B, một suất chiếu hợp lệ và một ghế trống (ví dụ A5 nếu tồn tại). Thời gian giữ ghế lấy theo cấu hình thực tế của hệ thống.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng A.
3. Chọn một phim, rạp và suất chiếu trong tương lai.
4. Mở sơ đồ ghế và chọn một ghế đang trống.
5. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
6. Thực hiện thao tác xác nhận giữ ghế theo quy trình thực tế của website.
7. Kiểm tra yêu cầu giữ ghế được Backend chấp nhận.
8. Ghi lại thời điểm bắt đầu giữ ghế và thời điểm hết hạn nếu API có trả về.
9. Không thực hiện thanh toán.
10. Trước thời điểm hết hạn, dùng tài khoản B ở một phiên đăng nhập độc lập để kiểm tra ghế vẫn chưa thể được giữ bởi người khác.
11. Chờ đến khi hết thời gian giữ ghế theo cấu hình thực tế, cộng thêm khoảng thời gian xử lý cho phép nếu hệ thống có quy định.
12. Tải lại sơ đồ ghế hoặc gọi API trạng thái ghế để kiểm tra ghế đã được giải phóng.
13. Dùng tài khoản B thử giữ lại chính ghế đó trong cùng suất chiếu.
14. Kiểm tra phản hồi API giữ ghế của tài khoản B.
15. Mở pgAdmin và đối chiếu trạng thái đơn đặt vé trong database `nova_cinema_tester`, nếu hệ thống có lưu bản ghi liên quan.
16. Kiểm tra trạng thái giữ ghế trong Redis hoặc cơ chế lưu trữ tương ứng nếu có công cụ và quyền truy cập phù hợp.

**Kết quả mong đợi:**

- Tài khoản A giữ ghế thành công trong thời hạn được hệ thống quy định.
- Trong thời gian giữ ghế còn hiệu lực, tài khoản B không thể giữ trùng ghế đó.
- Khi thời gian giữ ghế kết thúc mà chưa thanh toán thành công, lượt giữ ghế của tài khoản A hết hiệu lực.
- Ghế được cập nhật trở lại trạng thái có thể đặt.
- Tài khoản B có thể giữ ghế sau khi lượt giữ cũ hết hiệu lực, nếu không có khách hàng khác giữ trước.
- Không phát hành vé đã thanh toán cho lượt giữ ghế hết hạn.
- Dữ liệu đặt vé và trạng thái ghế nhất quán theo thiết kế.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh trạng thái ghế trước khi hết hạn, sau khi hết hạn, phản hồi API và dữ liệu đặt vé liên quan.

**Lưu ý:**
- Không tự giả định thời gian giữ ghế là 5 phút; cần xác nhận cấu hình thực tế trước khi chạy.
- Nếu hệ thống sử dụng Redis để quản lý giữ ghế, không yêu cầu trạng thái giữ ghế phải nằm trực tiếp trong bảng `seats` của PostgreSQL.
- Nếu Redis hoặc dịch vụ phụ thuộc chưa hoạt động, đánh dấu Blocked khi tiến hành kiểm thử và ghi rõ nguyên nhân.
- Không tự ý sửa thời gian hệ thống hoặc xóa dữ liệu Redis để làm cho test case đạt.


### TC-015 – Kiểm tra hủy đơn đặt vé và giải phóng ghế

- **Mã yêu cầu:** REQ-09
- **Chức năng:** Đặt vé – Hủy đơn đặt vé
- **Mục đích:** Kiểm tra khi khách hàng hủy một đơn đặt vé chưa thanh toán, Backend cập nhật trạng thái đơn và giải phóng ghế theo quy định của hệ thống.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và dịch vụ giữ ghế hoạt động; có tài khoản khách hàng thử nghiệm; có suất chiếu trong tương lai với ghế còn trống; hệ thống cho phép hủy đơn ở trạng thái được chọn.
- **Dữ liệu kiểm thử:** Một đơn đặt vé thử nghiệm chưa thanh toán, có ID xác định và ít nhất một ghế đang được giữ.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng thử nghiệm.
3. Chọn một phim và suất chiếu trong tương lai.
4. Chọn một ghế còn trống và thực hiện quy trình giữ ghế.
5. Xác nhận Backend đã tạo lượt giữ ghế hoặc đơn đặt vé theo thiết kế.
6. Ghi lại ID đơn đặt vé nếu hệ thống trả về.
7. Không thực hiện thanh toán.
8. Mở trang quản lý đơn hoặc lịch sử đặt vé nếu website có hỗ trợ.
9. Tìm đơn đặt vé thử nghiệm vừa tạo.
10. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
11. Thực hiện thao tác Hủy đơn nếu giao diện có hỗ trợ.
12. Quan sát thông báo trên giao diện và phản hồi API hủy đơn.
13. Kiểm tra mã trạng thái HTTP và trạng thái đơn sau khi hủy.
14. Tải lại sơ đồ ghế của đúng suất chiếu.
15. Kiểm tra ghế vừa hủy có trở lại trạng thái có thể đặt hay không.
16. Dùng một tài khoản thử nghiệm khác để kiểm tra khả năng giữ lại ghế, nếu cần.
17. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
18. Truy vấn đơn đặt vé theo ID và kiểm tra trạng thái đơn, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
19. Đối chiếu trạng thái giữ ghế trong Redis hoặc cơ chế lưu trữ tương ứng nếu có quyền truy cập.
20. Xác nhận không có vé đã thanh toán được phát hành từ đơn vừa hủy.

**Kết quả mong đợi:**

- Khách hàng có thể hủy đơn nếu đơn đang ở trạng thái được hệ thống cho phép hủy.
- Frontend gửi yêu cầu hủy đúng ID đơn đặt vé đến Backend.
- Backend xử lý yêu cầu và trả về mã HTTP phù hợp với thiết kế.
- Đơn đặt vé được cập nhật sang trạng thái hủy tương ứng.
- Ghế đang được giữ bởi đơn đó được giải phóng theo quy định.
- Ghế có thể được khách hàng khác giữ lại nếu chưa có người khác đặt trước.
- Không phát hành vé thanh toán thành công cho đơn đã hủy.
- Thông tin đơn trong PostgreSQL và trạng thái ghế nhất quán.
- Không ảnh hưởng đến các đơn đặt vé hoặc ghế khác.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh đơn trước và sau khi hủy, phản hồi API, sơ đồ ghế và kết quả truy vấn PostgreSQL.

**Lưu ý:**
- Chỉ sử dụng đơn đặt vé thử nghiệm chưa thanh toán.
- Không mặc định mọi đơn đều được phép hủy; cần kiểm tra quy tắc hủy thực tế.
- Nếu website không có nút Hủy đơn, cần xác nhận chức năng API trước khi kiểm thử và ghi rõ giới hạn Frontend.
- Không hủy vé hoặc đơn đặt vé thật của người dùng khác.
- Nếu Redis hoặc dịch vụ giữ ghế chưa hoạt động, ghi Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.


### TC-016 – Kiểm tra thanh toán thành công và cập nhật trạng thái đơn, ghế

- **Mã yêu cầu:** REQ-10
- **Chức năng:** Đặt vé – Thanh toán thành công
- **Mục đích:** Kiểm tra khi thanh toán thành công, Frontend hiển thị kết quả chính xác, Backend cập nhật đơn đặt vé và hệ thống ghi nhận ghế đã bán, đồng thời phát hành vé theo thiết kế.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và dịch vụ giữ ghế hoạt động; có tài khoản khách hàng thử nghiệm; có suất chiếu tương lai với ghế còn trống; môi trường thanh toán sandbox đã được cấu hình và cho phép mô phỏng thanh toán thành công.
- **Dữ liệu kiểm thử:** Một tài khoản khách hàng thử nghiệm, một suất chiếu hợp lệ, một ghế trống và một đơn đặt vé chưa thanh toán. Sử dụng thanh toán sandbox, không dùng tiền thật.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng thử nghiệm.
3. Chọn một phim, rạp và suất chiếu trong tương lai.
4. Chọn một ghế đang trống và thực hiện thao tác giữ ghế.
5. Kiểm tra ghế được giữ thành công và ghi lại ID đơn đặt vé.
6. Quan sát số tiền thanh toán được hiển thị trên giao diện.
7. Nhấn F12 để mở Developer Tools, chọn Network và bộ lọc Fetch/XHR.
8. Chọn chức năng Thanh toán.
9. Kiểm tra yêu cầu tạo phiên hoặc đường dẫn thanh toán được gửi đến Backend.
10. Thực hiện thanh toán thành công bằng chức năng sandbox được hệ thống hỗ trợ.
11. Quan sát thông báo kết quả thanh toán trên giao diện.
12. Kiểm tra phản hồi API thanh toán và trạng thái đơn đặt vé sau khi Backend xác nhận giao dịch.
13. Mở trang lịch sử đặt vé hoặc danh sách vé của tài khoản nếu website có hỗ trợ.
14. Kiểm tra đơn vừa thanh toán có được ghi nhận thành công hay không.
15. Tải lại sơ đồ ghế của đúng suất chiếu và kiểm tra ghế đã thanh toán không còn khả dụng để đặt.
16. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
17. Truy vấn đơn đặt vé theo ID đã ghi nhận, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
18. Kiểm tra trạng thái thanh toán, trạng thái đơn, ghế liên quan và bản ghi vé nếu hệ thống có lưu.
19. Đối chiếu số tiền, ID đơn, ID suất chiếu và ID ghế giữa giao diện, API và PostgreSQL.
20. Tải lại trang lịch sử đặt vé để kiểm tra kết quả thanh toán vẫn được lưu.

**Kết quả mong đợi:**

- Frontend gửi yêu cầu thanh toán hợp lệ đến Backend.
- Thanh toán sandbox được xác nhận thành công theo đúng quy trình của hệ thống.
- Backend cập nhật trạng thái đơn và thanh toán thành công.
- PostgreSQL ghi nhận thông tin giao dịch và đơn đặt vé chính xác.
- Ghế đã thanh toán được ghi nhận là không còn khả dụng cho khách hàng khác trong cùng suất chiếu.
- Không tạo hai giao dịch thành công hoặc hai bộ vé ngoài dự kiến cho cùng một lần thanh toán.
- Vé được phát hành theo thiết kế sau khi thanh toán được xác nhận.
- Thông tin vé tương ứng với đúng khách hàng, phim, suất chiếu và ghế đã đặt.
- Giao diện hiển thị thông báo thanh toán thành công và thông tin đặt vé phù hợp.
- Dữ liệu vẫn tồn tại sau khi tải lại trang.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh kết quả thanh toán sandbox, phản hồi API đã che thông tin nhạy cảm, lịch sử đặt vé, trạng thái ghế và dữ liệu PostgreSQL.

**Lưu ý:**
- Chỉ thực hiện thanh toán trong môi trường sandbox, không sử dụng giao dịch tiền thật.
- Không tự giả lập phản hồi thanh toán thành công bằng cách sửa dữ liệu PostgreSQL.
- Phải xác nhận giao dịch thành công từ Backend, không chỉ dựa vào thông báo trên Frontend.
- Không mặc định trạng thái bán ghế được lưu trực tiếp trong bảng `seats`; cần đối chiếu thiết kế thực tế.
- Nếu môi trường thanh toán hoặc dịch vụ giữ ghế chưa hoạt động, đánh dấu Blocked khi tiến hành kiểm thử và ghi rõ nguyên nhân.


### TC-017 – Kiểm tra thanh toán thất bại và không phát hành vé

- **Mã yêu cầu:** REQ-11
- **Chức năng:** Đặt vé – Thanh toán thất bại
- **Mục đích:** Kiểm tra khi thanh toán thất bại, Backend không ghi nhận đơn đã thanh toán thành công, không phát hành vé hợp lệ và xử lý trạng thái ghế theo đúng thiết kế.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và dịch vụ giữ ghế hoạt động; có tài khoản khách hàng thử nghiệm; có suất chiếu tương lai với ghế còn trống; môi trường thanh toán sandbox hỗ trợ tình huống thanh toán thất bại.
- **Dữ liệu kiểm thử:** Một đơn đặt vé thử nghiệm chưa thanh toán, một ghế đang được giữ và tình huống thanh toán thất bại được sandbox hỗ trợ. Không sử dụng tiền thật.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng thử nghiệm.
3. Chọn một phim, rạp và suất chiếu trong tương lai.
4. Chọn một ghế còn trống và thực hiện thao tác giữ ghế.
5. Ghi lại ID đơn đặt vé và ID ghế nếu hệ thống trả về.
6. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
7. Chọn chức năng Thanh toán.
8. Kiểm tra yêu cầu tạo phiên hoặc đường dẫn thanh toán được gửi đến Backend.
9. Trong môi trường sandbox, thực hiện tình huống thanh toán thất bại theo cách được hệ thống hỗ trợ.
10. Quan sát thông báo kết quả thanh toán trên giao diện.
11. Kiểm tra phản hồi API hoặc trạng thái giao dịch được Backend ghi nhận.
12. Mở trang lịch sử đặt vé hoặc danh sách đơn của tài khoản nếu website có hỗ trợ.
13. Kiểm tra trạng thái đơn vừa thanh toán thất bại.
14. Mở danh sách vé của tài khoản và kiểm tra không có vé hợp lệ mới được phát hành từ giao dịch thất bại.
15. Tải lại sơ đồ ghế của đúng suất chiếu.
16. Kiểm tra trạng thái ghế sau giao dịch thất bại theo quy tắc giữ ghế thực tế.
17. Mở pgAdmin và kết nối đến database `nova_cinema_tester`.
18. Truy vấn đơn đặt vé theo ID đã ghi nhận, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
19. Đối chiếu trạng thái đơn, giao dịch thanh toán và bản ghi vé liên quan.
20. Tải lại trang lịch sử đặt vé để kiểm tra trạng thái thất bại vẫn được hiển thị chính xác.

**Kết quả mong đợi:**

- Frontend nhận được kết quả thanh toán thất bại và hiển thị thông báo phù hợp.
- Backend không cập nhật giao dịch thất bại thành thanh toán thành công.
- Đơn đặt vé có trạng thái phù hợp với quy trình thanh toán thất bại của hệ thống.
- PostgreSQL không ghi nhận giao dịch thất bại là giao dịch đã thanh toán thành công.
- Không phát hành vé hợp lệ cho đơn chưa thanh toán thành công.
- Ghế không bị ghi nhận là đã bán do giao dịch thất bại.
- Nếu hệ thống cho phép giữ ghế để thanh toán lại, ghế chỉ tiếp tục được giữ trong thời hạn hợp lệ.
- Nếu hệ thống hủy đơn hoặc giải phóng ghế sau thanh toán thất bại, trạng thái ghế được cập nhật đúng theo thiết kế.
- Không ảnh hưởng đến các đơn đặt vé hoặc giao dịch khác.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh thông báo thanh toán thất bại, phản hồi API đã che dữ liệu nhạy cảm, lịch sử đơn, danh sách vé và kết quả truy vấn PostgreSQL.

**Lưu ý:**
- Chỉ thực hiện giao dịch trong môi trường sandbox.
- Không tự sửa phản hồi thanh toán hoặc dữ liệu PostgreSQL để tạo kết quả giả.
- Không mặc định ghế phải được giải phóng ngay sau khi thanh toán thất bại; cần đối chiếu quy tắc thực tế.
- Không kết luận thanh toán thất bại chỉ vì Frontend hiển thị lỗi; phải kiểm tra trạng thái Backend và PostgreSQL.
- Nếu sandbox chưa hỗ trợ mô phỏng giao dịch thất bại, ghi Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.


### TC-018 – Kiểm tra mã QR và thông tin vé sau khi thanh toán thành công

- **Mã yêu cầu:** REQ-12
- **Chức năng:** Vé điện tử – Hiển thị thông tin vé và mã QR
- **Mục đích:** Kiểm tra sau khi thanh toán thành công, hệ thống phát hành vé điện tử với thông tin chính xác và mã QR tương ứng với vé đã đặt.
- **Điều kiện trước:** Frontend, Backend, PostgreSQL và các dịch vụ liên quan hoạt động; có tài khoản khách hàng thử nghiệm; đã có một đơn đặt vé được thanh toán thành công bằng sandbox; hệ thống đã phát hành vé cho đơn đó.
- **Dữ liệu kiểm thử:** Một vé thử nghiệm đã thanh toán, có ID vé, ID đơn đặt vé, phim, suất chiếu và ghế xác định.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng đã thực hiện thanh toán thử nghiệm.
3. Mở mục Vé của tôi hoặc lịch sử đặt vé theo giao diện thực tế.
4. Tìm đơn đặt vé đã thanh toán thành công.
5. Mở phần chi tiết vé điện tử.
6. Ghi nhận mã vé, tên phim, rạp, phòng chiếu, ngày giờ chiếu và số ghế được hiển thị.
7. Kiểm tra vé có hiển thị mã QR hay không nếu đây là chức năng được thiết kế.
8. Nhấn F12, mở Developer Tools và chọn Network, bộ lọc Fetch/XHR.
9. Tải lại trang chi tiết vé và quan sát yêu cầu lấy thông tin vé từ Backend.
10. Kiểm tra mã trạng thái HTTP và nội dung phản hồi API.
11. Đối chiếu ID vé, ID đơn, phim, suất chiếu và ghế giữa giao diện với dữ liệu API.
12. Nếu hệ thống có chức năng xác minh QR, sử dụng chức năng kiểm tra vé được cấp quyền để xác nhận mã QR tương ứng với đúng vé.
13. Mở pgAdmin và kết nối đến database `nova_cinema_tester`.
14. Truy vấn bản ghi vé, đơn đặt vé và thông tin liên quan theo ID, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
15. Đối chiếu thông tin trong PostgreSQL với thông tin vé hiển thị.
16. Tải lại trang chi tiết vé và kiểm tra mã vé cùng thông tin vé vẫn nhất quán.
17. Kiểm tra không xuất hiện vé hợp lệ trùng ngoài dự kiến cho cùng một lượt đặt vé.

**Kết quả mong đợi:**

- Vé điện tử được phát hành sau khi Backend xác nhận thanh toán thành công.
- Vé hiển thị đúng tên phim, rạp, phòng chiếu, ngày giờ và ghế đã đặt.
- Mã vé hoặc ID vé tương ứng với bản ghi vé trong hệ thống.
- Mã QR được hiển thị đúng theo thiết kế và liên kết với vé tương ứng.
- Nếu có chức năng xác minh QR, hệ thống nhận diện được đúng vé hợp lệ.
- Dữ liệu vé trên Frontend, phản hồi API và PostgreSQL nhất quán.
- Thông tin vé vẫn chính xác sau khi tải lại trang.
- Không tạo thêm vé hợp lệ ngoài dự kiến.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh chi tiết vé, trạng thái phản hồi API và kết quả truy vấn PostgreSQL sau khi kiểm thử. Che mã QR và mã xác thực vé khi chia sẻ công khai.

**Lưu ý:**
- Không mặc định mã QR chứa trực tiếp toàn bộ thông tin vé; nội dung QR phải tuân theo thiết kế thực tế.
- Không sử dụng mã QR của vé thật để kiểm thử hoặc chia sẻ công khai.
- Nếu hệ thống chỉ hiển thị QR mà chưa có chức năng quét hoặc xác minh, ghi rõ giới hạn kiểm thử.
- Không tự kết luận QR hợp lệ chỉ vì hình ảnh QR xuất hiện trên giao diện.
- Nếu chưa tạo được vé thanh toán thành công do môi trường chưa hoạt động, đánh dấu Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.


### TC-019 – Kiểm tra dữ liệu đặt vé vẫn tồn tại sau khi tải lại trang

- **Mã yêu cầu:** REQ-13
- **Chức năng:** Đặt vé – Lưu trữ và khôi phục dữ liệu
- **Mục đích:** Kiểm tra thông tin đơn đặt vé đã thanh toán thành công vẫn được lưu và hiển thị chính xác khi khách hàng tải lại trang hoặc đăng nhập lại.
- **Điều kiện trước:** Frontend, Backend và PostgreSQL hoạt động; có tài khoản khách hàng thử nghiệm; tài khoản đã có ít nhất một đơn đặt vé thanh toán thành công và vé điện tử tương ứng.
- **Dữ liệu kiểm thử:** Một tài khoản khách hàng thử nghiệm và một đơn đặt vé đã thanh toán thành công có ID xác định.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Đăng nhập bằng tài khoản khách hàng thử nghiệm.
3. Mở mục Vé của tôi hoặc lịch sử đặt vé theo giao diện thực tế.
4. Tìm một đơn đặt vé đã thanh toán thành công.
5. Ghi lại ID đơn, mã vé, tên phim, rạp, phòng chiếu, ngày giờ chiếu, số ghế và trạng thái thanh toán.
6. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
7. Nhấn Ctrl + R hoặc nút Tải lại để tải lại trang.
8. Quan sát website có tải lại danh sách đơn hoặc vé thành công hay không.
9. Kiểm tra đơn đặt vé trước đó vẫn xuất hiện và có thông tin không thay đổi.
10. Mở lại chi tiết vé để kiểm tra mã vé, phim, suất chiếu và ghế.
11. Đăng xuất khỏi tài khoản nếu website có hỗ trợ.
12. Đăng nhập lại bằng chính tài khoản vừa sử dụng.
13. Mở lại mục Vé của tôi hoặc lịch sử đặt vé.
14. Kiểm tra đơn đặt vé và vé điện tử vẫn được hiển thị chính xác.
15. Quan sát yêu cầu API lấy lịch sử đơn hoặc danh sách vé trong tab Network.
16. Kiểm tra mã trạng thái HTTP và dữ liệu API trả về.
17. Mở pgAdmin, kết nối đến database `nova_cinema_tester`.
18. Truy vấn đơn đặt vé và bản ghi vé theo ID đã ghi nhận, sử dụng đúng tên bảng và cột trong Prisma schema thực tế.
19. Đối chiếu dữ liệu giữa giao diện, phản hồi API và PostgreSQL.
20. Xác nhận thao tác tải lại trang hoặc đăng nhập lại không tạo thêm đơn đặt vé hoặc vé trùng ngoài dự kiến.

**Kết quả mong đợi:**

- Đơn đặt vé đã thanh toán thành công vẫn tồn tại sau khi tải lại trang.
- Sau khi đăng nhập lại, khách hàng vẫn xem được lịch sử đặt vé thuộc tài khoản của mình.
- Thông tin phim, rạp, phòng, suất chiếu, ghế và mã vé không bị thay đổi.
- Trạng thái thanh toán vẫn được ghi nhận chính xác.
- Frontend lấy lại dữ liệu từ Backend theo quy trình thực tế.
- PostgreSQL vẫn lưu đúng đơn đặt vé và vé tương ứng.
- Không xuất hiện đơn đặt vé hoặc vé trùng do thao tác tải lại trang.
- Không hiển thị dữ liệu đặt vé của tài khoản khách hàng khác.
- Website không bị lỗi hoặc ngừng hoạt động.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh lịch sử đặt vé trước và sau khi tải lại, sau khi đăng nhập lại, phản hồi API và kết quả truy vấn PostgreSQL.

**Lưu ý:**
- Chỉ kiểm tra dữ liệu của đơn đã thanh toán thành công; không mặc định lượt giữ ghế tạm thời phải tồn tại sau khi hết hạn.
- Không tự tạo dữ liệu trực tiếp trong PostgreSQL để thay thế quy trình đặt vé thực tế.
- Nếu website chưa có chức năng đăng xuất hoặc lịch sử đặt vé, ghi rõ phần chưa hỗ trợ khi kiểm thử.
- Nếu chưa tạo được đơn thanh toán thành công do dịch vụ phụ thuộc chưa hoạt động, đánh dấu Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.

### TC-020 – Kiểm tra Frontend hiển thị thông báo khi API trả về lỗi

- **Mã yêu cầu:** REQ-14
- **Chức năng:** Xử lý lỗi – Frontend và Backend API
- **Mục đích:** Kiểm tra khi API trả về lỗi, Frontend thông báo phù hợp, không hiển thị kết quả thành công sai và cho phép người dùng tiếp tục thao tác khi có thể.
- **Điều kiện trước:** Website NOVA Cinema và Backend đang hoạt động; có tài khoản khách hàng thử nghiệm; có thể sử dụng một chức năng gọi API như xem danh sách phim hoặc tải sơ đồ ghế.
- **Dữ liệu kiểm thử:** Một yêu cầu API hợp lệ và một tình huống lỗi được tạo trong môi trường thử nghiệm bằng phương pháp an toàn, chẳng hạn chặn yêu cầu bằng Developer Tools.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Truy cập trang danh sách phim và xác nhận dữ liệu hiển thị bình thường khi API hoạt động.
3. Nhấn F12 để mở Developer Tools.
4. Chọn tab Network và bộ lọc Fetch/XHR.
5. Tải lại trang và xác định yêu cầu API dùng để lấy danh sách phim.
6. Ghi nhận đường dẫn API và mã trạng thái HTTP khi yêu cầu thành công.
7. Sử dụng tính năng Network request blocking của Chrome DevTools để chặn đúng yêu cầu API vừa xác định.
8. Tải lại trang hoặc thực hiện lại thao tác tải danh sách phim.
9. Quan sát giao diện khi yêu cầu API bị chặn.
10. Kiểm tra website có hiển thị thông báo lỗi hoặc trạng thái không tải được dữ liệu hay không.
11. Kiểm tra giao diện có bị treo, xuất hiện nội dung sai hoặc báo tải thành công nhầm hay không.
12. Kiểm tra tab Network và Console để ghi nhận thông tin lỗi.
13. Tắt tính năng chặn yêu cầu API.
14. Tải lại trang hoặc sử dụng nút Thử lại nếu website có hỗ trợ.
15. Kiểm tra danh sách phim có được tải lại bình thường hay không.
16. Nếu môi trường kiểm thử có sẵn tình huống Backend trả về HTTP 4xx hoặc 5xx, thực hiện kiểm tra bổ sung và ghi nhận cách Frontend xử lý.
17. Chụp ảnh màn hình giao diện khi xảy ra lỗi và sau khi khôi phục.

**Kết quả mong đợi:**

- Frontend phát hiện yêu cầu API không thành công.
- Giao diện hiển thị thông báo phù hợp hoặc trạng thái không thể tải dữ liệu.
- Không hiển thị thông báo thành công sai khi API bị lỗi.
- Không tự tạo dữ liệu phim hoặc dữ liệu đặt vé giả để thay thế kết quả API.
- Không để website bị treo hoặc ngừng phản hồi hoàn toàn.
- Người dùng có thể tải lại hoặc thử lại khi kết nối được khôi phục.
- Sau khi bỏ chặn yêu cầu, chức năng hoạt động trở lại bình thường.
- Không làm thay đổi dữ liệu đặt vé hoặc dữ liệu PostgreSQL ngoài dự kiến.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh thông báo lỗi, tab Network hoặc Console và giao diện sau khi khôi phục.

**Lưu ý:**
- Chặn yêu cầu bằng DevTools tạo lỗi mạng ở phía trình duyệt, không đồng nghĩa với Backend thực sự trả về HTTP 500.
- Để xác nhận khả năng xử lý HTTP 4xx hoặc 5xx, cần kiểm thử riêng với phản hồi lỗi thực tế trong môi trường được phép.
- Không chỉnh sửa mã nguồn hoặc cố ý làm sập Backend đang được nhóm sử dụng.
- Không kết luận Pass nếu giao diện chỉ hiện màn hình trắng hoặc không có phản hồi rõ ràng.
- Nếu website chưa hoạt động, ghi Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.

### TC-021 – Kiểm tra xử lý lỗi khi PostgreSQL không khả dụng

- **Mã yêu cầu:** REQ-15
- **Chức năng:** Xử lý lỗi – Backend và PostgreSQL
- **Mục đích:** Kiểm tra khi Backend không thể truy cập PostgreSQL, hệ thống xử lý lỗi phù hợp, không trả về kết quả thành công sai và có thể khôi phục hoạt động sau khi kết nối cơ sở dữ liệu được phục hồi.
- **Điều kiện trước:** Có môi trường kiểm thử riêng được phép kiểm soát; Frontend, Backend và PostgreSQL hoạt động bình thường trước khi thử nghiệm; có tài khoản kiểm thử; đã sao lưu hoặc có khả năng khôi phục môi trường nếu cần.
- **Dữ liệu kiểm thử:** Một yêu cầu API cần truy cập PostgreSQL, ví dụ lấy danh sách phim hoặc truy vấn thông tin đặt vé. Sử dụng dữ liệu thử nghiệm, không sử dụng đơn đặt vé thật.

**Các bước thực hiện:**

1. Mở website NOVA Cinema bằng Google Chrome.
2. Truy cập trang danh sách phim hoặc chức năng khác có sử dụng dữ liệu PostgreSQL.
3. Xác nhận chức năng hoạt động bình thường trước khi tạo tình huống lỗi.
4. Nhấn F12, mở Developer Tools và chọn tab Network, bộ lọc Fetch/XHR.
5. Ghi lại đường dẫn API, mã trạng thái HTTP và kết quả trả về khi hoạt động bình thường.
6. Xác nhận đang sử dụng môi trường kiểm thử riêng, không ảnh hưởng đến cơ sở dữ liệu hoặc Backend chung của nhóm.
7. Với sự cho phép của người phụ trách môi trường, tạo tình huống Backend không thể truy cập PostgreSQL bằng phương pháp thử nghiệm đã được thống nhất.
8. Thực hiện lại yêu cầu API cần truy cập cơ sở dữ liệu.
9. Quan sát mã trạng thái HTTP và nội dung phản hồi API.
10. Kiểm tra Backend có trả về thông báo lỗi phù hợp thay vì dữ liệu thành công không chính xác hay không.
11. Quan sát Frontend có hiển thị thông báo không thể tải dữ liệu hoặc lỗi hệ thống hay không.
12. Kiểm tra website có bị treo hoặc hiển thị dữ liệu sai hay không.
13. Kiểm tra phản hồi API có vô tình tiết lộ mật khẩu, chuỗi kết nối hoặc thông tin nội bộ nhạy cảm hay không.
14. Khôi phục kết nối PostgreSQL theo quy trình của môi trường kiểm thử.
15. Thực hiện lại yêu cầu API ban đầu.
16. Kiểm tra chức năng có hoạt động bình thường sau khi kết nối được phục hồi hay không.
17. Mở pgAdmin và kiểm tra dữ liệu thử nghiệm liên quan không bị thay đổi ngoài dự kiến.
18. Ghi lại thời điểm lỗi, thời điểm khôi phục, mã trạng thái HTTP và ảnh minh chứng.

**Kết quả mong đợi:**

- Khi PostgreSQL không khả dụng, Backend không trả về kết quả thành công sai cho yêu cầu cần truy cập cơ sở dữ liệu.
- API trả về mã trạng thái lỗi phù hợp với thiết kế, thường thuộc nhóm HTTP 5xx.
- Frontend hiển thị thông báo lỗi hoặc trạng thái không thể tải dữ liệu.
- Website không bị treo hoặc ngừng phản hồi hoàn toàn.
- Phản hồi API không làm lộ thông tin kết nối PostgreSQL, mật khẩu hoặc dữ liệu nhạy cảm.
- Không ghi nhận thành công giả cho thao tác lưu hoặc cập nhật dữ liệu.
- Không phát sinh thay đổi dữ liệu ngoài dự kiến.
- Sau khi PostgreSQL được khôi phục, hệ thống có thể tiếp tục xử lý yêu cầu theo quy trình vận hành.
- Dữ liệu Frontend, Backend và PostgreSQL nhất quán sau khi khôi phục.

**Kết quả thực tế:** Chưa kiểm thử.

**Trạng thái:** Not Run.

**Minh chứng:** Chưa có. Bổ sung ảnh Network khi API lỗi, thông báo trên Frontend, kết quả sau khi khôi phục và dữ liệu PostgreSQL liên quan.

**Lưu ý:**
- Không tự ý dừng PostgreSQL hoặc thay đổi cấu hình Backend đang được các thành viên khác sử dụng.
- Chỉ tạo lỗi kết nối trên môi trường kiểm thử riêng, sau khi xác nhận có quyền thực hiện và cách khôi phục.
- Không đăng tải mật khẩu, DATABASE_URL hoặc thông tin bí mật vào ảnh minh chứng hay GitHub.
- Chặn API bằng Chrome DevTools chỉ mô phỏng lỗi mạng ở Frontend, không chứng minh Backend xử lý được lỗi PostgreSQL.
- Nếu chưa có môi trường kiểm thử an toàn hoặc Backend chưa khởi động được, ghi Blocked khi tiến hành kiểm thử và nêu rõ nguyên nhân.
