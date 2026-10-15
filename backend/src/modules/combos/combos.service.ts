import { Injectable } from "@nestjs/common";
import { Combo, Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { PaginationDto, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { CombosRepository } from "./combos.repository";
import { CreateComboDto, UpdateComboDto } from "./combo.dto";
@Injectable()
export class CombosService {
  constructor(
    private readonly combos: CombosRepository,
    private readonly database: UnitOfWork,
  ) {}
  private serialize(row: Combo) {
    return { ...row, price: row.price.toFixed(2) };
  }
  list(query: PaginationDto) {
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.combos.page(query, tx);
      return pageOf(
        items.map((row) => this.serialize(row)),
        total,
        query,
      );
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  async create(dto: CreateComboDto) {
    return this.serialize(await this.combos.create(dto));
  }
  async update(id: string, dto: UpdateComboDto) {
    if (!(await this.combos.find(id)))
      throw new ApiException(404, "COMBO_NOT_FOUND", "Combo was not found.");
    return this.serialize(await this.combos.update(id, dto));
  }
}
