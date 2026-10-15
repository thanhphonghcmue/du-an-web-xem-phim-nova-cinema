import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { Page, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { RoomsRepository } from "./rooms.repository";
import {
  CreateRoomDto,
  ListRoomsDto,
  RoomDto,
  RoomFiltersDto,
  UpdateRoomDto,
} from "./room.dto";
@Injectable()
export class RoomsService {
  constructor(
    private readonly rooms: RoomsRepository,
    private readonly database: UnitOfWork,
  ) {}
  async get(id: string, tx?: Prisma.TransactionClient): Promise<RoomDto> {
    const room = await this.rooms.find(id, tx);
    if (!room)
      throw new ApiException(404, "ROOM_NOT_FOUND", "Room was not found.");
    return room;
  }
  async requireCinema(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!(await this.rooms.cinemaExists(id, tx)))
      throw new ApiException(404, "CINEMA_NOT_FOUND", "Cinema was not found.");
  }
  list(query: ListRoomsDto): Promise<Page<RoomDto>> {
    return this.database.transaction(async (tx) => {
      if (query.cinemaId) await this.requireCinema(query.cinemaId, tx);
      const [items, total] = await this.rooms.page(query, tx);
      return pageOf(items, total, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  listForCinema(
    cinemaId: string,
    query: RoomFiltersDto,
  ): Promise<Page<RoomDto>> {
    return this.list(Object.assign(new ListRoomsDto(), query, { cinemaId }));
  }
  async create(dto: CreateRoomDto): Promise<RoomDto> {
    await this.requireCinema(dto.cinemaId);
    return this.rooms.create(dto);
  }
  update(id: string, dto: UpdateRoomDto): Promise<RoomDto> {
    return this.database.transaction(async (tx) => {
      await this.rooms.lock(id, tx);
      const current = await this.get(id, tx);
      const changesStructure =
        (dto.cinemaId !== undefined && dto.cinemaId !== current.cinemaId) ||
        (dto.roomType !== undefined && dto.roomType !== current.roomType);
      if (changesStructure && (await this.rooms.hasShowtimes(id, tx)))
        throw new ApiException(
          409,
          "ROOM_STRUCTURE_LOCKED",
          "Cinema and format cannot change after this room has showtimes.",
        );
      if (dto.cinemaId !== undefined)
        await this.requireCinema(dto.cinemaId, tx);
      return this.rooms.update(id, dto, tx);
    });
  }
  delete(id: string) {
    return this.database.transaction(async (tx) => {
      await this.rooms.lock(id, tx);
      await this.get(id, tx);
      if (await this.rooms.hasShowtimes(id, tx))
        throw new ApiException(
          409,
          "ROOM_IN_USE",
          "Room is referenced by showtimes.",
        );
      if (await this.rooms.seatCount(id, tx))
        throw new ApiException(
          409,
          "ROOM_HAS_SEATS",
          "Remove the room's unreferenced seats before deleting it.",
        );
      await this.rooms.delete(id, tx);
      return { id, deleted: true };
    });
  }
}
