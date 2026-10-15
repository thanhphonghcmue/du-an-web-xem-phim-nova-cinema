import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
export const PAYMENT_OUTCOMES = ["SUCCESS", "FAILED", "CANCELLED"] as const;
export type PaymentOutcome = (typeof PAYMENT_OUTCOMES)[number];
export class CreateSandboxUrlDto {
  @ApiProperty({ format: "uuid" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsUUID()
  bookingId!: string;
  @ApiProperty({
    example: "http://localhost:3000/booking/result",
    maxLength: 2048,
  })
  @IsString()
  @MaxLength(2048)
  returnUrl!: string;
}
export class CheckoutPayloadDto extends CreateSandboxUrlDto {
  @ApiProperty()
  @Matches(/^NOVA-[a-f0-9]{32}$/)
  orderCode!: string;
  @ApiProperty({ example: "NOVA-SB-00000000-0000-4000-8000-000000000000" })
  @Matches(/^NOVA-SB-[a-f0-9-]{36}$/)
  transactionCode!: string;
  @ApiProperty({
    example: "85500.00",
    description: "Canonical fixed2 VND snapshot; never a JSON number.",
  })
  @Matches(/^(0|[1-9]\d{0,11})\.\d{2}$/)
  amount!: string;
  @ApiProperty({ format: "date-time" })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  timestamp!: string;
}
export class SignedCheckoutDto extends CheckoutPayloadDto {
  @ApiProperty({
    description:
      "128 lowercase hex characters, HMAC-SHA512 checkout.v1 domain.",
  })
  @Matches(/^[a-f0-9]{128}$/)
  signature!: string;
}
export class CompleteSandboxDto extends SignedCheckoutDto {
  @ApiProperty({ enum: PAYMENT_OUTCOMES })
  @IsIn(PAYMENT_OUTCOMES)
  result!: PaymentOutcome;
}
export class PaymentWebhookDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;
  @ApiProperty()
  @Matches(/^NOVA-[a-f0-9]{32}$/)
  orderCode!: string;
  @ApiProperty()
  @Matches(/^NOVA-SB-[a-f0-9-]{36}$/)
  transactionCode!: string;
  @ApiProperty({ example: "85500.00" })
  @Matches(/^(0|[1-9]\d{0,11})\.\d{2}$/)
  amount!: string;
  @ApiProperty({ format: "date-time" })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  timestamp!: string;
  @ApiProperty({ enum: PAYMENT_OUTCOMES })
  @IsIn(PAYMENT_OUTCOMES)
  status!: PaymentOutcome;
  @ApiProperty({
    description:
      "HMAC-SHA512 webhook.v1 signature; checkout signatures cannot authorize webhooks.",
  })
  @Matches(/^[a-f0-9]{128}$/)
  signature!: string;
}
export class SandboxUrlDto {
  @ApiProperty({ format: "uuid" }) bookingId!: string;
  @ApiProperty() transactionCode!: string;
  @ApiProperty() amount!: string;
  @ApiProperty({ enum: ["VND"] }) currency!: "VND";
  @ApiProperty({ format: "date-time" }) expiredAt!: Date;
  @ApiProperty() url!: string;
}
export class PaymentStateDto {
  @ApiProperty({ format: "uuid" }) bookingId!: string;
  @ApiProperty({ enum: BookingStatus }) bookingStatus!: BookingStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) transactionCode!:
    string | null;
  @ApiPropertyOptional({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;
  @ApiProperty() amount!: string;
  @ApiProperty({ enum: ["VND"] }) currency!: "VND";
  @ApiProperty({ format: "date-time" }) expiredAt!: Date;
  @ApiProperty() canPay!: boolean;
}
export class PaymentWebhookResultDto extends PaymentStateDto {
  @ApiProperty() duplicate!: boolean;
}
