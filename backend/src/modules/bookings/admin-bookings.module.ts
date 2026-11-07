import { Module } from "@nestjs/common";
import { AdminBookingsController } from "./admin-bookings.controller";
import { AdminBookingsRepository } from "./admin-bookings.repository";
import { AdminBookingsService } from "./admin-bookings.service";
@Module({
  controllers: [AdminBookingsController],
  providers: [AdminBookingsRepository, AdminBookingsService],
})
export class AdminBookingsModule {}
