import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateShowtimeDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  movieId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  roomId!: string;

  @ApiProperty({
    format: "date-time",
    example: "2042-01-01T10:00:00+07:00",
    description:
      "ISO timestamp with seconds and explicit timezone; millisecond precision maximum. endTime is server-derived.",
  })
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(
    /^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})(?![\s\S])/,
  )
  startTime!: string;

  @ApiProperty({
    type: String,
    example: "90000.00",
    pattern:
      "^(?!0(?:\\.0{1,2})?$)(?:0|[1-9][0-9]{0,11})(?:\\.[0-9]{1,2})?(?![\\s\\S])",
    description:
      "Positive VND Decimal(14,2) as a string; no floating-point conversion.",
  })
  @IsString()
  // Absolute end assertion also rejects a final newline (JavaScript's $ allows one).
  @Matches(/^(?!0(?:\.0{1,2})?$)(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?(?![\s\S])/)
  baseTicketPrice!: string;
}

export class UpdateShowtimeDto extends PartialType(CreateShowtimeDto, {
  skipNullProperties: false,
}) {}

export class ListShowtimesDto extends PaginationDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  movieId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    format: "date",
    example: "2042-01-01",
    description:
      "Full calendar day in Vietnam (UTC+07:00), including history. Without date, lists upcoming starts only.",
  })
  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}(?![\s\S])/)
  @IsDateString({ strict: true })
  date?: string;
}

export class ShowtimeDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) movieId!: string;
  @ApiProperty({ format: "uuid" }) roomId!: string;
  @ApiProperty({ type: String, format: "date-time" }) startTime!: Date;
  @ApiProperty({
    type: String,
    format: "date-time",
    description: "Start + movie duration + 15 minutes cleaning.",
  })
  endTime!: Date;
  @ApiProperty({ type: String, example: "90000.00" }) baseTicketPrice!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
