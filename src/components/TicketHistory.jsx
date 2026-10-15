import { useCallback, useEffect, useState } from "react";
import { apiGetMyBookings, apiGetMyTickets } from "../api/client.js";
import { useCatalog } from "../catalog.js";
import { money } from "../data.js";
export default function TicketHistory({ member, onResume }) {
  const { contextFor } = useCatalog();
  const [tickets, setTickets] = useState([]),
    [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!member) {
      setLoading(false);
      return;
    }
    try {
      const [t, o] = await Promise.all([apiGetMyTickets(), apiGetMyBookings()]);
      setTickets(t);
      setOrders(o);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [member]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, [load]);
  if (!member) return <p>Vui lòng đăng nhập để tra cứu vé của bạn.</p>;
  return (
    <div className="history-list">
      {loading && <p role="status">Đang tải vé…</p>}
      {error && <p role="alert">{error}</p>}
      {orders
        .filter((o) => ["HOLDING", "PENDING"].includes(o.status))
        .map((o) => (
          <article key={o.id}>
            <div>
              <h3>Đơn đang giữ ghế</h3>
              <p>{o.orderCode}</p>
              <p>
                {money(o.finalAmount)} · Hết hạn{" "}
                {new Date(o.expiredAt).toLocaleTimeString("vi-VN")}
              </p>
            </div>
            {contextFor(o.showtimeId) && (
              <button
                className="button button-glass"
                onClick={() =>
                  onResume({ ...contextFor(o.showtimeId), orderId: o.id })
                }
              >
                Tiếp tục đơn
              </button>
            )}
          </article>
        ))}
      {orders
        .filter(
          (o) =>
            o.status === "PAID" && !tickets.some((t) => t.bookingId === o.id),
        )
        .map((o) => (
          <p role="status" key={o.id}>
            Đơn {o.orderCode}: Đã thanh toán · đang phát hành vé QR.
          </p>
        ))}
      {tickets.map((ticket) => (
        <article key={ticket.id}>
          <img src={ticket.qrCodeBase64} alt={`QR vé ${ticket.orderCode}`} />
          <div>
            <h3>{ticket.movie}</h3>
            <p>
              {ticket.cinema} · {ticket.room}
            </p>
            <p>
              {new Date(ticket.startTime).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <p>
              Ghế: {ticket.seats.map((s) => s.label).join(", ")} ·{" "}
              {money(ticket.amount)}
            </p>
            <small>{ticket.isCheckedIn ? "Đã soát vé" : "Chưa soát vé"}</small>
            <p>
              <a
                className="text-button"
                href={ticket.qrCodeBase64}
                download={`${ticket.orderCode}.png`}
              >
                Tải QR
              </a>{" "}
              ·{" "}
              <a
                className="text-button"
                href={`/api/v1/tickets/${ticket.id}/calendar`}
              >
                Thêm lịch .ics
              </a>
            </p>
          </div>
        </article>
      ))}
      {!loading && !error && !orders.length && <p>Bạn chưa có đơn đặt vé.</p>}
    </div>
  );
}
