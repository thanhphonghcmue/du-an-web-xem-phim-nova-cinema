import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UnitOfWork } from "../database/unit-of-work";
import { OutboxRepository } from "../queues/outbox/outbox.repository";
import { seatEvent } from "./seat-event";
import { SeatEventsBus } from "./seat-events.bus";
@Injectable()
export class SeatEventsRelay
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer: ReturnType<typeof setInterval> | undefined;
  private active: Promise<void> | undefined;
  private readonly logger = new Logger("SeatEventRelay");
  constructor(
    private readonly events: OutboxRepository,
    private readonly database: UnitOfWork,
    private readonly bus: SeatEventsBus,
  ) {}
  onApplicationBootstrap(): void {
    this.start();
  }
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush().catch(() => {
        this.logger.warn("Seat event relay will retry.");
      });
    }, 1000);
    this.timer.unref();
    void this.flush().catch(() => {
      this.logger.warn("Initial seat event delivery deferred.");
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
    const owner = `seats-${randomUUID()}`;
    const batch = await this.database.transaction((tx) =>
      this.events.claimSeatEvents(owner, tx),
    );
    const outcomes = await Promise.allSettled(
      batch.map(async (event) => {
        try {
          await this.bus.publish(
            seatEvent(
              event.eventType,
              event.payload,
              event.id,
              event.createdAt.toISOString(),
            ),
          );
          await this.database.transaction((tx) =>
            this.events.acknowledge(event.id, owner, tx),
          );
        } catch {
          await this.database.transaction((tx) =>
            this.events.retry(
              event.id,
              owner,
              event.attempts,
              tx,
              "SEAT_BROADCAST_UNAVAILABLE",
            ),
          );
        }
      }),
    );
    if (outcomes.some((outcome) => outcome.status === "rejected"))
      throw new Error("Seat outbox retry unavailable.");
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
