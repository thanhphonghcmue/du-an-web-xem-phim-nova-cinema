import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { Page, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { CinemasRepository } from "./cinemas.repository";
import {
  CinemaDto,
  CreateCinemaDto,
  ListCinemasDto,
  UpdateCinemaDto,
} from "./cinema.dto";
@Injectable()
export class CinemasService {
  constructor(
    private readonly cinemas: CinemasRepository,
    private readonly database: UnitOfWork,
  ) {}
  async get(id: string, tx?: Prisma.TransactionClient): Promise<CinemaDto> {
    const cinema = await this.cinemas.find(id, tx);
    if (!cinema)
      throw new ApiException(404, "CINEMA_NOT_FOUND", "Cinema was not found.");
    return cinema;
  }
  list(query: ListCinemasDto): Promise<Page<CinemaDto>> {
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.cinemas.page(query, tx);
      return pageOf(items, total, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  create(dto: CreateCinemaDto): Promise<CinemaDto> {
    return this.cinemas.create(dto);
  }
  async update(id: string, dto: UpdateCinemaDto): Promise<CinemaDto> {
    await this.get(id);
    return this.cinemas.update(id, dto);
  }
  delete(id: string) {
    return this.database.transaction(async (tx) => {
      await this.cinemas.lock(id, tx);
      await this.get(id, tx);
      if (await this.cinemas.hasRooms(id, tx))
        throw new ApiException(
          409,
          "CINEMA_IN_USE",
          "Remove unreferenced rooms before deleting their cinema.",
        );
      await this.cinemas.delete(id, tx);
      return { id, deleted: true };
    });
  }
}
