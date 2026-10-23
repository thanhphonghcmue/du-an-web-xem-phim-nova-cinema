// MenuDieuHuong: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/GlassNavigation.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/MenuDieuHuong.jsx
 * ==============================================================================
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n.js";
export default function MenuDieuHuong() {
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
