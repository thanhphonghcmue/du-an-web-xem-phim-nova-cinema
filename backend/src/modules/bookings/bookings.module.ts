import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { CombosModule } from "../combos/combos.module";
import { QueuesModule } from "../../queues/queues.module";
import { OutboxModule } from "../../queues/outbox/outbox.module";
import { SeatExpirationProcessor } from "../../queues/seat-expiration/seat-expiration.processor";
import { BookingsController } from "./bookings.controller";
import { BookingsRepository } from "./bookings.repository";
import { BookingsService } from "./bookings.service";
import { SeatBookingService } from "./seat-booking.service";
import { SeatLockService } from "./seat-lock.service";
import { PricingService } from "./pricing.service";
import { BookingMaintenanceService } from "./booking-maintenance.service";
@Module({
  imports: [UsersModule, CombosModule, QueuesModule, OutboxModule],
  controllers: [BookingsController],
  providers: [
    BookingsRepository,
    BookingsService,
    SeatBookingService,
    SeatLockService,
    PricingService,
    SeatExpirationProcessor,
    BookingMaintenanceService,
  ],
  exports: [SeatBookingService, BookingsRepository, PricingService],
})
export class BookingsModule {}
