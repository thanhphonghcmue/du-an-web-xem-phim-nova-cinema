#!/usr/bin/env node

/**
 * 🚀 NOVA CINEMA - AUTOMATED GITHUB MILESTONES & ISSUE PROGRESS TRACKER
 * 
 * Tự động khởi tạo hệ thống 5 Thanh tiến trình Milestone nằm ngang trên GitHub Repository:
 * Repository: thanhphonghcmue/du-an-web-xem-phim-nova-cinema
 * 
 * Hỗ trợ chạy trực tiếp qua GitHub CLI (`gh`) hoặc Personal Access Token (`GITHUB_TOKEN`).
 */

import { execSync } from 'child_process';

const REPO_OWNER = 'thanhphonghcmue';
const REPO_NAME = 'du-an-web-xem-phim-nova-cinema';
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;

// Parse CLI flags
const args = process.argv.slice(2);
const statusArg = args.find(a => a.startsWith('--status='))?.split('=')[1] || 'completed'; // 'completed' | 'in-progress' | 'open'

console.log('='.repeat(75));
console.log('🎬 NOVA CINEMA (INFINITY) - GITHUB MILESTONES & PROGRESS TRACKER SETUP');
console.log(`📦 Repository: ${REPO_FULL}`);
console.log(`🎯 Chế độ trạng thái Issue: ${statusArg.toUpperCase()}`);
console.log('='.repeat(75));

// Check authentication
function checkAuth() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    return { type: 'token', token };
  }
  try {
    const status = execSync('gh auth status', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (status.includes('Logged in to github.com')) {
      return { type: 'gh-cli' };
    }
  } catch (err) {
    // gh CLI not authenticated
  }
  console.error('\n❌ Lỗi xác thực GitHub:');
  console.error('Vui lòng đăng nhập qua GitHub CLI bằng lệnh: gh auth login');
  console.error('Hoặc gán biến môi trường: $env:GITHUB_TOKEN="ghp_xxx" (PowerShell) / export GITHUB_TOKEN="ghp_xxx" (Bash)');
  process.exit(1);
}

const auth = checkAuth();
console.log(`✅ Xác thực GitHub: ${auth.type === 'token' ? 'Personal Access Token' : 'GitHub CLI (gh)'}`);

// Helper to execute gh or API call
function ghApi(endpoint, method = 'GET', data = null) {
  let cmd = `gh api repos/${REPO_FULL}/${endpoint}`;
  if (method === 'POST') {
    cmd += ' -X POST';
    if (data) {
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined && val !== null) {
          cmd += ` -f ${key}="${String(val).replace(/"/g, '\\"')}"`;
        }
      }
    }
  }
  try {
    const res = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return JSON.parse(res);
  } catch (err) {
    return null;
  }
}

// 5 Milestones Configuration
const MILESTONE_DEFINITIONS = [
  {
    number: 1,
    title: '[Lâm Thanh Phong] Progress Bar - FR Lead & Booking Engine',
    description: 'Tiến độ phân hệ Booking Engine, Khóa ghế 5 phút (CR-01), Chống trùng ghế Concurrency Mutex & Kiến trúc Monorepo - Phụ trách: Lâm Thanh Phong',
    assignee: 'thanhphonghcmue',
    fallbackAssignee: 'thanhphonghcmue',
    issues: [
      {
        tag: 'FR-01',
        title: '[FR-01] Thiết lập kiến trúc Monorepo Next.js 14 và NestJS 10 Clean Architecture',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thiết lập kiến trúc Monorepo Clean Architecture phân tách rõ rệt giữa Frontend (Next.js 14 App Router) và Backend (NestJS 10).
- Chuẩn hóa TypeScript Path Aliases và bộ scripts khởi chạy đồng thời trên cổng 3000 và 4000.

### 👤 Phụ trách:
- **Thành viên:** Lâm Thanh Phong (FR Lead & Fullstack Lead)
- **Tài khoản GitHub:** @thanhphonghcmue`,
        labels: ['role:fr-lead', 'type:architecture', 'priority:high']
      },
      {
        tag: 'FR-02',
        title: '[FR-02] Hiện thực cơ chế Khóa ghế 5 phút (CR-01 / BR01 Countdown Engine)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Xây dựng Booking Engine với bộ đếm ngược 300 giây (5 phút) cho các ghế VIP/Ghế đôi.
- Tự động hủy đơn hàng và hoàn trả ghế về trạng thái sẵn sàng khi đồng hồ đếm ngược về 0 theo quy tắc BR01 và BR04.

### 👤 Phụ trách:
- **Thành viên:** Lâm Thanh Phong (FR Lead & Fullstack Lead)
- **Tài khoản GitHub:** @thanhphonghcmue`,
        labels: ['role:fr-lead', 'type:feature', 'priority:high']
      },
      {
        tag: 'FR-03',
        title: '[FR-03] Xử lý tranh chấp phòng chiếu & Chống trùng ghế Race Condition (HTTP 409 Conflict)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Hiện thực cơ chế Concurrency Locking / Mutex trong In-Memory Database.
- Ngăn chặn triệt để 2 khách hàng chọn cùng 1 ghế tại cùng 1 mili-giây, trả về mã lỗi HTTP 409 Seat Conflict rõ ràng.

### 👤 Phụ trách:
- **Thành viên:** Lâm Thanh Phong (FR Lead & Fullstack Lead)
- **Tài khoản GitHub:** @thanhphonghcmue`,
        labels: ['role:fr-lead', 'type:feature', 'priority:high']
      },
      {
        tag: 'FR-04',
        title: '[FR-04] Tích hợp Cổng thanh toán Sandbox Momo & VNPay với Callback Signature',
        body: `### 📌 Mục tiêu nhiệm vụ
- Tích hợp cổng thanh toán mô phỏng Sandbox hỗ trợ quét mã QR và xác thực OTP.
- Xác thực tính toàn vẹn giao dịch với mã HMAC SHA256 Signature, tự động xuất vé điện tử sau khi thanh toán thành công.

### 👤 Phụ trách:
- **Thành viên:** Lâm Thanh Phong (FR Lead & Fullstack Lead)
- **Tài khoản GitHub:** @thanhphonghcmue`,
        labels: ['role:fr-lead', 'type:feature', 'priority:high']
      }
    ]
  },
  {
    number: 2,
    title: '[Phạm Ngọc Mỹ Huyền] Progress Bar - BA Lead & Requirements',
    description: 'Tiến độ phân tích yêu cầu nghiệp vụ, Đặc tả Ca sử dụng CR-01 & Ma trận Business Rules BR01-BR05 - Phụ trách: Phạm Ngọc Mỹ Huyền',
    assignee: 'huij3n',
    fallbackAssignee: 'thanhphonghcmue',
    issues: [
      {
        tag: 'BA-01',
        title: '[BA-01] Khảo sát yêu cầu nghiệp vụ rạp chiếu phim & Xây dựng Tổng thể Use Case Diagram',
        body: `### 📌 Mục tiêu nhiệm vụ
- Khảo sát bài toán chuỗi rạp chiếu phim hiện đại (đặt vé online, giữ ghế, bắp nước, soát vé).
- Xây dựng sơ đồ Use Case Diagram tổng thể phân bổ cho 5 Tác nhân (Customer, C'MEMBER, Staff, Admin, Payment Sandbox).

### 👤 Phụ trách:
- **Thành viên:** Phạm Ngọc Mỹ Huyền (BA Lead & Requirements)
- **Tài khoản GitHub:** @huij3n`,
        labels: ['role:ba-lead', 'type:documentation', 'priority:high']
      },
      {
        tag: 'BA-02',
        title: '[BA-02] Biên soạn Đặc tả chi tiết Ca sử dụng Đặt vé & Khóa ghế (CR-01 Specification)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Viết tài liệu đặc tả chi tiết cho Ca sử dụng CR-01 (Đặt vé xem phim trực tuyến).
- Mô tả chi tiết Luồng sự kiện chính (Main Flow), Luồng sự kiện thay thế (Alt Flow) và Ngoại lệ (Exception Flow).

### 👤 Phụ trách:
- **Thành viên:** Phạm Ngọc Mỹ Huyền (BA Lead & Requirements)
- **Tài khoản GitHub:** @huij3n`,
        labels: ['role:ba-lead', 'type:documentation', 'priority:high']
      },
      {
        tag: 'BA-03',
        title: '[BA-03] Thiết lập Ma trận Quy tắc nghiệp vụ cốt lõi BR01 đến BR05',
        body: `### 📌 Mục tiêu nhiệm vụ
- Xây dựng bảng ma trận 5 quy tắc nghiệp vụ vàng của hệ thống:
  - BR01: Giữ ghế tối đa 5 phút.
  - BR02: Bắt buộc chọn vé xem phim trước khi mua Combo bắp nước.
  - BR03: Giãn cách 15 phút giữa 2 suất chiếu cùng phòng để vệ sinh.
  - BR04: Tự động hủy đơn hàng và hoàn trả ghế khi quá hạn.
  - BR05: Vé điện tử QR chỉ được quét thành công 1 lần duy nhất.

### 👤 Phụ trách:
- **Thành viên:** Phạm Ngọc Mỹ Huyền (BA Lead & Requirements)
- **Tài khoản GitHub:** @huij3n`,
        labels: ['role:ba-lead', 'type:documentation', 'priority:high']
      },
      {
        tag: 'BA-04',
        title: '[BA-04] Rà soát yêu cầu chức năng Actor Khách hàng (UC01, UC03, UC04, UC07-UC10)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Chuẩn hóa tài liệu yêu cầu cho toàn bộ các ca sử dụng thuộc phân hệ Khách hàng:
  - Đăng ký cá nhân (UC01), Tra cứu 24 phim & lịch chiếu (UC03).
  - Chọn ghế IMAX (UC04), Phát hành vé điện tử (UC07) và Xuất file lịch .ics (UC10).

### 👤 Phụ trách:
- **Thành viên:** Phạm Ngọc Mỹ Huyền (BA Lead & Requirements)
- **Tài khoản GitHub:** @huij3n`,
        labels: ['role:ba-lead', 'type:documentation', 'priority:high']
      }
    ]
  },
  {
    number: 3,
    title: '[Nguyễn Bình Phương Mi] Progress Bar - Survey Lead & UI System',
    description: 'Tiến độ khảo sát hành vi người dùng, Design System Obsidian Dark UI & Prototype 25 Màn hình Figma - Phụ trách: Nguyễn Bình Phương Mi',
    assignee: 'nbpm06',
    fallbackAssignee: 'thanhphonghcmue',
    issues: [
      {
        tag: 'UI-01',
        title: '[UI-01] Khảo sát hành vi trải nghiệm người dùng & Thiết lập Design System Obsidian Dark UI',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thực hiện khảo sát hành vi đặt vé của giới trẻ và người yêu điện ảnh.
- Thiết lập bảng màu chuẩn Obsidian Dark (#08090C), Crimson Red (#E50914) và Amber Gold (#E5A93C) kèm Typography Inter Font.

### 👤 Phụ trách:
- **Thành viên:** Nguyễn Bình Phương Mi (Survey Lead & UI System)
- **Tài khoản GitHub:** @nbpm06`,
        labels: ['role:ui-design', 'type:design', 'priority:high']
      },
      {
        tag: 'UI-02',
        title: '[UI-02] Thiết kế hệ thống 25 Màn hình chuẩn Full HD (1920x1080) trên Figma Design',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thiết kế 25 màn hình native Figma hoàn chỉnh (100% Frame & Vector thật, không dùng ảnh chụp phẳng).
- Bao quát trọn vẹn từ Trang chủ, Sơ đồ ghế uốn cong IMAX, Bắp nước, Cổng thanh toán, Vé QR đến Dashboard Quản trị.

### 👤 Phụ trách:
- **Thành viên:** Nguyễn Bình Phương Mi (Survey Lead & UI System)
- **Tài khoản GitHub:** @nbpm06`,
        labels: ['role:ui-design', 'type:design', 'priority:high']
      },
      {
        tag: 'UI-03',
        title: '[UI-03] Xây dựng kịch bản tương tác Prototype 120+ dây liên kết không điểm cụt',
        body: `### 📌 Mục tiêu nhiệm vụ
- Kết nối toàn bộ nút bấm, thanh điều hướng trợ năng NOVA_WORKFLOW_NAV_BAR với hơn 120+ dây nối Prototype.
- Đảm bảo diễn tập trình chiếu mọi kịch bản Main Flow, Alt Flow và Exception Flow mượt mà.

### 👤 Phụ trách:
- **Thành viên:** Nguyễn Bình Phương Mi (Survey Lead & UI System)
- **Tài khoản GitHub:** @nbpm06`,
        labels: ['role:ui-design', 'type:design', 'priority:high']
      },
      {
        tag: 'UI-04',
        title: '[UI-04] Thiết kế giao diện Bàn soát vé QR Nhân viên rạp (UC14 / 3 Trạng thái thẻ)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thiết kế giao diện chuyên dụng cho nhân viên soát vé tại cửa phòng chiếu.
- Hiển thị phản hồi trực quan theo 3 màu: Thẻ Xanh (Hợp lệ), Thẻ Vàng (Sai suất chiếu), Thẻ Đỏ (Vé đã qua cửa).

### 👤 Phụ trách:
- **Thành viên:** Nguyễn Bình Phương Mi (Survey Lead & UI System)
- **Tài khoản GitHub:** @nbpm06`,
        labels: ['role:ui-design', 'type:design', 'priority:high']
      }
    ]
  },
  {
    number: 4,
    title: '[Thạch Võ Diễm Ngọc] Progress Bar - Modeling Lead & Database',
    description: 'Tiến độ Mô hình hóa ERD PostgreSQL, Cấu hình Prisma Schema & Sơ đồ Activity Diagram luồng thanh toán - Phụ trách: Thạch Võ Diễm Ngọc',
    assignee: 'thanhphonghcmue', // Fallback to repo owner with clear member credit in issue body
    fallbackAssignee: 'thanhphonghcmue',
    issues: [
      {
        tag: 'MOD-01',
        title: '[MOD-01] Thiết kế Sơ đồ Thực thể Quan hệ ERD và Cấu trúc quan hệ bảng PostgreSQL',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thiết kế Sơ đồ Thực thể Quan hệ (ERD) chuẩn hóa dạng 3NF.
- Định nghĩa quan hệ giữa các thực thể: Movies, Theaters, Rooms, Seats, Showtimes, Orders, Tickets, Combos.

### 👤 Phụ trách:
- **Thành viên:** Thạch Võ Diễm Ngọc (Modeling Lead & Database)
- **MSSV:** 50.01.103.050 (Nhóm 03 - 50.01.SPTIN.B)`,
        labels: ['role:modeling-db', 'type:database', 'priority:high']
      },
      {
        tag: 'MOD-02',
        title: '[MOD-02] Cấu hình Prisma Schema: Quản lý 24 Phim, 128 Phòng chiếu và Suất chiếu',
        body: `### 📌 Mục tiêu nhiệm vụ
- Viết định nghĩa Schema trong Prisma ORM với đầy đủ Type Safety và Unique Constraints.
- Thiết lập seed dữ liệu mẫu cho 24 bộ phim điện ảnh bom tấn và hơn 13.440 suất chiếu liên tục trong 30 ngày.

### 👤 Phụ trách:
- **Thành viên:** Thạch Võ Diễm Ngọc (Modeling Lead & Database)
- **MSSV:** 50.01.103.050 (Nhóm 03 - 50.01.SPTIN.B)`,
        labels: ['role:modeling-db', 'type:database', 'priority:high']
      },
      {
        tag: 'MOD-03',
        title: '[MOD-03] Xây dựng Sơ đồ Activity Diagram & BPMN 3 Lane cho luồng Giao dịch Thanh toán',
        body: `### 📌 Mục tiêu nhiệm vụ
- Vẽ Sơ đồ Hoạt động (Activity Diagram) thể hiện chi tiết luồng thanh toán mô phỏng.
- Xây dựng mô hình BPMN 3 Lane (Khách hàng - Hệ thống NOVA - Cổng Sandbox) mô tả việc xử lý OTP, QR và chữ ký hash.

### 👤 Phụ trách:
- **Thành viên:** Thạch Võ Diễm Ngọc (Modeling Lead & Database)
- **MSSV:** 50.01.103.050 (Nhóm 03 - 50.01.SPTIN.B)`,
        labels: ['role:modeling-db', 'type:documentation', 'priority:high']
      },
      {
        tag: 'MOD-04',
        title: '[MOD-04] Thiết kế kịch bản xử lý ngoại lệ Timeout giao dịch và Tự động hoàn ghế (BR04)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Đặc tả kịch bản xử lý khi khách hàng hủy bỏ thanh toán hoặc quá hạn 5 phút tại cổng Sandbox.
- Cơ chế gửi tín hiệu Webhook/Callback để giải phóng ghế và đối soát doanh thu.

### 👤 Phụ trách:
- **Thành viên:** Thạch Võ Diễm Ngọc (Modeling Lead & Database)
- **MSSV:** 50.01.103.050 (Nhóm 03 - 50.01.SPTIN.B)`,
        labels: ['role:modeling-db', 'type:feature', 'priority:high']
      }
    ]
  },
  {
    number: 5,
    title: '[Phùng Thị Mỹ Quyên] Progress Bar - QA Lead & Testing',
    description: 'Tiến độ Đảm bảo chất lượng (QA), Viết Test Cases TC-01 đến TC-05 & Kế hoạch nghiệm thu UAT - Phụ trách: Phùng Thị Mỹ Quyên',
    assignee: 'Ptmq-sptinB',
    fallbackAssignee: 'thanhphonghcmue',
    issues: [
      {
        tag: 'QA-01',
        title: '[QA-01] Xây dựng Ma trận Kiểm thử & Viết Bộ Test Cases TC-01 đến TC-05 (Kiểm thử Khóa ghế)',
        body: `### 📌 Mục tiêu nhiệm vụ
- Thiết lập bảng Test Cases kiểm thử chức năng giữ chỗ:
  - TC-01: Kiểm tra chọn ghế thường/ghế VIP hợp lệ.
  - TC-02: Kiểm tra đếm ngược khóa ghế 5 phút (BR01).
  - TC-03: Kiểm tra xung đột 2 người giữ cùng ghế 409 (Race Condition).
  - TC-04: Kiểm tra mua Combo bắp nước đi kèm (BR02).
  - TC-05: Kiểm tra thanh toán Sandbox và phát hành vé QR.

### 👤 Phụ trách:
- **Thành viên:** Phùng Thị Mỹ Quyên (QA Lead & Testing)
- **Tài khoản GitHub:** @Ptmq-sptinB`,
        labels: ['role:qa-testing', 'type:testing', 'priority:high']
      },
      {
        tag: 'QA-02',
        title: '[QA-02] Thực thi Suite 35 bài Unit & Contract Tests đạt tỉ lệ 100% PASS',
        body: `### 📌 Mục tiêu nhiệm vụ
- Chạy tự động và xác minh bộ kiểm thử hệ thống:
  - ticket-qr.test.mjs (11/11 tests pass).
  - memory-contract.test.cjs (9/9 tests pass).
  - food-cart.test.mjs (5/5 tests pass).
  - catalog-index.test.mjs, menu-photography.test.mjs, unique-records.test.mjs (10/10 tests pass).

### 👤 Phụ trách:
- **Thành viên:** Phùng Thị Mỹ Quyên (QA Lead & Testing)
- **Tài khoản GitHub:** @Ptmq-sptinB`,
        labels: ['role:qa-testing', 'type:testing', 'priority:high']
      },
      {
        tag: 'QA-03',
        title: '[QA-03] Kiểm thử Luồng quét QR Vé điện tử thời gian thực qua Camera jsQR',
        body: `### 📌 Mục tiêu nhiệm vụ
- Kiểm thử chức năng quét mã QR vé xem phim trực tiếp từ Webcam/Camera điện thoại.
- Xác thực phản hồi âm thanh (Beep tiếng chuông) và phân loại đúng thẻ Xanh, Thẻ Vàng, Thẻ Đỏ (BR05).

### 👤 Phụ trách:
- **Thành viên:** Phùng Thị Mỹ Quyên (QA Lead & Testing)
- **Tài khoản GitHub:** @Ptmq-sptinB`,
        labels: ['role:qa-testing', 'type:testing', 'priority:high']
      },
      {
        tag: 'QA-04',
        title: '[QA-04] Lập Kế hoạch & Biên bản Nghiệm thu UAT cho buổi Báo cáo Đồ án LAB04',
        body: `### 📌 Mục tiêu nhiệm vụ
- Soạn thảo Kịch bản Diễn tập Demo (User Acceptance Testing) cho giảng viên và hội đồng.
- Chuẩn bị dữ liệu kiểm thử thực tế và quy trình trình chiếu 25 màn hình Figma kết hợp Web thật.

### 👤 Phụ trách:
- **Thành viên:** Phùng Thị Mỹ Quyên (QA Lead & Testing)
- **Tài khoản GitHub:** @Ptmq-sptinB`,
        labels: ['role:qa-testing', 'type:documentation', 'priority:high']
      }
    ]
  }
];

// Main execution function
async function main() {
  // Step 1: Fetch existing milestones
  console.log('\n🔍 Bước 1: Kiểm tra các Milestones hiện có trên GitHub...');
  let existingMilestones = ghApi('milestones') || [];
  console.log(`ℹ️ Hiện có: ${existingMilestones.length} milestones.`);

  const milestoneMap = new Map();
  for (const m of existingMilestones) {
    milestoneMap.set(m.title, m);
  }

  // Step 2: Create missing milestones
  console.log('\n🏗️ Bước 2: Khởi tạo 5 Milestones cho 5 Thành viên...');
  for (const mDef of MILESTONE_DEFINITIONS) {
    let milestone = milestoneMap.get(mDef.title);
    if (!milestone) {
      console.log(`  ➕ Đang tạo Milestone: "${mDef.title}"...`);
      milestone = ghApi('milestones', 'POST', {
        title: mDef.title,
        description: mDef.description,
        state: 'open'
      });
      if (milestone) {
        milestoneMap.set(mDef.title, milestone);
        console.log(`    ✅ Tạo thành công (Milestone #${milestone.number})!`);
      } else {
        console.error(`    ❌ Không thể tạo milestone: ${mDef.title}`);
      }
    } else {
      console.log(`  ℹ️ Đã tồn tại: "${mDef.title}" (Milestone #${milestone.number})`);
    }
  }

  // Step 3: Fetch existing issues to avoid duplicates
  console.log('\n🔍 Bước 3: Lấy danh sách Issues hiện có...');
  let existingIssues = [];
  try {
    const rawIssues = execSync(`gh issue list --repo ${REPO_FULL} --state all --limit 100 --json number,title,milestone`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    existingIssues = JSON.parse(rawIssues);
  } catch (err) {
    existingIssues = [];
  }
  const existingIssueTitles = new Set(existingIssues.map(i => i.title));
  console.log(`ℹ️ Tìm thấy ${existingIssues.length} issues hiện tại.`);

  // Step 4: Create issues for each milestone
  console.log('\n📝 Bước 4: Tạo các GitHub Issues mẫu và gán vào Milestone tương ứng...');
  let createdCount = 0;
  let closedCount = 0;

  for (const mDef of MILESTONE_DEFINITIONS) {
    const milestone = milestoneMap.get(mDef.title);
    if (!milestone) continue;

    console.log(`\n📌 Xử lý Milestone: ${mDef.title} (Số #${milestone.number})`);

    for (let i = 0; i < mDef.issues.length; i++) {
      const issueDef = mDef.issues[i];

      // Check if already exists
      const existing = existingIssues.find(iss => iss.title === issueDef.title);
      let issueNumber = existing?.number;

      if (!existing) {
        console.log(`  ➕ Đang tạo Issue: ${issueDef.title}...`);
        
        // Attempt assignment with fallback
        let assigneeToUse = mDef.assignee;
        let createdUrl = null;

        try {
          // Try with target assignee
          const cmd = `gh issue create --repo ${REPO_FULL} --title "${issueDef.title.replace(/"/g, '\\"')}" --milestone "${mDef.title.replace(/"/g, '\\"')}" --assignee "${assigneeToUse}" --body "${issueDef.body.replace(/"/g, '\\"')}"`;
          createdUrl = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        } catch (err) {
          // Fallback to repo owner
          try {
            console.log(`    ⚠️ Không thể gán cho @${assigneeToUse}, chuyển sang gán cho @${mDef.fallbackAssignee}...`);
            const fallbackCmd = `gh issue create --repo ${REPO_FULL} --title "${issueDef.title.replace(/"/g, '\\"')}" --milestone "${mDef.title.replace(/"/g, '\\"')}" --assignee "${mDef.fallbackAssignee}" --body "${issueDef.body.replace(/"/g, '\\"')}"`;
            createdUrl = execSync(fallbackCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
          } catch (fallbackErr) {
            console.error(`    ❌ Lỗi khi tạo issue: ${fallbackErr.message}`);
          }
        }

        if (createdUrl) {
          createdCount++;
          const match = createdUrl.match(/\/issues\/(\d+)/);
          issueNumber = match ? parseInt(match[1], 10) : null;
          console.log(`    ✅ Đã tạo Issue #${issueNumber}: ${createdUrl}`);
        }
      } else {
        console.log(`  ℹ️ Issue đã tồn tại: #${issueNumber} (${issueDef.title})`);
      }

      // Step 5: Handle Issue Status (close to fill horizontal progress bar)
      if (issueNumber) {
        let shouldClose = false;
        if (statusArg === 'completed') {
          shouldClose = true;
        } else if (statusArg === 'in-progress') {
          // Close all except the last issue
          shouldClose = (i < mDef.issues.length - 1);
        }

        if (shouldClose) {
          try {
            execSync(`gh issue close ${issueNumber} --reason completed --repo ${REPO_FULL}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            closedCount++;
            console.log(`    🔒 Đóng Issue #${issueNumber} [Hoàn thành 100%] -> Điền thanh tiến độ %`);
          } catch (err) {
            // Already closed or error
          }
        }
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(75));
  console.log('🎉 THIẾT LẬP HOÀN TẤT HỆ THỐNG GITHUB MILESTONES & PROGRESS TRACKER!');
  console.log(`📊 Số Milestones hoạt động: 5`);
  console.log(`📝 Số Issues đã xử lý: ${createdCount} mới, ${closedCount} đã hoàn thành`);
  console.log('\n🌐 Xem 5 Thanh tiến trình Milestone nằm ngang trực tiếp tại:');
  console.log(`👉 https://github.com/${REPO_FULL}/milestones`);
  console.log('='.repeat(75));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
