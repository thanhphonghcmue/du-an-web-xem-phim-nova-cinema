"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
export default function ApiToast() {
  const [notice, setNotice] = useState(null);
  const last = useRef({ message: "", at: 0 });
  const reduced = useReducedMotion();
  useEffect(() => {
    const receive = (event) => {
      const message = event.detail?.message;
      if (
        !message ||
        (last.current.message === message &&
          Date.now() - last.current.at < 12000)
      )
        return;
      last.current = { message, at: Date.now() };
      setNotice({ message, at: Date.now() });
    };
    window.addEventListener("nova:api-error", receive);
    return () => window.removeEventListener("nova:api-error", receive);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          className="nova-api-toast"
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            aria-label="Đóng thông báo kết nối"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
