import { Module } from "@nestjs/common";
import { CombosController } from "./combos.controller";
import { CombosRepository } from "./combos.repository";
import { CombosService } from "./combos.service";
@Module({
  controllers: [CombosController],
  providers: [CombosRepository, CombosService],
  exports: [CombosRepository],
})
export class CombosModule {}
