import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingSeatStatus, BookingStatus, CMemberTier } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

const uuid = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.toLowerCase() : value;
export class ComboItemDto {
  @ApiProperty({ format: "uuid" }) @Transform(uuid) @IsUUID() comboId!: string;
  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
export class HoldSeatsDto {
  @ApiProperty({ format: "uuid" })
  @Transform(uuid)
  @IsUUID()
  showtimeId!: string;
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
    description:
      "Sweetbox selections resolve the same-row odd/even partner atomically; maximum20 after resolution.",
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    Array.isArray(value)
      ? (value as unknown[]).map((item) =>
          typeof item === "string" ? item.toLowerCase() : item,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  seatIds!: string[];
  @ApiPropertyOptional({
    type: [ComboItemDto],
    maxItems: 20,
    description:
      "Unique combo IDs; quantity 1–20 each. Server loads current active prices.",
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique((item: unknown) =>
    item !== null && typeof item === "object" && "comboId" in item
      ? item.comboId
      : item,
  )
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  comboItems?: ComboItemDto[];
}
export class ListBookingsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
export class BookingSeatDto {
  @ApiProperty({ format: "uuid" }) seatId!: string;
  @ApiProperty({ format: "uuid" }) roomId!: string;
  @ApiProperty({ enum: BookingSeatStatus }) status!: BookingSeatStatus;
  @ApiProperty({ type: String, example: "108000.00" }) price!: string;
}
export class BookingComboDto {
  @ApiProperty({ format: "uuid" }) comboId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: String, example: "69000.00" }) unitPrice!: string;
}
export class BookingDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() orderCode!: string;
  @ApiProperty({ format: "uuid" }) showtimeId!: string;
  @ApiProperty({ enum: BookingStatus }) status!: BookingStatus;
  @ApiProperty({
    type: String,
    format: "date-time",
    description:
      "Fixed server deadline, exactly createdAt +300000ms for new holds.",
  })
  expiredAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
  @ApiProperty({ type: String }) totalTicketAmount!: string;
  @ApiProperty({ type: String }) totalComboAmount!: string;
  @ApiProperty({ type: String }) discountAmount!: string;
  @ApiProperty({ type: String }) finalAmount!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: "Null for legacy bookings without snapshots.",
  })
  baseTicketPrice!: string | null;
  @ApiProperty({ enum: CMemberTier, nullable: true })
  membershipTier!: CMemberTier | null;
  @ApiProperty({ type: String, nullable: true, example: "0.050" })
  discountRate!: string | null;
  @ApiProperty({ type: [BookingSeatDto] }) seats!: BookingSeatDto[];
  @ApiProperty({ type: [BookingComboDto] }) combos!: BookingComboDto[];
}
