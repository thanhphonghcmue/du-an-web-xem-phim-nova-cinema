import { BookingRecord } from "./bookings.repository";

// Public reads project expiry without acquiring write locks or draining a queue.
// The hold writer and durable expiration worker perform the physical release.
export function projectExpiredBooking(
  row: BookingRecord,
  asOf: Date,
): BookingRecord {
  if (
    !["HOLDING", "PENDING"].includes(row.status) ||
    row.expiredAt > asOf ||
    row.seats.some((seat) => seat.status === "SOLD")
  )
    return row;
  return {
    ...row,
    status: "EXPIRED",
    seats: row.seats.map((seat) => ({
      ...seat,
      status: seat.status === "HOLDING" ? "AVAILABLE" : seat.status,
    })),
  };
}
