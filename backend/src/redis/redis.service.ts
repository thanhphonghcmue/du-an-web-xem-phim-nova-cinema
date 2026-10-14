import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { RedisOptions } from "ioredis";
import { RedisSettings } from "../config/redis.config";
export function redisConnection(settings: RedisSettings): RedisOptions {
  return {
    host: settings.host,
    port: settings.port,
    db: settings.db,
    ...(settings.password ? { password: settings.password } : {}),
    ...(settings.tls ? { tls: {} } : {}),
    connectTimeout: 2000,
  };
}
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger("Redis");
  private lastWarning = 0;
  constructor(config: ConfigService) {
    this.client = new Redis({
      ...redisConnection(config.getOrThrow<RedisSettings>("redis")),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 100, 1000),
    });
    this.client.on("error", () => {
      if (Date.now() - this.lastWarning > 60000) {
        this.lastWarning = Date.now();
        this.logger.warn(
          "Redis connection unavailable; health checks will report failure.",
        );
      }
    });
  }
  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.ping();
    } catch {
      this.client.disconnect();
      throw new Error("Redis connection failed.");
    }
  }
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === "ready") await this.client.quit();
    else this.client.disconnect();
  }
  async ping(): Promise<void> {
    await this.client.ping();
  }
  async evaluate(
    script: string,
    keys: string[],
    args: string[],
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }
}
