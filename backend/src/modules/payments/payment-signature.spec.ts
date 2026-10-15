import { ConfigService } from "@nestjs/config";
import { randomBytes, createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PaymentSignatureService } from "./payment-signature.service";
import { earnedMemberPoints } from "./member-points";
describe("Sandbox signatures and Decimal points", () => {
  const secret = randomBytes(48).toString("hex");
  const service = new PaymentSignatureService(
    new ConfigService({ payment: { secret } }),
  );
  const payload = {
    bookingId: "00000000-0000-4000-8000-000000000001",
    orderCode: "NOVA-" + "a".repeat(32),
    transactionCode: "NOVA-SB-00000000-0000-4000-8000-000000000002",
    amount: "85500.00",
    timestamp: "2026-10-15T10:00:00.000Z",
    returnUrl: "http://localhost:3000/result?x=%26",
  };
  it("matches an independently constructed canonical HMAC-SHA512 vector", () => {
    const expected = createHmac("sha512", secret)
      .update(
        "checkout.v1:" +
          JSON.stringify([
            payload.bookingId,
            payload.orderCode,
            payload.transactionCode,
            payload.amount,
            payload.timestamp,
            payload.returnUrl,
          ]),
      )
      .digest("hex");
    expect(service.checkout(payload)).toBe(expected);
    expect(() => {
      service.verifyCheckout(payload, expected);
    }).not.toThrow();
  });
  it("rejects every tampered checkout field, malformed hex and unequal byte lengths", () => {
    const signature = service.checkout(payload);
    for (const key of Object.keys(payload) as Array<keyof typeof payload>)
      expect(() => {
        service.verifyCheckout(
          { ...payload, [key]: payload[key] + "x" },
          signature,
        );
      }).toThrow();
    for (const wrong of [
      "",
      "a".repeat(126),
      "g".repeat(128),
      signature.toUpperCase(),
    ])
      expect(() => {
        service.verifyCheckout(payload, wrong);
      }).toThrow();
  });
  it("separates checkout authorization from webhook authorization and signs the outcome", () => {
    const callback = { ...payload, status: "SUCCESS" as const };
    const signature = service.webhook(callback);
    expect(() => {
      service.verifyWebhook({ ...callback, signature });
    }).not.toThrow();
    expect(() => {
      service.verifyWebhook({
        ...callback,
        signature: service.checkout(payload),
      });
    }).toThrow();
    expect(() => {
      service.verifyWebhook({ ...callback, status: "FAILED", signature });
    }).toThrow();
  });
  it.each([
    ["0.00", 0],
    ["9999.99", 0],
    ["10000.00", 1],
    ["85500.00", 8],
    ["319200.00", 31],
    ["999999999999.99", 99999999],
  ])("converts %s VND using floor(amount ×0.10 /1000)", (value, expected) => {
    expect(earnedMemberPoints(new Prisma.Decimal(value))).toBe(expected);
  });
});
