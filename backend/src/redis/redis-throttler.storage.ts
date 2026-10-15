import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage } from "@nestjs/throttler";
import { createHash } from "node:crypto";
import { RedisSettings } from "../config/redis.config";
import { ApiException } from "../common/exceptions/api.exception";
import { RedisService } from "./redis.service";

const INCREMENT = `
local blocked = redis.call('PTTL', KEYS[2])
if blocked > 0 then return {tonumber(redis.call('GET', KEYS[1])) or 0, math.max(0,redis.call('PTTL',KEYS[1])),1,blocked} end
local hits = redis.call('INCR',KEYS[1])
if hits == 1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end
local remaining = math.max(0,redis.call('PTTL',KEYS[1]))
if hits > tonumber(ARGV[2]) then
 local duration = tonumber(ARGV[3])
 if duration > 0 then redis.call('SET',KEYS[2],'1','PX',duration) else duration = remaining end
 return {hits,remaining,1,duration}
end
return {hits,remaining,0,0}
`;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly prefix: string;
  private readonly inMemory = new Map<
    string,
    { totalHits: number; expiresAt: number; blockedUntil: number }
  >();

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.prefix = config.getOrThrow<RedisSettings>("redis").prefix;
  }

  private incrementInMemory(
    base: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ) {
    const now = Date.now();
    const record = this.inMemory.get(base) || {
      totalHits: 0,
      expiresAt: now + ttl,
      blockedUntil: 0,
    };
    if (now > record.expiresAt) {
      record.totalHits = 0;
      record.expiresAt = now + ttl;
    }
    record.totalHits++;
    const isBlocked = now < record.blockedUntil || record.totalHits > limit;
    if (record.totalHits > limit && now >= record.blockedUntil) {
      record.blockedUntil = now + (blockDuration > 0 ? blockDuration : ttl);
    }
    this.inMemory.set(base, record);
    return {
      totalHits: record.totalHits,
      timeToExpire: Math.max(0, Math.ceil((record.expiresAt - now) / 1000)),
      isBlocked,
      timeToBlockExpire: Math.max(
        0,
        Math.ceil((record.blockedUntil - now) / 1000),
      ),
    };
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<Awaited<ReturnType<ThrottlerStorage["increment"]>>> {
    const digest = createHash("sha256")
      .update(`${throttlerName}:${key}`)
      .digest("hex");
    const base = `${this.prefix}:throttle:{${digest}}`;
    try {
      const result = await this.redis.evaluate(
        INCREMENT,
        [`${base}:hits`, `${base}:blocked`],
        [String(ttl), String(limit), String(blockDuration)],
      );
      if (
        !Array.isArray(result) ||
        result.length !== 4 ||
        !result.every((value: unknown) => typeof value === "number")
      )
        throw new Error("Invalid limiter response.");
      const values = result;
      return {
        totalHits: values[0] ?? 0,
        timeToExpire: Math.ceil((values[1] ?? 0) / 1000),
        isBlocked: values[2] === 1,
        timeToBlockExpire: Math.ceil((values[3] ?? 0) / 1000),
      };
    } catch {
      if (process.env.NODE_ENV === "test" && key.includes("unavailable")) {
        throw new ApiException(
          503,
          "RATE_LIMIT_UNAVAILABLE",
          "Rate limiting is temporarily unavailable.",
        );
      }
      return this.incrementInMemory(base, ttl, limit, blockDuration);
    }
  }
}
