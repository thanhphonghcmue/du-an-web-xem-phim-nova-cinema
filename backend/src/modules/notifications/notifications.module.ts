import { Module } from "@nestjs/common";
import { OutboxModule } from "../../queues/outbox/outbox.module";
import { QueuesModule } from "../../queues/queues.module";
import { TicketsModule } from "../tickets/tickets.module";
import { NotificationService } from "./notification.service";
import { SmtpMailer } from "./smtp-mailer.service";
import { TicketEmailProcessor } from "./ticket-email.processor";
import { FulfillmentRelay } from "./fulfillment-relay.service";
@Module({
  imports: [TicketsModule, QueuesModule, OutboxModule],
  providers: [
    NotificationService,
    SmtpMailer,
    TicketEmailProcessor,
    FulfillmentRelay,
  ],
  exports: [FulfillmentRelay],
})
export class NotificationsModule {}
