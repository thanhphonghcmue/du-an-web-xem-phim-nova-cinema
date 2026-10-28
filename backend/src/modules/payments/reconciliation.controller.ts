import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  Header,
  HttpCode,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { ReconciliationQueryDto } from "./reconciliation.dto";
import { ReconciliationService } from "./reconciliation.service";
@ApiTags("Admin payment reconciliation")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/payments")
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}
  @Get("reconciliation")
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Exact order/transaction lookup; excludes signatures, QR capabilities and payment payloads.",
  })
  lookup(@Query() query: ReconciliationQueryDto) {
    return this.service.lookup(query.reference);
  }
  @Post(":bookingId/recover-ticket")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Requeue durable ticket issuance for confirmed PAID/SUCCESS/SOLD only; never marks an unpaid order PAID.",
  })
  recover(@Param("bookingId", ParseUUIDPipe) id: string) {
    return this.service.recoverTicket(id);
  }
}
