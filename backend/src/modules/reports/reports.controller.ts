import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { ReportsService } from "./reports.service";
import { RevenueQueryDto, RevenueReportDto } from "./revenue.dto";

export class PurgeOutboxDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  daysOld?: number;
}

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
      "One SQL statement aggregates immutable booking totals and counts SOLD seats without fan-out. Required from/to YYYY-MM-DD; optional cinema/movie filters use AND.",
  })
  revenue(@Query() query: RevenueQueryDto) {
    return this.service.revenue(query);
  }

  @Get("overview")
  @ApiOperation({
    summary: "ADMIN-only overview metrics for dashboard",
    description: "Returns counts of movies, cinemas, rooms, showtimes, users, bookings and recent bookings.",
  })
  overview() {
    return this.service.overview();
  }

  @Get("users")
  @ApiOperation({
    summary: "ADMIN-only user management list",
    description: "Returns list of registered users with roles, tiers, points and creation dates.",
  })
  listUsers() {
    return this.service.listUsers();
  }

  @Post("purge-outbox")
  @ApiOperation({
    summary: "ADMIN-only purge processed outbox events to prevent table bloat",
    description: "Deletes processed outbox events older than the specified days (default 1 day).",
  })
  purgeOutbox(@Body() body: PurgeOutboxDto) {
    return this.service.purgeOutbox(body.daysOld ?? 1);
  }
}
