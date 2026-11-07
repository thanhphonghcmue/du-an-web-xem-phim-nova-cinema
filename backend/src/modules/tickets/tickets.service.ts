import { EmailLogsRepository } from "../notifications/email-logs.repository";
import { extractNormalizedCode } from "../../../../shared/ticket-input.cjs";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomBytes, createHmac } from "node:crypto";
import { ApiException } from "../../common/exceptions/api.exception";
import { pageOf } from "../../common/dto/pagination.dto";
import { JwtSettings } from "../../config/jwt.config";
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
  private readonly ticketSigningKey: string;
  constructor(
    config: ConfigService,
    private readonly database: UnitOfWork,
    private readonly bookings: BookingsRepository,
    private readonly tickets: TicketsRepository,
    private readonly events: OutboxRepository,
    private readonly emailLogs: EmailLogsRepository,
  ) {
    this.ticketSigningKey = config.getOrThrow<JwtSettings>("jwt").accessSecret;
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
          {
            ticketHash,
            qrPayload: this.qrUrl(ticketHash),
            hmacSignature: createHmac("sha256", this.ticketSigningKey)
              .update(`nova-ticket:v1:${bookingId}:${ticketHash}`)
              .digest("hex"),
            qrCodeBase64: ticketQrPng(this.qrUrl(ticketHash)),
          },
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
            const event = await this.events.add(
              EMAIL_REQUESTED,
              bookingId,
              { bookingId, ticketId: ticket.id },
              tx,
            );
            // FR10: nội dung chờ gửi được lưu cùng transaction phát hành vé.
            const message = ticketEmail(
              { ...ticket, booking },
              event.id,
              this.settings.from,
            );
            await this.emailLogs.enqueue(
              {
                eventId: event.id,
                ticketId: ticket.id,
                bookingId,
                recipient: message.to,
                subject: message.subject,
                html: message.html,
                text: message.text,
              },
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
    if (!row || (row.demoOnly && process.env.NODE_ENV === "production"))
      throw missing();
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
  async demoFixtures() {
    if (process.env.NODE_ENV === "production")
      return { enabled: false, tickets: [], showtimeId: null };
    const rows = await this.database.transaction((tx) =>
      this.tickets.demoSamples(tx),
    );
    return {
      enabled: true,
      showtimeId:
        rows.find((row) => row.shortCode === "V1")?.booking.showtimeId ?? null,
      tickets: rows.map((row) => ({
        code: row.shortCode,
        ticketCode: row.ticketCode,
        isCheckedIn: row.isCheckedIn,
        usedAt: row.checkedInAt,
      })),
    };
  }
  async resetDemo(staffId: string, code = "V1") {
    if (code !== "V1")
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "Chỉ được reset vé mẫu V1.",
      );
    // Chỉ vé mẫu V1: tuyệt đối không mở lại quyền vào rạp của vé thật/production.
    if (process.env.NODE_ENV === "production")
      throw new ApiException(
        404,
        "DEMO_DISABLED",
        "Công cụ vé mẫu không khả dụng.",
      );
    return this.database.transaction(async (tx) => {
      const initial = await this.tickets.byHash("V1", tx);
      if (!initial?.demoOnly || initial.shortCode !== "V1") throw missing();
      await this.bookings.lockShowtime(initial.booking.showtimeId, tx);
      await this.tickets.lockPaidBooking(initial.bookingId, tx);
      const staff = await this.tickets.lockStaff(staffId, tx);
      if (!staff || !["STAFF", "ADMIN"].includes(staff.role))
        throw new ApiException(
          403,
          "FORBIDDEN",
          "Chỉ nhân viên hoặc quản trị viên được đặt lại vé mẫu.",
        );
      if ((await this.tickets.resetDemo(initial.id, tx)).count !== 1)
        throw missing();
      const row = await this.tickets.find(initial.id, tx);
      if (!row) throw missing();
      return { reset: true, ticket: ticketDetails(row) };
    });
  }
  async lookupCode(raw: string, userId: string, staffLookup = false) {
    const code = extractNormalizedCode(raw);
    if (!code)
      throw new ApiException(
        400,
        "TICKET_CODE_REQUIRED",
        "Vui lòng nhập hoặc quét mã vé!",
      );
    const row = await this.database.transaction((tx) =>
      this.tickets.byHash(code, tx),
    );
    // Cùng 404 cho mã giả và mã thuộc người khác; không fallback sang danh sách.
    if (
      !row ||
      (row.demoOnly && process.env.NODE_ENV === "production") ||
      (!staffLookup && row.booking.userId !== userId) ||
      row.booking.status !== "PAID"
    )
      throw missing();
    const ticket = this.serialize(row);
    // Chủ vé/nhân viên đối chiếu toàn bộ đơn; QR vẫn chỉ cấp quyền cho ghế trên vé.
    ticket.bookingSeats = row.booking.seats.map((line) => ({
      label: `${line.seat.seatRow}${String(line.seat.seatColumn)}`,
      type: line.seat.seatType,
      price: line.price.toFixed(2),
    }));
    return { found: true, ticket };
  }
  async verifyCode(
    raw: string,
    staffId: string,
    showtimeId?: string,
    currentShowtime?: string,
    autoCheckin = false,
  ) {
    const code = extractNormalizedCode(raw);
    if (!code)
      throw new ApiException(
        400,
        "TICKET_CODE_REQUIRED",
        "Vui lòng nhập hoặc quét mã vé!",
      );
    const details = await this.verify(code, showtimeId, staffId);
    if (
      currentShowtime &&
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
      }).format(details.startTime) !== currentShowtime
    )
      throw new ApiException(
        409,
        "TICKET_SHOWTIME_MISMATCH",
        "CẢNH BÁO: SAI SUẤT CHIẾU",
        details,
      );
    const ticket = autoCheckin
      ? await this.checkIn(code, staffId, details.showtimeId)
      : details;
    return Object.assign({}, ticket, {
      statusType: "VALID_SUCCESS",
      httpCode: 200,
      title: "Soát vé thành công - Hợp lệ",
      badge: "✓ VÉ HỢP LỆ (VERIFIED)",
      statusLabel: autoCheckin
        ? "ĐỦ ĐIỀU KIỆN VÀO RẠP (LẦN 1) -> ĐÃ CHECK-IN"
        : "ĐỦ ĐIỀU KIỆN VÀO RẠP · CHƯA CHECK-IN",
      ticket,
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
  async confirmation(
    id: string,
    userId: string,
  ): Promise<TicketConfirmationDto> {
    const row = await this.requireOwned(id, userId);
    const event = await this.tickets.emailStatus(row.bookingId, row.id);
    const log = await this.emailLogs.byTicket(row.id);
    const message = log
      ? { subject: log.subject, to: log.recipient, html: log.html }
      : ticketEmail(row, event?.id ?? row.id, this.settings.from);
    return {
      subject: message.subject,
      to: message.to,
      html: message.html.replace("cid:nova-ticket-qr", row.qrCodeBase64),
      deliveryStatus: log
        ? (log.deliveryStatus as TicketConfirmationDto["deliveryStatus"])
        : !event
          ? "UNKNOWN"
          : event.processedAt
            ? "SMTP_ACCEPTED"
            : event.lastError
              ? "RETRYING"
              : "QUEUED",
      acceptedAt: log?.acceptedAt ?? event?.processedAt ?? null,
      attempts: log?.attempts ?? event?.attempts ?? 0,
    };
  }
  verify(
    ticketHash: string,
    showtimeId: string | undefined,
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
      if (!ticket || ticket.booking.status !== "PAID") throw missing();
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
    if (ticket.demoOnly && process.env.NODE_ENV === "production")
      throw missing();
    if (ticket.isCheckedIn)
      throw new ApiException(
        409,
        "TICKET_ALREADY_USED",
        "Vé đã được sử dụng.",
        { ...this.admissionContext(ticket), checkedInAt: ticket.checkedInAt },
      );
    if (showtimeId && ticket.booking.showtimeId !== showtimeId.toLowerCase())
      throw new ApiException(
        409,
        "TICKET_SHOWTIME_MISMATCH",
        "Vé không khớp với suất chiếu đang kiểm tra.",
        {
          ...this.admissionContext(ticket),
          actualShowtimeId: ticket.booking.showtimeId,
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
      !(ticket.demoOnly && process.env.NODE_ENV !== "production") &&
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
        this.admissionContext(ticket),
      );
  }
  private admissionContext(ticket: TicketRecord) {
    // Chỉ dùng trong API STAFF/ADMIN; không đưa QR token/PII vào lỗi public.
    const details = ticketDetails(ticket);
    return {
      movie: details.movie,
      cinema: details.cinema,
      room: details.room,
      startTime: details.startTime,
      orderCode: details.orderCode,
      ticketCode: details.ticketCode,
      shortCode: details.shortCode,
      seats: details.seats,
      customerName: details.customerName,
    };
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
      qrPayload:
        row.qrPayload ||
        (row.bookingSeatId ? this.qrUrl(row.ticketHash) : row.ticketHash),
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
