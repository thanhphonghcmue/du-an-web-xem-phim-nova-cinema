import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  TICKET_REQUESTED,
  EMAIL_REQUESTED,
} from "../../queues/outbox/outbox.repository";
@Injectable()
export class ReconciliationRepository {
  find(reference: string, tx: Prisma.TransactionClient) {
    return tx.booking.findFirst({
      where: reference.startsWith("NOVA-SB-")
        ? { payments: { some: { transactionCode: reference } } }
        : { orderCode: reference },
      select: {
        id: true,
        orderCode: true,
        status: true,
        finalAmount: true,
        expiredAt: true,
        seats: { select: { status: true } },
        payments: {
          select: {
            transactionCode: true,
            status: true,
            amount: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        ticket: { select: { id: true, isCheckedIn: true, createdAt: true } },
      },
    });
  }
  delivery(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.outboxEvent.findMany({
      where: {
        aggregateType: "booking",
        aggregateId: bookingId,
        eventType: { in: [TICKET_REQUESTED, EMAIL_REQUESTED] },
      },
      select: {
        id: true,
        eventType: true,
        processedAt: true,
        attempts: true,
        lastError: true,
        availableAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
  }
  async lock(bookingId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId}::uuid FOR UPDATE`;
  }
  booking(id: string, tx: Prisma.TransactionClient) {
    return tx.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        finalAmount: true,
        payments: { select: { status: true, amount: true } },
        seats: { select: { status: true } },
        ticket: { select: { id: true } },
      },
    });
  }
  async wakeTicketEvent(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    // Never steal a live worker lease or acknowledge a callback on behalf of the bank.
    const changed = await tx.$executeRaw`
      UPDATE outbox_events SET processed_at=NULL, available_at=clock_timestamp(), locked_at=NULL, locked_by=NULL, last_error=NULL
      WHERE aggregate_type='booking' AND aggregate_id=${id}::uuid AND event_type=${TICKET_REQUESTED}
        AND (locked_at IS NULL OR locked_at < clock_timestamp() - interval '30 seconds')`;
    return changed > 0;
  }
}
