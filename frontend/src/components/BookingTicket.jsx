import { useEffect, useState } from "react";
import { apiGetMyTickets } from "@/api/client.js";
import { ticketQrData } from "@/ticketQr.js";
import { uniqueRecords } from "@/uniqueRecords.js";
import ETicketQr from "./ETicketQr.jsx";
import TicketQrZoom from "./TicketQrZoom.jsx";
export default function BookingTicket({ orderId, expectedSeats = 1 }) {
  const [tickets, setTickets] = useState([]),
    [zoomTicket, setZoomTicket] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      running = false,
      loaded = false;
    let timer;
    async function readTicket() {
      if (running || (loaded && document.hidden)) return;
      running = true;
      try {
        const items = await apiGetMyTickets();
        if (active) {
          const issued = uniqueRecords(items).filter(
            (item) => item.bookingId === orderId,
          );
          setTickets(issued);
          setError("");
          loaded = true;
          // QR đã phát hành là định danh cố định; không poll ví vé suốt phiên.
          if (
            issued.length &&
            (issued.some((item) => item.legacyGroup) ||
              issued.length >= expectedSeats) &&
            issued.every(ticketQrData)
          ) {
            clearInterval(timer);
            window.removeEventListener("focus", readTicket);
          }
        }
      } catch (cause) {
        if (active) setError(cause.message);
      } finally {
        running = false;
      }
    }
    void readTicket();
    timer = setInterval(readTicket, 4000);
    window.addEventListener("focus", readTicket);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", readTicket);
    };
  }, [orderId, expectedSeats]);
  return (
    <div className="booking-issued-ticket">
      {!tickets.length && <ETicketQr loading />}
      {tickets.map((ticket) => (
        <div className="booking-seat-ticket" key={ticket.id}>
          <strong>
            Ghế {ticket.seats.map((seat) => seat.label).join(", ")}
          </strong>
          <button
            type="button"
            className="ticket-zoom-trigger"
            onClick={() => setZoomTicket(ticket)}
            aria-label={`Phóng to QR ghế ${ticket.seats.map((seat) => seat.label).join(", ")}`}
          >
            <ETicketQr ticket={ticket} />
          </button>
          <span className="ticket-readable-code">
            {ticket.ticketCode || ticket.orderCode}
          </span>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
      {zoomTicket && (
        <TicketQrZoom ticket={zoomTicket} onClose={() => setZoomTicket(null)} />
      )}
    </div>
  );
}
