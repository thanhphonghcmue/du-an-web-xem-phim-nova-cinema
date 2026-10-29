"use client";
import { useEffect, useRef, useState } from "react";

// Decorative only: choosing seats never depends on WebGL or animation readiness.
export default function CinematicScreen3D({ className = "" }) {
  const host = useRef(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const node = host.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator.connection;
    let closed = false,
      started = false,
      visible = typeof IntersectionObserver !== "function",
      epoch = 0,
      dispose = () => {},
      observer;
    async function start() {
      if (started || closed || !visible || document.hidden) return;
      started = true;
      const version = ++epoch;
      if (media.matches || connection?.saveData) {
        setStatus(media.matches ? "reduced-motion" : "fallback");
        return;
      }
      try {
        const [{ createCinemaScreen }, THREE, { gsap }] = await Promise.all([
          import("../three/cinemaScreen.js"),
          import("three"),
          import("gsap"),
        ]);
        if (closed || version !== epoch) return;
        if (
          media.matches ||
          connection?.saveData ||
          !visible ||
          document.hidden
        ) {
          // Import có thể hoàn tất sau khi tab ẩn; thử lại khi màn hình hiện ra.
          started = false;
          return;
        }
        dispose = createCinemaScreen(node, THREE, gsap, () =>
          setStatus("fallback"),
        );
        setStatus(node.querySelector("canvas") ? "webgl" : "fallback");
      } catch {
        if (!closed) setStatus("fallback");
      }
    }
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) void start();
        },
        { rootMargin: "80px" },
      );
      observer.observe(node);
    } else void start();
    const reduce = () => {
      epoch++;
      dispose();
      dispose = () => {};
      started = false;
      if (media.matches) setStatus("reduced-motion");
      else if (connection?.saveData) setStatus("fallback");
      else void start();
    };
    const resume = () => {
      if (!document.hidden) void start();
    };
    media.addEventListener("change", reduce);
    connection?.addEventListener?.("change", reduce);
    document.addEventListener("visibilitychange", resume);
    return () => {
      closed = true;
      observer?.disconnect();
      media.removeEventListener("change", reduce);
      connection?.removeEventListener?.("change", reduce);
      document.removeEventListener("visibilitychange", resume);
      dispose();
    };
  }, []);
  return (
    <figure
      className={`cinematic-screen ${className}`}
      data-screen-state={status}
      aria-label="Màn hình cong NOVA Cinema"
    >
      <div ref={host} className="cinematic-screen__stage" aria-hidden="true">
        <div className="cinematic-screen__static">
          <span>NOVA</span>
          <i />
          CINEMASCOPE
        </div>
      </div>
      <figcaption>
        <span>NOVA / CINEMASCOPE</span>
        <small>MÀN HÌNH · HƯỚNG NHÌN CỦA BẠN</small>
      </figcaption>
    </figure>
  );
}
