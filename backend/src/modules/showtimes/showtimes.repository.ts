import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListShowtimesDto, ShowtimeCapacityDto } from "./showtime.dto";

@Injectable()
export class ShowtimesRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.showtime.findUnique({ where: { id } });
  }

  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM showtimes WHERE id = ${id}::uuid FOR UPDATE`;
  }

  overlap(
    roomId: string,
    startTime: Date,
    endTime: Date,
    tx: Prisma.TransactionClient,
    excludeId?: string,
  ) {
    return tx.showtime.findFirst({
      where: {
        roomId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  async hasBookings(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    return (
      (await tx.booking.findFirst({
        where: { showtimeId: id },
        select: { id: true },
      })) !== null
    );
  }

  page(query: ListShowtimesDto, now: Date, tx: Prisma.TransactionClient) {
    const dayStart = query.date
      ? new Date(`${query.date}T00:00:00+07:00`)
      : undefined;
    const where: Prisma.ShowtimeWhereInput = {
      ...(query.movieId ? { movieId: query.movieId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.cinemaId ? { room: { cinemaId: query.cinemaId } } : {}),
      startTime: dayStart
        ? { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) }
        : { gte: now },
    };
    return Promise.all([
      tx.showtime.findMany({
        where,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.showtime.count({ where }),
    ]);
  }

  capacities(
    ids: string[],
    tx: Prisma.TransactionClient,
  ): Promise<ShowtimeCapacityDto[]> {
    // Three set-based groups, no per-show seat-map queries, no mutation/row locks.
    // Match lazy-expiry policy: SOLD, PAID and mixed SOLD/HOLDING bookings stay occupied.
    return tx.$queryRaw<ShowtimeCapacityDto[]>`
      WITH clock AS (SELECT CURRENT_TIMESTAMP AS now),
      requested AS (SELECT id, room_id FROM showtimes
        WHERE id = ANY(ARRAY[${Prisma.join(ids)}]::uuid[])),
      physical AS (SELECT room_id, COUNT(*)::int AS total FROM seats
        WHERE room_id IN (SELECT room_id FROM requested) GROUP BY room_id),
      active AS (
        SELECT bs.showtime_id,
          COUNT(*) FILTER (WHERE bs.status = 'HOLDING')::int AS holding,
          COUNT(*) FILTER (WHERE bs.status = 'SOLD')::int AS sold
        FROM booking_seats bs JOIN bookings b ON b.id = bs.booking_id CROSS JOIN clock
        WHERE bs.showtime_id IN (SELECT id FROM requested)
          AND bs.status IN ('HOLDING', 'SOLD')
          AND NOT (bs.status = 'HOLDING' AND b.status IN ('HOLDING', 'PENDING')
            AND b.expired_at <= clock.now AND NOT EXISTS (
              SELECT 1 FROM booking_seats protected WHERE protected.booking_id = b.id AND protected.status = 'SOLD'))
        GROUP BY bs.showtime_id)
      SELECT r.id AS "showtimeId", COALESCE(p.total, 0)::int AS total,
        GREATEST(0, COALESCE(p.total, 0) - COALESCE(a.holding, 0) - COALESCE(a.sold, 0))::int AS available,
        COALESCE(a.holding, 0)::int AS holding, COALESCE(a.sold, 0)::int AS sold, clock.now AS "asOf"
      FROM requested r LEFT JOIN physical p ON p.room_id = r.room_id
      LEFT JOIN active a ON a.showtime_id = r.id CROSS JOIN clock ORDER BY r.id`;
  }

  programme(now: Date, until: Date, tx: Prisma.TransactionClient) {
    return Promise.all([
      tx.movie.findMany({
        where: { status: { not: "ENDED" } },
        orderBy: { title: "asc" },
        take: 1001,
      }),
      tx.cinema.findMany({ orderBy: { name: "asc" }, take: 1001 }),
      tx.room.findMany({
        orderBy: [{ cinemaId: "asc" }, { name: "asc" }],
        take: 2001,
      }),
      tx.combo.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 1001,
      }),
      tx.showtime.findMany({
        where: {
          startTime: { gte: now, lt: until },
          movie: { status: { not: "ENDED" } },
        },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 20001,
      }),
    ]);
  }
  create(
    data: Prisma.ShowtimeUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.showtime.create({ data });
  }

  update(
    id: string,
    data: Prisma.ShowtimeUncheckedUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.showtime.update({ where: { id }, data });
  }

  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.showtime.delete({ where: { id }, select: { id: true } });
  }
}
