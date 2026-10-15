import { Processor, WorkerHost } from "@nestjs/bullmq";
import { DelayedError, Job } from "bullmq";
import { isUUID } from "class-validator";
import { SeatBookingService } from "../../modules/bookings/seat-booking.service";
@Processor("seat-expiration", { concurrency: 5 })
export class SeatExpirationProcessor extends WorkerHost {
  constructor(private readonly seats: SeatBookingService) {
    super();
  }
  override async process(
    job: Job<unknown, void>,
    token?: string,
  ): Promise<void> {
    if (
      job.name !== "expire-booking-hold" ||
      !job.data ||
      typeof job.data !== "object" ||
      !("bookingId" in job.data) ||
      typeof job.data.bookingId !== "string" ||
      !isUUID(job.data.bookingId)
    )
      throw new Error("Invalid seat expiration job.");
    const until = await this.seats.autoReleaseExpiredHold(job.data.bookingId);
    if (until) {
      await job.moveToDelayed(until.getTime(), token);
      throw new DelayedError();
    }
  }
}
