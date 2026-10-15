import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  RevenueAggregate,
  RevenueFilters,
  revenueQuery,
} from "./revenue-query";

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(filters: RevenueFilters): Promise<RevenueAggregate> {
    const rows = await this.prisma.$queryRaw<RevenueAggregate[]>(
      revenueQuery(filters),
    );
    const row = rows[0];
    if (!row)
      throw new Error("Revenue aggregate did not return its totals row.");
    return row;
  }

  async overview() {
    const [
      movieCount,
      cinemaCount,
      roomCount,
      showtimeCount,
      userCount,
      bookingCount,
      recentBookings,
    ] = await Promise.all([
      this.prisma.movie.count(),
      this.prisma.cinema.count(),
      this.prisma.room.count(),
      this.prisma.showtime.count(),
      this.prisma.user.count(),
      this.prisma.booking.count(),
      this.prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, fullName: true, cMemberTier: true } },
          showtime: {
            include: {
              movie: { select: { title: true } },
              room: {
                include: { cinema: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);
    return {
      movieCount,
      cinemaCount,
      roomCount,
      showtimeCount,
      userCount,
      bookingCount,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        orderCode: b.orderCode,
        status: b.status,
        finalAmount: b.finalAmount.toString(),
        createdAt: b.createdAt.toISOString(),
        customer: b.user.fullName || b.user.email,
        movie: b.showtime.movie.title,
        cinema: b.showtime.room.cinema.name,
        room: b.showtime.room.name,
      })),
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        cMemberTier: true,
        cMemberPoints: true,
        createdAt: true,
      },
    });
    return users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async purgeOutbox(daysOld: number) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        processedAt: {
          not: null,
          lt: cutoff,
        },
      },
    });
    return { purgedCount: result.count, cutoff: cutoff.toISOString() };
  }
}
