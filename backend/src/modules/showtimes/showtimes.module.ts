import { Module } from "@nestjs/common";
import { MoviesModule } from "../movies/movies.module";
import { RoomsModule } from "../rooms/rooms.module";
import { ShowtimesController } from "./showtimes.controller";
import { ShowtimesRepository } from "./showtimes.repository";
import { ShowtimesService } from "./showtimes.service";

@Module({
  imports: [MoviesModule, RoomsModule],
  controllers: [ShowtimesController],
  providers: [ShowtimesService, ShowtimesRepository],
  exports: [ShowtimesService, ShowtimesRepository],
})
export class ShowtimesModule {}
