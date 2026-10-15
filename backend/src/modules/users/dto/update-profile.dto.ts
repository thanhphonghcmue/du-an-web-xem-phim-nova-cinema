import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from "class-validator";
export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Set null to clear. 6–20 phone characters.",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9 -]{5,18}$/)
  phone?: string | null;
}
