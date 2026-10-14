import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
export default function TiltPoster({ children, className = "" }) {
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
