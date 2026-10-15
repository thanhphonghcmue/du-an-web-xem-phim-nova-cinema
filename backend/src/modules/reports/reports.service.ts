import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { ReportsRepository } from "./reports.repository";
import { RevenueQueryDto, RevenueReportDto } from "./revenue.dto";
import { RevenueAggregate, RevenueFilters } from "./revenue-query";

export function revenueFilters(query: RevenueQueryDto): RevenueFilters {
  const fromInclusive = new Date(`${query.from}T00:00:00+07:00`);
  const toExclusive = new Date(
    new Date(`${query.to}T00:00:00+07:00`).getTime() + 86400000,
  );
  if (
    !Number.isFinite(fromInclusive.getTime()) ||
    !Number.isFinite(toExclusive.getTime()) ||
    fromInclusive >= toExclusive
  )
    throw new ApiException(
      400,
      "INVALID_REPORT_RANGE",
      "from and to must define an ordered inclusive calendar-day range.",
    );
  return {
    fromInclusive,
    toExclusive,
    ...(query.cinemaId ? { cinemaId: query.cinemaId } : {}),
    ...(query.movieId ? { movieId: query.movieId } : {}),
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportsRepository) {}

  async revenue(query: RevenueQueryDto): Promise<RevenueReportDto> {
    const row = await this.reports.revenue(revenueFilters(query));
    return serializeRevenue(row);
  }

  async overview() {
    return this.reports.overview();
  }

  async listUsers() {
    return this.reports.listUsers();
  }

  async purgeOutbox(daysOld: number) {
    return this.reports.purgeOutbox(daysOld);
  }
}

export function serializeRevenue(row: RevenueAggregate): RevenueReportDto {
  return {
    ticketRevenue: new Prisma.Decimal(row.ticketRevenue).toFixed(2),
    comboRevenue: new Prisma.Decimal(row.comboRevenue).toFixed(2),
    discountAmount: new Prisma.Decimal(row.discountAmount).toFixed(2),
    netRevenue: new Prisma.Decimal(row.netRevenue).toFixed(2),
    paidBookingCount: count(row.paidBookingCount),
    ticketCount: count(row.ticketCount),
  };
}

function count(value: string): number {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error("Report count is outside the safe JSON integer range.");
  return parsed;
}
