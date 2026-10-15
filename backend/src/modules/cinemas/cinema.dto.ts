import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
export class CreateCinemaDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;
  @ApiProperty({ maxLength: 300 })
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  address!: string;
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  city!: string;
}
export class UpdateCinemaDto extends PartialType(CreateCinemaDto, {
  skipNullProperties: false,
}) {}
export class ListCinemasDto extends PaginationDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  city?: string;
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
export class CinemaDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() address!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
