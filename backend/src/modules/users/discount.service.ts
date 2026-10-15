import { Injectable } from "@nestjs/common";
import { CMemberTier, Prisma } from "@prisma/client";
const RATES: Record<CMemberTier, string> = {
  SILVER: "0.05",
  GOLD: "0.07",
  DIAMOND: "0.10",
};
@Injectable()
export class DiscountService {
  getDiscountRate(tier: CMemberTier): number {
    return Number(RATES[tier]);
  }
  getDecimalDiscountRate(tier: CMemberTier): Prisma.Decimal {
    return new Prisma.Decimal(RATES[tier]);
  }
}
