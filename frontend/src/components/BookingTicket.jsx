import { useEffect, useState } from "react";
import { apiGetMyTickets } from "@/api/client.js";
import { ticketQrData } from "@/ticketQr.js";
import ETicketQr from "./ETicketQr.jsx";
export default function BookingTicket({ orderId }) {
  const [ticket, setTicket] = useState(null),
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
          const issued =
            items.find((item) => item.bookingId === orderId) || null;
          setTicket(issued);
          setError("");
          loaded = true;
          // QR đã phát hành là định danh cố định; không poll ví vé suốt phiên.
          if (ticketQrData(issued)) {
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
  }, [orderId]);
  return (
    <div className="booking-issued-ticket">
      <ETicketQr ticket={ticket} loading={!ticket} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
