import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isUUID } from "class-validator";
import { randomUUID } from "node:crypto";
import { UnitOfWork } from "../../database/unit-of-work";
import { NotificationSettings } from "../../config/notification.settings";
import { OutboxRepository } from "../../queues/outbox/outbox.repository";
import { TicketsRepository } from "../tickets/tickets.repository";
import { SmtpMailer } from "./smtp-mailer.service";
import { ticketEmail } from "./ticket-email";
@Injectable()
export class NotificationService {
  private readonly settings: NotificationSettings;
  private readonly logger = new Logger("TicketEmail");
  constructor(
    config: ConfigService,
    private readonly database: UnitOfWork,
    private readonly events: OutboxRepository,
    private readonly tickets: TicketsRepository,
    private readonly mailer: SmtpMailer,
  ) {
    this.settings = config.getOrThrow<NotificationSettings>("notification");
  }
  async deliver(eventId: string, queuedOwner: string): Promise<void> {
    const owner = `smtp-${randomUUID()}`;
    const event = await this.database.transaction((tx) =>
      this.events.takeEmail(eventId, queuedOwner, owner, tx),
    );
    if (!event) return;
    try {
      const payload = event.payload;
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        typeof payload.ticketId !== "string" ||
        !isUUID(payload.ticketId) ||
        payload.bookingId !== event.aggregateId
      )
        throw new Error("Invalid email payload.");
      const ticket = await this.tickets.find(payload.ticketId);
      if (
        !ticket ||
        ticket.bookingId !== event.aggregateId ||
        ticket.booking.status !== "PAID" ||
        !ticket.booking.seats.length ||
        ticket.booking.seats.some((seat) => seat.status !== "SOLD")
      )
        throw new Error("Ticket is not eligible for email delivery.");
      await this.mailer.send(ticketEmail(ticket, event.id, this.settings.from));
      const ack = await this.database.transaction((tx) =>
        this.events.acknowledge(event.id, owner, tx),
      );
      if (ack.count !== 1)
        throw new Error("Email acknowledgement lease was lost.");
    } catch {
      await this.database.transaction((tx) =>
        this.events.retry(
          event.id,
          owner,
          event.attempts,
          tx,
          "EMAIL_DELIVERY_FAILED",
        ),
      );
      this.logger.warn(
        "Ticket email delivery deferred; payment remains committed.",
      );
      throw new Error("EMAIL_DELIVERY_FAILED");
    }
  }
}
