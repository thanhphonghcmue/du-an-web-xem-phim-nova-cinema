import { Injectable } from "@nestjs/common";
import { Prisma, Seat, SeatType } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { Page, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { RoomsRepository } from "../rooms/rooms.repository";
import { SeatsRepository } from "./seats.repository";
import {
  CreateSeatDto,
  GenerateSeatsDto,
  GeneratedSeatsDto,
  ListSeatsDto,
  SeatDto,
  UpdateSeatDto,
} from "./seat.dto";
const MODIFIERS: Record<SeatType, string> = {
  STANDARD: "1.00",
  VIP: "1.20",
  SWEETBOX: "1.50",
};
function serialize(seat: Seat): SeatDto {
  return { ...seat, priceModifier: seat.priceModifier.toFixed(2) };
}
@Injectable()
export class SeatsService {
  constructor(
    private readonly seats: SeatsRepository,
    private readonly rooms: RoomsRepository,
    private readonly database: UnitOfWork,
  ) {}
  async get(id: string): Promise<SeatDto> {
    const seat = await this.seats.find(id);
    if (!seat)
      throw new ApiException(404, "SEAT_NOT_FOUND", "Seat was not found.");
    return serialize(seat);
  }
  list(roomId: string, query: ListSeatsDto): Promise<Page<SeatDto>> {
    return this.database.transaction(async (tx) => {
      if (!(await this.rooms.find(roomId, tx)))
        throw new ApiException(404, "ROOM_NOT_FOUND", "Room was not found.");
      const [items, total] = await this.seats.page(roomId, query, tx);
      return pageOf(items.map(serialize), total, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  private mutate<T>(
    roomId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (tx) => {
      await this.rooms.lock(roomId, tx);
      if (!(await this.rooms.find(roomId, tx)))
        throw new ApiException(404, "ROOM_NOT_FOUND", "Room was not found.");
      if (await this.rooms.hasShowtimes(roomId, tx))
        throw new ApiException(
          409,
          "SEAT_LAYOUT_LOCKED",
          "Physical seats cannot change after their room has showtimes.",
        );
      return operation(tx);
    });
  }
  create(roomId: string, dto: CreateSeatDto): Promise<SeatDto> {
    return this.mutate(roomId, async (tx) => {
      const seat = await this.seats.create(
        {
          roomId,
          seatRow: dto.seatRow,
          seatColumn: dto.seatColumn,
          seatType: dto.seatType,
          priceModifier: new Prisma.Decimal(MODIFIERS[dto.seatType]),
        },
        tx,
      );
      await this.rooms.syncSeatCount(roomId, tx);
      return serialize(seat);
    });
  }
  async update(id: string, dto: UpdateSeatDto): Promise<SeatDto> {
    const existing = await this.get(id);
    return this.mutate(existing.roomId, async (tx) => {
      const seat = await this.seats.update(
        id,
        {
          ...(dto.seatRow !== undefined ? { seatRow: dto.seatRow } : {}),
          ...(dto.seatColumn !== undefined
            ? { seatColumn: dto.seatColumn }
            : {}),
          ...(dto.seatType !== undefined
            ? {
                seatType: dto.seatType,
                priceModifier: new Prisma.Decimal(MODIFIERS[dto.seatType]),
              }
            : {}),
        },
        tx,
      );
      return serialize(seat);
    });
  }
  async delete(id: string) {
    const existing = await this.get(id);
    return this.mutate(existing.roomId, async (tx) => {
      await this.seats.delete(id, tx);
      await this.rooms.syncSeatCount(existing.roomId, tx);
      return { id, deleted: true };
    });
  }
  generate(roomId: string, dto: GenerateSeatsDto): Promise<GeneratedSeatsDto> {
    const vip = new Set(dto.vipRows || []);
    const sweetbox = new Set(dto.sweetboxRows || []);
    if (
      [...vip, ...sweetbox].some((label) => !dto.rows.includes(label)) ||
      [...vip].some((label) => sweetbox.has(label))
    )
      throw new ApiException(
        400,
        "INVALID_SEAT_LAYOUT",
        "VIP/Sweetbox rows must belong to rows and cannot overlap.",
      );
    return this.mutate(roomId, async (tx) => {
      if (await this.rooms.seatCount(roomId, tx))
        throw new ApiException(
          409,
          "SEAT_LAYOUT_EXISTS",
          "Generate is allowed only for an empty room; existing seats are never replaced.",
        );
      const data: Prisma.SeatCreateManyInput[] = [];
      for (const label of dto.rows) {
        const seatType = sweetbox.has(label)
          ? SeatType.SWEETBOX
          : vip.has(label)
            ? SeatType.VIP
            : SeatType.STANDARD;
        for (let column = 1; column <= dto.columns; column++)
          data.push({
            roomId,
            seatRow: label,
            seatColumn: column,
            seatType,
            priceModifier: new Prisma.Decimal(MODIFIERS[seatType]),
          });
      }
      const created = await this.seats.createMany(data, tx);
      const room = await this.rooms.syncSeatCount(roomId, tx);
      return {
        roomId,
        createdCount: created.count,
        totalSeats: room.totalSeats,
      };
    });
  }
}
