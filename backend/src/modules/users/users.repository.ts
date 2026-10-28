import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
export const profileSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  cMemberPoints: true,
  cMemberTier: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
  findProfile(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.user.findUnique({ where: { id }, select: profileSelect });
  }
  findCredentials(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...profileSelect, passwordHash: true, status: true },
    });
  }
  findAccount(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.user.findUnique({
      where: { id },
      select: { ...profileSelect, status: true },
    });
  }
  async lockAccount(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
  }
  setStatus(
    id: string,
    status: "ACTIVE" | "LOCKED" | "INACTIVE",
    tx: Prisma.TransactionClient,
  ) {
    return tx.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }
  revokeSessions(userId: string, tx: Prisma.TransactionClient) {
    return tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  create(
    data: {
      email: string;
      passwordHash: string;
      fullName: string;
      phone?: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.user.create({
      data: {
        ...data,
        role: "CUSTOMER",
        cMemberPoints: 0,
        cMemberTier: "SILVER",
      },
      select: profileSelect,
    });
  }
  updateProfile(id: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
      select: profileSelect,
    });
  }
}
