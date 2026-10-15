import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { RoomType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
export class CreateRoomDto {
  @ApiProperty({ format: "uuid" }) @IsUUID() cinemaId!: string;
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;
  @ApiProperty({ enum: RoomType }) @IsEnum(RoomType) roomType!: RoomType;
}
export class UpdateRoomDto extends PartialType(CreateRoomDto, {
  skipNullProperties: false,
}) {}
export class RoomFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  keyword?: string;
}
export class ListRoomsDto extends RoomFiltersDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;
}
export class RoomDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) cinemaId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: RoomType }) roomType!: RoomType;
  @ApiProperty({
    readOnly: true,
    description: "Derived from physical seat count.",
  })
  totalSeats!: number;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
