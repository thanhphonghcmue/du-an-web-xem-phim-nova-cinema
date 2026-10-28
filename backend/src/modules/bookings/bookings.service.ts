import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { BookingDto, HoldSeatsDto, ListBookingsDto } from "./booking.dto";
import { BookingRecord, BookingsRepository } from "./bookings.repository";
import { SeatBookingService } from "./seat-booking.service";
import { projectExpiredBooking } from "./booking-projection";
@Injectable()
export class BookingsService {
  constructor(
    private readonly seats: SeatBookingService,
    private readonly bookings: BookingsRepository,
    private readonly database: UnitOfWork,
  ) {}
  private serialize(row: BookingRecord): BookingDto {
    return {
      id: row.id,
      orderCode: row.orderCode,
      showtimeId: row.showtimeId,
      status: row.status,
      expiredAt: row.expiredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalTicketAmount: row.totalTicketAmount.toFixed(2),
      totalComboAmount: row.totalComboAmount.toFixed(2),
      discountAmount: row.discountAmount.toFixed(2),
      finalAmount: row.finalAmount.toFixed(2),
      baseTicketPrice: row.baseTicketPrice?.toFixed(2) ?? null,
      membershipTier: row.membershipTier,
      discountRate: row.discountRate?.toFixed(3) ?? null,
      seats: row.seats.map((seat) => ({
        seatId: seat.seatId,
        roomId: seat.roomId,
        status: seat.status,
        price: seat.price.toFixed(2),
      })),
      combos: row.combos.map((combo) => ({
        comboId: combo.comboId,
        quantity: combo.quantity,
        unitPrice: combo.unitPrice.toFixed(2),
      })),
    };
  }
  async hold(userId: string, dto: HoldSeatsDto, key?: string) {
    return this.serialize(await this.seats.holdSeats(userId, dto, key));
  }
  async get(id: string, userId: string) {
    return this.serialize(await this.seats.getOwned(id, userId));
  }
  async cancel(id: string, userId: string) {
    return this.serialize(await this.seats.releaseSeats(id, userId));
  }
  async list(userId: string, query: ListBookingsDto) {
    return this.database.transaction(async (tx) => {
      const asOf = await this.bookings.now(tx);
      const [items, total] = await this.bookings.page(userId, query, tx, asOf);
      return pageOf(
        items.map((row) => this.serialize(projectExpiredBooking(row, asOf))),
        total,
        query,
      );
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
}
