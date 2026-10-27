import { QRCodeSVG } from "qrcode.react";
import { ticketQrData } from "../ticketQr.js";

export default function ETicketQr({ ticket, loading = false }) {
  if (loading || !ticket)
    return (
      <div className="ticket-qr-placeholder" role="status">
        Đang phát hành mã QR…
      </div>
    );
  const data = ticketQrData(ticket);
  if (!data)
    return (
      <div className="ticket-qr-placeholder" role="alert">
        Chưa nhận được định danh vé hợp lệ. Hãy bấm Làm mới vé để thử lại.
      </div>
    );
  return (
    <QRCodeSVG
      className="ticket-qr-svg"
      role="img"
      aria-label={data.label}
      title={data.label}
      value={data.value}
      size={192}
      level="M"
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#080b12"
    />
  );
}
