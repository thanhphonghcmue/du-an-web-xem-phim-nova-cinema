import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { isUUID } from "class-validator";
import { NotificationService } from "./notification.service";
@Processor("ticket-email", { concurrency: 3 })
export class TicketEmailProcessor extends WorkerHost {
  constructor(private readonly notifications: NotificationService) {
    super();
  }
  override async process(job: Job<unknown, void>): Promise<void> {
    const data = job.data;
    if (
      job.name !== "send-ticket-email" ||
      !data ||
      typeof data !== "object" ||
      !("eventId" in data) ||
      typeof data.eventId !== "string" ||
      !isUUID(data.eventId) ||
      !("queuedOwner" in data) ||
      typeof data.queuedOwner !== "string" ||
      !/^fulfill-[a-f0-9-]{36}$/.test(data.queuedOwner)
    )
      throw new Error("Invalid ticket email job.");
    await this.notifications.deliver(data.eventId, data.queuedOwner);
  }
}
