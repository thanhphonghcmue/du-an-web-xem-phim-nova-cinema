"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { menuPhotographs } from "../menuPhotography.js";
function Photograph({ photo, priority }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`menu-photo menu-photo--${photo.fit}`}>
      {failed ? (
        <span className="menu-photo-unavailable" role="status">
          <ImageOff size={25} />
          <span>Ảnh đang cập nhật</span>
        </span>
      ) : (
        <img
          src={photo.src}
          alt=""
          width="640"
          height="480"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {photo.quantity > 1 && (
        <span className="menu-photo-quantity">×{photo.quantity}</span>
      )}
    </span>
  );
}
export default function MenuImage({
  item,
  className = "",
  priority = false,
  decorative = false,
}) {
  const photos = menuPhotographs(item);
  return (
    <span
      className={`menu-image ${photos.length > 1 ? "menu-image--combo" : ""} ${className}`}
      data-photo-key={item?.key || "custom"}
      data-media-kind="photography"
      role={decorative ? undefined : "img"}
      aria-label={
        decorative ? undefined : `Ảnh tham khảo ${item?.name || "bắp nước"}`
      }
      aria-hidden={decorative || undefined}
    >
      {photos.length ? (
        photos.map((photo) => (
          <Photograph key={photo.src} photo={photo} priority={priority} />
        ))
      ) : (
        <span className="menu-photo-unavailable">
          <ImageOff size={25} />
          <span>Ảnh món đang cập nhật</span>
        </span>
      )}
    </span>
  );
}
