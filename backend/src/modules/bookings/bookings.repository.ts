import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListBookingsDto } from "./booking.dto";
export const bookingRelations = {
  seats: { orderBy: { seatId: "asc" } },
  combos: { orderBy: { comboId: "asc" } },
} satisfies Prisma.BookingInclude;
export type BookingRecord = Prisma.BookingGetPayload<{
  include: typeof bookingRelations;
}>;
@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.booking.findUnique({ where: { id }, include: bookingRelations });
  }
  findReplay(userId: string, key: string, tx: Prisma.TransactionClient) {
    return tx.booking.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
      include: bookingRelations,
    });
  }
  async lockRequest(
    userId: string,
    key: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    // pg_advisory_xact_lock returns PostgreSQL void, which Prisma cannot deserialize.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${key}`}, 0))`;
  }
  async lockShowtime(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM showtimes WHERE id = ${id}::uuid FOR SHARE`;
  }
  async lockBooking(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async lockOwned(
    id: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
  }
  async membership(userId: string, tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR SHARE`;
    return tx.user.findUnique({
      where: { id: userId },
      select: { cMemberTier: true },
    });
  }
  async now(tx: Prisma.TransactionClient): Promise<Date> {
    const rows = await tx.$queryRaw<
      Array<{ now: Date }>
    >`SELECT clock_timestamp() AS now`;
    const now = rows[0]?.now;
    if (!now) throw new Error("Database clock unavailable.");
    return now;
  }
  showtime(id: string, tx: Prisma.TransactionClient) {
    return tx.showtime.findUnique({
      where: { id },
      include: { movie: { select: { status: true } } },
    });
  }
  seats(ids: string[], roomId: string, tx: Prisma.TransactionClient) {
    return tx.seat.findMany({
      where: { id: { in: ids }, roomId },
      orderBy: { id: "asc" },
    });
  }
  sweetboxSeats(roomId: string, tx: Prisma.TransactionClient) {
    return tx.seat.findMany({ where: { roomId, seatType: "SWEETBOX" } });
  }
  roomSeatsForRows(
    roomId: string,
    rows: string[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.seat.findMany({
      where: { roomId, seatRow: { in: rows } },
      select: { id: true, seatRow: true, seatColumn: true },
      orderBy: [{ seatRow: "asc" }, { seatColumn: "asc" }],
    });
  }
  activeOccupiedSeatsInShowtime(
    showtimeId: string,
    seatIds: string[],
    tx: Prisma.TransactionClient,
    asOf: Date,
  ) {
    return tx.bookingSeat.findMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
        status: { in: ["HOLDING", "SOLD"] },
        NOT: {
          status: "HOLDING",
          booking: {
            status: { in: ["HOLDING", "PENDING"] },
            expiredAt: { lte: asOf },
            seats: { none: { status: "SOLD" } },
          },
        },
      },
      select: { seatId: true },
    });
  }
  expiredForSeats(
    showtimeId: string,
    seatIds: string[],
    now: Date,
    tx: Prisma.TransactionClient,
  ) {
    return tx.booking.findMany({
      where: {
        showtimeId,
        status: { in: ["PENDING", "HOLDING"] },
        expiredAt: { lte: now },
        seats: { some: { seatId: { in: seatIds }, status: "HOLDING" } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
  }
  async activeSeat(
    showtimeId: string,
    seatIds: string[],
    tx: Prisma.TransactionClient,
  ) {
    return await tx.bookingSeat.findFirst({
      where: {
        showtimeId,
        seatId: { in: seatIds },
        status: { in: ["HOLDING", "SOLD"] },
      },
      select: { id: true },
    });
  }
  create(
    data: Prisma.BookingUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.booking.create({ data });
  }
  createSeats(
    data: Prisma.BookingSeatCreateManyInput[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.bookingSeat.createMany({ data });
  }
  createCombos(
    data: Prisma.BookingComboCreateManyInput[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.bookingCombo.createMany({ data });
  }
  release(
    id: string,
    status: "CANCELLED" | "EXPIRED",
    tx: Prisma.TransactionClient,
  ) {
    return tx.booking.update({
      where: { id },
      data: {
        status,
        seats: {
          updateMany: {
            where: { status: "HOLDING" },
            data: { status: "AVAILABLE" },
          },
        },
      },
      include: bookingRelations,
    });
  }
  page(
    userId: string,
    query: ListBookingsDto,
    tx: Prisma.TransactionClient,
    asOf: Date,
  ) {
    const overdue: Prisma.BookingWhereInput = {
      status: { in: ["PENDING", "HOLDING"] },
      expiredAt: { lte: asOf },
      seats: { none: { status: "SOLD" } },
    };
    const filter: Prisma.BookingWhereInput =
      query.status === "EXPIRED"
        ? { OR: [{ status: "EXPIRED" }, overdue] }
        : query.status && ["PENDING", "HOLDING"].includes(query.status)
          ? { status: query.status, NOT: overdue }
          : query.status
            ? { status: query.status }
            : {};
    const where: Prisma.BookingWhereInput = {
      userId,
      ...filter,
    };
    return Promise.all([
      tx.booking.findMany({
        where,
        include: bookingRelations,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.booking.count({ where }),
    ]);
  }
  expiredBatch(now: Date, userId?: string) {
    return this.prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "HOLDING"] },
        expiredAt: { lte: now },
        ...(userId ? { userId } : {}),
      },
      orderBy: [{ expiredAt: "asc" }, { id: "asc" }],
      select: { id: true },
      take: 100,
    });
  }
  expiredInShowtime(showtimeId: string, now: Date) {
    return this.prisma.booking.findMany({
      where: {
        showtimeId,
        status: { in: ["PENDING", "HOLDING"] },
        expiredAt: { lte: now },
        seats: { some: { status: "HOLDING" } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 100,
    });
  }
}
