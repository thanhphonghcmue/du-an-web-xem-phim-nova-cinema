import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n.js";
export default function GlassNavigation() {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("#movies");
  const links = [
    ["#movies", "Lịch chiếu"],
    ["#cinemas", "Rạp Cinema"],
    ["#offers", "Ưu đãi & Khuyến mãi"],
    ["#membership", "C’MEMBER"],
    ["#events", "Sự kiện"],
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
