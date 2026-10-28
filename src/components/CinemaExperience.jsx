/**
 * ==============================================================================
 * TỆP TIN: src/components/CinemaExperience.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Lớp đệm ranh giới Client (Client Boundary Wrapper) cho trải nghiệm điện ảnh.
 *   - Nạp động (Dynamic Import với ssr: false) component NovaClient để tránh lỗi
 *     bất đồng bộ thủy hóa (Hydration mismatch) khi truy cập window, localStorage.
 *   - Cung cấp màn hình chào đón với ảnh không gian rạp và thanh loading.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Next.js hiển thị giao diện Splash Screen ngay lập tức khi người dùng tải trang.
 *   2. Trình duyệt tải gói mã nguồn JavaScript của ứng dụng tương tác.
 *   3. Khi tải xong, chuyển cảnh sang NovaClient và khởi chạy toàn bộ hệ thống.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Tất cả người dùng truy cập trang chủ.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Cho phép đổi ảnh Splash Screen ngẫu nhiên theo phim bom tấn đang chiếu trong tuần.
 * ==============================================================================
 */

"use client";
import dynamic from "next/dynamic";
const NovaClient = dynamic(() => import("./NovaClient.jsx"), {
  ssr: false,
  loading: () => (
    <main className="initial-screen">
      <img
        src="/images/cinema-auditorium.jpg"
        alt="NOVA Cinema — bước vào điện ảnh"
        width="1920"
        height="804"
      />
      <div>
        <span>NOVA CINEMA</span>
        <h1>
          Điện ảnh.
          <br />
          Không giới hạn.
        </h1>
        <p>Phim hay, ghế đẹp và những trải nghiệm đáng nhớ.</p>
        <span className="loading-bar" aria-label="Đang chuẩn bị trải nghiệm" />
      </div>
    </main>
  ),
});
export default function CinemaExperience() {
  return <NovaClient />;
}
