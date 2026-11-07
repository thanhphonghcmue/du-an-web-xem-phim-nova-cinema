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
  async remove(id: string) {
    await this.combos.remove(id);
    return { id, deleted: true };
  }
  list(query: PaginationDto, admin = false) {
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.combos.page(query, tx, admin);
      return pageOf(
        items.map((row) => this.serialize(row)),
        total,
        query,
      );
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  private validateRange(min: number, max?: number | null) {
    if (max != null && max < min)
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "Số người tối đa phải lớn hơn hoặc bằng tối thiểu.",
      );
  }
  async toggle(id: string) {
    const changed = await this.combos.toggle(id);
    if (!changed.length)
      throw new ApiException(404, "COMBO_NOT_FOUND", "Không tìm thấy combo.");
    const row = await this.combos.find(id);
    if (!row)
      throw new ApiException(404, "COMBO_NOT_FOUND", "Không tìm thấy combo.");
    return this.serialize(row);
  }
  async create(dto: CreateComboDto) {
    this.validateRange(dto.suggestedMinSeats ?? 1, dto.suggestedMaxSeats);
    return this.serialize(await this.combos.create(dto));
  }
  async update(id: string, dto: UpdateComboDto) {
    const current = await this.combos.find(id);
    this.validateRange(
      dto.suggestedMinSeats ?? current?.suggestedMinSeats ?? 1,
      dto.suggestedMaxSeats === undefined
        ? current?.suggestedMaxSeats
        : dto.suggestedMaxSeats,
    );
    if (!current)
      throw new ApiException(404, "COMBO_NOT_FOUND", "Combo was not found.");
    return this.serialize(await this.combos.update(id, dto));
  }
}
