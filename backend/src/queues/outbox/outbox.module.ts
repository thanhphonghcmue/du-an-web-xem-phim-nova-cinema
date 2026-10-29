import { Module } from "@nestjs/common";
import { QueuesModule } from "../queues.module";
import { OutboxRepository } from "./outbox.repository";
import { ExpiryOutboxRelay } from "./expiry-outbox-relay.service";
import { FulfillmentSignal } from "./fulfillment-signal";
@Module({
  imports: [QueuesModule],
  providers: [OutboxRepository, ExpiryOutboxRelay, FulfillmentSignal],
  exports: [OutboxRepository, ExpiryOutboxRelay, FulfillmentSignal],
})
export class OutboxModule {}
