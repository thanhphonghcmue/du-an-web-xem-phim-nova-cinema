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
        viewBox="0 0 112 72"
        fill="none"
        width={size || 64}
        height={size ? (size * 72) / 112 : 42}
        aria-hidden="true"
        data-nova-mark="supernova"
      >
        <defs>
          <linearGradient
            id={`${id}-spectrum`}
            x1="8"
            y1="10"
            x2="103"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#38BDF8" />
            <stop offset=".5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop stopColor="#38BDF8" stopOpacity=".58" />
            <stop offset="1" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>
          <filter
            id={`${id}-glow`}
            x="-60%"
            y="-80%"
            width="220%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="2.5" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse
          className="nova-logo__halo"
          cx="56"
          cy="36"
          rx="54"
          ry="34"
          fill={`url(#${id}-halo)`}
        />
        <path
          d="M16 18Q56 9 96 18L102 51Q56 64 10 51Z"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M20 23Q56 16 92 23M17 47Q56 57 95 47"
          stroke={`url(#${id}-spectrum)`}
          strokeOpacity=".35"
        />
        <g className="nova-logo__star" filter={`url(#${id}-glow)`}>
          <path
            d="M56 10 60 28 75 18 65 32 92 36 65 40 75 54 60 44 56 64 52 44 37 54 47 40 20 36 47 32 37 18 52 28Z"
            fill={`url(#${id}-spectrum)`}
          />
          <circle
            cx="56"
            cy="36"
            r="7"
            fill="#050817"
            stroke="#CCF8FF"
            strokeWidth="1.2"
          />
          <circle cx="56" cy="36" r="3" fill="#ECFEFF" />
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
