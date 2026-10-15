import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(operation);
  }
  createToken(
    data: { id: string; userId: string; tokenHash: string; expiresAt: Date },
    tx: Prisma.TransactionClient,
  ) {
    return tx.refreshToken.create({ data, select: { id: true } });
  }
  async consumeToken(
    id: string,
    userId: string,
    hash: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const consumed = await tx.$queryRaw<
      { id: string }[]
    >`UPDATE refresh_tokens SET revoked_at = clock_timestamp() WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND token_hash = ${hash} AND revoked_at IS NULL AND expires_at > clock_timestamp() RETURNING id`;
    return consumed.length === 1;
  }
  findToken(
    id: string,
    userId: string,
    hash: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.refreshToken.findFirst({
      where: { id, userId, tokenHash: hash },
      select: { id: true },
    });
  }
  revokeToken(id: string, tx: Prisma.TransactionClient) {
    return tx.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
