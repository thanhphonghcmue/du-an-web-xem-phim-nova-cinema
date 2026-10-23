/**
 * ==============================================================================
 * TỆP TIN: src/components/TiltPoster.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Poster Phim Hiệu Ứng Nghiêng 3D Tương Tác Theo Chuột (3D Interactive Tilt Poster).
 *   - Sử dụng Framer Motion và Motion Values:
 *     + Xoay nghiêng theo trục X và Y (`rotateX`, `rotateY`) mượt mà với lò xo vật lý (`useSpring`).
 *     + Tối ưu: Không gây re-render lại component khi chuột di chuyển liên tục.
 *     + Bỏ qua hiệu ứng trên màn hình cảm ứng di động (Touch) và khi người dùng bật giảm chuyển động.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Lắng nghe sự kiện di chuột `onPointerMove`.
 *   2. Tính toán độ lệch tọa độ con trỏ so với tâm của poster.
 *   3. Khi chuột rời khỏi poster (`onPointerLeave`): hồi vị trí về góc 0 ban đầu.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Bao bọc các poster phim trong danh mục phim nổi bật.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung hiệu ứng lóa sáng hologram (Glow sheen reflection) di chuyển theo góc nghiêng của poster.
 * ==============================================================================
 */

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
export default function PosterNghieng3D({ children, className = "" }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 180, damping: 25 }),
    rotateY = useSpring(y, { stiffness: 180, damping: 25 });
  // Nghiêng bằng motion values: không render lại cả lưới khi chuột di chuyển. Touch giữ nguyên.
  function move(e) {
    if (reduced || e.pointerType !== "mouse") return;
    const rect = ref.current.getBoundingClientRect();
    x.set((-(e.clientY - rect.top - rect.height / 2) / rect.height) * 6);
    y.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * 6);
  }
  return (
    <motion.div
      ref={ref}
      className={`poster-wrap ${className}`}
      style={
        reduced ? undefined : { rotateX, rotateY, transformPerspective: 1000 }
      }
      onPointerMove={move}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
