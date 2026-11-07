import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { CombosRepository } from "./combos.repository";
@Injectable()
export class ComboBackupService implements OnApplicationBootstrap {
  private readonly logger = new Logger("ComboBackup");
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly repository: CombosRepository) {}
  onApplicationBootstrap() {
    return this.sync();
  }
  sync(): Promise<void> {
    const configured = process.env.NOVA_COMBO_STORE_PATH;
    if (process.env.NODE_ENV === "test" && !configured)
      return Promise.resolve();
    const path =
      configured || resolve(__dirname, "../../../../data/combos.json");
    // Bản sao phục hồi: DB vẫn là nguồn giá/trạng thái có thẩm quyền khi bán vé.
    this.tail = this.tail.then(async () => {
      const temporary = `${path}.${randomUUID()}.tmp`;
      try {
        const rows = await this.repository.snapshot();
        await mkdir(dirname(path), { recursive: true });
        await writeFile(
          temporary,
          JSON.stringify(
            rows.map((row) => ({ ...row, price: row.price.toFixed(2) })),
            null,
            2,
          ) + "\n",
          { mode: 0o600 },
        );
        await rename(temporary, path);
      } catch {
        this.logger.warn(
          "Combo backup unavailable; PostgreSQL remains the source of truth.",
        );
      } finally {
        await rm(temporary, { force: true }).catch(() => {});
      }
    });
    return this.tail;
  }
}
