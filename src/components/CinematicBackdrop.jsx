"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const CinematicCanvas = dynamic(() => import("./CinematicCanvas.jsx"), {
  ssr: false,
});
export default function CinematicBackdrop() {
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
