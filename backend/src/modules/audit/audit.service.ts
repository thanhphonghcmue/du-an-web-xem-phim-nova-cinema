import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { AuditQueryDto } from "./audit.dto";
import { AuditRepository } from "./audit.repository";
@Injectable()
export class AuditService {
  constructor(
    private readonly audit: AuditRepository,
    private readonly database: UnitOfWork,
  ) {}
  record(data: Prisma.AuditLogCreateInput, tx: Prisma.TransactionClient) {
    return this.audit.record(data, tx);
  }
  list(query: AuditQueryDto) {
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.audit.page(query, tx);
      return pageOf(items, total, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
}
