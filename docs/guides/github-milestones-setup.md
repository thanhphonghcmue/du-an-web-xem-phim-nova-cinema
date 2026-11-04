# 🚀 HƯỚNG DẪN KHỞI TẠO HỆ THỐNG GITHUB MILESTONES & THANH TIẾN TRÌNH 5 THÀNH VIÊN

Tài liệu hướng dẫn tự động hóa thiết lập **5 Thanh tiến trình Milestone nằm ngang** trên GitHub Repository `thanhphonghcmue/du-an-web-xem-phim-nova-cinema` theo chuẩn Agile / Scrum chuyên nghiệp.

---

## 👥 Danh sách 5 Milestones & Phân công Thành viên

| STT | Tên Milestone trên GitHub | Tài khoản GitHub | Vai trò chuyên trách | Các Issues nhiệm vụ trọng tâm |
| :-: | :--- | :---: | :--- | :--- |
| **1** | `[Lâm Thanh Phong] Progress Bar - FR Lead & Booking Engine` | `@thanhphonghcmue` | **FR Lead & Fullstack Lead** | • Monorepo Clean Architecture<br>• Khóa ghế 5 phút (`CR-01 / BR01`)<br>• Chống trùng ghế Mutex 409<br>• Cổng thanh toán Sandbox Momo/VNPay |
| **2** | `[Phạm Ngọc Mỹ Huyền] Progress Bar - BA Lead & Requirements` | `@huij3n` | **BA Lead & Requirements** | • Tổng thể Use Case Diagram<br>• Đặc tả chi tiết Ca sử dụng `CR-01`<br>• Ma trận 5 Quy tắc cốt lõi `BR01–BR05`<br>• Rà soát phân hệ Khách hàng (`UC01–UC10`) |
| **3** | `[Nguyễn Bình Phương Mi] Progress Bar - Survey Lead & UI System` | `@nbpm06` | **Survey Lead & UI System** | • Khảo sát hành vi người dùng & Obsidian Dark UI<br>• 25 Màn hình Full HD Figma native<br>• Kịch bản Prototype 120+ dây không điểm cụt<br>• Giao diện Soát vé QR 3 trạng thái (`UC14`) |
| **4** | `[Thạch Võ Diễm Ngọc] Progress Bar - Modeling Lead & Database` | `@thanhphonghcmue` *(Đại diện)* | **Modeling Lead & Database** | • Sơ đồ ERD 3NF PostgreSQL<br>• Cấu hình Prisma Schema 24 Phim & Suất chiếu<br>• Activity Diagram & BPMN 3 Lane thanh toán<br>• Xử lý Timeout và hoàn trả ghế (`BR04`) |
| **5** | `[Phùng Thị Mỹ Quyên] Progress Bar - QA Lead & Testing` | `@Ptmq-sptinB` | **QA Lead & Testing** | • Ma trận Test Cases `TC-01` đến `TC-05`<br>• Suite 35 bài Unit & Contract Tests PASS 100%<br>• Kiểm thử quét QR Camera jsQR âm thanh thực<br>• Kế hoạch và Biên bản Nghiệm thu UAT LAB04 |

---

## 🛠️ Hướng dẫn Chạy Kịch bản Tự động (Terminal)

### Cách 1: Sử dụng GitHub CLI (`gh`) — Khuyến nghị (Đơn giản nhất)

1. Mở PowerShell hoặc Terminal tại thư mục gốc dự án:
```powershell
# 1. Đăng nhập GitHub (nếu chưa đăng nhập)
gh auth login

# 2. Chạy lệnh tự động hóa 1 bước:
npm run milestones:setup
```

Hoặc chạy trực tiếp script:
```powershell
node scripts/setup-github-milestones.mjs
```

---

### Cách 2: Sử dụng GitHub Personal Access Token (PAT)

Nếu bạn chạy trên máy chủ CI/CD (GitHub Actions) hoặc không cài GitHub CLI:

1. Tạo Personal Access Token tại [GitHub Settings ➔ Developer Settings ➔ Personal access tokens](https://github.com/settings/tokens) (chọn quyền `repo`).
2. Gán biến môi trường trong Terminal:
```powershell
# Trên Windows PowerShell:
$env:GITHUB_TOKEN="ghp_your_personal_access_token_here"
node scripts/setup-github-milestones.mjs

# Trên Linux / macOS / Git Bash:
export GITHUB_TOKEN="ghp_your_personal_access_token_here"
node scripts/setup-github-milestones.mjs
```

---

## 🎛️ Các Tùy chọn Trạng thái Tiến độ (`--status`)

Script hỗ trợ 3 chế độ hiển thị thanh tiến độ nằm ngang:

| Tùy chọn Lệnh | Mô tả hiển thị trên GitHub | Mục đích sử dụng |
| :--- | :--- | :--- |
| `node scripts/setup-github-milestones.mjs --status=completed` *(Mặc định)* | **100% Complete** (Tất cả Issues hoàn thành) | Nghiệm thu và chấm điểm cuối kỳ LAB04 |
| `node scripts/setup-github-milestones.mjs --status=in-progress` | **75% Complete** (Đóng 3 issues, giữ mở 1 issue) | Minh họa nhóm đang chạy Sprint thực tế |
| `node scripts/setup-github-milestones.mjs --status=open` | **0% Complete** (Tất cả Issues đang mở) | Bắt đầu giao việc đầu Sprint |

---

## 🌐 Kiểm tra Kết quả trên GitHub

Sau khi kịch bản chạy xong, truy cập trực tiếp trang Milestones của dự án:  
👉 **[https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/milestones](https://github.com/thanhphonghcmue/du-an-web-xem-phim-nova-cinema/milestones)**

Bạn sẽ thấy **5 Thanh tiến trình nằm ngang** hiển thị trực quan tỷ lệ hoàn thành công việc của từng thành viên trong nhóm!
