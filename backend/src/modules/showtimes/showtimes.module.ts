import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ProgrammeSnapshotService } from "./programme-snapshot.service";
import { ProgrammeInvalidationInterceptor } from "./programme-invalidation.interceptor";
import { MoviesModule } from "../movies/movies.module";
import { RoomsModule } from "../rooms/rooms.module";
import { ShowtimesController } from "./showtimes.controller";
import { ShowtimesRepository } from "./showtimes.repository";
import { ShowtimesService } from "./showtimes.service";

@Module({
  imports: [MoviesModule, RoomsModule],
  controllers: [ShowtimesController],
  providers: [
    ShowtimesService,
    ShowtimesRepository,
    ProgrammeSnapshotService,
    { provide: APP_INTERCEPTOR, useClass: ProgrammeInvalidationInterceptor },
  ],
  exports: [ShowtimesService, ShowtimesRepository],
})
export class ShowtimesModule {}
