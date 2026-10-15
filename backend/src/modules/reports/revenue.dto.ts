import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, ValidateBy } from "class-validator";

function IsReportDay(): PropertyDecorator {
  return ValidateBy({
    name: "isReportDay",
    validator: {
      validate(value: unknown): boolean {
        if (
          typeof value !== "string" ||
          !/^(?!0000)\d{4}-\d{2}-\d{2}(?![\s\S])/.test(value)
        )
          return false;
        // ISO parsing preserves years0001–0099; numeric Date constructors reinterpret them as1901–1999.
        const date = new Date(`${value}T00:00:00.000Z`);
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      },
      defaultMessage: () =>
        "$property must be a real YYYY-MM-DD calendar day in years0001–9999",
    },
  });
}

export class RevenueQueryDto {
  @ApiProperty({
    format: "date",
    example: "2026-10-01",
    description:
      "First inclusive Vietnam calendar day, applied to Booking.createdAt. Explicit YYYY-MM-DD only.",
  })
  @IsReportDay()
  from!: string;
  @ApiProperty({
    format: "date",
    example: "2026-10-31",
    description:
      "Last inclusive Vietnam calendar day. A one-day range is valid; must not precede from.",
  })
  @IsReportDay()
  to!: string;
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Filter showtime.room.cinemaId; unknown valid IDs produce zero totals.",
  })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;
  @ApiPropertyOptional({
    format: "uuid",
    description: "Filter showtime.movieId; combined with cinemaId using AND.",
  })
  @IsOptional()
  @IsUUID()
  movieId?: string;
}
export class RevenueReportDto {
  @ApiProperty({
    type: String,
    example: "180000.00",
    description:
      "SUM Booking.totalTicketAmount before discounts; fixed2 VND string.",
  })
  ticketRevenue!: string;
  @ApiProperty({
    type: String,
    example: "69000.00",
    description:
      "SUM Booking.totalComboAmount before discounts; fixed2 VND string.",
  })
  comboRevenue!: string;
  @ApiProperty({
    type: String,
    example: "12450.00",
    description: "SUM Booking.discountAmount; fixed2 VND string.",
  })
  discountAmount!: string;
  @ApiProperty({
    type: String,
    example: "236550.00",
    description:
      "SUM Booking.finalAmount; fixed2 VND string. ticketRevenue+comboRevenue-discountAmount.",
  })
  netRevenue!: string;
  @ApiProperty({
    minimum: 0,
    example: 1,
    description:
      "Number of matching PAID bookings; independent of payment/ticket/email rows.",
  })
  paidBookingCount!: number;
  @ApiProperty({
    minimum: 0,
    example: 2,
    description:
      "Number of SOLD BookingSeat rows belonging to matching PAID bookings, not QR count.",
  })
  ticketCount!: number;
}
