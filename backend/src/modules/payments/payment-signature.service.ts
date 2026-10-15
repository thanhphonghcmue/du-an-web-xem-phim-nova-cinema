import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentSettings } from "../../config/payment.config";
import { ApiException } from "../../common/exceptions/api.exception";
import { CheckoutPayloadDto, PaymentWebhookDto } from "./payment.dto";
@Injectable()
export class PaymentSignatureService {
  private readonly secret: string;
  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<PaymentSettings>("payment").secret;
  }
  checkout(payload: CheckoutPayloadDto): string {
    return this.digest("checkout.v1", [
      payload.bookingId,
      payload.orderCode,
      payload.transactionCode,
      payload.amount,
      payload.timestamp,
      payload.returnUrl,
    ]);
  }
  webhook(payload: Omit<PaymentWebhookDto, "signature">): string {
    return this.digest("webhook.v1", [
      payload.bookingId,
      payload.orderCode,
      payload.transactionCode,
      payload.amount,
      payload.timestamp,
      payload.status,
    ]);
  }
  verifyCheckout(payload: CheckoutPayloadDto, signature: string): void {
    this.verify(this.checkout(payload), signature);
  }
  verifyWebhook(payload: PaymentWebhookDto): void {
    this.verify(this.webhook(payload), payload.signature);
  }
  private digest(domain: string, fields: string[]): string {
    return createHmac("sha512", this.secret)
      .update(`${domain}:${JSON.stringify(fields)}`, "utf8")
      .digest("hex");
  }
  private verify(expected: string, received: string): void {
    if (
      !/^[a-f0-9]{128}$/.test(received) ||
      !timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(received, "hex"),
      )
    )
      throw new ApiException(
        401,
        "PAYMENT_SIGNATURE_INVALID",
        "Sandbox signature is invalid.",
      );
  }
}
