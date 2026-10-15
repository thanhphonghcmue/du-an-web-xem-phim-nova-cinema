import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Payment, Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { randomUUID } from "node:crypto";
import { ApiException } from "../../common/exceptions/api.exception";
import { PaymentSettings } from "../../config/payment.config";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  EXPIRATION_CANCEL_REQUESTED,
  OutboxRepository,
  TICKET_REQUESTED,
} from "../../queues/outbox/outbox.repository";
import {
  BookingRecord,
  BookingsRepository,
} from "../bookings/bookings.repository";
import { SeatBookingService } from "../bookings/seat-booking.service";
import { earnedMemberPoints } from "./member-points";
import {
  CheckoutPayloadDto,
  CompleteSandboxDto,
  CreateSandboxUrlDto,
  PaymentStateDto,
  PaymentWebhookDto,
  PaymentWebhookResultDto,
  SandboxUrlDto,
  SignedCheckoutDto,
} from "./payment.dto";
import { PaymentSignatureService } from "./payment-signature.service";
import { PaymentsRepository } from "./payments.repository";

type Completion = { data: PaymentWebhookResultDto } | { rejection: string };
@Injectable()
export class PaymentsService {
  private readonly settings: PaymentSettings;
  constructor(
    config: ConfigService,
    private readonly database: UnitOfWork,
    private readonly bookings: BookingsRepository,
    private readonly seats: SeatBookingService,
    private readonly payments: PaymentsRepository,
    private readonly signatures: PaymentSignatureService,
    private readonly events: OutboxRepository,
  ) {
    this.settings = config.getOrThrow<PaymentSettings>("payment");
  }

  async createSandboxUrl(
    userId: string,
    dto: CreateSandboxUrlDto,
  ): Promise<SandboxUrlDto> {
    const returnUrl = this.returnUrl(dto.returnUrl);
    const result = await this.database.transaction(async (tx) => {
      const booking = await this.lockForPayment(dto.bookingId, tx, userId);
      await this.seats.expireLocked(booking.id, tx);
      const current = await this.seats.requireRecord(booking.id, tx);
      const now = await this.bookings.now(tx);
      const showtime = await this.bookings.showtime(booking.showtimeId, tx);
      if (!this.isHolding(current) || !showtime || showtime.startTime <= now)
        return { rejection: "BOOKING_NOT_PAYABLE" } as const;
      const existing = await this.payments.forBooking(booking.id, tx);
      if (existing && existing.status !== "PENDING")
        return { rejection: "PAYMENT_ALREADY_FINALIZED" } as const;
      let payload: Pick<CheckoutPayloadDto, keyof CheckoutPayloadDto>;
      if (existing) {
        if (
          !existing.requestPayload ||
          typeof existing.requestPayload !== "object" ||
          Array.isArray(existing.requestPayload)
        )
          throw new ApiException(
            409,
            "PAYMENT_STATE_CONFLICT",
            "Stored sandbox request is inconsistent.",
          );
        payload = plainToInstance(CheckoutPayloadDto, existing.requestPayload);
        if (
          validateSync(payload, { whitelist: true, forbidNonWhitelisted: true })
            .length ||
          payload.bookingId !== booking.id ||
          payload.orderCode !== booking.orderCode ||
          payload.transactionCode !== existing.transactionCode ||
          payload.amount !== current.finalAmount.toFixed(2) ||
          !existing.amount.equals(current.finalAmount)
        )
          throw new ApiException(
            409,
            "PAYMENT_STATE_CONFLICT",
            "Stored sandbox request is inconsistent.",
          );
        if (payload.returnUrl !== returnUrl)
          throw new ApiException(
            409,
            "PAYMENT_REQUEST_CONFLICT",
            "This booking already has a sandbox request with another return URL.",
          );
      } else {
        payload = {
          bookingId: booking.id,
          orderCode: booking.orderCode,
          transactionCode: `NOVA-SB-${randomUUID()}`,
          amount: current.finalAmount.toFixed(2),
          timestamp: now.toISOString(),
          returnUrl,
        };
        await this.payments.create(
          {
            bookingId: booking.id,
            provider: "SANDBOX",
            transactionCode: payload.transactionCode,
            amount: current.finalAmount,
            status: "PENDING",
            createdAt: now,
            requestPayload: { ...payload },
          },
          tx,
        );
      }
      const url = new URL("/api/v1/payments/sandbox", this.settings.baseUrl);
      for (const [key, value] of Object.entries({
        ...payload,
        signature: this.signatures.checkout(payload),
      }))
        url.searchParams.set(key, value);
      url.searchParams.sort();
      return {
        data: {
          bookingId: booking.id,
          transactionCode: payload.transactionCode,
          amount: payload.amount,
          currency: "VND" as const,
          expiredAt: current.expiredAt,
          url: url.href,
        },
      };
    });
    if ("rejection" in result)
      throw new ApiException(
        409,
        result.rejection,
        "Booking is not eligible for a sandbox payment.",
      );
    return result.data;
  }

  status(id: string, userId: string): Promise<PaymentStateDto> {
    return this.database.transaction(async (tx) => {
      await this.bookings.lockOwned(id, userId, tx);
      const booking = await this.seats.requireRecord(id, tx);
      if (booking.userId !== userId) throw notFound();
      await this.seats.expireLocked(id, tx);
      const current = await this.seats.requireRecord(id, tx);
      const showtime = await this.bookings.showtime(current.showtimeId, tx);
      return this.state(
        current,
        await this.payments.forBooking(id, tx),
        await this.bookings.now(tx),
        showtime?.startTime,
      );
    });
  }

  async webhook(dto: PaymentWebhookDto): Promise<PaymentWebhookResultDto> {
    this.signatures.verifyWebhook(dto);
    return this.finish(dto);
  }
  // A checkout signature is a sandbox-only capability: its holder may simulate any outcome.
  // It is never accepted as a webhook signature, never extends the hold and never charges money.
  async checkout(dto: SignedCheckoutDto): Promise<PaymentStateDto> {
    this.signatures.verifyCheckout(dto, dto.signature);
    return this.database.transaction(async (tx) => {
      const booking = await this.lockForPayment(dto.bookingId, tx);
      const payment = await this.payments.find(dto.transactionCode, tx);
      this.matchCheckout(dto, booking, payment);
      await this.seats.expireLocked(booking.id, tx);
      const current = await this.seats.requireRecord(booking.id, tx);
      const showtime = await this.bookings.showtime(current.showtimeId, tx);
      return this.state(
        current,
        payment,
        await this.bookings.now(tx),
        showtime?.startTime,
      );
    });
  }
  async simulate(dto: CompleteSandboxDto): Promise<PaymentWebhookResultDto> {
    this.signatures.verifyCheckout(dto, dto.signature);
    // Load/verify the original checkout, including its exact allowlisted return URL.
    await this.checkout(dto);
    const now = await this.database.transaction((tx) => this.bookings.now(tx));
    const callback = {
      bookingId: dto.bookingId,
      orderCode: dto.orderCode,
      transactionCode: dto.transactionCode,
      amount: dto.amount,
      timestamp: now.toISOString(),
      status: dto.result,
    };
    return this.finish({
      ...callback,
      signature: this.signatures.webhook(callback),
    });
  }

  private async finish(
    dto: PaymentWebhookDto,
  ): Promise<PaymentWebhookResultDto> {
    // Every writer locks showtime -> booking -> payment -> member. Expiry/cancel serialize on booking.
    // Retry only actual serialization/deadlock errors; business errors are stable.
    let result: Completion | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await this.database.transaction((tx) =>
          this.completeWithin(dto, tx),
        );
        break;
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          !(
            error.code === "P2034" ||
            (error.code === "P2010" && error.meta?.code === "40P01")
          )
        )
          throw error;
      }
    }
    if (!result)
      throw new ApiException(
        409,
        "PAYMENT_CHANGED",
        "Payment changed concurrently; retry the same transaction code.",
      );
    if ("rejection" in result)
      throw new ApiException(
        409,
        result.rejection,
        "Payment cannot complete for this booking state.",
      );
    return result.data;
  }

  private async completeWithin(
    dto: PaymentWebhookDto,
    tx: Prisma.TransactionClient,
  ): Promise<Completion> {
    const booking = await this.lockForPayment(dto.bookingId, tx);
    await this.payments.lock(dto.transactionCode, tx);
    const payment = await this.payments.find(dto.transactionCode, tx);
    if (
      !payment ||
      payment.bookingId !== booking.id ||
      payment.provider !== "SANDBOX" ||
      dto.orderCode !== booking.orderCode
    )
      throw new ApiException(
        404,
        "PAYMENT_NOT_FOUND",
        "Sandbox payment was not found.",
      );
    if (
      !payment.amount.equals(dto.amount) ||
      !booking.finalAmount.equals(dto.amount)
    )
      throw new ApiException(
        400,
        "PAYMENT_AMOUNT_MISMATCH",
        "Amount must match the immutable booking and payment snapshots.",
      );
    if (payment.status === "PENDING" && dto.status === "SUCCESS")
      await this.payments.lockMember(booking.userId, tx);
    const now = await this.bookings.now(tx);
    const showtime = await this.bookings.showtime(booking.showtimeId, tx);
    if (payment.status !== "PENDING") {
      if (payment.status !== dto.status)
        throw new ApiException(
          409,
          "PAYMENT_ALREADY_FINALIZED",
          "This transaction already has a different terminal outcome.",
        );
      return {
        data: {
          ...this.state(booking, payment, now, showtime?.startTime),
          duplicate: true,
        },
      };
    }
    const timestamp = new Date(dto.timestamp).getTime();
    if (
      !Number.isFinite(timestamp) ||
      timestamp < payment.createdAt.getTime() - 30000 ||
      timestamp < now.getTime() - 300000 ||
      timestamp > now.getTime() + 30000
    )
      throw new ApiException(
        400,
        "PAYMENT_TIMESTAMP_INVALID",
        "First callback timestamp is outside the allowed window.",
      );
    await this.seats.expireLocked(booking.id, tx);
    let current = await this.seats.requireRecord(booking.id, tx);
    const response = {
      bookingId: dto.bookingId,
      transactionCode: dto.transactionCode,
      amount: dto.amount,
      status: dto.status,
      timestamp: dto.timestamp,
    };
    if (dto.status === "SUCCESS") {
      if (!this.isHolding(current) || !showtime || showtime.startTime <= now) {
        if (this.isHolding(current))
          current = await this.seats.releaseLocked(current, "CANCELLED", tx);
        if (
          current.status === "PAID" ||
          current.seats.some((seat) => seat.status === "SOLD")
        )
          return { rejection: "PAYMENT_STATE_CONFLICT" };
        await this.payments.finalize(
          payment.id,
          "CANCELLED",
          { ...response, rejection: "BOOKING_NOT_PAYABLE" },
          tx,
        );
        await this.requestExpiryCancellation(current, tx);
        return { rejection: "BOOKING_NOT_PAYABLE" };
      }
      const points = earnedMemberPoints(current.finalAmount);
      if (!(await this.payments.awardPoints(current.userId, points, tx)))
        throw new ApiException(
          409,
          "MEMBER_POINTS_LIMIT",
          "Membership points exceed the supported range.",
        );
      await this.payments.markPaid(current.id, tx);
      const paid = await this.payments.finalize(
        payment.id,
        "SUCCESS",
        { ...response, earnedPoints: points },
        tx,
      );
      await this.events.add(
        "seat_sold",
        current.id,
        {
          showtimeId: current.showtimeId,
          seatIds: current.seats.map((seat) => seat.seatId).sort(),
        },
        tx,
      );
      await this.events.add(
        TICKET_REQUESTED,
        current.id,
        { bookingId: current.id },
        tx,
      );
      await this.requestExpiryCancellation(current, tx);
      current = await this.seats.requireRecord(current.id, tx);
      return {
        data: {
          ...this.state(current, paid, now, showtime.startTime),
          duplicate: false,
        },
      };
    }
    if (
      current.status === "PAID" ||
      current.seats.some((seat) => seat.status === "SOLD")
    )
      return { rejection: "PAYMENT_STATE_CONFLICT" };
    if (["PENDING", "HOLDING"].includes(current.status))
      current = await this.seats.releaseLocked(current, "CANCELLED", tx);
    const failed = await this.payments.finalize(
      payment.id,
      dto.status,
      response,
      tx,
    );
    await this.requestExpiryCancellation(current, tx);
    return {
      data: {
        ...this.state(current, failed, now, showtime?.startTime),
        duplicate: false,
      },
    };
  }

  private requestExpiryCancellation(
    booking: BookingRecord,
    tx: Prisma.TransactionClient,
  ) {
    return this.events.add(
      EXPIRATION_CANCEL_REQUESTED,
      booking.id,
      { bookingId: booking.id, expiredAt: booking.expiredAt.toISOString() },
      tx,
    );
  }
  private async lockForPayment(
    id: string,
    tx: Prisma.TransactionClient,
    owner?: string,
  ): Promise<BookingRecord> {
    const initial = await this.bookings.find(id, tx);
    if (!initial || (owner && initial.userId !== owner)) throw notFound();
    await this.bookings.lockShowtime(initial.showtimeId, tx);
    if (owner) await this.bookings.lockOwned(id, owner, tx);
    else await this.bookings.lockBooking(id, tx);
    const booking = await this.seats.requireRecord(id, tx);
    if (owner && booking.userId !== owner) throw notFound();
    return booking;
  }
  private matchCheckout(
    dto: SignedCheckoutDto,
    booking: BookingRecord,
    payment: Payment | null,
  ): void {
    if (
      !payment ||
      payment.provider !== "SANDBOX" ||
      payment.bookingId !== booking.id ||
      booking.orderCode !== dto.orderCode ||
      !payment.amount.equals(dto.amount) ||
      !booking.finalAmount.equals(dto.amount)
    )
      throw new ApiException(
        404,
        "PAYMENT_NOT_FOUND",
        "Sandbox payment was not found.",
      );
    const saved = payment.requestPayload;
    if (
      !saved ||
      typeof saved !== "object" ||
      Array.isArray(saved) ||
      saved.returnUrl !== dto.returnUrl ||
      saved.timestamp !== dto.timestamp
    )
      throw new ApiException(
        409,
        "PAYMENT_REQUEST_CONFLICT",
        "Checkout must match the original sandbox request.",
      );
    this.returnUrl(dto.returnUrl);
  }
  private isHolding(booking: BookingRecord): boolean {
    return (
      ["PENDING", "HOLDING"].includes(booking.status) &&
      booking.seats.length >= 1 &&
      booking.seats.length <= 20 &&
      booking.seats.every((seat) => seat.status === "HOLDING")
    );
  }
  private state(
    booking: BookingRecord,
    payment: Payment | null,
    now: Date,
    starts?: Date,
  ) {
    return {
      bookingId: booking.id,
      bookingStatus: booking.status,
      transactionCode: payment?.transactionCode ?? null,
      paymentStatus: payment?.status ?? null,
      amount: booking.finalAmount.toFixed(2),
      currency: "VND" as const,
      expiredAt: booking.expiredAt,
      canPay:
        this.isHolding(booking) &&
        booking.expiredAt > now &&
        !!starts &&
        starts > now &&
        (!payment || payment.status === "PENDING"),
    };
  }
  private returnUrl(value: string): string {
    try {
      const url = new URL(value);
      if (
        !this.settings.returnOrigins.includes(url.origin) ||
        url.username ||
        url.password ||
        url.hash
      )
        throw new Error();
      return url.href;
    } catch {
      throw new ApiException(
        400,
        "PAYMENT_RETURN_URL_INVALID",
        "Return URL must use an allowed origin without credentials or a fragment.",
      );
    }
  }
}
function notFound(): ApiException {
  return new ApiException(404, "BOOKING_NOT_FOUND", "Booking was not found.");
}
