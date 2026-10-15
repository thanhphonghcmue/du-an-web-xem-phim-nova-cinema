import { Injectable } from "@nestjs/common";
import { isUUID } from "class-validator";
import { randomUUID } from "node:crypto";
import { UnitOfWork } from "../../database/unit-of-work";
import { SeatExpirationQueueService } from "../seat-expiration/seat-expiration-queue.service";
import {
  EXPIRATION_CANCEL_REQUESTED,
  OutboxRepository,
} from "./outbox.repository";
@Injectable()
export class ExpiryOutboxRelay {
  constructor(
    private readonly events: OutboxRepository,
    private readonly database: UnitOfWork,
    private readonly queue: SeatExpirationQueueService,
  ) {}
  async flush(): Promise<void> {
    const owner = `relay-${randomUUID()}`;
    const batch = await this.database.transaction((tx) =>
      this.events.claim(owner, tx),
    );
    await Promise.all(
      batch.map(async (event) => {
        try {
          const payload = event.payload;
          if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload) ||
            typeof payload.bookingId !== "string" ||
            !isUUID(payload.bookingId) ||
            typeof payload.expiredAt !== "string"
          )
            throw new Error("Invalid expiration event.");
          const expiredAt = new Date(payload.expiredAt);
          if (!Number.isFinite(expiredAt.getTime()))
            throw new Error("Invalid expiration deadline.");
          if (event.eventType === EXPIRATION_CANCEL_REQUESTED)
            await this.queue.cancel(payload.bookingId);
          else if (
            await this.database.transaction((tx) =>
              this.events.needsExpiration(payload.bookingId as string, tx),
            )
          )
            await this.queue.schedule(payload.bookingId, expiredAt);
          await this.database.transaction((tx) =>
            this.events.acknowledge(event.id, owner, tx),
          );
        } catch {
          await this.database.transaction((tx) =>
            this.events.retry(event.id, owner, event.attempts, tx),
          );
        }
      }),
    );
  }
}
