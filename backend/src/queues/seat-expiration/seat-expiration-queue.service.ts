import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { withTimeout } from "../../common/utils/with-timeout";
export interface ExpirationPayload {
  bookingId: string;
}
@Injectable()
export class SeatExpirationQueueService {
  constructor(
    @InjectQueue("seat-expiration")
    private readonly queue: Queue<ExpirationPayload, void>,
  ) {}
  async cancel(bookingId: string): Promise<void> {
    // BullMQ returns0 for an active/locked job. Its worker rechecks the DB and is harmless.
    await withTimeout(this.queue.remove(`booking-expire-${bookingId}`), 2000);
  }
  async schedule(bookingId: string, expiredAt: Date): Promise<void> {
    await withTimeout(
      this.queue.add(
        "expire-booking-hold",
        { bookingId },
        {
          jobId: `booking-expire-${bookingId}`,
          delay: Math.max(0, expiredAt.getTime() - Date.now()),
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { age: 86400, count: 10000 },
          removeOnFail: { age: 604800, count: 10000 },
        },
      ),
      2000,
    );
  }
}
