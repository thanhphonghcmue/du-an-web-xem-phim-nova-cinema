import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { DiscountService } from "../users/discount.service";
import { calculateCouponDiscount } from "./coupons";
import { PricingService } from "./pricing.service";

describe("Coupon eligibility and authoritative money", () => {
  it("leaves a request without a coupon unchanged", () => {
    expect(
      calculateCouponDiscount(
        new Prisma.Decimal("95000"),
      ).discountAmount.toFixed(2),
    ).toBe("0.00");
  });
  it("normalizes a code and rounds percentage cents HALF_UP", () => {
    expect(
      calculateCouponDiscount(
        new Prisma.Decimal("100000.05"),
        " cinema10 ",
      ).discountAmount.toFixed(2),
    ).toBe("10000.01");
  });
  it("rejects an unknown coupon instead of silently charging full price", () => {
    expect(() =>
      calculateCouponDiscount(new Prisma.Decimal("100000"), "UNKNOWN"),
    ).toThrow(ApiException);
  });
  it.each([
    ["U22", "49999.99"],
    ["CHAOBANMOI", "99999.99"],
    ["VIP50", "149999.99"],
  ])("rejects %s below its minimum", (code, subtotal) => {
    try {
      calculateCouponDiscount(new Prisma.Decimal(subtotal), code);
      throw new Error("Expected an ineligible coupon to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(400);
      expect((error as ApiException).getResponse()).toMatchObject({
        error: "COUPON_MINIMUM_NOT_MET",
      });
    }
  });
  it.each([
    ["U22", "50000", "25000.00"],
    ["CHAOBANMOI", "100000", "30000.00"],
    ["VIP50", "150000", "50000.00"],
  ])("accepts %s exactly at its minimum", (code, subtotal, discount) => {
    expect(
      calculateCouponDiscount(
        new Prisma.Decimal(subtotal),
        code,
      ).discountAmount.toFixed(2),
    ).toBe(discount);
  });
  it("caps a fixed coupon at the eligible balance", () => {
    expect(
      calculateCouponDiscount(
        new Prisma.Decimal("10000"),
        "NOVA20",
      ).discountAmount.toFixed(2),
    ).toBe("10000.00");
  });
  it("applies the coupon after the server membership discount", () => {
    const pricing = new PricingService(new DiscountService());
    const input = {
      baseTicketPrice: new Prisma.Decimal("100000"),
      tier: "GOLD" as const,
      seats: [{ id: "a", seatType: "STANDARD" as const }],
      combos: [],
    };
    const result = pricing.calculateBookingPrice({
      ...input,
      couponCode: "CINEMA10",
    });
    expect(result.discountAmount.toFixed(2)).toBe("16300.00");
    expect(result.finalAmount.toFixed(2)).toBe("83700.00");
    expect(() =>
      pricing.calculateBookingPrice({ ...input, couponCode: "CHAOBANMOI" }),
    ).toThrow("sau ưu đãi hội viên");
  });
});
