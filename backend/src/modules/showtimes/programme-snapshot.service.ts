import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  encodeProgramme,
  MAX_CHUNKS,
  ProgrammeChunk,
  ProgrammeManifest,
  ProgrammeTransportTooLarge,
  RETENTION_SECONDS,
  REUSE_SECONDS,
} from "../../../programme-codec.cjs";
import { ApiException } from "../../common/exceptions/api.exception";
import { RedisSettings } from "../../config/redis.config";
import { RedisService } from "../../redis/redis.service";
import { ShowtimesService } from "./showtimes.service";

const READ = 'return redis.call("GET", KEYS[1])';
const PUBLISH = `
  redis.call('SET', KEYS[3], ARGV[4], 'EX', ARGV[3])
  for index = 4, #KEYS do redis.call('SET', KEYS[index], ARGV[index + 1], 'EX', ARGV[3]) end
  if (redis.call('GET', KEYS[2]) or '0') == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[4], 'EX', ARGV[2])
  end
  return 1`;

@Injectable()
export class ProgrammeSnapshotService {
  private readonly prefix: string;
  private readonly pending = new Map<string, Promise<ProgrammeManifest>>();
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
    private readonly showtimes: ShowtimesService,
  ) {
    this.prefix = `${config.getOrThrow<RedisSettings>("redis").prefix}:programme:v1`;
  }
  private get versionKey(): string {
    return `${this.prefix}:version`;
  }
  async manifest(days: number): Promise<ProgrammeManifest> {
    const storedVersion = await this.redis.evaluate(
      READ,
      [this.versionKey],
      [],
    );
    if (storedVersion !== null && typeof storedVersion !== "string")
      throw new Error("Invalid catalogue version state.");
    const version = storedVersion ?? "0";
    const pointer = `${this.prefix}:current:${String(days)}:${version}`;
    const existing = await this.redis.evaluate(READ, [pointer], []);
    if (typeof existing === "string")
      return JSON.parse(existing) as ProgrammeManifest;
    const pending = this.pending.get(pointer);
    if (pending) return pending;
    const operation = this.create(days, version, pointer).finally(() =>
      this.pending.delete(pointer),
    );
    this.pending.set(pointer, operation);
    return operation;
  }
  private async create(
    days: number,
    version: string,
    pointer: string,
  ): Promise<ProgrammeManifest> {
    // Catalogue snapshot only: holds/seat availability and payment state never enter this cache.
    const programme = await this.showtimes.programme(days);
    let encoded: ReturnType<typeof encodeProgramme>;
    try {
      encoded = encodeProgramme(programme);
    } catch (error) {
      if (!(error instanceof ProgrammeTransportTooLarge)) throw error;
      throw new ApiException(
        422,
        "PROGRAMME_TRANSPORT_TOO_LARGE",
        "Danh mục vượt giới hạn truyền theo phần. Hãy tải đầy đủ bằng API lịch hiện tại.",
      );
    }
    const { manifest, pages, source } = encoded;
    await this.redis.evaluate(
      PUBLISH,
      [
        pointer,
        this.versionKey,
        `${this.prefix}:${manifest.snapshotId}:manifest`,
        `${this.prefix}:${manifest.snapshotId}:raw`,
        ...pages.map(
          (page) =>
            `${this.prefix}:${manifest.snapshotId}:${String(page.index)}`,
        ),
      ],
      [
        version,
        String(REUSE_SECONDS),
        String(RETENTION_SECONDS),
        JSON.stringify(manifest),
        source,
        ...pages.map((page) => JSON.stringify(page)),
      ],
    );
    return manifest;
  }
  async legacy(days: number): Promise<unknown> {
    try {
      const manifest = await this.manifest(days);
      const raw = await this.redis.evaluate(
        READ,
        [`${this.prefix}:${manifest.snapshotId}:raw`],
        [],
      );
      // An explicitly removed cache blob must not silently produce a partial catalogue.
      return typeof raw === "string"
        ? (JSON.parse(raw) as unknown)
        : await this.showtimes.programme(days);
    } catch (error) {
      if (error instanceof ApiException && error.getStatus() === 422) {
        const body = error.getResponse();
        if (
          typeof body === "object" &&
          "error" in body &&
          body.error === "PROGRAMME_TRANSPORT_TOO_LARGE"
        )
          return this.showtimes.programme(days);
      }
      // Keep network/Redis/validation failures visible; this fallback only preserves
      // the existing large legacy contract when the optional transport cannot fit.
      throw error;
    }
  }
  async chunk(
    snapshotId: string,
    index: number,
  ): Promise<{ chunk: ProgrammeChunk; expiresAt: string }> {
    if (!Number.isSafeInteger(index) || index < 0 || index >= MAX_CHUNKS)
      throw new ApiException(
        400,
        "INVALID_PROGRAMME_CHUNK",
        "Chỉ mục phần lịch không hợp lệ.",
      );
    const id = snapshotId.toLowerCase();
    const values = await this.redis.evaluate(
      `return {
      redis.call('GET', KEYS[1]) or '', redis.call('GET', KEYS[2]) or ''
    }`,
      [
        `${this.prefix}:${id}:manifest`,
        `${this.prefix}:${id}:${String(index)}`,
      ],
      [],
    );
    if (!Array.isArray(values) || typeof values[0] !== "string" || !values[0])
      throw expired();
    const manifest = JSON.parse(values[0]) as ProgrammeManifest;
    if (Date.parse(manifest.expiresAt) <= Date.now()) throw expired();
    if (index >= manifest.chunks)
      throw new ApiException(
        404,
        "PROGRAMME_CHUNK_NOT_FOUND",
        "Không có phần lịch này trong snapshot.",
      );
    if (typeof values[1] !== "string" || !values[1]) throw expired();
    return {
      chunk: JSON.parse(values[1]) as ProgrammeChunk,
      expiresAt: manifest.expiresAt,
    };
  }
  async invalidate(): Promise<void> {
    // Existing immutable snapshots remain readable; subsequent manifests use a fresh version.
    await this.redis.evaluate(
      'return redis.call("INCR", KEYS[1])',
      [this.versionKey],
      [],
    );
  }
}
function expired(): ApiException {
  return new ApiException(
    410,
    "PROGRAMME_SNAPSHOT_EXPIRED",
    "Lịch đã được cập nhật. Vui lòng tải lại snapshot đầy đủ.",
  );
}
