import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { ReportsService } from "./reports.service";
import { RevenueQueryDto, RevenueReportDto } from "./revenue.dto";
@ApiTags("Admin reports")
@ApiBearerAuth()
@Roles("ADMIN")
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@Controller("admin/reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get("revenue")
  @ApiDataResponse(RevenueReportDto)
  @ApiOperation({
    summary:
      "ADMIN-only snapshot revenue from current PAID bookings by inclusive Vietnam creation dates",
    description:
      "One SQL statement aggregates immutable booking totals and counts SOLD seats without fan-out. Required from/to YYYY-MM-DD; optional cinema/movie filters use AND. Creation-date cohort report, not a payment-received-at ledger. No customer, payment or QR data is returned.",
  })
  revenue(@Query() query: RevenueQueryDto) {
    return this.service.revenue(query);
  }
}
