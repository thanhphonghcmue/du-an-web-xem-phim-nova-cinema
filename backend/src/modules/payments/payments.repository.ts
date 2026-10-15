import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaymentOutcome } from "./payment.dto";
@Injectable()
export class PaymentsRepository {
  forBooking(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.payment.findFirst({
      where: { bookingId, provider: "SANDBOX" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }
  async lock(
    transactionCode: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM payments WHERE transaction_code = ${transactionCode} FOR UPDATE`;
  }
  find(transactionCode: string, tx: Prisma.TransactionClient) {
    return tx.payment.findUnique({ where: { transactionCode } });
  }
  create(
    data: Prisma.PaymentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.payment.create({ data });
  }
  finalize(
    id: string,
    status: PaymentOutcome,
    responsePayload: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient,
  ) {
    return tx.payment.update({
      where: { id },
      data: { status, responsePayload },
    });
  }
  markPaid(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        seats: {
          updateMany: {
            where: { status: "HOLDING" },
            data: { status: "SOLD" },
          },
        },
      },
    });
  }
  async lockMember(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  }
  async awardPoints(
    userId: string,
    points: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const changed = await tx.user.updateMany({
      where: { id: userId, cMemberPoints: { lte: 2147483647 - points } },
      data: { cMemberPoints: { increment: points } },
    });
    return changed.count === 1;
  }
}
