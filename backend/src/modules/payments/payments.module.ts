import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { OutboxModule } from "../../queues/outbox/outbox.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsRepository } from "./payments.repository";
import { PaymentSignatureService } from "./payment-signature.service";
@Module({
  imports: [BookingsModule, OutboxModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentSignatureService],
})
export class PaymentsModule {}
