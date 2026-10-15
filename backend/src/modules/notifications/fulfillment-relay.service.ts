import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { randomUUID } from "node:crypto";
import { UnitOfWork } from "../../database/unit-of-work";
import {
  EMAIL_REQUESTED,
  TICKET_REQUESTED,
  OutboxRepository,
} from "../../queues/outbox/outbox.repository";
import { TicketEmailQueueService } from "../../queues/ticket-email/ticket-email-queue.service";
import { TicketsService } from "../tickets/tickets.service";
@Injectable()
export class FulfillmentRelay
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer: ReturnType<typeof setInterval> | undefined;
  private active: Promise<void> | undefined;
  private readonly logger = new Logger("FulfillmentRelay");
  constructor(
    private readonly database: UnitOfWork,
    private readonly events: OutboxRepository,
    private readonly tickets: TicketsService,
    private readonly queue: TicketEmailQueueService,
  ) {}
  onApplicationBootstrap(): void {
    this.start();
  }
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush().catch(() => {
        this.logger.warn("Ticket/email delivery will retry.");
      });
    }, 1000);
    this.timer.unref();
    void this.flush().catch(() => {
      this.logger.warn("Initial ticket/email recovery deferred.");
    });
  }
  flush(): Promise<void> {
    if (this.active) return this.active;
    this.active = this.dispatch().finally(() => {
      this.active = undefined;
    });
    return this.active;
  }
  private async dispatch(): Promise<void> {
    for (const type of [TICKET_REQUESTED, EMAIL_REQUESTED] as const) {
      const owner = `fulfill-${randomUUID()}`;
      const batch = await this.database.transaction((tx) =>
        this.events.claimFulfillment(owner, type, tx),
      );
      const outcomes = await Promise.allSettled(
        batch.map(async (event) => {
          try {
            const payload = event.payload;
            if (
              !payload ||
              typeof payload !== "object" ||
              Array.isArray(payload) ||
              typeof payload.bookingId !== "string" ||
              !isUUID(payload.bookingId) ||
              payload.bookingId !== event.aggregateId
            )
              throw new Error("Invalid fulfillment event.");
            if (type === TICKET_REQUESTED) {
              await this.tickets.generateETicket(payload.bookingId);
              await this.database.transaction((tx) =>
                this.events.acknowledge(event.id, owner, tx),
              );
            } else {
              if (
                typeof payload.ticketId !== "string" ||
                !isUUID(payload.ticketId)
              )
                throw new Error("Invalid ticket email event.");
              await this.queue.enqueue(event.id, owner, event.attempts);
              // Worker, not queue acceptance, acknowledges SMTP delivery in the outbox.
            }
          } catch {
            await this.database.transaction((tx) =>
              this.events.retry(
                event.id,
                owner,
                event.attempts,
                tx,
                type === TICKET_REQUESTED
                  ? "TICKET_ISSUANCE_FAILED"
                  : "EMAIL_QUEUE_UNAVAILABLE",
              ),
            );
            this.logger.warn(
              type === TICKET_REQUESTED
                ? "Ticket issuance deferred."
                : "Email enqueue deferred.",
            );
          }
        }),
      );
      if (outcomes.some((outcome) => outcome.status === "rejected"))
        throw new Error("Fulfillment retry state unavailable.");
    }
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.active?.catch(() => undefined);
  }
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }
}
