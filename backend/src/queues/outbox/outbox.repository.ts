import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
export const EXPIRATION_REQUESTED = "booking.expiration.requested";
export const EXPIRATION_CANCEL_REQUESTED =
  "booking.expiration.cancel.requested";
export const TICKET_REQUESTED = "booking.ticket.requested";
export interface ClaimedEvent {
  id: string;
  payload: Prisma.JsonValue;
  attempts: number;
  eventType: string;
}
export interface ClaimedSeatEvent extends ClaimedEvent {
  eventType: string;
  createdAt: Date;
}
@Injectable()
export class OutboxRepository {
  async add(
    eventType: string,
    bookingId: string,
    payload: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient,
  ) {
    return await tx.outboxEvent.create({
      data: {
        eventType,
        aggregateType: "booking",
        aggregateId: bookingId,
        payload,
      },
    });
  }
  claim(owner: string, tx: Prisma.TransactionClient): Promise<ClaimedEvent[]> {
    return tx.$queryRaw`
      WITH pending AS (
        SELECT id FROM outbox_events
        WHERE event_type IN (${EXPIRATION_REQUESTED}, ${EXPIRATION_CANCEL_REQUESTED}) AND processed_at IS NULL
          AND available_at <= clock_timestamp()
          AND (locked_at IS NULL OR locked_at < clock_timestamp() - interval '30 seconds')
        ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 20
      )
      UPDATE outbox_events AS event SET locked_at = clock_timestamp(), locked_by = ${owner}, attempts = attempts + 1
      FROM pending WHERE event.id = pending.id
      RETURNING event.id, event.payload, event.attempts, event.event_type AS "eventType"`;
  }
  async needsExpiration(
    bookingId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    return !!booking && ["PENDING", "HOLDING"].includes(booking.status);
  }
  acknowledge(id: string, owner: string, tx: Prisma.TransactionClient) {
    return tx.outboxEvent.updateMany({
      where: { id, lockedBy: owner, processedAt: null },
      data: {
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
  }
  claimSeatEvents(
    owner: string,
    tx: Prisma.TransactionClient,
  ): Promise<ClaimedSeatEvent[]> {
    return tx.$queryRaw`
      WITH pending AS (
        SELECT id FROM outbox_events
        WHERE event_type IN ('seat_locked', 'seat_released', 'seat_sold') AND processed_at IS NULL
          AND available_at <= clock_timestamp()
          AND (locked_at IS NULL OR locked_at < clock_timestamp() - interval '30 seconds')
        ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 20
      )
      UPDATE outbox_events AS event SET locked_at = clock_timestamp(), locked_by = ${owner}, attempts = attempts + 1
      FROM pending WHERE event.id = pending.id
      RETURNING event.id, event.payload, event.attempts, event.event_type AS "eventType", event.created_at AS "createdAt"`;
  }
  retry(
    id: string,
    owner: string,
    attempts: number,
    tx: Prisma.TransactionClient,
    reason:
      | "EXPIRATION_QUEUE_UNAVAILABLE"
      | "SEAT_BROADCAST_UNAVAILABLE" = "EXPIRATION_QUEUE_UNAVAILABLE",
  ) {
    return tx.outboxEvent.updateMany({
      where: { id, lockedBy: owner, processedAt: null },
      data: {
        availableAt: new Date(
          Date.now() + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6)),
        ),
        lockedAt: null,
        lockedBy: null,
        lastError: reason,
      },
    });
  }
}
