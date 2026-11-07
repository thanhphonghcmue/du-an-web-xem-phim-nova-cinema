"use client";
import { useRef, useState } from "react";
import { read } from "@/api/client.js";
import input from "../../../shared/ticket-input.cjs";
import QrCapture from "./QrCapture.jsx";
import ETicketQr from "./ETicketQr.jsx";
import { money } from "@/data.js";
import { friendlyDay } from "@/bookingDates.js";
import { formatVietnamDateKey } from "@/catalog.js";
const showDay = (start) => {
  const day = formatVietnamDateKey(start);
  return day === formatVietnamDateKey(new Date())
    ? "Hôm nay"
    : friendlyDay(day, "vi");
};
const seatName = (seat) =>
  seat.label.replace(
    /(\D+)(\d+)$/,
    (_, row, column) => row + column.padStart(2, "0"),
  );
export default function SingleTicketLookup({
  onActive = () => {},
  staffMode = false,
}) {
  const [code, setCode] = useState(""),
    [ticket, setTicket] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [scanner, setScanner] = useState(false);
  const version = useRef(0);
  async function lookup(raw) {
    const value = input.extractNormalizedCode(raw);
    if (!value) return;
    const current = ++version.current;
    setCode(value);
    setTicket(null);
    setError("");
    setBusy(true);
    onActive(true);
    try {
      const result = await read(
        `${staffMode ? "/staff/tickets" : "/tickets"}/lookup?${new URLSearchParams({ code: value })}`,
      );
      if (current === version.current) setTicket(result.ticket);
    } catch (cause) {
      if (current === version.current)
        setError(
          cause.status === 401
            ? "Vui lòng đăng nhập để tra cứu mã vé riêng của bạn."
            : cause.status === 404
              ? "Không tìm thấy mã vé hoặc mã vé không hợp lệ! (Hệ thống từ chối mã giả và bảo mật tuyệt đối thông tin vé của khách hàng khác)"
              : cause.message,
        );
    } finally {
      if (current === version.current) setBusy(false);
    }
  }
  return (
    <section
      className="ticket-lookup-panel"
      aria-label="Tra cứu mã vé riêng lẻ"
    >
      <h2>🔍 Tra cứu &amp; Quét Mã Vé Điện Tử Riêng Lẻ (Ticket Lookup)</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(code);
        }}
      >
        <input
          type="text"
          aria-label="Mã vé riêng lẻ"
          placeholder="Nhập mã vé riêng lẻ (VD: V1, 8F9A, NOVA-20261102-8F9A) hoặc mã bất kỳ..."
          value={code}
          onChange={(e) => {
            ++version.current;
            setCode(e.target.value);
            setTicket(null);
            setError("");
            setBusy(false);
            onActive(Boolean(e.target.value.trim()));
          }}
        />
        <button
          className="button button-primary"
          disabled={busy || !code.trim()}
        >
          🔍 Tìm kiếm / Tra cứu vé
        </button>
        <button
          type="button"
          className="button button-glass"
          onClick={() => setScanner((v) => !v)}
        >
          📷 Quét mã QR vé
        </button>
        <button
          type="button"
          className="button button-glass"
          onClick={() => {
            ++version.current;
            setCode("");
            setTicket(null);
            setError("");
            setBusy(false);
            onActive(false);
          }}
        >
          Xóa tra cứu
        </button>
      </form>
      <div className="cinema-state-actions">
        {["V1", "NOVA-20261102-8F9A", "QR_INVALID_999"].map((c) => (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            key={c}
            onClick={() => lookup(c)}
          >
            Thử mã {c === "QR_INVALID_999" ? "giả" : "hợp lệ"}: {c}
          </button>
        ))}
      </div>
      {scanner && <QrCapture onCode={lookup} disabled={busy} />}
      {busy && <p role="status">Đang tra cứu vé…</p>}
      {error && (
        <p role="alert" className="cinema-state-card cinema-state-red">
          {error}
        </p>
      )}
      {ticket && (
        <article className="ticket-lookup-result cinema-state-card cinema-state-green">
          <p className="cinema-status-pill">
            ✓ TÌM THẤY VÉ HỢP LỆ (TRÙNG KHỚP BOOKING ĐÃ THANH TOÁN)
          </p>
          <h3>{ticket.movie}</h3>
          <strong>
            {ticket.ticketCode} {ticket.shortCode && `(${ticket.shortCode})`}
          </strong>
          <p>
            {ticket.cinema} · {ticket.room}
          </p>
          <p>Hạng thành viên: {ticket.membershipTier || "Khách hàng"}</p>
          <p>
            {new Date(ticket.startTime).toLocaleTimeString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            - {showDay(ticket.startTime)}
          </p>
          <p>
            Ghế của vé:{" "}
            {(ticket.seats || [])
              .map((s) => `${seatName(s)} (${s.type})`)
              .join(", ")}
          </p>
          <p>
            Ghế trong đơn đã thanh toán:{" "}
            {(ticket.bookingSeats || ticket.seats || [])
              .map(seatName)
              .join(", ")}
          </p>
          <p>
            Đã thanh toán ({ticket.paymentStatus}) - {money(ticket.amount)} ·
            Tổng tiền của đơn
          </p>
          <p>
            Bắp nước:{" "}
            {(ticket.combos || [])
              .map((c) => `${c.quantity}x ${c.name}`)
              .join(", ") || "Không có"}
          </p>
          <p>
            VÉ HỢP LỆ ({ticket.paymentStatus}) ·{" "}
            {ticket.isCheckedIn ? "Đã sử dụng / Đã check-in" : "Chưa sử dụng"}
          </p>
          <ETicketQr ticket={ticket} />
        </article>
      )}
    </section>
  );
}
