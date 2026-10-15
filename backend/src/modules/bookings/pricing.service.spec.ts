import { CMemberTier, Prisma } from "@prisma/client";
import { DiscountService } from "../users/discount.service";
import { PricingService } from "./pricing.service";

describe("BR05 Decimal pricing", () => {
  const discounts = new DiscountService();
  const pricing = new PricingService(discounts);
  const input = (tier: CMemberTier) => ({
    baseTicketPrice: new Prisma.Decimal("90000.00"),
    seats: [
      { id: "s", seatType: "STANDARD" as const },
      { id: "v", seatType: "VIP" as const },
      { id: "w", seatType: "SWEETBOX" as const },
    ],
    combos: [
      { id: "party", price: new Prisma.Decimal("69000.00"), quantity: 2 },
    ],
    tier,
  });
  it.each([
    ["SILVER", "0.05", "23550.00", "447450.00"],
    ["GOLD", "0.07", "32970.00", "438030.00"],
    ["DIAMOND", "0.10", "47100.00", "423900.00"],
  ] as const)(
    "applies %s discount to tickets plus combos",
    (tier, rate, discount, total) => {
      const result = pricing.calculateBookingPrice(input(tier));
      expect(result.seats.map((seat) => seat.price.toFixed(2))).toEqual([
        "90000.00",
        "108000.00",
        "135000.00",
      ]);
      expect(result.ticketAmount.toFixed(2)).toBe("333000.00");
      expect(result.comboAmount.toFixed(2)).toBe("138000.00");
      expect(result.discountRate.equals(rate)).toBe(true);
      expect(result.discountAmount.toFixed(2)).toBe(discount);
      expect(result.finalAmount.toFixed(2)).toBe(total);
      expect(discounts.getDiscountRate(tier)).toBe(Number(rate));
    },
  );
  it("rounds each seat HALF_UP before summing and rounds the subtotal discount once", () => {
    const result = pricing.calculateBookingPrice({
      baseTicketPrice: new Prisma.Decimal("0.03"),
      tier: "SILVER",
      seats: [
        { id: "a", seatType: "SWEETBOX" },
        { id: "b", seatType: "SWEETBOX" },
      ],
      combos: [],
    });
    expect(result.seats.map((seat) => seat.price.toFixed(2))).toEqual([
      "0.05",
      "0.05",
    ]);
    expect(result.ticketAmount.toFixed(2)).toBe("0.10");
    expect(result.discountAmount.toFixed(2)).toBe("0.01");
    expect(result.finalAmount.toFixed(2)).toBe("0.09");
  });
  it("retains precision near the Numeric(14,2) maximum", () => {
    const result = pricing.calculateBookingPrice({
      baseTicketPrice: new Prisma.Decimal("999999999999.99"),
      tier: "SILVER",
      seats: [{ id: "a", seatType: "STANDARD" }],
      combos: [],
    });
    expect(result.discountAmount.toFixed(2)).toBe("50000000000.00");
    expect(result.finalAmount.toFixed(2)).toBe("949999999999.99");
  });
  it("rejects seat or accumulated amounts exceeding database capacity", () => {
    for (const seatType of ["VIP", "SWEETBOX"] as const)
      expect(() =>
        pricing.calculateBookingPrice({
          baseTicketPrice: new Prisma.Decimal("999999999999.99"),
          tier: "SILVER",
          seats: [{ id: "a", seatType }],
          combos: [],
        }),
      ).toThrow("Booking amounts exceed");
    const large = input("SILVER");
    large.combos[0] = {
      id: "party",
      price: new Prisma.Decimal("999999999999.99"),
      quantity: 2,
    };
    expect(() => pricing.calculateBookingPrice(large)).toThrow(
      "Booking amounts exceed",
    );
  });
});
