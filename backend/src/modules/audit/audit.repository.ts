import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditQueryDto } from "./audit.dto";
@Injectable()
export class AuditRepository {
  record(data: Prisma.AuditLogCreateInput, tx: Prisma.TransactionClient) {
    return tx.auditLog.create({ data });
  }
  page(query: AuditQueryDto, tx: Prisma.TransactionClient) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };
    return Promise.all([
      tx.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.auditLog.count({ where }),
    ]);
  }
}
