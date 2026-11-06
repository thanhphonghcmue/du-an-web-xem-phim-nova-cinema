// HopThoaiModal: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/Modal.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/HopThoaiModal.jsx
 * ==============================================================================
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Chỉ hộp thoại trên cùng xử lý Escape/Tab; các bước thanh toán có thể lồng nhau.
const dialogStack = [];
let bodyOverflow = "";

export default function HopThoaiModal({
  title,
  onClose,
  children,
  wide = false,
  embedded = false,
  image = "/images/cinema-lobby.jpg",
  className = "",
  headerless = false,
  dialogRole = "dialog",
}) {
  const panel = useRef(null);
  useEffect(() => {
    if (embedded) return;
    const previous = document.activeElement;
    const node = panel.current;
    if (!dialogStack.length) bodyOverflow = document.body.style.overflow;
    dialogStack.push(node);
    document.body.style.overflow = "hidden";
    node.focus();
    return () => {
      const index = dialogStack.indexOf(node);
      if (index !== -1) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = bodyOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [embedded]);
  useEffect(() => {
    if (embedded) return;
    const onKey = (e) => {
      if (dialogStack.at(-1) !== panel.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
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
  const content = (
    <div
      className={embedded ? "embedded-dialog" : "modal-backdrop"}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role={dialogRole}
        aria-modal={embedded ? undefined : true}
        aria-label={title}
        className={`modal-panel ${wide ? "modal-wide" : ""} ${className}`}
      >
        {!headerless && (
          <header
            className="modal-header"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(10,12,18,.94), rgba(10,12,18,.45)), url("${image}")`,
            }}
          >
            <div>
              <span className="eyebrow">NOVA / BEYOND THE FRAME</span>
              <h2>{title}</h2>
            </div>
            {!embedded && (
              <button
                className="icon-button"
                onClick={onClose}
                aria-label="Đóng"
              >
                <X size={21} />
              </button>
            )}
          </header>
        )}
        {children}
      </section>
    </div>
  );
  // A transformed page section must not place the dialog below the sticky header.
  return embedded
    ? content
    : typeof document === "undefined"
      ? null
      : createPortal(content, document.body);
}
