"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SingleTicketLookup from "./SingleTicketLookup.jsx";
import NovaLogo from "./NovaLogo.jsx";
import { readCommand } from "@/api/client.js";
export default function PublicTicket() {
  const [lookupActive, setLookupActive] = useState(false);
  const [ticket, setTicket] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true,
      version = 0;
    const read = async () => {
      const current = ++version;
      const hash = window.location.hash.slice(1);
      setLoading(true);
      setTicket(null);
      setError("");
      try {
        if (!hash) return;
        if (!/^[a-f0-9]{64}$/.test(hash))
          throw new Error(
            "Mã tra cứu vé chưa hợp lệ. Hãy quét lại QR trên vé của bạn.",
          );
        const data = await readCommand("/tickets/lookup", { ticketHash: hash });
        if (
          !Array.isArray(data?.seats) ||
          typeof data.movie !== "string" ||
          !Number.isFinite(Date.parse(data.startTime))
        )
          throw new Error(
            "Máy chủ chưa trả đủ thông tin vé. Vui lòng thử lại.",
          );
        if (active && current === version) setTicket(data);
      } catch (cause) {
        if (active && current === version) setError(cause.message);
      } finally {
        if (active && current === version) setLoading(false);
      }
    };
    void read();
    window.addEventListener("hashchange", read);
    return () => {
      active = false;
      window.removeEventListener("hashchange", read);
    };
  }, []);
  return (
    <main className="public-ticket-page">
      <section className="public-ticket-card">
        <NovaLogo />
        <p className="nova-kicker">THÔNG TIN VÉ ĐIỆN TỬ</p>
        <SingleTicketLookup onActive={setLookupActive} />
        {!lookupActive && loading && <p role="status">Đang tra cứu vé…</p>}
        {!lookupActive && error && <p role="alert">{error}</p>}
        {!lookupActive && ticket && (
          <>
            <h1>{ticket.movie}</h1>
            <strong className="ticket-readable-code">
              {ticket.ticketCode}
            </strong>
            <p>
              {ticket.cinema} · {ticket.room}
            </p>
            <p>
              {new Date(ticket.startTime).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <p>Ghế: {ticket.seats.map((s) => s.label).join(", ")}</p>
            <p
              className={`ticket-state ${ticket.status === "USED" ? "used" : ""}`}
            >
              {ticket.status === "USED"
                ? "Vé đã sử dụng"
                : ticket.status === "VALID"
                  ? "Vé chưa sử dụng"
                  : "Vé không đủ điều kiện sử dụng"}
            </p>
            <p>
              Xuất trình QR hoặc mã vé tại cửa phòng. Việc cho vào rạp cần nhân
              viên xác nhận.
            </p>
          </>
        )}
        <Link className="button button-primary" href="/">
          Về NOVA Cinema
        </Link>
      </section>
    </main>
  );
}
