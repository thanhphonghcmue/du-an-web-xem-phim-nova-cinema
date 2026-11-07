import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AdminBookingsQueryDto } from "./admin-bookings.dto";
const include = {
  user: { select: { fullName: true, email: true } },
  showtime: {
    include: {
      movie: { select: { title: true } },
      room: { include: { cinema: { select: { name: true } } } },
    },
  },
  seats: { include: { seat: true }, orderBy: { seatId: "asc" } },
  combos: { include: { combo: { select: { name: true } } } },
  // Không trả token/QR riêng của khách trong danh sách quản trị.
  tickets: {
    select: {
      id: true,
      ticketCode: true,
      shortCode: true,
      isCheckedIn: true,
      checkedInAt: true,
      emailLogs: {
        select: {
          id: true,
          deliveryStatus: true,
          acceptedAt: true,
          attempts: true,
        },
      },
    },
  },
} satisfies Prisma.BookingInclude;
export type AdminBookingRecord = Prisma.BookingGetPayload<{
  include: typeof include;
}>;
@Injectable()
export class AdminBookingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  page(query: AdminBookingsQueryDto, tx: Prisma.TransactionClient) {
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.showtimeId ? { showtimeId: query.showtimeId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { orderCode: { contains: query.keyword, mode: "insensitive" } },
              {
                user: {
                  email: { contains: query.keyword, mode: "insensitive" },
                },
              },
              {
                tickets: {
                  some: {
                    ticketCode: {
                      contains: query.keyword,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    return Promise.all([
      tx.booking.findMany({
        where,
        include,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.booking.count({ where }),
    ]);
  }
  find(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include });
  }
}
