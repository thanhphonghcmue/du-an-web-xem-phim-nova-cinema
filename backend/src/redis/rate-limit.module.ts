import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppSettings } from "../config/app.config";
import { RedisModule } from "./redis.module";
import { RedisThrottlerStorage } from "./redis-throttler.storage";
@Module({
  imports: [RedisModule],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
class RateLimitStorageModule {}
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RateLimitStorageModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (config: ConfigService, storage: RedisThrottlerStorage) => {
        const app = config.getOrThrow<AppSettings>("app");
        return {
          storage,
          throttlers: [
            {
              name: "default",
              ttl: app.rateLimitTtlMs,
              limit: app.rateLimitMax,
              blockDuration: app.rateLimitTtlMs,
            },
          ],
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
