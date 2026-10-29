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
import { FulfillmentSignal } from "../../queues/outbox/fulfillment-signal";
@Injectable()
export class FulfillmentRelay
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer: ReturnType<typeof setInterval> | undefined;
  private active: Promise<void> | undefined;
  private unsubscribe: (() => void) | undefined;
  private wakeAgain = false;
  private readonly logger = new Logger("FulfillmentRelay");
  constructor(
    private readonly database: UnitOfWork,
    private readonly events: OutboxRepository,
    private readonly tickets: TicketsService,
    private readonly queue: TicketEmailQueueService,
    private readonly signal: FulfillmentSignal,
  ) {}
  onApplicationBootstrap(): void {
    this.start();
  }
  start(): void {
    if (this.timer) return;
    this.unsubscribe = this.signal.subscribe(() => {
      this.wake();
    });
    this.timer = setInterval(() => {
      this.wake();
    }, 1000);
    this.timer.unref();
    this.wake();
  }
  private wake(): void {
    this.wakeAgain = true;
    if (this.active) return;
    void this.flush().catch(() => {
      this.logger.warn("Ticket/email delivery will retry.");
    });
  }
  flush(): Promise<void> {
    if (this.active) return this.active;
    this.wakeAgain = false;
    this.active = this.dispatch().finally(() => {
      this.active = undefined;
      // Commit đến giữa một batch phải được đọc ngay, không đợi poll1s kế tiếp.
      if (this.wakeAgain && this.timer) this.wake();
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
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.wakeAgain = false;
    await this.active?.catch(() => undefined);
  }
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }
}
