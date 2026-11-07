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
  async configure(
    roomId: string,
    data: Prisma.SeatCreateManyInput[],
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const existing = await this.positions(roomId, tx);
    const wanted = new Set(
      data.map((seat) => `${seat.seatRow}:${String(seat.seatColumn)}`),
    );
    await tx.seat.deleteMany({
      where: {
        roomId,
        id: {
          in: existing
            .filter(
              (seat) =>
                !wanted.has(`${seat.seatRow}:${String(seat.seatColumn)}`),
            )
            .map((seat) => seat.id),
        },
      },
    });
    const positions = new Map(
      existing.map((seat) => [
        `${seat.seatRow}:${String(seat.seatColumn)}`,
        seat.id,
      ]),
    );
    const added: Prisma.SeatCreateManyInput[] = [];
    const groups = new Map<
      string,
      { ids: string[]; seat: Prisma.SeatCreateManyInput }
    >();
    for (const seat of data) {
      const id = positions.get(`${seat.seatRow}:${String(seat.seatColumn)}`);
      if (!id) {
        added.push(seat);
        continue;
      }
      const group = groups.get(seat.seatType) ?? { ids: [], seat };
      group.ids.push(id);
      groups.set(seat.seatType, group);
    }
    for (const { ids, seat } of groups.values())
      await tx.seat.updateMany({
        where: { id: { in: ids }, roomId },
        data: { seatType: seat.seatType, priceModifier: seat.priceModifier },
      });
    return (await this.createMany(added, tx)).count;
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
