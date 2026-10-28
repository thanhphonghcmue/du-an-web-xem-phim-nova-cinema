import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ["MOVIE"] })
  @IsOptional()
  @IsIn(["MOVIE"])
  entityType?: string;
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  entityId?: string;
  @ApiPropertyOptional({ enum: ["CREATE", "UPDATE", "DELETE"] })
  @IsOptional()
  @IsIn(["CREATE", "UPDATE", "DELETE"])
  action?: string;
}
export class AuditLogDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) actorId!: string;
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ format: "uuid" }) entityId!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ type: Object }) changes!: Prisma.JsonValue;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
