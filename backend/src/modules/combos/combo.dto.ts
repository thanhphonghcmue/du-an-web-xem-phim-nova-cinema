import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
export class CreateComboDto {
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsIn([
    "NGỌT",
    "MẶN",
    "PHÔ_MAI",
    "CARAMEL",
    "MIX",
    "Ngọt Caramel",
    "Phô Mai Hoàng Kim",
    "Mix 2 Vị (Ngọt & Phô Mai)",
  ])
  tasteTag?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(4000)
  itemsSummary?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  suggestedMinSeats?: number;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsInt()
  @Min(1)
  @Max(20)
  suggestedMaxSeats?: number | null;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsIn(["SOLO", "COUPLE", "PARTY"])
  badgeLabel?: string;

  @ApiProperty({ maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name!: string;
  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @Length(1, 4000)
  description!: string;
  @ApiProperty({ type: String, example: "69000.00" })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?(?![\s\S])/)
  price!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  imageUrl?: string | null;
  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateComboDto extends PartialType(CreateComboDto, {
  skipNullProperties: false,
}) {}
export class ComboDto {
  @ApiProperty() tasteTag!: string;
  @ApiProperty() itemsSummary!: string;
  @ApiProperty() suggestedMinSeats!: number;
  @ApiProperty({ nullable: true }) suggestedMaxSeats!: number | null;
  @ApiProperty() badgeLabel!: string;
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, example: "69000.00" }) price!: string;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}

export class ComboStatusDto {
  @ApiPropertyOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
