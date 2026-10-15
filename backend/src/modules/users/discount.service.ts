import { Injectable } from "@nestjs/common";
import { CMemberTier } from "@prisma/client";
const RATES: Record<CMemberTier, number> = {
  SILVER: 0.05,
  GOLD: 0.07,
  DIAMOND: 0.1,
};
@Injectable()
export class DiscountService {
  getDiscountRate(tier: CMemberTier): number {
    return RATES[tier];
  }
}
