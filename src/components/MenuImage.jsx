"use client";
// Each artIndex selects a different original packshot from the local 4 × 6 sheet.
// A single cached WebP serves the catalogue, product detail and booking summary.
import { useState } from "react";
export default function MenuImage({
  item,
  className = "",
  priority = false,
  decorative = false,
}) {
  const index = item?.artIndex;
  const hasPackshot =
    !item?.imageUrl && Number.isInteger(index) && index >= 0 && index < 24;
  const source = hasPackshot
    ? "/images/menu/nova-menu-studio.webp"
    : item?.imageUrl || item?.image || "/images/menu/party69.svg";
  const [failedSource, setFailedSource] = useState("");
  const failed = failedSource === source;
  const sprite = hasPackshot && !failed;
  return (
    <span
      className={`menu-image ${sprite ? "" : "menu-image--fallback"} ${className}`}
      data-art-index={sprite ? index : "custom"}
    >
      <img
        src={failed ? "/images/menu/party69.svg" : source}
        onError={() => setFailedSource(source)}
        alt={
          decorative ? "" : `${item?.name || "Bắp nước NOVA"} · hình minh họa`
        }
        width={sprite ? 1024 : 480}
        height={sprite ? 1536 : 320}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={
          sprite
            ? {
                left: `${-(index % 4) * 100}%`,
                top: `${-Math.floor(index / 4) * 100}%`,
              }
            : undefined
        }
      />
    </span>
  );
}
