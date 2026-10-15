import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreateComboDto, UpdateComboDto } from "./combo.dto";
@Injectable()
export class CombosRepository {
  constructor(private readonly prisma: PrismaService) {}
  async lockPrices(ids: string[], tx: Prisma.TransactionClient): Promise<void> {
    for (const id of [...ids].sort())
      await tx.$queryRaw`SELECT id FROM combos WHERE id = ${id}::uuid FOR SHARE`;
  }
  findMany(ids: string[], tx: Prisma.TransactionClient) {
    return tx.combo.findMany({
      where: { id: { in: ids } },
      orderBy: { id: "asc" },
    });
  }
  find(id: string) {
    return this.prisma.combo.findUnique({ where: { id } });
  }
  page(query: PaginationDto, tx: Prisma.TransactionClient) {
    return Promise.all([
      tx.combo.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.combo.count({ where: { isActive: true } }),
    ]);
  }
  create(dto: CreateComboDto) {
    return this.prisma.combo.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        imageUrl: dto.imageUrl ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }
  update(id: string, dto: UpdateComboDto) {
    return this.prisma.combo.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.price !== undefined
          ? { price: new Prisma.Decimal(dto.price) }
          : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
