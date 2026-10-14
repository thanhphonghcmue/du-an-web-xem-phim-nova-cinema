import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppSettings } from "../config/app.config";
import { DatabaseRepository } from "../database/database.repository";
import { RedisService } from "../redis/redis.service";
import { InfrastructureQueueService } from "../queues/infrastructure/infrastructure-queue.service";
import { ApiException } from "../common/exceptions/api.exception";
import { withTimeout } from "../common/utils/with-timeout";
import { DependencyStatusDto, HealthDto } from "./health.dto";
@Injectable()
export class HealthService {
  private readonly timeoutMs: number;
  constructor(
    private readonly database: DatabaseRepository,
    private readonly redis: RedisService,
    private readonly queue: InfrastructureQueueService,
    config: ConfigService,
  ) {
    this.timeoutMs = config.getOrThrow<AppSettings>("app").healthTimeoutMs;
  }
  private async status(
    operation: () => Promise<void>,
  ): Promise<DependencyStatusDto> {
    try {
      await withTimeout(operation(), this.timeoutMs);
      return { status: "up" };
    } catch {
      return { status: "down" };
    }
  }
  async readiness(): Promise<HealthDto> {
    const [postgres, redis, queue] = await Promise.all([
      this.status(() => this.database.ping()),
      this.status(() => this.redis.ping()),
      this.status(() => this.queue.probe(this.timeoutMs)),
    ]);
    const ready = [postgres, redis, queue].every(
      (check) => check.status === "up",
    );
    const result: HealthDto = {
      status: ready ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: { postgres, redis, queue },
    };
    if (!ready)
      throw new ApiException(
        503,
        "HEALTH_UNAVAILABLE",
        "One or more infrastructure services are unavailable.",
        result,
      );
    return result;
  }
  liveness(): { status: string; timestamp: string } {
    return { status: "alive", timestamp: new Date().toISOString() };
  }
}
