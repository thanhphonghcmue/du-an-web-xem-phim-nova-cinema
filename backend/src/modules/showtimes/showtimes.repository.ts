import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListShowtimesDto } from "./showtime.dto";

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
