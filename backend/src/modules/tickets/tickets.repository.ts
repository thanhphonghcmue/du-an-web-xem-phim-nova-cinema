import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListTicketsDto } from "./ticket.dto";
export const ticketRelations = {
  booking: {
    include: {
      showtime: {
        include: { movie: true, room: { include: { cinema: true } } },
      },
      seats: {
        include: { seat: true },
        orderBy: [
          { seat: { seatRow: "asc" } },
          { seat: { seatColumn: "asc" } },
        ],
      },
      combos: { include: { combo: true }, orderBy: { comboId: "asc" } },
      user: { select: { email: true } },
    },
  },
} satisfies Prisma.ETicketInclude;
export type TicketRecord = Prisma.ETicketGetPayload<{
  include: typeof ticketRelations;
}>;
@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}
  issuanceSnapshot(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.booking.findUnique({
      where: { id: bookingId },
      include: { ...ticketRelations.booking.include, ticket: true },
    });
  }
  createRecord(
    data: Prisma.ETicketUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.eTicket.create({ data });
  }
  byBooking(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.eTicket.findUnique({
      where: { bookingId },
      include: ticketRelations,
    });
  }
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.eTicket.findUnique({ where: { id }, include: ticketRelations });
  }
  byHash(ticketHash: string, tx: Prisma.TransactionClient) {
    return tx.eTicket.findUnique({
      where: { ticketHash },
      include: ticketRelations,
    });
  }
  create(
    data: Prisma.ETicketUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.eTicket.create({ data, include: ticketRelations });
  }
  owned(
    id: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.eTicket.findFirst({
      where: { id, booking: { userId } },
      include: ticketRelations,
    });
  }
  page(userId: string, query: ListTicketsDto, tx: Prisma.TransactionClient) {
    const where: Prisma.ETicketWhereInput = {
      booking: { userId },
      ...(query.isCheckedIn === undefined
        ? {}
        : { isCheckedIn: query.isCheckedIn }),
    };
    return Promise.all([
      tx.eTicket.findMany({
        where,
        include: ticketRelations,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.eTicket.count({ where }),
    ]);
  }
  emailStatus(bookingId: string) {
    return this.prisma.outboxEvent.findFirst({
      where: { aggregateId: bookingId, eventType: "ticket.email.requested" },
      orderBy: { createdAt: "desc" },
      select: { id: true, processedAt: true, attempts: true, lastError: true },
    });
  }
  async lockStaff(id: string, tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${id}::uuid FOR SHARE`;
    return tx.user.findUnique({ where: { id }, select: { role: true } });
  }
  async lockPaidBooking(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id=${id}::uuid FOR SHARE`;
  }
  checkIn(
    id: string,
    staffId: string,
    now: Date,
    tx: Prisma.TransactionClient,
  ) {
    return tx.eTicket.updateMany({
      where: { id, isCheckedIn: false, booking: { status: "PAID" } },
      data: {
        isCheckedIn: true,
        checkedInAt: now,
        checkedInByStaffId: staffId,
      },
    });
  }
}
