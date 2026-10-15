import { Module } from "@nestjs/common";
import { CinemasController } from "./cinemas.controller";
import { CinemasService } from "./cinemas.service";
import { CinemasRepository } from "./cinemas.repository";
@Module({
  controllers: [CinemasController],
  providers: [CinemasService, CinemasRepository],
  exports: [CinemasService, CinemasRepository],
})
export class CinemasModule {}
