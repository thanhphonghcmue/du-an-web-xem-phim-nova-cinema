import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateCinemaDto, ListCinemasDto, UpdateCinemaDto } from "./cinema.dto";
@Injectable()
export class CinemasRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.cinema.findUnique({ where: { id } });
  }
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM cinemas WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async hasRooms(id: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return (
      (await tx.room.findFirst({
        where: { cinemaId: id },
        select: { id: true },
      })) !== null
    );
  }
  page(query: ListCinemasDto, tx: Prisma.TransactionClient) {
    const where: Prisma.CinemaWhereInput = {
      ...(query.city
        ? { city: { equals: query.city, mode: "insensitive" } }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword, mode: "insensitive" } },
              { address: { contains: query.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return Promise.all([
      tx.cinema.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.cinema.count({ where }),
    ]);
  }
  create(dto: CreateCinemaDto) {
    return this.prisma.cinema.create({
      data: { name: dto.name, address: dto.address, city: dto.city },
    });
  }
  update(id: string, dto: UpdateCinemaDto) {
    return this.prisma.cinema.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
      },
    });
  }
  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.cinema.delete({ where: { id }, select: { id: true } });
  }
}
