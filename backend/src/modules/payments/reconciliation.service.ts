import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { UnitOfWork } from "../../database/unit-of-work";
import { ApiException } from "../../common/exceptions/api.exception";
import {
  OutboxRepository,
  TICKET_REQUESTED,
} from "../../queues/outbox/outbox.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import { ReconciliationRepository } from "./reconciliation.repository";
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly database: UnitOfWork,
    private readonly records: ReconciliationRepository,
    private readonly events: OutboxRepository,
    private readonly bookings: BookingsRepository,
  ) {}
  lookup(reference: string) {
    return this.database.transaction(async (tx) => {
      const row = await this.records.find(reference, tx);
      if (!row)
        throw new ApiException(
          404,
          "PAYMENT_REFERENCE_NOT_FOUND",
          "Không tìm thấy mã đơn hoặc mã giao dịch.",
        );
      const delivery = await this.records.delivery(row.id, tx);
      const now = await this.bookings.now(tx);
      const expired =
        ["PENDING", "HOLDING"].includes(row.status) &&
        row.expiredAt <= now &&
        !row.seats.some((s) => s.status === "SOLD");
      return {
        bookingId: row.id,
        orderCode: row.orderCode,
        bookingStatus: expired ? "EXPIRED" : row.status,
        amount: row.finalAmount.toFixed(2),
        expiredAt: row.expiredAt,
        payments: row.payments.map((p) => ({
          ...p,
          amount: p.amount.toFixed(2),
        })),
        ticket: row.ticket,
        delivery,
        canRecoverTicket:
          row.status === "PAID" &&
          !row.ticket &&
          row.seats.length > 0 &&
          row.seats.every((s) => s.status === "SOLD") &&
          row.payments.some(
            (p) => p.status === "SUCCESS" && p.amount.equals(row.finalAmount),
          ),
      };
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  recoverTicket(id: string) {
    return this.database.transaction(async (tx) => {
      await this.records.lock(id, tx);
      const row = await this.records.booking(id, tx);
      if (!row)
        throw new ApiException(
          404,
          "BOOKING_NOT_FOUND",
          "Không tìm thấy đơn đặt vé.",
        );
      if (
        row.status !== "PAID" ||
        !row.payments.some(
          (p) => p.status === "SUCCESS" && p.amount.equals(row.finalAmount),
        ) ||
        !row.seats.length ||
        row.seats.some((s) => s.status !== "SOLD")
      )
        throw new ApiException(
          409,
          "PAYMENT_NOT_CONFIRMED",
          "Chỉ khôi phục vé khi thanh toán đã xác nhận thành công và ghế đã bán.",
        );
      if (row.ticket)
        return { bookingId: id, queued: false, ticketId: row.ticket.id };
      const delivery = await this.records.delivery(id, tx);
      if (!delivery.some((e) => e.eventType === TICKET_REQUESTED))
        await this.events.add(TICKET_REQUESTED, id, { bookingId: id }, tx);
      else await this.records.wakeTicketEvent(id, tx);
      return { bookingId: id, queued: true, ticketId: null };
    });
  }
}
