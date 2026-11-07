import { Module } from "@nestjs/common";
import { EmailLogsRepository } from "./email-logs.repository";
import { EmailLogsService } from "./email-logs.service";
import { EmailLogsController } from "./email-logs.controller";
@Module({
  providers: [EmailLogsRepository, EmailLogsService],
  controllers: [EmailLogsController],
  exports: [EmailLogsRepository],
})
export class EmailLogsModule {}
