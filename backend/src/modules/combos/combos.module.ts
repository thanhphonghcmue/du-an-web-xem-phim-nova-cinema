import { ComboBackupService } from "./combo-backup.service";
import { Module } from "@nestjs/common";
import { CombosController, AdminCombosController } from "./combos.controller";
import { CombosRepository } from "./combos.repository";
import { CombosService } from "./combos.service";
@Module({
  controllers: [CombosController, AdminCombosController],
  providers: [CombosRepository, CombosService, ComboBackupService],
  exports: [CombosRepository],
})
export class CombosModule {}
