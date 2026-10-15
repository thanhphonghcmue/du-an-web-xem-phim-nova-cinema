import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListMoviesDto } from "./movie.dto";
@Injectable()
export class MoviesRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.movie.findUnique({ where: { id } });
  }
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM movies WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async hasShowtimes(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    return (
      (await tx.showtime.findFirst({
        where: { movieId: id },
        select: { id: true },
      })) !== null
    );
  }
  page(query: ListMoviesDto, tx: Prisma.TransactionClient) {
    const where: Prisma.MovieWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ageRating ? { ageRating: query.ageRating } : {}),
      ...(query.keyword
        ? { title: { contains: query.keyword, mode: "insensitive" } }
        : {}),
    };
    return Promise.all([
      tx.movie.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.movie.count({ where }),
    ]);
  }
  create(data: Prisma.MovieCreateInput) {
    return this.prisma.movie.create({ data });
  }
  update(
    id: string,
    data: Prisma.MovieUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.movie.update({ where: { id }, data });
  }
  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.movie.delete({ where: { id }, select: { id: true } });
  }
}
