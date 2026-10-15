import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { ApiException } from "../../common/exceptions/api.exception";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  EXPIRATION_REQUESTED,
  OutboxRepository,
} from "../../queues/outbox/outbox.repository";
import { CombosRepository } from "../combos/combos.repository";
import { HoldSeatsDto } from "./booking.dto";
import { BookingsRepository, BookingRecord } from "./bookings.repository";
import { PricingService } from "./pricing.service";
import { SeatLockLease, SeatLockService } from "./seat-lock.service";

export const HOLD_DURATION_MS = 300000;
@Injectable()
export class SeatBookingService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly combos: CombosRepository,
    private readonly pricing: PricingService,
    private readonly locks: SeatLockService,
    private readonly events: OutboxRepository,
    private readonly database: UnitOfWork,
  ) {}

  async holdSeats(
    userId: string,
    dto: HoldSeatsDto,
    idempotencyKey?: string,
  ): Promise<BookingRecord> {
    const key = idempotencyKey?.toLowerCase();
    const comboItems = (dto.comboItems ?? [])
      .map((item) => ({ comboId: item.comboId, quantity: item.quantity }))
      .sort((a, b) => a.comboId.localeCompare(b.comboId));
    const seatIds = [...dto.seatIds].sort();
    const hash = createHash("sha256")
      .update(
        JSON.stringify({ showtimeId: dto.showtimeId, seatIds, comboItems }),
      )
      .digest("hex");
    for (let attempt = 0; attempt < 3; attempt++) {
      let lease: SeatLockLease | undefined;
      try {
        return await this.database.transaction(async (tx) => {
          if (key) {
            await this.bookings.lockRequest(userId, key, tx);
            const replay = await this.bookings.findReplay(userId, key, tx);
            if (replay) {
              if (replay.requestHash !== hash)
                throw new ApiException(
                  409,
                  "IDEMPOTENCY_CONFLICT",
                  "Idempotency-Key was already used with a different request.",
                );
              await this.bookings.lockBooking(replay.id, tx);
              await this.expireWithin(replay.id, tx);
              return this.requireRecord(replay.id, tx);
            }
          }
          lease = await this.locks.acquire(dto.showtimeId, seatIds);
          await this.bookings.lockShowtime(dto.showtimeId, tx);
          const showtime = await this.bookings.showtime(dto.showtimeId, tx);
          if (!showtime)
            throw new ApiException(
              404,
              "SHOWTIME_NOT_FOUND",
              "Showtime was not found.",
            );
          const seats = await this.bookings.seats(seatIds, showtime.roomId, tx);
          if (seats.length !== seatIds.length)
            throw new ApiException(
              400,
              "SEATS_NOT_IN_ROOM",
              "All requested seats must exist in this showtime's room.",
            );
          const expired = await this.bookings.expiredForSeats(
            showtime.id,
            seatIds,
            await this.bookings.now(tx),
            tx,
          );
          for (const row of expired) {
            await this.bookings.lockBooking(row.id, tx);
            await this.expireWithin(row.id, tx);
          }
          if (await this.bookings.activeSeat(showtime.id, seatIds, tx))
            throw unavailable();
          const member = await this.bookings.membership(userId, tx);
          if (!member)
            throw new ApiException(
              401,
              "UNAUTHORIZED",
              "Authentication is required.",
            );
          await this.combos.lockPrices(
            comboItems.map((item) => item.comboId),
            tx,
          );
          const combos = await this.combos.findMany(
            comboItems.map((item) => item.comboId),
            tx,
          );
          if (
            combos.length !== comboItems.length ||
            combos.some((combo) => !combo.isActive)
          )
            throw new ApiException(
              400,
              "COMBO_UNAVAILABLE",
              "Every selected combo must exist and be active.",
            );
          const prices = this.pricing.calculateBookingPrice({
            baseTicketPrice: showtime.baseTicketPrice,
            seats,
            tier: member.cMemberTier,
            combos: combos.map((combo) => ({
              ...combo,
              quantity:
                comboItems.find((item) => item.comboId === combo.id)
                  ?.quantity ?? 0,
            })),
          });
          const now = await this.bookings.now(tx);
          if (showtime.startTime.getTime() <= now.getTime())
            throw new ApiException(
              409,
              "SHOWTIME_STARTED",
              "Seats cannot be held after this showtime starts.",
            );
          const expiredAt = new Date(now.getTime() + HOLD_DURATION_MS);
          const booking = await this.bookings.create(
            {
              orderCode: `NOVA-${randomUUID().replaceAll("-", "")}`,
              userId,
              showtimeId: showtime.id,
              status: "HOLDING",
              createdAt: now,
              expiredAt,
              baseTicketPrice: showtime.baseTicketPrice,
              membershipTier: member.cMemberTier,
              discountRate: prices.discountRate,
              totalTicketAmount: prices.ticketAmount,
              totalComboAmount: prices.comboAmount,
              discountAmount: prices.discountAmount,
              finalAmount: prices.finalAmount,
              ...(key ? { idempotencyKey: key, requestHash: hash } : {}),
            },
            tx,
          );
          try {
            await this.bookings.createSeats(
              prices.seats.map((seat) => ({
                bookingId: booking.id,
                seatId: seat.seatId,
                showtimeId: showtime.id,
                roomId: showtime.roomId,
                price: seat.price,
                status: "HOLDING",
              })),
              tx,
            );
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            )
              throw unavailable();
            throw error;
          }
          if (combos.length)
            await this.bookings.createCombos(
              combos.map((combo) => ({
                bookingId: booking.id,
                comboId: combo.id,
                quantity:
                  comboItems.find((item) => item.comboId === combo.id)
                    ?.quantity ?? 0,
                unitPrice: combo.price,
              })),
              tx,
            );
          await this.events.add(
            EXPIRATION_REQUESTED,
            booking.id,
            { bookingId: booking.id, expiredAt: expiredAt.toISOString() },
            tx,
          );
          await this.events.add(
            "seat_locked",
            booking.id,
            {
              showtimeId: showtime.id,
              bookingId: booking.id,
              seatIds,
              expiresAt: expiredAt.toISOString(),
            },
            tx,
          );
          return this.requireRecord(booking.id, tx);
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          !["P2034", "P2010"].includes(error.code) ||
          (error.code === "P2010" && error.meta?.code !== "40P01")
        )
          throw error;
      } finally {
        if (lease) await this.locks.release(lease);
      }
    }
    throw new ApiException(
      409,
      "BOOKING_CHANGED",
      "Booking changed concurrently. Retry with the same Idempotency-Key.",
    );
  }

  async requireRecord(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<BookingRecord> {
    const booking = await this.bookings.find(id, tx);
    if (!booking)
      throw new ApiException(
        404,
        "BOOKING_NOT_FOUND",
        "Booking was not found.",
      );
    return booking;
  }

  // Caller owns booking FOR UPDATE. Never convert SOLD rows back to AVAILABLE.
  private async expireWithin(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<Date | null> {
    const booking = await this.bookings.find(id, tx);
    if (
      !booking ||
      !["PENDING", "HOLDING"].includes(booking.status) ||
      booking.seats.some((seat) => seat.status === "SOLD")
    )
      return null;
    const now = await this.bookings.now(tx);
    if (booking.expiredAt.getTime() > now.getTime()) return booking.expiredAt;
    await this.releaseWithin(booking, "EXPIRED", tx);
    return null;
  }
  private async releaseWithin(
    booking: BookingRecord,
    status: "CANCELLED" | "EXPIRED",
    tx: Prisma.TransactionClient,
  ): Promise<BookingRecord> {
    const seatIds = booking.seats
      .filter((seat) => seat.status === "HOLDING")
      .map((seat) => seat.seatId)
      .sort();
    const updated = await this.bookings.release(booking.id, status, tx);
    await this.events.add(
      "seat_released",
      booking.id,
      { showtimeId: booking.showtimeId, seatIds },
      tx,
    );
    return updated;
  }
  autoReleaseExpiredHold(id: string): Promise<Date | null> {
    return this.database.transaction(async (tx) => {
      await this.bookings.lockBooking(id, tx);
      return this.expireWithin(id, tx);
    });
  }
  releaseSeats(id: string, userId: string): Promise<BookingRecord> {
    return this.database.transaction(async (tx) => {
      await this.bookings.lockOwned(id, userId, tx);
      const booking = await this.requireRecord(id, tx);
      if (booking.userId !== userId)
        throw new ApiException(
          404,
          "BOOKING_NOT_FOUND",
          "Booking was not found.",
        );
      if (["CANCELLED", "EXPIRED"].includes(booking.status)) return booking;
      if (
        booking.status === "PAID" ||
        booking.seats.some((seat) => seat.status === "SOLD")
      )
        throw new ApiException(
          409,
          "BOOKING_NOT_CANCELLABLE",
          "Paid or sold bookings cannot be cancelled.",
        );
      const now = await this.bookings.now(tx);
      return this.releaseWithin(
        booking,
        booking.expiredAt.getTime() <= now.getTime() ? "EXPIRED" : "CANCELLED",
        tx,
      );
    });
  }
  getOwned(id: string, userId: string): Promise<BookingRecord> {
    return this.database.transaction(async (tx) => {
      await this.bookings.lockOwned(id, userId, tx);
      const booking = await this.requireRecord(id, tx);
      if (booking.userId !== userId)
        throw new ApiException(
          404,
          "BOOKING_NOT_FOUND",
          "Booking was not found.",
        );
      await this.expireWithin(id, tx);
      return this.requireRecord(id, tx);
    });
  }
  async sweepExpired(userId?: string): Promise<void> {
    const now = await this.database.transaction((tx) => this.bookings.now(tx));
    const rows = await this.bookings.expiredBatch(now, userId);
    for (const row of rows) await this.autoReleaseExpiredHold(row.id);
  }
}
function unavailable(): ApiException {
  return new ApiException(
    409,
    "SEAT_UNAVAILABLE",
    "One or more seats were just held or sold. Choose again.",
  );
}
