import { useEffect, useState } from "react";
import { apiGetMyTickets } from "@/api/client.js";
import ETicketQr from "./ETicketQr.jsx";
export default function BookingTicket({ orderId }) {
  const [ticket, setTicket] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      running = false;
    async function readTicket() {
      if (running) return;
      running = true;
      try {
        const items = await apiGetMyTickets();
        if (active) {
          setTicket(items.find((item) => item.bookingId === orderId) || null);
          setError("");
        }
      } catch (cause) {
        if (active) setError(cause.message);
      } finally {
        running = false;
      }
    }
    void readTicket();
    const timer = setInterval(readTicket, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId]);
  return (
    <div className="booking-issued-ticket">
      <ETicketQr ticket={ticket} loading={!ticket} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
