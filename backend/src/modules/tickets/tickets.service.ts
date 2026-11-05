import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { ApiException } from "../../common/exceptions/api.exception";
import { pageOf } from "../../common/dto/pagination.dto";
import { AppSettings } from "../../config/app.config";
import { NotificationSettings } from "../../config/notification.settings";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  EMAIL_REQUESTED,
  OutboxRepository,
} from "../../queues/outbox/outbox.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import {
  TicketDetailsDto,
  TicketDto,
  ListTicketsDto,
  TicketConfirmationDto,
} from "./ticket.dto";
import {
  ticketCalendar,
  ticketDetails,
  withinCheckInWindow,
} from "./ticket-format";
import { ticketEmail } from "../notifications/ticket-email";
import { TicketRecord, TicketsRepository } from "./tickets.repository";
import { ticketQrPng } from "./ticket-qr";
@Injectable()
export class TicketsService {
  private readonly settings: NotificationSettings;
  private readonly webOrigin: string;
  constructor(
    config: ConfigService,
    private readonly database: UnitOfWork,
    private readonly bookings: BookingsRepository,
    private readonly tickets: TicketsRepository,
    private readonly events: OutboxRepository,
  ) {
    this.settings = config.getOrThrow<NotificationSettings>("notification");
    this.webOrigin =
      config.getOrThrow<AppSettings>("app").corsOrigins[0] ||
      "http://localhost:3000";
  }
  async generateETicket(bookingId: string): Promise<TicketRecord> {
    // Chuẩn bị QR ngoài lock; dữ liệu PAID/SOLD vẫn được kiểm tra lại trong transaction.
    const initial = await this.tickets.issuanceSnapshot(bookingId);
    if (!initial) throw missing();
    const prepared = new Map(
      initial.seats.map((seat) => {
        const ticketHash = randomBytes(32).toString("hex");
        return [
          seat.id,
          { ticketHash, qrCodeBase64: ticketQrPng(this.qrUrl(ticketHash)) },
        ];
      }),
    );
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.database.transaction(async (tx) => {
          await this.bookings.lockBooking(bookingId, tx);
          const snapshot = await this.tickets.issuanceSnapshot(bookingId, tx);
          if (!snapshot) throw missing();
          const { tickets: existing, ...booking } = snapshot;
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
          // QR nhóm cũ tiếp tục đại diện đơn cũ, không phát thêm vé trùng quyền vào rạp.
          const legacy = existing.find((ticket) => !ticket.bookingSeatId);
          if (legacy) return { ...legacy, booking };
          const issued = [...existing];
          for (const seat of booking.seats) {
            if (existing.some((ticket) => ticket.bookingSeatId === seat.id))
              continue;
            const candidate = prepared.get(seat.id);
            if (!candidate)
              throw new ApiException(
                409,
                "TICKET_SNAPSHOT_CHANGED",
                "Dữ liệu ghế đã thay đổi. Vui lòng thử phát hành lại vé.",
              );
            const ticket = await this.tickets.createRecord(
              { bookingId, bookingSeatId: seat.id, ...candidate },
              tx,
            );
            issued.push(ticket);
            await this.events.add(
              EMAIL_REQUESTED,
              bookingId,
              { bookingId, ticketId: ticket.id },
              tx,
            );
          }
          const first = issued[0];
          if (!first) throw missing();
          return { ...first, booking };
        });
      } catch (error) {
        // Unique code/hash là ràng buộc cuối; retry toàn transaction, không để SQL abort dở.
        if (
          attempt >= 3 ||
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
      }
    }
  }
  private qrUrl(hash: string): string {
    return `${this.webOrigin}/ve#${hash}`;
  }
  async publicLookup(hash: string) {
    const row = await this.database.transaction((tx) =>
      this.tickets.byHash(hash, tx),
    );
    if (!row) throw missing();
    const d = ticketDetails(row);
    // Không trả tên/số điện thoại/email, mã đơn, QR token hoặc quyền check-in cho khách ẩn danh.
    return {
      ticketCode: d.ticketCode,
      movie: d.movie,
      posterUrl: d.posterUrl,
      cinema: d.cinema,
      room: d.room,
      startTime: d.startTime,
      endTime: d.endTime,
      seats: d.seats.map((seat) => ({ label: seat.label, type: seat.type })),
      status:
        row.booking.status !== "PAID"
          ? "INVALID"
          : row.isCheckedIn
            ? "USED"
            : "VALID",
    };
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
  async confirmation(
    id: string,
    userId: string,
  ): Promise<TicketConfirmationDto> {
    const row = await this.requireOwned(id, userId);
    const event = await this.tickets.emailStatus(row.bookingId, row.id);
    const message = ticketEmail(row, event?.id ?? row.id, this.settings.from);
    return {
      subject: message.subject,
      to: message.to,
      html: message.html.replace("cid:nova-ticket-qr", row.qrCodeBase64),
      deliveryStatus: !event
        ? "UNKNOWN"
        : event.processedAt
          ? "SMTP_ACCEPTED"
          : event.lastError
            ? "RETRYING"
            : "QUEUED",
      acceptedAt: event?.processedAt ?? null,
      attempts: event?.attempts ?? 0,
    };
  }
  verify(
    ticketHash: string,
    showtimeId: string,
    staffId: string,
  ): Promise<TicketDetailsDto> {
    return this.database.transaction(async (tx) => {
      const staff = await this.tickets.lockStaff(staffId, tx);
      if (!staff || !["STAFF", "ADMIN"].includes(staff.role))
        throw new ApiException(
          403,
          "FORBIDDEN",
          "Only staff or administrators can verify tickets.",
        );
      const ticket = await this.tickets.byHash(ticketHash, tx);
      if (!ticket) throw missing();
      this.assertAdmission(ticket, await this.bookings.now(tx), showtimeId);
      return ticketDetails(ticket);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  checkIn(
    ticketHash: string,
    staffId: string,
    showtimeId?: string,
  ): Promise<TicketDetailsDto> {
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
      const now = await this.bookings.now(tx);
      this.assertAdmission(ticket, now, showtimeId);
      if ((await this.tickets.checkIn(ticket.id, staffId, now, tx)).count !== 1)
        throw used();
      const checked = await this.tickets.find(ticket.id, tx);
      if (!checked) throw missing();
      return ticketDetails(checked);
    });
  }
  private assertAdmission(
    ticket: TicketRecord,
    now: Date,
    showtimeId?: string,
  ): void {
    if (ticket.isCheckedIn)
      throw new ApiException(
        409,
        "TICKET_ALREADY_USED",
        "Vé đã được sử dụng.",
        { checkedInAt: ticket.checkedInAt },
      );
    if (showtimeId && ticket.booking.showtimeId !== showtimeId.toLowerCase())
      throw new ApiException(
        409,
        "TICKET_SHOWTIME_MISMATCH",
        "Vé không khớp với suất chiếu đang kiểm tra.",
        {
          startTime: ticket.booking.showtime.startTime,
          room: ticket.booking.showtime.room.name,
        },
      );
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
      ticketQrToken: row.ticketHash,
      qrPayload: row.bookingSeatId
        ? this.qrUrl(row.ticketHash)
        : row.ticketHash,
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
