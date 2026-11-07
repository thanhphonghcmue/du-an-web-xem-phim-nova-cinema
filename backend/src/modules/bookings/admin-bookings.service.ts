import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  AdminBookingsRepository,
  AdminBookingRecord,
} from "./admin-bookings.repository";
import { AdminBookingsQueryDto } from "./admin-bookings.dto";
function serialize(row: AdminBookingRecord) {
  return {
    ...row,
    baseTicketPrice: row.baseTicketPrice?.toFixed(2) ?? null,
    totalTicketAmount: row.totalTicketAmount.toFixed(2),
    totalComboAmount: row.totalComboAmount.toFixed(2),
    discountAmount: row.discountAmount.toFixed(2),
    finalAmount: row.finalAmount.toFixed(2),
    discountRate: row.discountRate?.toFixed(3) ?? null,
    seats: row.seats.map((seat) => ({
      ...seat,
      price: seat.price.toFixed(2),
      seat: { ...seat.seat, priceModifier: seat.seat.priceModifier.toFixed(2) },
    })),
    combos: row.combos.map((combo) => ({
      ...combo,
      unitPrice: combo.unitPrice.toFixed(2),
    })),
    showtime: {
      ...row.showtime,
      baseTicketPrice: row.showtime.baseTicketPrice.toFixed(2),
    },
  };
}
@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly repository: AdminBookingsRepository,
    private readonly database: UnitOfWork,
  ) {}
  list(query: AdminBookingsQueryDto) {
    return this.database.transaction(async (tx) => {
      const [rows, count] = await this.repository.page(query, tx);
      return pageOf(rows.map(serialize), count, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  async get(id: string) {
    const row = await this.repository.find(id);
    if (!row)
      throw new ApiException(
        404,
        "BOOKING_NOT_FOUND",
        "Không tìm thấy đơn đặt vé.",
      );
    return serialize(row);
  }
}
