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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1000));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setReady(true));
    return () => cancel(id);
  }, []);
  return ready ? <CinematicCanvas /> : <div className="canvas-fallback" />;
}
