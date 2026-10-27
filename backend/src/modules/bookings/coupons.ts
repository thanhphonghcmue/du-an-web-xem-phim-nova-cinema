import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";

export interface CouponDef {
  code: string;
  name: string;
  description: string;
  discountType: "FIXED" | "PERCENT";
  discountValue: number; // VND for FIXED, percent (0-100) for PERCENT
  minSubtotal?: number;
}

export const VALID_COUPONS: Record<string, CouponDef> = {
  NOVA20: {
    code: "NOVA20",
    name: "Ưu đãi Nova Cinema",
    description: "Giảm 20.000đ cho mọi đơn vé",
    discountType: "FIXED",
    discountValue: 20000,
  },
  CINEMA10: {
    code: "CINEMA10",
    name: "Ưu đãi Mê Phim",
    description: "Giảm 10% tổng đơn sau ưu đãi hội viên",
    discountType: "PERCENT",
    discountValue: 10,
  },
  U22: {
    code: "U22",
    name: "Khán giả Học sinh - Sinh viên",
    description: "Giảm 25.000đ cho HSSV",
    discountType: "FIXED",
    discountValue: 25000,
    minSubtotal: 50000,
  },
  CHAOBANMOI: {
    code: "CHAOBANMOI",
    name: "Chào bạn mới",
    description: "Giảm 30.000đ cho đơn từ 100.000đ",
    discountType: "FIXED",
    discountValue: 30000,
    minSubtotal: 100000,
  },
  VIP50: {
    code: "VIP50",
    name: "Voucher Thành Viên VIP",
    description: "Giảm 50.000đ cho đơn từ 150.000đ",
    discountType: "FIXED",
    discountValue: 50000,
    minSubtotal: 150000,
  },
};

export function calculateCouponDiscount(
  subtotal: Prisma.Decimal,
  couponCode?: string,
): { discountAmount: Prisma.Decimal; coupon?: CouponDef } {
  if (!couponCode) {
    return { discountAmount: new Prisma.Decimal("0") };
  }
  const normalized = couponCode.trim().toUpperCase();
  const coupon = VALID_COUPONS[normalized];
  if (!coupon) {
    throw new ApiException(400, "COUPON_INVALID", "Mã giảm giá không hợp lệ.");
  }
  if (coupon.minSubtotal && subtotal.lt(coupon.minSubtotal)) {
    throw new ApiException(
      400,
      "COUPON_MINIMUM_NOT_MET",
      `Mã ${coupon.code} yêu cầu tổng đơn sau ưu đãi hội viên tối thiểu ${coupon.minSubtotal.toLocaleString("vi-VN")}đ. Hãy thêm vé/bắp nước hoặc gỡ mã để tiếp tục.`,
    );
  }

  let discount: Prisma.Decimal;
  if (coupon.discountType === "FIXED") {
    discount = new Prisma.Decimal(coupon.discountValue);
  } else {
    discount = subtotal
      .mul(coupon.discountValue)
      .div(100)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  // Ensure discount does not exceed subtotal
  if (discount.gt(subtotal)) {
    discount = subtotal;
  }
  return { discountAmount: discount, coupon };
}
