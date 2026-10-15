import { Injectable } from "@nestjs/common";
import { CMemberTier, Prisma, SeatType } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { DiscountService } from "../users/discount.service";

export const SEAT_MULTIPLIERS: Record<SeatType, string> = {
  STANDARD: "1.00",
  VIP: "1.20",
  SWEETBOX: "1.50",
};
const MAX_AMOUNT = new Prisma.Decimal("999999999999.99");
export interface PriceInput {
  baseTicketPrice: Prisma.Decimal;
  seats: Array<{ id: string; seatType: SeatType }>;
  combos: Array<{ id: string; price: Prisma.Decimal; quantity: number }>;
  tier: CMemberTier;
}
@Injectable()
export class PricingService {
  constructor(private readonly discounts: DiscountService) {}
  calculateSeatPrice(
    basePrice: Prisma.Decimal,
    type: SeatType,
  ): Prisma.Decimal {
    return basePrice
      .mul(SEAT_MULTIPLIERS[type])
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
  calculateBookingPrice(input: PriceInput) {
    const seats = input.seats.map((seat) => ({
      seatId: seat.id,
      price: this.calculateSeatPrice(input.baseTicketPrice, seat.seatType),
    }));
    const ticketAmount = seats.reduce(
      (sum, seat) => sum.add(seat.price),
      new Prisma.Decimal("0"),
    );
    const comboAmount = input.combos.reduce(
      (sum, combo) => sum.add(combo.price.mul(combo.quantity)),
      new Prisma.Decimal("0"),
    );
    const subtotal = ticketAmount.add(comboAmount);
    const discountRate = this.discounts.getDecimalDiscountRate(input.tier);
    const discountAmount = subtotal
      .mul(discountRate)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const finalAmount = subtotal.sub(discountAmount);
    if (
      [
        ...seats.map((seat) => seat.price),
        ticketAmount,
        comboAmount,
        subtotal,
        discountAmount,
        finalAmount,
      ].some(
        (amount) =>
          !amount.isFinite() || amount.isNegative() || amount.gt(MAX_AMOUNT),
      )
    ) {
      throw new ApiException(
        400,
        "BOOKING_AMOUNT_OUT_OF_RANGE",
        "Booking amounts exceed supported Decimal(14,2) limits.",
      );
    }
    return {
      seats,
      ticketAmount,
      comboAmount,
      discountRate,
      discountAmount,
      finalAmount,
    };
  }
}
