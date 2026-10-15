import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateRoomDto, ListRoomsDto, UpdateRoomDto } from "./room.dto";
@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.room.findUnique({ where: { id } });
  }
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async cinemaExists(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    return (
      (await tx.cinema.findUnique({ where: { id }, select: { id: true } })) !==
      null
    );
  }
  async hasShowtimes(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    return (
      (await tx.showtime.findFirst({
        where: { roomId: id },
        select: { id: true },
      })) !== null
    );
  }
  seatCount(id: string, tx: Prisma.TransactionClient) {
    return tx.seat.count({ where: { roomId: id } });
  }
  async syncSeatCount(id: string, tx: Prisma.TransactionClient) {
    const totalSeats = await this.seatCount(id, tx);
    return tx.room.update({ where: { id }, data: { totalSeats } });
  }
  page(query: ListRoomsDto, tx: Prisma.TransactionClient) {
    const where: Prisma.RoomWhereInput = {
      ...(query.cinemaId ? { cinemaId: query.cinemaId } : {}),
      ...(query.roomType ? { roomType: query.roomType } : {}),
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: "insensitive" } }
        : {}),
    };
    return Promise.all([
      tx.room.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tx.room.count({ where }),
    ]);
  }
  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        cinemaId: dto.cinemaId,
        name: dto.name,
        roomType: dto.roomType,
        totalSeats: 0,
      },
    });
  }
  update(id: string, dto: UpdateRoomDto, tx: Prisma.TransactionClient) {
    return tx.room.update({
      where: { id },
      data: {
        ...(dto.cinemaId !== undefined ? { cinemaId: dto.cinemaId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.roomType !== undefined ? { roomType: dto.roomType } : {}),
      },
    });
  }
  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.room.delete({ where: { id }, select: { id: true } });
  }
}
