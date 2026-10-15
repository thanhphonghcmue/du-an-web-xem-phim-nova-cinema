import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { Namespace } from "socket.io";
import { RedisSettings } from "../config/redis.config";
import { redisConnection } from "../redis/redis.service";
import { withTimeout } from "../common/utils/with-timeout";
import { ApiException } from "../common/exceptions/api.exception";
import { decodeSeatEvent, publicSeatPayload, SeatEvent } from "./seat-event";
@Injectable()
export class SeatEventsBus implements OnModuleInit, OnModuleDestroy {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly channel: string;
  private namespace: Namespace | undefined;
  private initialized = false;
  private listening = false;
  private closing = false;
  private lastWarning = 0;
  private readonly logger = new Logger("SeatEvents");
  constructor(config: ConfigService) {
    const settings = config.getOrThrow<RedisSettings>("redis");
    const options = {
      ...redisConnection(settings),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      autoResubscribe: false,
      retryStrategy: (attempt: number) => Math.min(1000, attempt * 100),
    };
    this.publisher = new Redis({
      ...options,
      connectionName: `${settings.prefix}:seats-pub:${randomUUID()}`,
    });
    this.subscriber = new Redis({
      ...options,
      connectionName: `${settings.prefix}:seats-sub:${randomUUID()}`,
    });
    // Redis Pub/Sub is not scoped to logical databases.
    this.channel = `${settings.prefix}:seats:events:db-${String(settings.db)}`;
    this.publisher.on("error", () => {
      this.warn();
    });
    this.subscriber.on("error", () => {
      this.warn();
    });
    this.subscriber.on("close", () => {
      this.listening = false;
      if (!this.closing)
        this.namespace?.emit("resync_required", {
          reason: "REDIS_UNAVAILABLE",
        });
    });
    this.subscriber.on("ready", () => {
      if (this.initialized && !this.closing)
        void this.restore().catch(() => {
          this.warn();
        });
    });
    this.subscriber.on("message", (channel: string, message: string) => {
      if (channel !== this.channel || this.closing) return;
      try {
        const event = decodeSeatEvent(message);
        this.namespace?.local
          .to(`showtime:${event.showtimeId}`)
          .emit(event.type, publicSeatPayload(event));
      } catch {
        this.warn();
      }
    });
  }
  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }
  private warn(): void {
    if (Date.now() - this.lastWarning > 60000) {
      this.lastWarning = Date.now();
      this.logger.warn(
        "Seat event transport unavailable or invalid; snapshot resynchronization may be needed.",
      );
    }
  }
  private async restore(): Promise<void> {
    await withTimeout(this.subscriber.subscribe(this.channel), 2000);
    this.listening = this.subscriber.status === "ready";
    if (this.listening)
      this.namespace?.emit("resync_required", { reason: "REDIS_RECONNECTED" });
  }
  async onModuleInit(): Promise<void> {
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    await this.restore();
    this.initialized = true;
  }
  assertReady(): void {
    if (
      !this.listening ||
      this.publisher.status !== "ready" ||
      this.subscriber.status !== "ready"
    )
      throw new ApiException(
        503,
        "REALTIME_UNAVAILABLE",
        "Seat event transport is temporarily unavailable.",
      );
  }
  async ping(): Promise<void> {
    this.assertReady();
    await this.publisher.ping();
  }
  async publish(event: SeatEvent): Promise<void> {
    this.assertReady();
    const listeners = await withTimeout(
      this.publisher.publish(this.channel, JSON.stringify(event)),
      2000,
    );
    if (listeners === 0) throw new Error("Seat event subscribers unavailable.");
  }
  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    this.listening = false;
    this.namespace = undefined;
    await Promise.allSettled(
      [this.publisher, this.subscriber].map(async (client) => {
        try {
          if (client.status === "ready") await withTimeout(client.quit(), 2000);
        } finally {
          client.disconnect();
        }
      }),
    );
  }
}
