// MenuDieuHuong: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/GlassNavigation.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/MenuDieuHuong.jsx
 * ==============================================================================
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavigation } from "../navigation.js";
import { motion } from "framer-motion";
import { useI18n } from "../i18n.js";
export default function MenuDieuHuong() {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const active = usePathname();
  return (
    <nav
      className="desktop-nav"
      aria-label={t("Điều hướng chính")}
      onMouseLeave={() => setHovered(null)}
    >
      {mainNavigation.map(([href, label]) => (
        <Link
          href={href}
          key={href}
          onMouseEnter={() => setHovered(href)}
          onFocus={() => setHovered(href)}
          onBlur={() => setHovered(null)}
          aria-current={active === href ? "page" : undefined}
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
        </Link>
      ))}
    </nav>
  );
}
