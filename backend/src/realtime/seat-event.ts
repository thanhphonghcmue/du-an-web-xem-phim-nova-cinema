import { isISO8601, isUUID } from "class-validator";
export type SeatEventName = "seat_locked" | "seat_released" | "seat_sold";
export interface SeatEvent {
  type: SeatEventName;
  eventId: string;
  occurredAt: string;
  showtimeId: string;
  seatIds: string[];
  bookingId?: string;
  expiresAt?: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function uuid(value: unknown): value is string {
  return typeof value === "string" && isUUID(value);
}
function timestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    isISO8601(value, { strict: true, strictSeparator: true }) &&
    Number.isFinite(new Date(value).getTime())
  );
}
// Rebuild the public payload; never forward arbitrary JSON fields from outbox/Redis.
export function seatEvent(
  type: unknown,
  payload: unknown,
  id: unknown,
  occurredAt: unknown,
): SeatEvent {
  if (
    (type !== "seat_locked" &&
      type !== "seat_released" &&
      type !== "seat_sold") ||
    !record(payload) ||
    !uuid(id) ||
    !timestamp(occurredAt) ||
    !uuid(payload.showtimeId) ||
    !Array.isArray(payload.seatIds) ||
    payload.seatIds.length > 20 ||
    !payload.seatIds.every(uuid)
  )
    throw new Error("Invalid seat event.");
  const seatIds = payload.seatIds.map((value) => value.toLowerCase()).sort();
  if (new Set(seatIds).size !== seatIds.length)
    throw new Error("Invalid seat event.");
  const base: SeatEvent = {
    type,
    eventId: id.toLowerCase(),
    occurredAt: new Date(occurredAt).toISOString(),
    showtimeId: payload.showtimeId.toLowerCase(),
    seatIds,
  };
  if (type === "seat_locked") {
    if (
      !uuid(payload.bookingId) ||
      !timestamp(payload.expiresAt) ||
      seatIds.length === 0
    )
      throw new Error("Invalid seat event.");
    return {
      ...base,
      bookingId: payload.bookingId.toLowerCase(),
      expiresAt: new Date(payload.expiresAt).toISOString(),
    };
  }
  return base;
}
export function decodeSeatEvent(message: string): SeatEvent {
  const raw: unknown = JSON.parse(message);
  if (!record(raw)) throw new Error("Invalid seat event.");
  return seatEvent(raw.type, raw, raw.eventId, raw.occurredAt);
}
export function publicSeatPayload(event: SeatEvent) {
  return {
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    showtimeId: event.showtimeId,
    seatIds: event.seatIds,
    ...(event.type === "seat_locked"
      ? { bookingId: event.bookingId, expiresAt: event.expiresAt }
      : {}),
  };
}
