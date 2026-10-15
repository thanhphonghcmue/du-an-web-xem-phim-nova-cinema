import { Module } from "@nestjs/common";
import { QueuesModule } from "../queues.module";
import { OutboxRepository } from "./outbox.repository";
import { ExpiryOutboxRelay } from "./expiry-outbox-relay.service";
@Module({
  imports: [QueuesModule],
  providers: [OutboxRepository, ExpiryOutboxRelay],
  exports: [OutboxRepository, ExpiryOutboxRelay],
})
export class OutboxModule {}
