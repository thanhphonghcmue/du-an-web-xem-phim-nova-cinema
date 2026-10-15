import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { OutboxModule } from "../../queues/outbox/outbox.module";
import { TicketsController } from "./tickets.controller";
import { StaffController } from "./staff.controller";
import { TicketsService } from "./tickets.service";
import { TicketsRepository } from "./tickets.repository";
@Module({
  imports: [BookingsModule, OutboxModule],
  controllers: [TicketsController, StaffController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService, TicketsRepository],
})
export class TicketsModule {}
