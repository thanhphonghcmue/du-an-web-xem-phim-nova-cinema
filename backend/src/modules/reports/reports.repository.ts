import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  RevenueAggregate,
  RevenueFilters,
  revenueQuery,
} from "./revenue-query";
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async revenue(filters: RevenueFilters): Promise<RevenueAggregate> {
    const rows = await this.prisma.$queryRaw<RevenueAggregate[]>(
      revenueQuery(filters),
    );
    const row = rows[0];
    if (!row)
      throw new Error("Revenue aggregate did not return its totals row.");
    return row;
  }
}
