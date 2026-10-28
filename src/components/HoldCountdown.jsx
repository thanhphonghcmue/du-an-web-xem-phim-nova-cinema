"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { holdSeconds } from "../holdDeadline.js";
export default function HoldCountdown({ expiresAt, offset = 0, onExpire }) {
  const [now, setNow] = useState(Date.now);
  const remaining = holdSeconds(expiresAt, offset, now);
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (!holdSeconds(expiresAt, offset)) onExpire();
    };
    const clock = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(clock);
      window.removeEventListener("focus", tick);
    };
  }, [expiresAt, offset, onExpire]);
  return (
    <div className={`hold-timer ${remaining < 60 ? "urgent" : ""}`}>
      <Clock3 size={18} />
      <div>
        <small>Giữ ghế còn lại</small>
        <strong data-testid="hold-timer">
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </strong>
      </div>
    </div>
  );
}
