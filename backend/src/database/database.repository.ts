import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
@Injectable()
export class DatabaseRepository {
  constructor(private readonly prisma: PrismaService) {}
  async ping(): Promise<void> {
    const result = await this.prisma.$queryRaw<
      { ok: number }[]
    >`SELECT 1 AS ok`;
    if (result[0]?.ok !== 1) throw new Error("PostgreSQL probe failed.");
  }
}
