import { extractNormalizedCode } from "../../../../shared/ticket-input.cjs";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ApiException } from "../../common/exceptions/api.exception";
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
      user: { select: { email: true, fullName: true, phone: true } },
    },
  },
} satisfies Prisma.ETicketInclude;
export type TicketRecord = Prisma.ETicketGetPayload<{
  include: typeof ticketRelations;
}>;
@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}
  issuanceSnapshot(
    bookingId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        ...ticketRelations.booking.include,
        tickets: { orderBy: { createdAt: "asc" } },
      },
    });
  }
  createRecord(
    data: Prisma.ETicketUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.eTicket.create({ data });
  }
  byBooking(bookingId: string, tx: Prisma.TransactionClient) {
    return tx.eTicket.findFirst({
      where: { bookingId },
      include: ticketRelations,
    });
  }
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.eTicket.findUnique({ where: { id }, include: ticketRelations });
  }
  async byHash(ticketHash: string, tx: Prisma.TransactionClient) {
    const code = extractNormalizedCode(ticketHash);
    const rows = await tx.eTicket.findMany({
      take: 2,
      where: /^[a-f0-9]{64}$/i.test(code)
        ? { ticketHash: code.toLowerCase() }
        : {
            OR: [
              { ticketCode: code },
              { shortCode: code },
              { aliases: { has: code } },
            ],
          },
      include: ticketRelations,
    });
    return rows.length === 1 ? (rows[0] ?? null) : null;
  }
  demoSamples(tx: Prisma.TransactionClient) {
    return tx.eTicket.findMany({
      where: { demoOnly: true, shortCode: { in: ["V1", "V1B", "V2", "V3"] } },
      select: {
        ticketCode: true,
        shortCode: true,
        isCheckedIn: true,
        checkedInAt: true,
        booking: { select: { showtimeId: true } },
      },
      orderBy: { shortCode: "asc" },
    });
  }
  resetDemo(id: string, tx: Prisma.TransactionClient) {
    return tx.eTicket.updateMany({
      where: {
        id,
        demoOnly: true,
        shortCode: "V1",
        booking: { status: "PAID" },
      },
      data: { isCheckedIn: false, checkedInAt: null, checkedInByStaffId: null },
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
    const from = query.date || query.dateFrom;
    const to = query.date || query.dateTo;
    if (from && to && from > to)
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "Ngày kết thúc phải từ ngày bắt đầu trở đi.",
      );
    const dateRange = {
      ...(from ? { gte: new Date(`${from}T00:00:00+07:00`) } : {}),
      ...(to
        ? {
            lt: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000),
          }
        : {}),
    };
    const search = query.search?.trim();
    const filterViewingDate = (from || to) && query.dateBasis !== "booked";
    const showtime = {
      ...(query.status === "past" ? { endTime: { lt: new Date() } } : {}),
      ...(query.status === "unused" ? { endTime: { gte: new Date() } } : {}),
      ...(filterViewingDate ? { startTime: dateRange } : {}),
    };
    const where: Prisma.ETicketWhereInput = {
      booking: {
        userId,
        ...(query.status === "cancelled"
          ? { status: { in: ["CANCELLED", "EXPIRED"] } }
          : query.status === "unused"
            ? { status: "PAID" }
            : {}),
        ...(Object.keys(showtime).length ? { showtime } : {}),
        ...((from || to) && query.dateBasis === "booked"
          ? { createdAt: dateRange }
          : {}),
      },
      ...(query.status === "used"
        ? { isCheckedIn: true }
        : query.status === "unused"
          ? {
              isCheckedIn: false,
            }
          : {}),
      ...(search
        ? {
            OR: [
              { ticketCode: { contains: search, mode: "insensitive" } },
              {
                booking: {
                  orderCode: { contains: search, mode: "insensitive" },
                },
              },
              {
                booking: {
                  showtime: {
                    movie: { title: { contains: search, mode: "insensitive" } },
                  },
                },
              },
              {
                booking: {
                  showtime: {
                    room: {
                      cinema: {
                        name: { contains: search, mode: "insensitive" },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.isCheckedIn === undefined
        ? {}
        : { isCheckedIn: query.isCheckedIn }),
    };
    return Promise.all([
      tx.eTicket.findMany({
        where,
        include: ticketRelations,
        orderBy:
          query.sort === "showtime"
            ? [{ booking: { showtime: { startTime: "asc" } } }, { id: "asc" }]
            : [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.eTicket.count({ where }),
    ]);
  }
  emailStatus(bookingId: string, ticketId?: string) {
    return this.prisma.outboxEvent.findFirst({
      where: {
        aggregateId: bookingId,
        eventType: "ticket.email.requested",
        ...(ticketId
          ? { payload: { path: ["ticketId"], equals: ticketId } }
          : {}),
      },
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
