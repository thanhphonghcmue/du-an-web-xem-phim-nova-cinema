import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import {
  MAX_SNAPSHOT_BYTES,
  ProgrammeTransportTooLarge,
  encodeProgramme,
} from "../../../programme-codec.cjs";
import { ApiException } from "../../common/exceptions/api.exception";
import { RedisService } from "../../redis/redis.service";
import { ProgrammeDto } from "./showtime.dto";
import { ProgrammeSnapshotService } from "./programme-snapshot.service";
import { ShowtimesService } from "./showtimes.service";

function setup(programme: ProgrammeDto) {
  const evaluate = jest
    .fn<
      ReturnType<RedisService["evaluate"]>,
      Parameters<RedisService["evaluate"]>
    >()
    .mockResolvedValue(null);
  const source = jest
    .fn<ReturnType<ShowtimesService["programme"]>, [number]>()
    .mockResolvedValue(programme);
  const service = new ProgrammeSnapshotService(
    new ConfigService({ redis: { prefix: "owned-unit-snapshot" } }),
    { evaluate } as unknown as RedisService,
    { programme: source } as unknown as ShowtimesService,
  );
  return { service, evaluate, source };
}
function empty(): ProgrammeDto {
  return {
    movies: [],
    cinemas: [],
    rooms: [],
    combos: [],
    showtimes: [],
    asOf: new Date("2042-01-01T00:00:00Z"),
    until: new Date("2042-03-01T00:00:00Z"),
  };
}

describe("bounded optional programme transport preserves the legacy catalogue contract", () => {
  it("rejects legal oversized Unicode content in the new protocol but returns the complete original legacy dataset", async () => {
    const programme = empty();
    // 300 valid movies (<1000) with legal 20K-character descriptions exceed 16 MiB
    // in UTF-8; character count and wire byte budgets are deliberately different.
    programme.movies = Array.from({ length: 300 }, (_, index) => ({
      id: randomUUID(),
      title: `Owned movie ${String(index)}`,
      description: "漢".repeat(20000),
      durationMinutes: 120,
      releaseDate: new Date("2042-01-01T00:00:00Z"),
      ageRating: "P",
      status: "NOW_SHOWING",
      trailerUrl: null,
      posterUrl: null,
      createdAt: new Date("2042-01-01T00:00:00Z"),
      updatedAt: new Date("2042-01-01T00:00:00Z"),
    }));
    expect(Buffer.byteLength(JSON.stringify(programme))).toBeGreaterThan(
      MAX_SNAPSHOT_BYTES,
    );
    expect(() => encodeProgramme(programme)).toThrow(
      ProgrammeTransportTooLarge,
    );
    const { service, evaluate, source } = setup(programme);
    const failure: unknown = await service
      .manifest(60)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiException);
    if (!(failure instanceof ApiException))
      throw new Error("Expected explicit transport limit response.");
    expect(failure.getStatus()).toBe(422);
    expect(failure.getResponse()).toMatchObject({
      error: "PROGRAMME_TRANSPORT_TOO_LARGE",
    });
    await expect(service.legacy(60)).resolves.toBe(programme);
    expect(source).toHaveBeenCalledTimes(3);
    // The oversized source is never published into Redis.
    expect(
      evaluate.mock.calls.every(([script]) => !script.includes("SET")),
    ).toBe(true);
  });

  it("does not hide a Redis/network failure behind an uncached legacy or mock response", async () => {
    const { service, evaluate, source } = setup(empty());
    const outage = new Error("Owned Redis outage");
    evaluate.mockRejectedValue(outage);
    await expect(service.legacy(60)).rejects.toBe(outage);
    expect(source).not.toHaveBeenCalled();
  });
});
