import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { RedisSettings } from "../../config/redis.config";
import { RedisService } from "../../redis/redis.service";
import { ApiException } from "../../common/exceptions/api.exception";
import { withTimeout } from "../../common/utils/with-timeout";

const ACQUIRE = `
local conflicts = {}
for index, key in ipairs(KEYS) do
  if redis.call('EXISTS', key) == 1 then table.insert(conflicts, index) end
end
if #conflicts > 0 then return conflicts end
for _, key in ipairs(KEYS) do redis.call('SET', key, ARGV[1], 'PX', ARGV[2], 'NX') end
return 1`;
const RELEASE = `
for _, key in ipairs(KEYS) do
  if redis.call('GET', key) == ARGV[1] then redis.call('DEL', key) end
end
return 1`;
export interface SeatLockLease {
  keys: string[];
  owner: string;
}
@Injectable()
export class SeatLockService {
  private readonly prefix: string;
  private readonly logger = new Logger("SeatLock");
  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.prefix = config.getOrThrow<RedisSettings>("redis").prefix;
  }
  async acquire(showtimeId: string, seatIds: string[]): Promise<SeatLockLease> {
    const ordered = [...seatIds].sort();
    const lease = {
      owner: randomUUID(),
      keys: ordered.map(
        (id) => `${this.prefix}:seat-lock:{${showtimeId}}:${id}`,
      ),
    };
    try {
      const result = await withTimeout(
        this.redis.evaluate(ACQUIRE, lease.keys, [lease.owner, "10000"]),
        2000,
      );
      if (result !== 1)
        throw new ApiException(
          409,
          "SEAT_UNAVAILABLE",
          "Một hoặc nhiều ghế đang được giữ. Vui lòng chọn lại.",
          {
            seatIds: Array.isArray(result)
              ? result
                  .filter(
                    (i: unknown): i is number =>
                      Number.isInteger(i) &&
                      Number(i) > 0 &&
                      Number(i) <= ordered.length,
                  )
                  .map((i: number) => ordered[i - 1])
              : [],
          },
        );
      return lease;
    } catch (error) {
      await this.release(lease);
      if (error instanceof ApiException) throw error;
      throw new ApiException(
        503,
        "SEAT_LOCK_UNAVAILABLE",
        "Seat locking is temporarily unavailable.",
      );
    }
  }
  async release(lease: SeatLockLease): Promise<void> {
    try {
      await withTimeout(
        this.redis.evaluate(RELEASE, lease.keys, [lease.owner]),
        1000,
      );
    } catch {
      this.logger.warn("Seat mutex cleanup deferred to its short TTL.");
    }
  }
}
