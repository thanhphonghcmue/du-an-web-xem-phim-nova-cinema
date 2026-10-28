/**
 * ==============================================================================
 * TỆP TIN: src/app/page.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Trang chủ chính của website (Home Page Route - Next.js App Router).
 *   - Chạy trên tầng Server (Server Component); chuyển giao trải nghiệm tương tác
 *     phức tạp sang Client Component (`CinemaExperience`).
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Trình duyệt gửi yêu cầu GET tới địa chỉ "/" (Root URL).
 *   2. Next.js render khung trang phía máy chủ và nạp `CinemaExperience`.
 *   3. Phía Client nạp tài nguyên tĩnh, kết nối WebSocket và hiển thị các rạp/phim.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Mọi khách hàng, nhân viên và quản trị viên khi truy cập website.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tích hợp Server-Side Generation (ISR - Incremental Static Regeneration) để tăng tốc tải trang ban đầu.
 *   - Bổ sung thẻ OpenGraph động chứa tên bộ phim đang chiếu nổi bật nhất trong ngày.
 * ==============================================================================
 */

import CinemaExperience from "@/components/CinemaExperience.jsx";

// Trang App Router ở server; chỉ trải nghiệm có dữ liệu trình duyệt được tách sang client.
export default function Home() {
  return <CinemaExperience />;
}
