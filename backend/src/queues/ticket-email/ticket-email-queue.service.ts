import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { withTimeout } from "../../common/utils/with-timeout";
export interface TicketEmailJob {
  eventId: string;
  queuedOwner: string;
}
@Injectable()
export class TicketEmailQueueService {
  constructor(
    @InjectQueue("ticket-email")
    private readonly queue: Queue<TicketEmailJob, void>,
  ) {}
  async enqueue(
    eventId: string,
    queuedOwner: string,
    attempt: number,
  ): Promise<void> {
    // Durable retry/backoff lives in PostgreSQL outbox; each claimed attempt gets a new job ID.
    await withTimeout(
      this.queue.add(
        "send-ticket-email",
        { eventId, queuedOwner },
        {
          jobId: `ticket-email-${eventId}-${String(attempt)}`,
          attempts: 1,
          removeOnComplete: { age: 86400, count: 10000 },
          removeOnFail: { age: 604800, count: 10000 },
        },
      ),
      2000,
    );
  }
}
