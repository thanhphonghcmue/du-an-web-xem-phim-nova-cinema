import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { OutboxModule } from "../../queues/outbox/outbox.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsRepository } from "./payments.repository";
import { PaymentSignatureService } from "./payment-signature.service";
import { ReconciliationController } from "./reconciliation.controller";
import { ReconciliationService } from "./reconciliation.service";
import { ReconciliationRepository } from "./reconciliation.repository";
@Module({
  imports: [BookingsModule, OutboxModule],
  controllers: [PaymentsController, ReconciliationController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentSignatureService,
    ReconciliationService,
    ReconciliationRepository,
  ],
})
export class PaymentsModule {}
