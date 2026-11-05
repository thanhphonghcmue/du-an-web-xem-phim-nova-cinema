"use client";
import { useEffect, useRef } from "react";
import ETicketQr from "./ETicketQr.jsx";
export default function TicketQrZoom({ ticket, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ticket-qr-zoom"
      aria-label={`Mã QR ghế ${ticket.seats.map((s) => s.label).join(", ")}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="button button-glass"
        onClick={onClose}
        autoFocus
      >
        Đóng mã QR
      </button>
      <p className="nova-kicker">NOVA CINEMA · XUẤT TRÌNH TẠI RẠP</p>
      <h2>{ticket.movie}</h2>
      <p>
        {ticket.cinema} · {ticket.room}
      </p>
      <ETicketQr ticket={ticket} />
      <strong className="ticket-readable-code">
        {ticket.ticketCode || ticket.orderCode}
      </strong>
      <p>
        Ghế {ticket.seats.map((seat) => seat.label).join(", ")} ·{" "}
        {ticket.isCheckedIn ? "Đã sử dụng" : "Chưa sử dụng"}
      </p>
      <p>Nhân viên rạp sẽ đối chiếu vé trước khi xác nhận cho vào phòng.</p>
    </dialog>
  );
}
