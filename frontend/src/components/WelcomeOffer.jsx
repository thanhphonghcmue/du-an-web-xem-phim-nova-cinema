import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MenuImage from "./MenuImage.jsx";
import { ArrowRight, ArrowUpRight, Popcorn, Sparkles, X } from "lucide-react";

export default function WelcomeOffer({ onClose }) {
  const panel = useRef(null);
  const [hideToday, setHideToday] = useState(false);
  function close() {
    if (hideToday) {
      try {
        localStorage.setItem(
          "nova-welcome-hidden-day",
          new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
          }),
        );
      } catch {
        // Tùy chọn lưu trữ bị chặn vẫn phải cho phép đóng ưu đãi.
      }
    }
    onClose();
  }
  useEffect(() => {
    try {
      sessionStorage.setItem("nova-welcome-seen", "1");
    } catch {
      // Phiên duyệt riêng tư vẫn sử dụng được hộp thoại.
    }
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function keyboard(event) {
    if (event.key === "Escape") close();
    if (event.key !== "Tab") return;
    const items = [...panel.current.querySelectorAll("button, a[href], input")];
    const first = items[0],
      last = items.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === panel.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div
      className="welcome-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="welcome-campaign"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        tabIndex={-1}
        ref={panel}
        onKeyDown={keyboard}
      >
        <div className="welcome-art welcome-product-photo">
          <MenuImage
            item={{ key: "party69", name: "Party Combo 69K" }}
            priority
          />
          <span>1 BẮP LỚN + 2 NƯỚC NGỌT</span>
        </div>
        <button
          className="welcome-close"
          onClick={close}
          aria-label="Đóng ưu đãi mở màn"
        >
          <X size={22} />
        </button>
        <div className="welcome-copy">
          <p className="welcome-brand">
            NOVA <span>CINEMA</span>
          </p>
          <span className="welcome-tag">
            <Sparkles size={13} />
            COMBO CHO BUỔI PHIM
          </span>
          <h2 id="welcome-title">
            Mở màn rực rỡ.
            <br />
            <em>Trọn vị cuộc vui.</em>
          </h2>
          <p className="welcome-intro">
            Một bộ phim hay. Một combo đầy vị.
            <br />
            Một cuộc hẹn chẳng muốn bỏ lỡ.
          </p>
          <div className="welcome-price">
            <span>
              PARTY
              <br />
              <b>COMBO</b>
            </span>
            <strong>
              69<small>K</small>
            </strong>
          </div>
          <p className="welcome-includes">
            <Popcorn size={16} />1 bắp lớn + 2 nước ngọt 22oz
          </p>
          <div className="welcome-buttons">
            <Link href="/bap-nuoc" onClick={close}>
              Khám phá bắp nước <ArrowUpRight size={17} />
            </Link>
            <Link href="/dat-ve" onClick={close}>
              Chọn suất xem phim <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="welcome-bottom">
          <label>
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(event) => setHideToday(event.target.checked)}
            />
            Không hiển thị lại hôm nay
          </label>
          <span>Giá minh họa · Mua kèm vé · Không thu tiền thật</span>
        </div>
      </section>
    </div>
  );
}
