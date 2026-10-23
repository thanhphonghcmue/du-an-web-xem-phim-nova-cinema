/**
 * ==============================================================================
 * TỆP TIN: src/components/Modal.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Hộp Thoại Popup Đa Năng Chuẩn Trợ Năng (Accessible Reusable Modal Dialog).
 *   - Các tính năng tiêu chuẩn công nghiệp:
 *     1. BẪY TIÊU ĐIỂM (Focus Trap): Khi bấm phím Tab, tiêu điểm chỉ xoay vòng bên trong modal, không rò rỉ ra ngoài trang.
 *     2. PHÍM TẮT TIỆN LỢI: Bấm phím "Escape" lập tức đóng modal an toàn.
 *     3. KHÓA CUỘN NỀN: Tự động khóa cuộn trang (`body.overflow = hidden`) khi modal đang mở.
 *     4. KHÔI PHỤC TIÊU ĐIỂM: Tự động trả tiêu điểm về nút bấm trước đó khi modal đóng.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Nhận props `title`, `onClose`, `children`, `wide`.
 *   2. Khóa màn hình nền, kích hoạt tiêu điểm vào hộp thoại.
 *   3. Khi người dùng click vào vùng tối mờ bên ngoài (backdrop) hoặc nút X: gọi `onClose()`.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Dùng chung cho: Màn hình chọn ghế, Đăng nhập, Soát vé, Quản trị Admin, Trailer phim.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung hiệu ứng chuyển động trượt mượt mà (Slide-in and Fade-out với Framer Motion).
 * ==============================================================================
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, wide = false }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
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
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-panel ${wide ? "modal-wide" : ""}`}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">NOVA / INFINITY EXPERIENCE</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">
            <X size={21} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
