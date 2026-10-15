import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingSeatStatus, SeatType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
export class GroupSeatQueryDto {
  @ApiProperty({ minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
  @ApiPropertyOptional({
    enum: SeatType,
    description: "When specified, every suggested seat must have this type.",
  })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;
}
export class JoinShowtimeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsUUID()
  showtimeId!: string;
}
export class ShowtimeSeatDto {
  @ApiProperty({ format: "uuid" }) seatId!: string;
  @ApiProperty() row!: string;
  @ApiProperty() column!: number;
  @ApiProperty({ enum: SeatType }) type!: SeatType;
  @ApiProperty({
    type: String,
    example: "108000.00",
    description: "Per-seat price before C'MEMBER discount.",
  })
  price!: string;
  @ApiProperty({ enum: BookingSeatStatus }) status!: BookingSeatStatus;
  @ApiProperty({ type: String, nullable: true, format: "date-time" })
  expiresAt!: Date | null;
}
export class SeatCapacityDto {
  @ApiProperty() total!: number;
  @ApiProperty() available!: number;
  @ApiProperty() holding!: number;
  @ApiProperty() sold!: number;
}
export class ShowtimeSeatMapDto {
  @ApiProperty({ format: "uuid" }) showtimeId!: string;
  @ApiProperty({ format: "uuid" }) roomId!: string;
  @ApiProperty({ type: String, format: "date-time" }) startTime!: Date;
  @ApiProperty({
    type: String,
    format: "date-time",
    description: "Database clock for this snapshot.",
  })
  asOf!: Date;
  @ApiProperty({
    description:
      "Time eligibility only; also inspect available capacity. Actual reservation requires authenticated hold.",
  })
  canBook!: boolean;
  @ApiProperty({ type: SeatCapacityDto }) capacity!: SeatCapacityDto;
  @ApiProperty({ type: [ShowtimeSeatDto] }) seats!: ShowtimeSeatDto[];
}
export class GroupSeatSuggestionDto {
  @ApiProperty({ format: "uuid" }) showtimeId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ enum: SeatType, nullable: true }) seatType!: SeatType | null;
  @ApiProperty({
    type: [String],
    description:
      "Empty when no suitable contiguous window exists. Advisory only; not a reservation.",
  })
  seatIds!: string[];
  @ApiProperty({ type: String, format: "date-time" }) asOf!: Date;
}
