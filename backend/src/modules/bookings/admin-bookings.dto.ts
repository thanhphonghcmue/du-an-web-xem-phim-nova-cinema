import { ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
export class AdminBookingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() showtimeId?: string;
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
