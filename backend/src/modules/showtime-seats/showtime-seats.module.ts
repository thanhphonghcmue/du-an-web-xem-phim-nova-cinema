import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { ShowtimeSeatsController } from "./showtime-seats.controller";
import { ShowtimeSeatsRepository } from "./showtime-seats.repository";
import { ShowtimeSeatsService } from "./showtime-seats.service";
@Module({
  imports: [BookingsModule],
  controllers: [ShowtimeSeatsController],
  providers: [ShowtimeSeatsRepository, ShowtimeSeatsService],
  exports: [ShowtimeSeatsService],
})
export class ShowtimeSeatsModule {}
