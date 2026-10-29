/**
 * ==============================================================================
 * TỆP TIN: src/components/CinematicCanvas.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Hiệu Ứng Bụi Ánh Sáng Máy Chiếu Điện Ảnh 3D (3D Cinematic Projector Dust Simulation).
 *   - Sử dụng Three.js và @react-three/fiber:
 *     + Mô phỏng các hạt bụi lơ lửng trong luồng ánh sáng máy chiếu rạp phim IMAX.
 *     + Tối ưu hóa cực đại: Một draw call duy nhất (Single Draw Call Points), không setState trong vòng lặp Render.
 *     + Tích hợp Error Boundary tự động fallback sang CSS nếu WebGL bị tắt trên máy người dùng.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Tạo mảng Float32Array vị trí 3D ngẫu nhiên cho hàng ngàn hạt bụi.
 *   2. Trong `useFrame`: di chuyển nhẹ nhàng các hạt theo trục tọa độ độc lập với tần số làm tươi màn hình.
 *   3. Render trên nền Three.js Canvas với độ mờ và chế độ hòa trộn AdditiveBlending.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Hiệu ứng phông nền thẩm mỹ cao của NOVA Cinema.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm tương tác phản ứng theo con trỏ chuột (hạt bụi dạt sang hai bên khi rê chuột qua).
 * ==============================================================================
 */

"use client";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
function subscribeMotion(callback) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  media.addEventListener("change", callback);
  connection?.addEventListener?.("change", callback);
  return () => {
    media.removeEventListener("change", callback);
    connection?.removeEventListener?.("change", callback);
  };
}
const prefersStaticBackdrop = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  Boolean(navigator.connection?.saveData);
const staticServerSnapshot = () => true;
class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="canvas-fallback" data-canvas="fallback" />
    ) : (
      this.props.children
    );
  }
}
function makeParticles(count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    positions[i * 3] = (Math.sin(n * 127.1) * 0.5 + 0.5) * 18 - 9;
    positions[i * 3 + 1] = (Math.sin(n * 311.7) * 0.5 + 0.5) * 14 - 7;
    positions[i * 3 + 2] = (Math.sin(n * 74.7) * 0.5 + 0.5) * 8 - 6;
  }
  return positions;
}
function ProjectorDust({ count }) {
  const points = useRef(null),
    elapsed = useRef(0);
  const positions = useMemo(() => makeParticles(count), [count]);
  // Một draw call, không setState trong vòng lặp; chuyển động độc lập với tốc độ khung hình.
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.04);
    if (points.current) {
      points.current.rotation.y = elapsed.current * 0.012;
      points.current.rotation.z = Math.sin(elapsed.current * 0.08) * 0.045;
    }
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.023}
        color="#e5d7c2"
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
function AmbientCanvas() {
  const [visible, setVisible] = useState(() => !document.hidden);
  const [lost, setLost] = useState(false);
  const canvasRef = useRef(null);
  const onLost = useCallback(() => setLost(true), []);
  const [supported] = useState(() => {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    // StrictMode chạy lại effect; onCreated có thể đã chạy từ lần setup trước.
    canvasRef.current?.addEventListener("webglcontextlost", onLost, {
      once: true,
    });
    return () => {
      document.removeEventListener("visibilitychange", update);
      canvasRef.current?.removeEventListener("webglcontextlost", onLost);
    };
  }, [onLost]);
  if (!supported || lost)
    return <div className="canvas-fallback" data-canvas="fallback" />;
  return (
    <CanvasBoundary>
      <div
        className="cinematic-canvas"
        aria-hidden="true"
        data-canvas="ambient"
      >
        <Canvas
          dpr={[1, 1.35]}
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
          frameloop={visible ? "always" : "never"}
          onCreated={({ gl }) => {
            canvasRef.current?.removeEventListener("webglcontextlost", onLost);
            canvasRef.current = gl.domElement;
            gl.domElement.addEventListener("webglcontextlost", onLost, {
              once: true,
            });
          }}
        >
          <ProjectorDust count={innerWidth < 768 ? 80 : 220} />
        </Canvas>
      </div>
    </CanvasBoundary>
  );
}
export default function CinematicCanvas() {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    prefersStaticBackdrop,
    staticServerSnapshot,
  );
  // Không tạo cả context thăm dò khi hiệu ứng đã bị tắt.
  return reduced ? (
    <div className="canvas-fallback" data-canvas="reduced-motion" />
  ) : (
    <AmbientCanvas />
  );
}
