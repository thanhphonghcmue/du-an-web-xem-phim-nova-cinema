import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, QueueEvents } from "bullmq";
import { RedisSettings } from "../../config/redis.config";
import { redisConnection } from "../../redis/redis.service";
@Injectable()
export class InfrastructureQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly events: QueueEvents;
  constructor(
    @InjectQueue("infrastructure")
    private readonly queue: Queue<unknown, string>,
    config: ConfigService,
  ) {
    const settings = config.getOrThrow<RedisSettings>("redis");
    this.events = new QueueEvents("infrastructure", {
      connection: { ...redisConnection(settings), maxRetriesPerRequest: null },
      prefix: settings.prefix,
    });
    this.events.on("error", () => {
      /* Request health reports queue errors without logging connection secrets. */
    });
  }
  async onModuleInit(): Promise<void> {
    await this.events.waitUntilReady();
    await this.queue.waitUntilReady();
  }
  async onModuleDestroy(): Promise<void> {
    await this.events.close();
  }
  async probe(timeoutMs: number): Promise<void> {
    const job = await this.queue.add(
      "infrastructure-probe",
      {},
      {
        removeOnComplete: { age: 60, count: 100 },
        removeOnFail: { age: 60, count: 100 },
      },
    );
    try {
      const result: unknown = await job.waitUntilFinished(
        this.events,
        timeoutMs,
      );
      if (result !== "pong")
        throw new Error("Queue probe returned an invalid result.");
    } finally {
      await job.remove().catch(() => undefined);
    }
  }
}
