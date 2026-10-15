import { Module } from "@nestjs/common";
import { RateLimitModule } from "../redis/rate-limit.module";
import { OutboxModule } from "../queues/outbox/outbox.module";
import { ShowtimeSeatsModule } from "../modules/showtime-seats/showtime-seats.module";
import { SeatEventsBus } from "./seat-events.bus";
import { SeatEventsRelay } from "./seat-events-relay.service";
import { SeatSocketPolicy } from "./seat-socket-policy.service";
import { SeatSubscriptionsService } from "./seat-subscriptions.service";
import { SeatsGateway } from "./seats.gateway";
@Module({
  imports: [RateLimitModule, OutboxModule, ShowtimeSeatsModule],
  providers: [
    SeatEventsBus,
    SeatEventsRelay,
    SeatSocketPolicy,
    SeatSubscriptionsService,
    SeatsGateway,
  ],
  exports: [SeatEventsBus, SeatSocketPolicy],
})
export class RealtimeModule {}
