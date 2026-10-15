import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserProfileDto } from "../../users/dto/user-profile.dto";
class EmailDto {
  @ApiProperty({ format: "email", maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
export class LoginDto extends EmailDto {
  @ApiProperty({ minLength: 1, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
export class RegisterDto extends EmailDto {
  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  fullName!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9 -]{5,18}$/)
  phone?: string;
}
export class RefreshTokenDto {
  @ApiProperty({ writeOnly: true, maxLength: 4096 })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refreshToken!: string;
}
export class TokenPairDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ example: "Bearer" }) tokenType!: string;
  @ApiProperty({ example: 900 }) expiresIn!: number;
  @ApiProperty({ example: 604800 }) refreshExpiresIn!: number;
}
export class AuthSessionDto extends TokenPairDto {
  @ApiProperty({ type: UserProfileDto }) user!: UserProfileDto;
}
export class LogoutDto {
  @ApiProperty({ example: true }) revoked!: boolean;
}
