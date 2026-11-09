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
    ...(settings.username ? { username: settings.username } : {}),
    ...(settings.password ? { password: settings.password } : {}),
    ...(settings.tls ? { tls: { rejectUnauthorized: false } } : {}),
    connectTimeout: 10000,
  };
}
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger("Redis");
  private lastWarning = 0;
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();
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
          "Redis connection unavailable; operating with in-memory resilience.",
        );
      }
    });
  }
  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.ping();
    } catch {
      this.logger.warn(
        "Redis initial connection failed; operating with in-memory resilience.",
      );
    }
  }
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === "ready") await this.client.quit();
    else this.client.disconnect();
  }
  async ping(): Promise<void> {
    try {
      await this.client.ping();
    } catch {
      // Degraded Redis does not fail the process
    }
  }
  async evaluate(
    script: string,
    keys: string[],
    args: string[],
  ): Promise<unknown> {
    try {
      return await this.client.eval(script, keys.length, ...keys, ...args);
    } catch {
      return this.evaluateInMemory(script, keys, args);
    }
  }

  private evaluateInMemory(
    script: string,
    keys: string[],
    args: string[],
  ): unknown {
    const now = Date.now();
    const firstKey = keys[0] ?? "";
    const firstArg = args[0] ?? "";

    // 1. Single GET (READ)
    if (
      script.includes('redis.call("GET", KEYS[1])') ||
      script.includes("redis.call('GET', KEYS[1])")
    ) {
      if (!firstKey) return null;
      const item = this.memoryStore.get(firstKey);
      if (item && item.expiresAt > now) return item.value;
      if (item) this.memoryStore.delete(firstKey);
      return null;
    }
    // 2. Chunks read in programme
    if (script.includes("redis.call('GET', KEYS[2])")) {
      const getVal = (k?: string) => {
        if (!k) return "";
        const item = this.memoryStore.get(k);
        return item && item.expiresAt > now ? item.value : "";
      };
      return [getVal(keys[0]), getVal(keys[1])];
    }
    // 3. PUBLISH (programme snapshot)
    if (script.includes("redis.call('SET', KEYS[3], ARGV[4]")) {
      const reuseSec = Number(args[1]) || 30;
      const retentionSec = Number(args[2]) || 120;
      const manifest = args[3] ?? "{}";
      const source = args[4] ?? "{}";
      if (keys[2])
        this.memoryStore.set(keys[2], {
          value: manifest,
          expiresAt: now + retentionSec * 1000,
        });
      if (keys[3])
        this.memoryStore.set(keys[3], {
          value: source,
          expiresAt: now + retentionSec * 1000,
        });
      for (let i = 4; i < keys.length; i++) {
        const pageArg = args[i + 1];
        const pageKey = keys[i];
        if (pageKey && pageArg) {
          this.memoryStore.set(pageKey, {
            value: pageArg,
            expiresAt: now + retentionSec * 1000,
          });
        }
      }
      if (firstKey) {
        this.memoryStore.set(firstKey, {
          value: manifest,
          expiresAt: now + reuseSec * 1000,
        });
      }
      return 1;
    }
    // 4. ACQUIRE (seat lock)
    if (script.includes("conflicts")) {
      const conflicts: number[] = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key) {
          const item = this.memoryStore.get(key);
          if (item && item.expiresAt > now) {
            conflicts.push(i + 1);
          }
        }
      }
      if (conflicts.length > 0) return conflicts;
      const ttl = Number(args[1]) || 10000;
      for (const key of keys) {
        if (key) {
          this.memoryStore.set(key, { value: firstArg, expiresAt: now + ttl });
        }
      }
      return 1;
    }
    // 5. RELEASE (seat unlock)
    if (script.includes("DEL")) {
      for (const key of keys) {
        if (key) {
          const item = this.memoryStore.get(key);
          if (item && item.value === firstArg) {
            this.memoryStore.delete(key);
          }
        }
      }
      return 1;
    }
    // 6. INCR
    if (script.includes("INCR")) {
      if (!firstKey) return 1;
      const item = this.memoryStore.get(firstKey);
      const current =
        (item && item.expiresAt > now ? Number(item.value) || 0 : 0) + 1;
      this.memoryStore.set(firstKey, {
        value: String(current),
        expiresAt: Infinity,
      });
      return current;
    }
    return 1;
  }
}
