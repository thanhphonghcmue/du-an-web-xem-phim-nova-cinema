import { Module } from "@nestjs/common";
import { QueuesModule } from "../queues/queues.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
@Module({
  imports: [QueuesModule, RealtimeModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
