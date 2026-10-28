"use client";
import { useId } from "react";

export default function NovaLogo({
  className = "",
  showText = true,
  size,
  ...props
}) {
  const id = "nova-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <span className={`nova-logo ${className}`} {...props}>
      <svg
        className="nova-logo__mark"
        viewBox="0 0 128 54"
        fill="none"
        width={size || 72}
        height={size ? (size * 54) / 128 : 32}
        aria-hidden="true"
        data-nova-mark="supernova"
      >
        <defs>
          {/* Gradient N: Electric Ice Cyan sang Platinum sang trọng */}
          <linearGradient id={`${id}-cyan`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* Gradient V: Đỏ Cờ Khát Vọng chuyển sang Ánh Vàng Kim Vươn Mình */}
          <linearGradient id={`${id}-red`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="55%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Quầng sáng nền điện ảnh */}
          <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
            <stop stopColor="#38BDF8" stopOpacity=".35" />
            <stop offset="1" stopColor="#0B1120" stopOpacity="0" />
          </radialGradient>

          {/* Hiệu ứng hào quang ngôi sao */}
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Hào quang tỏa sáng nền */}
        <ellipse
          className="nova-logo__halo"
          cx="64"
          cy="28"
          rx="58"
          ry="24"
          fill={`url(#${id}-halo)`}
        />

        {/* 2. CHỮ N: Dual-Stripe Ribbons song song (Cyan & Trắng Bạc) */}
        <g className="nova-logo__monogram-n">
          {/* Cột trái 1 (xiên lên /) */}
          <polygon points="6,48 13,48 31,6 24,6" fill={`url(#${id}-cyan)`} />
          <polygon points="15,48 21,48 39,6 33,6" fill="#FFFFFF" />

          {/* Nét chéo 2 (xiên xuống \) */}
          <polygon points="33,6 40,6 64,48 57,48" fill={`url(#${id}-cyan)`} />
          <polygon points="25,6 31,6 55,48 49,48" fill="#FFFFFF" />

          {/* Cột giữa 3 (xiên lên /) */}
          <polygon points="57,48 63,48 81,6 75,6" fill={`url(#${id}-cyan)`} />
          <polygon points="65,48 71,48 89,6 83,6" fill="#FFFFFF" />
        </g>

        {/* 3. CHỮ V: Dual-Stripe Ribbons song song (Đỏ Cờ & Vàng Kim Vươn Mình Dân Tộc) */}
        <g className="nova-logo__monogram-v">
          {/* Nhánh 1 của V (xiên xuống \) */}
          <polygon points="76,14 82,14 97,48 91,48" fill={`url(#${id}-red)`} />
          <polygon points="84,14 90,14 105,48 99,48" fill="#FDE047" />

          {/* Nhánh 2 của V (xiên lên vút cao / - Biểu tượng Khát vọng Vươn Mình) */}
          <polygon points="91,48 97,48 113,4 107,4" fill={`url(#${id}-red)`} />
          <polygon points="99,48 105,48 121,4 115,4" fill="#FDE047" />
        </g>

        {/* 4. NGÔI SAO KHÁT VỌNG ĐIỆN ẢNH (Tỏa sáng tại đỉnh vươn mình) */}
        <g className="nova-logo__star" filter={`url(#${id}-glow)`}>
          <polygon
            points="114,4 116,0 118,4 122,6 118,8 116,12 114,8 110,6"
            fill="#FDE047"
          />
          <circle cx="116" cy="6" r="1.5" fill="#FFFFFF" />
        </g>
      </svg>
      {showText && (
        <span className="nova-logo__wordmark">
          NOVA<span>CINEMA</span>
        </span>
      )}
    </span>
  );
}
