import { TicketRecord } from "../tickets/tickets.repository";
import { ticketCalendar, ticketDetails } from "../tickets/ticket-format";
export function ticketEmail(row: TicketRecord, eventId: string, from: string) {
  const details = ticketDetails(row);
  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
  }).format(details.startTime);
  const lines = [
    `NOVA CINEMA — ${details.orderCode}`,
    `Phim: ${details.movie}`,
    `Rạp: ${details.cinema}`,
    `Phòng: ${details.room}`,
    `Suất chiếu: ${date} (UTC+07:00)`,
    `Ghế: ${details.seats.map((seat) => seat.label).join(", ")}`,
    `Combo: ${details.combos.map((combo) => `${combo.name} ×${String(combo.quantity)}`).join(", ") || "Không"}`,
    `Tổng thanh toán: ${details.amount} VND`,
    "Xuất trình QR đính kèm để nhân viên check-in. Mỗi vé chỉ được sử dụng một lần.",
  ];
  return {
    from,
    to: row.booking.user.email,
    subject: `NOVA Cinema — Vé ${details.orderCode}`,
    messageId: `<nova-ticket-${eventId}@nova.local>`,
    text: lines.join("\n"),
    html: `<h1>Vé NOVA CINEMA</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<img alt="QR check-in" width="320" height="320" src="cid:nova-ticket-qr">`,
    attachments: [
      {
        filename: `nova-${details.orderCode}.png`,
        content: Buffer.from(
          row.qrCodeBase64.replace(/^data:image\/png;base64,/, ""),
          "base64",
        ),
        contentType: "image/png",
        cid: "nova-ticket-qr",
      },
      {
        filename: "nova-calendar.ics",
        content: Buffer.from(ticketCalendar(row)),
        contentType: "text/calendar; charset=utf-8",
      },
    ],
  };
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] || "",
  );
}
