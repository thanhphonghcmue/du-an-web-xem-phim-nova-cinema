import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
@Processor("infrastructure", { concurrency: 2 })
export class InfrastructureProcessor extends WorkerHost {
  override process(job: Job<unknown, string>): Promise<string> {
    if (job.name !== "infrastructure-probe")
      return Promise.reject(new Error("Unsupported infrastructure job."));
    return Promise.resolve("pong");
  }
}
