"use client";
import { useRef, useState } from "react";
import { read } from "@/api/client.js";
import input from "../../../shared/ticket-input.cjs";
import QrCapture from "./QrCapture.jsx";
import ETicketQr from "./ETicketQr.jsx";
export default function SingleTicketLookup({ onActive = () => {} }) {
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
        `/tickets/lookup?${new URLSearchParams({ code: value })}`,
      );
      if (current === version.current) setTicket(result.ticket);
    } catch (cause) {
      if (current === version.current)
        setError(
          cause.status === 401
            ? "Vui lòng đăng nhập để tra cứu mã vé riêng của bạn."
            : cause.status === 404
              ? "Không tìm thấy vé hoặc mã vé không hợp lệ! Hệ thống bảo mật không hiển thị thông tin vé khi mã tra cứu không khớp."
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
      <h2>🔍 Tra cứu &amp; Kiểm tra Mã Vé Điện Tử (Ticket Lookup)</h2>
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
          Tra cứu vé
        </button>
        <button
          type="button"
          className="button button-glass"
          onClick={() => setScanner((v) => !v)}
        >
          📷 Quét QR vé
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
          <h3>{ticket.movie}</h3>
          <strong>
            {ticket.ticketCode} {ticket.shortCode && `(${ticket.shortCode})`}
          </strong>
          <p>
            {ticket.cinema} · {ticket.room}
          </p>
          <p>
            {new Date(ticket.startTime).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
          <p>
            Ghế: {ticket.seats.map((s) => `${s.label} (${s.type})`).join(", ")}
          </p>
          <p>
            Bắp nước:{" "}
            {ticket.combos.map((c) => `${c.quantity}x ${c.name}`).join(", ") ||
              "Không có"}
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
