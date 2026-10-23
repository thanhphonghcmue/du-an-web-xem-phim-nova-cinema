import { useState } from "react";
import { Mail, RefreshCw, ChevronUp, CheckCircle2 } from "lucide-react";
import { read } from "../api/client.js";

const delivery = {
  SMTP_ACCEPTED: "Máy chủ SMTP đã tiếp nhận thư",
  RETRYING: "Chưa gửi được · Hệ thống đang thử lại",
  QUEUED: "Thư đang chờ gửi",
  UNKNOWN: "Chưa có trạng thái gửi trong hệ thống",
};
export default function TicketConfirmation({ ticketId }) {
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setMessage(await read(`/tickets/${ticketId}/confirmation`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="ticket-confirmation">
      <button
        className="text-button confirmation-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void load();
        }}
      >
        <Mail size={15} />
        {open ? "Đóng xem trước email" : "Xem email xác nhận"}
        {open && <ChevronUp size={14} />}
      </button>
      {open && (
        <section className="confirmation-panel" aria-label="Email xác nhận vé">
          <header>
            <div>
              <p className="nova-kicker">NOVA MAIL · BẢN XEM TRƯỚC</p>
              <h3>{message?.subject || "Email xác nhận đặt vé"}</h3>
              {message && <p>Đến: {message.to}</p>}
            </div>
            <button
              className="icon-button"
              aria-label="Cập nhật trạng thái email"
              disabled={loading}
              onClick={load}
            >
              <RefreshCw size={16} />
            </button>
          </header>
          {loading && <p role="status">Đang đọc email từ hệ thống…</p>}
          {error && (
            <p role="alert" className="auth-notice">
              {error}
            </p>
          )}
          {message && (
            <>
              <p
                className={`confirmation-delivery ${message.deliveryStatus === "SMTP_ACCEPTED" ? "accepted" : ""}`}
              >
                <CheckCircle2 size={15} />
                {delivery[message.deliveryStatus]}
                {message.acceptedAt &&
                  ` · ${new Date(message.acceptedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`}
              </p>
              <p className="confirmation-note">
                Nội dung từ vé thực của bạn. Bản xem trước không gửi lại thư;
                trạng thái SMTP chưa xác nhận thư đã vào hộp thư đến.
              </p>
              <iframe
                title="Nội dung email NOVA Cinema"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={`<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';"></head><body style="margin:0">${message.html}</body></html>`}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
