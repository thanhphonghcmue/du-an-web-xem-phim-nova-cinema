import { TicketRecord } from "../tickets/tickets.repository";
import { ticketCalendar, ticketDetails } from "../tickets/ticket-format";
export function ticketEmail(row: TicketRecord, eventId: string, from: string) {
  const details = ticketDetails(row);
  const customerName = row.booking.user.fullName || row.booking.user.email;
  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
  }).format(details.startTime);
  const amount = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(details.amount));
  const comboDetails = details.combos.length
    ? details.combos
        .map(
          (combo) =>
            `${combo.name} ×${String(combo.quantity)} — ${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(combo.unitPrice) * combo.quantity)}₫`,
        )
        .join("; ")
    : "Không có combo";
  const rows: Array<[string, string]> = [
    ["Tên khách hàng", customerName],
    ["Mã đơn hàng", details.orderCode],
    ["Tên phim", details.movie],
    ["Suất chiếu", `${date} (UTC+07:00)`],
    ["Rạp", details.cinema],
    ["Phòng chiếu", details.room],
    ["Vị trí ghế", details.seats.map((seat) => seat.label).join(", ")],
    ["Chi tiết combo", comboDetails],
  ];
  const lines = [
    `Xin chào ${customerName},`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    `Số tiền đã thanh toán: ${amount}₫`,
    "Xuất trình QR đính kèm để nhân viên check-in. Mỗi vé chỉ được sử dụng một lần.",
  ];
  const emailRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #30394b;color:#aeb9ca;font-size:13px;line-height:1.6;vertical-align:top;width:36%">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #30394b;color:#f4f6fa;font-size:13px;font-weight:600;line-height:1.6;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return {
    from,
    to: row.booking.user.email,
    subject: `NOVA Cinema — Vé ${details.orderCode}`,
    messageId: `<nova-ticket-${eventId}@nova.local>`,
    text: lines.join("\n"),
    html: `<div style="background-color:#0b0e16;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#f4f6fa;color-scheme:dark"><table role="presentation" width="100%" bgcolor="#151a27" style="max-width:620px;width:100%;margin:0 auto;border-collapse:collapse;background-color:#151a27;border:1px solid #30394b;border-radius:12px;color:#f4f6fa"><tr><td bgcolor="#151a27" style="padding:25px 28px;border-bottom:3px solid #eb2540;background-color:#151a27;color:#f4f6fa"><p style="letter-spacing:5px;font-size:22px;font-weight:bold;margin:0;color:#f0c77d">NOVA CINEMA</p><p style="font-size:10px;letter-spacing:2px;margin:6px 0 0;color:#b7c0cf">INFINITY EXPERIENCE</p></td></tr><tr><td bgcolor="#151a27" style="padding:24px 28px 12px;background-color:#151a27;color:#f4f6fa"><p style="margin:0 0 8px;color:#35d980;font-size:11px;font-weight:bold;letter-spacing:1.5px">THANH TOÁN THÀNH CÔNG · VÉ ĐÃ PHÁT HÀNH</p><h1 style="font-size:24px;line-height:1.35;margin:0 0 10px;color:#ffffff">${escapeHtml(details.movie)}</h1><p style="font-size:14px;line-height:1.6;margin:0;color:#e1e6ef">Xin chào <strong style="color:#ffffff">${escapeHtml(customerName)}</strong>, vé điện tử của bạn đã sẵn sàng.</p></td></tr><tr><td bgcolor="#151a27" style="padding:8px 18px 22px;background-color:#151a27"><table role="presentation" width="100%" bgcolor="#1b2130" style="width:100%;border-collapse:collapse;background-color:#1b2130;border:1px solid #30394b">${emailRows}<tr><td bgcolor="#10251a" style="padding:13px 12px;border-top:2px solid #21cb70;color:#d8e7dd;font-size:13px;font-weight:bold">Số tiền đã thanh toán</td><td bgcolor="#10251a" style="padding:13px 12px;border-top:2px solid #21cb70;color:#37e184;font-size:18px;font-weight:bold">${amount}₫</td></tr></table></td></tr><tr><td bgcolor="#151a27" style="text-align:center;padding:20px 24px;border-top:1px dashed #596579;background-color:#151a27;color:#f4f6fa"><img alt="Mã QR vé điện tử" width="220" height="220" style="display:block;width:220px;height:220px;max-width:100%;margin:0 auto;border:8px solid #ffffff;border-radius:10px;background-color:#ffffff" src="cid:nova-ticket-qr"><p style="font-size:12px;line-height:1.8;margin:14px 0 0;color:#d5dbe6">Xuất trình mã QR này tại quầy soát vé để vào rạp.<br>Mỗi vé chỉ được sử dụng một lần.</p></td></tr><tr><td bgcolor="#10141e" style="padding:18px 28px;background-color:#10141e;color:#b7c0cf;font-size:11px;line-height:1.8">Mã QR (PNG) và lịch xem phim (.ics) được đính kèm email này.<br>NOVA Cinema · Thanh toán Sandbox.</td></tr></table></div>`,
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
