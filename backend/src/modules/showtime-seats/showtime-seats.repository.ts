import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
@Injectable()
export class ShowtimeSeatsRepository {
  constructor(private readonly prisma: PrismaService) {}
  exists(id: string) {
    return this.prisma.showtime.findUnique({
      where: { id },
      select: { id: true },
    });
  }
  showtime(id: string, tx: Prisma.TransactionClient) {
    return tx.showtime.findUnique({ where: { id } });
  }
  async now(tx: Prisma.TransactionClient): Promise<Date> {
    const rows = await tx.$queryRaw<
      Array<{ now: Date }>
    >`SELECT clock_timestamp() AS now`;
    if (!rows[0]) throw new Error("Database clock unavailable.");
    return rows[0].now;
  }
  seats(roomId: string, tx: Prisma.TransactionClient) {
    return tx.seat.findMany({
      where: { roomId },
      orderBy: [{ seatRow: "asc" }, { seatColumn: "asc" }],
    });
  }
  active(showtimeId: string, tx: Prisma.TransactionClient) {
    return tx.bookingSeat.findMany({
      where: { showtimeId, status: { in: ["HOLDING", "SOLD"] } },
      select: {
        seatId: true,
        status: true,
        booking: {
          select: {
            status: true,
            expiredAt: true,
            seats: { where: { status: "SOLD" }, take: 1, select: { id: true } },
          },
        },
      },
    });
  }
}
