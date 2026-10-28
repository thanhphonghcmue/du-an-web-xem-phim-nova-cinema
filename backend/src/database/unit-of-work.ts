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
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '1500ms'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '4500ms'`;
        return operation(tx);
      },
      { isolationLevel, maxWait: 1000, timeout: 5000 },
    );
  }
}
