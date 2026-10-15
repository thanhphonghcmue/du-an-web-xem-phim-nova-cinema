import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisSettings } from "../config/redis.config";
import { redisConnection } from "../redis/redis.service";
import { InfrastructureProcessor } from "./infrastructure/infrastructure.processor";
import { InfrastructureQueueService } from "./infrastructure/infrastructure-queue.service";
import { SeatExpirationQueueService } from "./seat-expiration/seat-expiration-queue.service";
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const settings = config.getOrThrow<RedisSettings>("redis");
        return {
          connection: {
            ...redisConnection(settings),
            maxRetriesPerRequest: null,
          },
          prefix: settings.prefix,
        };
      },
    }),
    BullModule.registerQueue(
      { name: "infrastructure" },
      { name: "seat-expiration" },
    ),
  ],
  providers: [
    InfrastructureProcessor,
    InfrastructureQueueService,
    SeatExpirationQueueService,
  ],
  exports: [BullModule, InfrastructureQueueService, SeatExpirationQueueService],
})
export class QueuesModule {}
