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
    html: `<div style="background:#0d1018;padding:24px 12px;font-family:Arial,sans-serif;color:#e9e6df"><table role="presentation" style="max-width:580px;width:100%;margin:auto;border-collapse:collapse;background:#171c29;border:1px solid #323849;border-radius:12px"><tr><td style="padding:28px;border-bottom:3px solid #eb2540"><p style="letter-spacing:5px;font-size:22px;font-weight:bold;margin:0;color:#e9bf7c">NOVA CINEMA</p><p style="font-size:10px;letter-spacing:2px;color:#a9afbc">INFINITY EXPERIENCE</p></td></tr><tr><td style="padding:28px"><p style="color:#e9bf7c;font-size:11px;letter-spacing:2px">CUỘC HẸN ĐIỆN ẢNH ĐÃ SẴN SÀNG</p><h1 style="font-size:25px;line-height:1.35;margin:14px 0 24px">${escapeHtml(details.movie)}</h1>${lines
      .slice(2, 8)
      .map(
        (line) =>
          `<p style="line-height:1.7;font-size:13px;margin:8px 0">${escapeHtml(line)}</p>`,
      )
      .join(
        "",
      )}<p style="font-size:12px;color:#bdc2cc;margin-top:24px">Mã đơn: <b>${escapeHtml(details.orderCode)}</b></p></td></tr><tr><td style="text-align:center;padding:24px;border-top:1px dashed #576074"><img alt="QR check-in" width="240" height="240" style="max-width:100%;border-radius:8px" src="cid:nova-ticket-qr"><p style="font-size:12px;line-height:1.8;color:#c2c7d1">Xuất trình QR tại cửa phòng chiếu.<br>Mỗi vé chỉ được xác nhận vào rạp một lần.</p></td></tr><tr><td style="padding:20px 28px;background:#121620;color:#a9afbc;font-size:11px;line-height:1.8">Vé QR (PNG) và lịch xem phim (.ics) được đính kèm email này.<br>NOVA Cinema · Đồ án Nhóm 03 · Thanh toán Sandbox.</td></tr></table></div>`,
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
