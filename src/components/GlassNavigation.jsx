/**
 * ==============================================================================
 * TỆP TIN: src/components/GlassNavigation.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Thanh Menu Điều Hướng Chính Hiệu Ứng Kính Mờ (Glassmorphic Navigation Bar).
 *   - Điều hướng nhanh đến các khu vực trên trang chủ:
 *     + Lịch chiếu phim (`#movies`)
 *     + Cụm rạp điện ảnh (`#cinemas`)
 *     + Ưu đãi & Khuyến mãi bắp nước (`#offers`)
 *     + Đặc quyền hội viên C’MEMBER (`#membership`)
 *     + Sự kiện công chiếu (`#events`)
 *   - Hiệu ứng vệt sáng chuyển động (Shared Layout Animation `layoutId="nav-glow"`) lướt theo chuột.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Lắng nghe `onMouseEnter` và `onFocus` của từng liên kết.
 *   2. Framer Motion di chuyển vệt sáng gradient mượt mà sang vị trí mục được chọn.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Người dùng máy tính điều hướng trên thanh Header.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tự động highlight mục menu theo vị trí cuộn trang thực tế của người dùng (Intersection Observer).
 * ==============================================================================
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n.js";
export default function GlassNavigation() {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("#movies");
  const links = [
    ["/phim", "Phim"],
    ["/rap", "Rạp NOVA"],
    ["/uu-dai", "Ưu đãi"],
    ["/hoi-vien", "C’MEMBER"],
    ["/bap-nuoc", "Bắp nước"],
  ];
  return (
    <nav
      className="desktop-nav"
      aria-label="Điều hướng chính"
      onMouseLeave={() => setHovered(null)}
    >
      {links.map(([href, label]) => (
        <a
          href={href}
          key={href}
          onMouseEnter={() => setHovered(href)}
          onFocus={() => setHovered(href)}
          onBlur={() => setHovered(null)}
          onClick={() => setActive(href)}
          className={(hovered || active) === href ? "nav-active" : ""}
        >
          {t(label)}
          {(hovered || active) === href && (
            <motion.span
              layoutId="nav-glow"
              className="nav-glow"
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            />
          )}
        </a>
      ))}
    </nav>
  );
}
