/**
 * ==============================================================================
 * TỆP TIN: src/app/not-found.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Màn hình thông báo lỗi 404 (Trang không tìm thấy).
 *   - Thiết kế chuẩn phong cách rạp chiếu phim NOVA Cinema với thông điệp:
 *     "Suất chiếu này không tồn tại. Quay lại NOVA để tìm câu chuyện tiếp theo của bạn."
 *   - Nút hành động nhanh đưa người dùng quay về trang chủ một cách mượt mà.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khi người dùng truy cập một URL không hợp lệ trên Next.js (ví dụ "/abcxyz").
 *   2. Next.js tự động render component `NotFound`.
 *   3. Người dùng bấm nút "Về trang chủ →" để tiếp tục trải nghiệm.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Bất kỳ ai truy cập nhầm đường dẫn hoặc liên kết phim đã bị gỡ bỏ.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm danh sách gợi ý 3 bộ phim hot nhất đang chiếu ngay bên dưới thông báo 404.
 * ==============================================================================
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <span>NOVA CINEMA / 404</span>
      <h1>
        Suất chiếu này
        <br />
        không tồn tại.
      </h1>
      <p>Quay lại NOVA để tìm câu chuyện tiếp theo của bạn.</p>
      <Link href="/" className="button button-primary">
        Về trang chủ →
      </Link>
    </main>
  );
}
