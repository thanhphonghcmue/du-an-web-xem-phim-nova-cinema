import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CMemberTier, UserRole } from "@prisma/client";
export class UserProfileDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "email" }) email!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() cMemberPoints!: number;
  @ApiProperty({ enum: CMemberTier }) cMemberTier!: CMemberTier;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
export class MembershipDto {
  @ApiProperty() points!: number;
  @ApiProperty({ enum: CMemberTier }) tier!: CMemberTier;
  @ApiProperty({ enum: [0.05, 0.07, 0.1] }) discountRate!: number;
}
