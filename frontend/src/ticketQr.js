const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// A booking code is a display/reference ID. Admission verifies the opaque
// server-issued ticket hash, so never generate a substitute QR from an order ID.
export function ticketQrData(ticket) {
  if (
    !ticket ||
    typeof ticket.id !== "string" ||
    typeof ticket.bookingId !== "string" ||
    typeof ticket.orderCode !== "string" ||
    typeof ticket.ticketHash !== "string" ||
    !uuid.test(ticket.id) ||
    !uuid.test(ticket.bookingId) ||
    !/^NOVA-[a-f0-9]{32}$/.test(ticket.orderCode || "") ||
    !/^[a-f0-9]{64}$/.test(ticket.ticketHash || "")
  )
    return null;
  return { value: ticket.ticketHash, label: `QR vé ${ticket.orderCode}` };
}

export function ticketPng(ticket) {
  return typeof ticket?.qrCodeBase64 === "string" &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(ticket.qrCodeBase64)
    ? ticket.qrCodeBase64
    : null;
}
