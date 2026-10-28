import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { ListSeatsDto } from "./seat.dto";
@Injectable()
export class SeatsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.seat.findUnique({ where: { id } });
  }
  page(roomId: string, query: ListSeatsDto, tx: Prisma.TransactionClient) {
    const where: Prisma.SeatWhereInput = {
      roomId,
      ...(query.seatType ? { seatType: query.seatType } : {}),
      ...(query.seatRow ? { seatRow: query.seatRow } : {}),
    };
    return Promise.all([
      tx.seat.findMany({
        where,
        orderBy: [{ seatRow: "asc" }, { seatColumn: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.seat.count({ where }),
    ]);
  }
  positions(roomId: string, tx: Prisma.TransactionClient) {
    return tx.seat.findMany({
      where: { roomId },
      select: { id: true, seatRow: true, seatColumn: true },
    });
  }
  create(data: Prisma.SeatUncheckedCreateInput, tx: Prisma.TransactionClient) {
    return tx.seat.create({ data });
  }
  createMany(data: Prisma.SeatCreateManyInput[], tx: Prisma.TransactionClient) {
    return tx.seat.createMany({ data });
  }
  update(
    id: string,
    data: Prisma.SeatUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.seat.update({ where: { id }, data });
  }
  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.seat.delete({ where: { id }, select: { id: true } });
  }
}
