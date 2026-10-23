import { TicketRecord } from "./tickets.repository";
export function ticketDetails(row: TicketRecord) {
  const booking = row.booking;
  const showtime = booking.showtime;
  return {
    id: row.id,
    showtimeId: booking.showtimeId,
    bookingId: booking.id,
    orderCode: booking.orderCode,
    movie: showtime.movie.title,
    cinema: showtime.room.cinema.name,
    room: showtime.room.name,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    amount: booking.finalAmount.toFixed(2),
    currency: "VND" as const,
    seats: booking.seats.map((line) => ({
      label: `${line.seat.seatRow}${String(line.seat.seatColumn)}`,
      type: line.seat.seatType,
      price: line.price.toFixed(2),
    })),
    combos: booking.combos.map((line) => ({
      name: line.combo.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toFixed(2),
    })),
    isCheckedIn: row.isCheckedIn,
    checkedInAt: row.checkedInAt,
  };
}
export function withinCheckInWindow(
  now: Date,
  start: Date,
  before: number,
  after: number,
): boolean {
  return (
    now.getTime() >= start.getTime() - before * 60000 &&
    now.getTime() <= start.getTime() + after * 60000
  );
}
export function ticketCalendar(row: TicketRecord): string {
  const details = ticketDetails(row);
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/[,;]/g, (match) => `\\${match}`);
  const fold = (line: string) => {
    let result = "";
    let bytes = 0;
    for (const char of line) {
      const size = Buffer.byteLength(char);
      if (bytes + size > 75) {
        result += "\r\n ";
        bytes = 1;
      }
      result += char;
      bytes += size;
    }
    return result;
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NOVA Cinema//Ticket//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${row.id}@nova.local`,
    `DTSTAMP:${stamp(row.createdAt)}`,
    `DTSTART:${stamp(details.startTime)}`,
    `DTEND:${stamp(new Date(details.startTime.getTime() + row.booking.showtime.movie.durationMinutes * 60000))}`,
    `SUMMARY:${escape(details.movie + " — NOVA Cinema")}`,
    `LOCATION:${escape(details.cinema + " / " + details.room + " / " + row.booking.showtime.room.cinema.address)}`,
    `DESCRIPTION:${escape("Đơn " + details.orderCode + "; Ghế " + details.seats.map((seat) => seat.label).join(", "))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Nhắc lịch xem phim NOVA Cinema",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(fold)
    .join("\r\n");
}
