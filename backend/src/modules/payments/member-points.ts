import { Prisma } from "@prisma/client";
export const MEMBER_POINT_EARNING_RATE = "0.10";
export const MEMBER_POINT_REVENUE_UNIT = "1000";
export function earnedMemberPoints(finalAmount: Prisma.Decimal): number {
  return finalAmount
    .mul(MEMBER_POINT_EARNING_RATE)
    .div(MEMBER_POINT_REVENUE_UNIT)
    .floor()
    .toNumber();
}
