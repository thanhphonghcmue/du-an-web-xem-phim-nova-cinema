import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiException } from "../common/exceptions/api.exception";
import { AppSettings } from "../config/app.config";
import { RedisThrottlerStorage } from "../redis/redis-throttler.storage";
import { SeatEventsBus } from "./seat-events.bus";
@Injectable()
export class SeatSocketPolicy {
  readonly origins: string[];
  constructor(
    private readonly storage: RedisThrottlerStorage,
    private readonly bus: SeatEventsBus,
    config: ConfigService,
  ) {
    this.origins = config.getOrThrow<AppSettings>("app").corsOrigins;
  }
  private async limit(
    identity: string,
    action: string,
    maximum: number,
  ): Promise<void> {
    const result = await this.storage.increment(
      `${identity}:${action}`,
      60000,
      maximum,
      60000,
      "seats-ws",
    );
    if (result.isBlocked)
      throw new ApiException(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Too many seat subscription requests.",
      );
  }
  async connect(origin: string | undefined, address: string): Promise<void> {
    if (origin !== undefined && !this.origins.includes(origin))
      throw new ApiException(
        403,
        "ORIGIN_NOT_ALLOWED",
        "Origin is not allowed.",
      );
    this.bus.assertReady();
    await this.limit(address, "connect", 30);
  }
  async message(address: string): Promise<void> {
    this.bus.assertReady();
    await this.limit(address, "subscribe", 60);
  }
}
