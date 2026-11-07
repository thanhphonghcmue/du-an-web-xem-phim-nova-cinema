import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Matches,
  IsString,
  MaxLength,
  IsIn,
  IsDateString,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { Transform } from "class-transformer";
export class ListTicketsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["all", "unused", "used", "past", "cancelled"])
  status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;
  @ApiPropertyOptional({ enum: ["viewing", "booked"] })
  @IsOptional()
  @IsIn(["viewing", "booked"])
  dateBasis?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["newest", "showtime"])
  sort?: string;
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
  @ApiPropertyOptional({
    format: "uuid",
    description: "Reject a QR for a different screening before admission.",
  })
  @IsOptional()
  @IsUUID()
  showtimeId?: string;
  @ApiProperty({
    description:
      "Opaque64 lowercase QR token or the seat's case-insensitive 8-character ticket code.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  ticketHash!: string;
}
export class VerifyTicketDto {
  @ApiProperty({
    description: "Opaque QR token or 8-character seat ticket code.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  ticketHash!: string;
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  showtimeId!: string;
}
export class TicketConfirmationDto {
  @ApiProperty() subject!: string;
  @ApiProperty() to!: string;
  @ApiProperty() html!: string;
  @ApiProperty({ enum: ["QUEUED", "RETRYING", "SMTP_ACCEPTED", "UNKNOWN"] })
  deliveryStatus!: "QUEUED" | "RETRYING" | "SMTP_ACCEPTED" | "UNKNOWN";
  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  acceptedAt!: Date | null;
  @ApiProperty() attempts!: number;
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
  @ApiPropertyOptional({ nullable: true }) shortCode?: string | null;
  @ApiProperty() ticketStatus!: string;
  @ApiPropertyOptional({ nullable: true }) usedAt?: Date | null;
  @ApiProperty() ticketCode!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: Date;
  @ApiProperty({ format: "date-time" }) bookedAt!: Date;
  @ApiProperty({ nullable: true }) posterUrl!: string | null;
  @ApiProperty() customerName!: string;
  @ApiProperty({ nullable: true }) membershipTier!: string | null;
  @ApiProperty({ nullable: true }) customerPhone!: string | null;
  @ApiProperty() paymentStatus!: string;
  @ApiProperty() ticketCount!: number;
  @ApiProperty() legacyGroup!: boolean;
  @ApiProperty({ format: "uuid" }) showtimeId!: string;
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
export class LookupTicketDto {
  @Matches(/^[a-f0-9]{64}$/) ticketHash!: string;
}
export class TicketDto extends TicketDetailsDto {
  @ApiProperty() qrPayload!: string;
  @ApiProperty() ticketQrToken!: string;
  @ApiProperty() ticketHash!: string;
  @ApiProperty({
    description:
      "data:image/png;base64 QR encoding the read-only ticket URL (opaque hash for legacy tickets).",
  })
  qrCodeBase64!: string;
}

export class TicketCodeQueryDto {
  @IsString() @MaxLength(4096) code!: string;
}
export class StaffTicketCodeDto extends TicketCodeQueryDto {
  @IsOptional() @IsUUID() showtimeId?: string;
  @IsOptional() @IsString() @MaxLength(5) currentShowtime?: string;
  @IsOptional() @IsBoolean() autoCheckin?: boolean;
}

export class ResetDemoTicketDto {
  @IsOptional() @IsIn(["V1"]) code?: string;
}
