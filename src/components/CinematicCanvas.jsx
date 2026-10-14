"use client";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const media = matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}
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
export default function CinematicCanvas() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [lost, setLost] = useState(false);
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
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  if (reduced || !supported || lost)
    return (
      <div
        className="canvas-fallback"
        data-canvas={reduced ? "reduced-motion" : "fallback"}
      />
    );
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
            gl.domElement.addEventListener(
              "webglcontextlost",
              () => setLost(true),
              { once: true },
            );
          }}
        >
          <ProjectorDust count={innerWidth < 768 ? 80 : 220} />
        </Canvas>
      </div>
    </CanvasBoundary>
  );
}
