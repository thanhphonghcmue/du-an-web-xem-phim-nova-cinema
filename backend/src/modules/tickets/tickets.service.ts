import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { toDataURL } from "qrcode";
import { ApiException } from "../../common/exceptions/api.exception";
import { pageOf } from "../../common/dto/pagination.dto";
import { NotificationSettings } from "../../config/notification.settings";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  EMAIL_REQUESTED,
  OutboxRepository,
} from "../../queues/outbox/outbox.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import { TicketDetailsDto, TicketDto, ListTicketsDto } from "./ticket.dto";
import {
  ticketCalendar,
  ticketDetails,
  withinCheckInWindow,
} from "./ticket-format";
import { TicketRecord, TicketsRepository } from "./tickets.repository";
@Injectable()
export class TicketsService {
  private readonly settings: NotificationSettings;
  constructor(
    config: ConfigService,
    private readonly database: UnitOfWork,
    private readonly bookings: BookingsRepository,
    private readonly tickets: TicketsRepository,
    private readonly events: OutboxRepository,
  ) {
    this.settings = config.getOrThrow<NotificationSettings>("notification");
  }
  generateETicket(bookingId: string): Promise<TicketRecord> {
    return this.database.transaction(async (tx) => {
      await this.bookings.lockBooking(bookingId, tx);
      const booking = await this.bookings.find(bookingId, tx);
      if (!booking) throw missing();
      if (
        booking.status !== "PAID" ||
        !booking.seats.length ||
        booking.seats.some((seat) => seat.status !== "SOLD")
      )
        throw new ApiException(
          409,
          "TICKET_BOOKING_NOT_PAID",
          "Only a paid booking with sold seats can issue a ticket.",
        );
      const existing = await this.tickets.byBooking(bookingId, tx);
      if (existing) return existing;
      const ticketHash = randomBytes(32).toString("hex");
      const qrCodeBase64 = await toDataURL(ticketHash, {
        type: "image/png",
        errorCorrectionLevel: "M",
        width: 320,
        margin: 4,
      });
      const ticket = await this.tickets.create(
        { bookingId, ticketHash, qrCodeBase64 },
        tx,
      );
      await this.events.add(
        EMAIL_REQUESTED,
        bookingId,
        { bookingId, ticketId: ticket.id },
        tx,
      );
      return ticket;
    });
  }
  async get(id: string, userId: string): Promise<TicketDto> {
    return this.serialize(await this.requireOwned(id, userId));
  }
  list(userId: string, query: ListTicketsDto) {
    return this.database.transaction(async (tx) => {
      const [rows, total] = await this.tickets.page(userId, query, tx);
      return pageOf(
        rows.map((row) => this.serialize(row)),
        total,
        query,
      );
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  async calendar(id: string, userId: string): Promise<string> {
    return ticketCalendar(await this.requireOwned(id, userId));
  }
  checkIn(ticketHash: string, staffId: string): Promise<TicketDetailsDto> {
    return this.database.transaction(async (tx) => {
      const initial = await this.tickets.byHash(ticketHash, tx);
      if (!initial) throw missing();
      await this.bookings.lockShowtime(initial.booking.showtimeId, tx);
      await this.tickets.lockPaidBooking(initial.bookingId, tx);
      const staff = await this.tickets.lockStaff(staffId, tx);
      if (!staff || !["STAFF", "ADMIN"].includes(staff.role))
        throw new ApiException(
          403,
          "FORBIDDEN",
          "Only staff or administrators can check in tickets.",
        );
      const ticket = await this.tickets.byHash(ticketHash, tx);
      if (!ticket) throw missing();
      if (ticket.isCheckedIn) throw used();
      if (
        ticket.booking.status !== "PAID" ||
        !ticket.booking.seats.length ||
        ticket.booking.seats.some((seat) => seat.status !== "SOLD")
      )
        throw new ApiException(
          409,
          "TICKET_BOOKING_NOT_PAID",
          "Ticket is not eligible for admission.",
        );
      const now = await this.bookings.now(tx);
      if (
        !withinCheckInWindow(
          now,
          ticket.booking.showtime.startTime,
          this.settings.checkInBeforeMinutes,
          this.settings.checkInAfterMinutes,
        )
      )
        throw new ApiException(
          409,
          "CHECK_IN_OUTSIDE_WINDOW",
          "Ticket is outside the configured check-in window.",
        );
      if ((await this.tickets.checkIn(ticket.id, staffId, now, tx)).count !== 1)
        throw used();
      const checked = await this.tickets.find(ticket.id, tx);
      if (!checked) throw missing();
      return ticketDetails(checked);
    });
  }
  private async requireOwned(
    id: string,
    userId: string,
  ): Promise<TicketRecord> {
    const row = await this.tickets.owned(id, userId);
    if (!row) throw missing();
    return row;
  }
  private serialize(row: TicketRecord): TicketDto {
    return {
      ...ticketDetails(row),
      ticketHash: row.ticketHash,
      qrCodeBase64: row.qrCodeBase64,
    };
  }
}
function missing(): ApiException {
  return new ApiException(404, "TICKET_NOT_FOUND", "Ticket was not found.");
}
function used(): ApiException {
  return new ApiException(
    409,
    "TICKET_ALREADY_USED",
    "Ticket has already been checked in.",
  );
}
