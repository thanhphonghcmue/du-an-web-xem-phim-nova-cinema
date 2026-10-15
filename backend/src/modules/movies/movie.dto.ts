import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { AgeRating, MovieStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
export class CreateMovieDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title!: string;
  @ApiProperty({ maxLength: 20000 })
  @Transform(trim)
  @IsString()
  @Length(1, 20000)
  description!: string;
  @ApiProperty({ minimum: 1, maximum: 600 })
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes!: number;
  @ApiProperty({ example: "2026-10-15T00:00:00Z", format: "date-time" })
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  releaseDate!: string;
  @ApiProperty({ enum: AgeRating }) @IsEnum(AgeRating) ageRating!: AgeRating;
  @ApiPropertyOptional({ enum: MovieStatus, default: MovieStatus.COMING_SOON })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsEnum(MovieStatus)
  status?: MovieStatus;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  trailerUrl?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  posterUrl?: string | null;
}
export class UpdateMovieDto extends PartialType(CreateMovieDto, {
  skipNullProperties: false,
}) {}
export class ListMoviesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MovieStatus })
  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;
  @ApiPropertyOptional({ enum: AgeRating })
  @IsOptional()
  @IsEnum(AgeRating)
  ageRating?: AgeRating;
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
export class MovieDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ type: String, format: "date-time" }) releaseDate!: Date;
  @ApiProperty({ enum: AgeRating }) ageRating!: AgeRating;
  @ApiProperty({ enum: MovieStatus }) status!: MovieStatus;
  @ApiProperty({ type: String, nullable: true }) trailerUrl!: string | null;
  @ApiProperty({ type: String, nullable: true }) posterUrl!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
