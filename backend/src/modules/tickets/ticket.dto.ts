import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, Matches } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { Transform } from "class-transformer";
export class ListTicketsDto extends PaginationDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: "Exact true/false query values; omit to include both states.",
  })
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  isCheckedIn?: boolean;
}
export class CheckInDto {
  @ApiProperty({
    description:
      "The opaque64 lowercase hex characters decoded from the QR PNG.",
  })
  @Matches(/^[a-f0-9]{64}$/)
  ticketHash!: string;
}
export class TicketSeatDto {
  @ApiProperty() label!: string;
  @ApiProperty() type!: string;
  @ApiProperty() price!: string;
}
export class TicketComboDto {
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: string;
}
export class TicketDetailsDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) bookingId!: string;
  @ApiProperty() orderCode!: string;
  @ApiProperty() movie!: string;
  @ApiProperty() cinema!: string;
  @ApiProperty() room!: string;
  @ApiProperty({ format: "date-time" }) startTime!: Date;
  @ApiProperty({ format: "date-time" }) endTime!: Date;
  @ApiProperty() amount!: string;
  @ApiProperty({ enum: ["VND"] }) currency!: "VND";
  @ApiProperty({ type: [TicketSeatDto] }) seats!: TicketSeatDto[];
  @ApiProperty({ type: [TicketComboDto] }) combos!: TicketComboDto[];
  @ApiProperty() isCheckedIn!: boolean;
  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String })
  checkedInAt!: Date | null;
}
export class TicketDto extends TicketDetailsDto {
  @ApiProperty() ticketHash!: string;
  @ApiProperty({
    description: "data:image/png;base64 QR encoding only the opaque hash.",
  })
  qrCodeBase64!: string;
}
