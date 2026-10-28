import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { SeatType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
const row = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;
const rows = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((item: unknown) =>
        typeof item === "string" ? item.trim().toUpperCase() : item,
      )
    : value;
export class CreateSeatDto {
  @ApiProperty({ example: "A" })
  @Transform(row)
  @Matches(/^[A-Z]{1,8}$/)
  seatRow!: string;
  @ApiProperty({ minimum: 1, maximum: 24 })
  @IsInt()
  @Min(1)
  @Max(24)
  seatColumn!: number;
  @ApiProperty({ enum: SeatType }) @IsEnum(SeatType) seatType!: SeatType;
}
export class UpdateSeatDto extends PartialType(CreateSeatDto, {
  skipNullProperties: false,
}) {}
export class GenerateSeatsDto {
  @ApiProperty({ type: [String], example: ["A", "B", "C"], maxItems: 15 })
  @Transform(rows)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @ArrayUnique()
  @Matches(/^[A-Z]{1,8}$/, { each: true })
  rows!: string[];
  @ApiProperty({ minimum: 1, maximum: 24, example: 20 })
  @IsInt()
  @Min(1)
  @Max(24)
  columns!: number;
  @ApiPropertyOptional({ type: [String], example: ["B"] })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(rows)
  @IsArray()
  @ArrayMaxSize(15)
  @ArrayUnique()
  @Matches(/^[A-Z]{1,8}$/, { each: true })
  vipRows?: string[];
  @ApiPropertyOptional({ type: [String], example: ["C"] })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(rows)
  @IsArray()
  @ArrayMaxSize(15)
  @ArrayUnique()
  @Matches(/^[A-Z]{1,8}$/, { each: true })
  sweetboxRows?: string[];
}
export class ListSeatsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SeatType })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;
  @ApiPropertyOptional({ example: "A" })
  @IsOptional()
  @Transform(row)
  @Matches(/^[A-Z]{1,8}$/)
  seatRow?: string;
}
export class SeatDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) roomId!: string;
  @ApiProperty() seatRow!: string;
  @ApiProperty() seatColumn!: number;
  @ApiProperty({ enum: SeatType }) seatType!: SeatType;
  @ApiProperty({ type: String, enum: ["1.00", "1.20", "1.50"], readOnly: true })
  priceModifier!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
export class GeneratedSeatsDto {
  @ApiProperty({ format: "uuid" }) roomId!: string;
  @ApiProperty() createdCount!: number;
  @ApiProperty() totalSeats!: number;
}
