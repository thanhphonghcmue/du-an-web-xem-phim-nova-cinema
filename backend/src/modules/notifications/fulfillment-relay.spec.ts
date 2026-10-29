import { Prisma } from "@prisma/client";
import { UnitOfWork } from "../../database/unit-of-work";
import { FulfillmentSignal } from "../../queues/outbox/fulfillment-signal";
import {
  FulfillmentEvent,
  OutboxRepository,
} from "../../queues/outbox/outbox.repository";
import { TicketEmailQueueService } from "../../queues/ticket-email/ticket-email-queue.service";
import { TicketsService } from "../tickets/tickets.service";
import { FulfillmentRelay } from "./fulfillment-relay.service";

describe("fulfillment wake-up lifecycle", () => {
  it("does not lose a commit arriving while a prior batch is active, and stop unsubscribes", async () => {
    let release!: (rows: FulfillmentEvent[]) => void;
    const gate = new Promise<FulfillmentEvent[]>((resolve) => {
      release = resolve;
    });
    const events = {
      claimFulfillment: jest
        .fn<Promise<FulfillmentEvent[]>, unknown[]>()
        .mockImplementationOnce(() => gate)
        .mockResolvedValue([]),
    };
    const database = {
      transaction: (
        operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
      ) => operation({} as Prisma.TransactionClient),
    };
    const signal = new FulfillmentSignal();
    const relay = new FulfillmentRelay(
      database as unknown as UnitOfWork,
      events as unknown as OutboxRepository,
      {} as TicketsService,
      {} as TicketEmailQueueService,
      signal,
    );
    relay.start();
    try {
      expect(events.claimFulfillment).toHaveBeenCalledTimes(1);
      signal.notify();
      await Promise.resolve();
      release([]);
      await relay.flush();
      await relay.flush();
      expect(events.claimFulfillment).toHaveBeenCalledTimes(4);
    } finally {
      release([]);
      await relay.stop();
    }
    const count = events.claimFulfillment.mock.calls.length;
    signal.notify();
    await Promise.resolve();
    expect(events.claimFulfillment).toHaveBeenCalledTimes(count);
  });
});
