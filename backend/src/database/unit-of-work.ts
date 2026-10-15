import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = Prisma
      .TransactionIsolationLevel.ReadCommitted,
  ): Promise<T> {
    return this.prisma.$transaction(operation, { isolationLevel });
  }
}
