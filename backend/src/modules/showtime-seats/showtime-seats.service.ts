import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { UnitOfWork } from "../../database/unit-of-work";
import { PricingService } from "../bookings/pricing.service";
import { SeatBookingService } from "../bookings/seat-booking.service";
import { findGroupSeats } from "./group-seats";
import {
  GroupSeatQueryDto,
  GroupSeatSuggestionDto,
  ShowtimeSeatDto,
  ShowtimeSeatMapDto,
} from "./showtime-seats.dto";
import { ShowtimeSeatsRepository } from "./showtime-seats.repository";
@Injectable()
export class ShowtimeSeatsService {
  constructor(
    private readonly repository: ShowtimeSeatsRepository,
    private readonly database: UnitOfWork,
    private readonly bookings: SeatBookingService,
    private readonly pricing: PricingService,
  ) {}
  async requireShowtime(id: string): Promise<void> {
    if (!(await this.repository.exists(id)))
      throw new ApiException(
        404,
        "SHOWTIME_NOT_FOUND",
        "Showtime was not found.",
      );
  }
  async map(id: string): Promise<ShowtimeSeatMapDto> {
    await this.requireShowtime(id);
    await this.bookings.expireShowtimeHolds(id);
    return this.database.transaction(async (tx) => {
      const asOf = await this.repository.now(tx);
      const showtime = await this.repository.showtime(id, tx);
      if (!showtime)
        throw new ApiException(
          404,
          "SHOWTIME_NOT_FOUND",
          "Showtime was not found.",
        );
      const [physical, active] = await Promise.all([
        this.repository.seats(showtime.roomId, tx),
        this.repository.active(id, tx),
      ]);
      const ownership = new Map(active.map((seat) => [seat.seatId, seat]));
      const seats: ShowtimeSeatDto[] = physical.map((seat) => {
        const owner = ownership.get(seat.id);
        const releasable =
          owner?.status === "HOLDING" &&
          ["PENDING", "HOLDING"].includes(owner.booking.status) &&
          owner.booking.seats.length === 0;
        const overdue =
          releasable && owner.booking.expiredAt.getTime() <= asOf.getTime();
        return {
          seatId: seat.id,
          row: seat.seatRow,
          column: seat.seatColumn,
          type: seat.seatType,
          price: this.pricing
            .calculateSeatPrice(showtime.baseTicketPrice, seat.seatType)
            .toFixed(2),
          status: owner && !overdue ? owner.status : "AVAILABLE",
          expiresAt: releasable && !overdue ? owner.booking.expiredAt : null,
        };
      });
      return {
        showtimeId: id,
        roomId: showtime.roomId,
        startTime: showtime.startTime,
        asOf,
        canBook: showtime.startTime.getTime() > asOf.getTime(),
        capacity: {
          total: seats.length,
          available: seats.filter((seat) => seat.status === "AVAILABLE").length,
          holding: seats.filter((seat) => seat.status === "HOLDING").length,
          sold: seats.filter((seat) => seat.status === "SOLD").length,
        },
        seats,
      };
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  async suggest(
    id: string,
    query: GroupSeatQueryDto,
  ): Promise<GroupSeatSuggestionDto> {
    const map = await this.map(id);
    if (!map.canBook)
      throw new ApiException(
        409,
        "SHOWTIME_STARTED",
        "Cannot suggest seats after the showtime starts.",
      );
    return {
      showtimeId: id,
      quantity: query.quantity,
      seatType: query.seatType ?? null,
      seatIds: findGroupSeats(map.seats, query.quantity, query.seatType),
      asOf: map.asOf,
    };
  }
}
