/**
 * ==============================================================================
 * TỆP TIN: src/components/CinematicBackdrop.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Lớp Nền Phim Điện Ảnh Tối Ưu Hiệu Năng (Cinematic Ambient Backdrop Loader).
 *   - Trì hoãn việc khởi tạo Three.js Canvas cho đến khi trình duyệt nhàn rỗi (requestIdleCallback).
 *   - Tôn trọng thuộc tính giảm chuyển động (prefers-reduced-motion) trên các thiết bị tiết kiệm pin.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Ban đầu render thẻ canvas-fallback nhẹ nhàng bằng CSS.
 *   2. Khi CPU rảnh -> nạp động CinematicCanvas render hạt bụi ánh sáng máy chiếu 3D.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ trang chủ để tạo cảm giác chìm đắm trong không gian rạp chiếu phim cao cấp.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Cho phép thay đổi tông màu chùm sáng máy chiếu theo poster của bộ phim đang được xem.
 * ==============================================================================
 */

"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const CinematicCanvas = dynamic(() => import("./CinematicCanvas.jsx"), {
  ssr: false,
});
export default function NenDienAnh() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator.connection;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1000));
    const cancel = window.cancelIdleCallback || clearTimeout;
    let id = null,
      active = false;
    const update = () => {
      if (id !== null) cancel(id);
      id = null;
      if (media.matches || connection?.saveData) {
        if (active) setReady(false);
        active = false;
        return;
      }
      // Không tải Three.js trong tab ẩn hoặc khi người dùng tiết kiệm dữ liệu.
      if (active || document.hidden) return;
      id = idle(() => {
        id = null;
        if (media.matches || connection?.saveData || document.hidden) return;
        active = true;
        setReady(true);
      });
    };
    media.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      if (id !== null) cancel(id);
      media.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return ready ? <CinematicCanvas /> : <div className="canvas-fallback" />;
}
