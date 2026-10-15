import { Module } from "@nestjs/common";
import { SeatsController } from "./seats.controller";
import { SeatsService } from "./seats.service";
import { SeatsRepository } from "./seats.repository";
import { RoomsModule } from "../rooms/rooms.module";
@Module({
  imports: [RoomsModule],
  controllers: [SeatsController],
  providers: [SeatsService, SeatsRepository],
  exports: [SeatsService, SeatsRepository],
})
export class SeatsModule {}
