// HopThoaiModal: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/Modal.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/HopThoaiModal.jsx
 * ==============================================================================
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function HopThoaiModal({
  title,
  onClose,
  children,
  wide = false,
  embedded = false,
  image = "/images/cinema-lobby.jpg",
}) {
  const panel = useRef(null);
  useEffect(() => {
    if (embedded) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [embedded]);
  useEffect(() => {
    if (embedded) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...panel.current.querySelectorAll(
            'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
          ),
        ];
        const first = items[0],
          last = items.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, embedded]);
  return (
    <div
      className={embedded ? "embedded-dialog" : "modal-backdrop"}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal={embedded ? undefined : true}
        aria-label={title}
        className={`modal-panel ${wide ? "modal-wide" : ""}`}
      >
        <header
          className="modal-header"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(10,12,18,.94), rgba(10,12,18,.45)), url("${image}")`,
          }}
        >
          <div>
            <span className="eyebrow">NOVA / INFINITY EXPERIENCE</span>
            <h2>{title}</h2>
          </div>
          {!embedded && (
            <button className="icon-button" onClick={onClose} aria-label="Đóng">
              <X size={21} />
            </button>
          )}
        </header>
        {children}
      </section>
    </div>
  );
}
