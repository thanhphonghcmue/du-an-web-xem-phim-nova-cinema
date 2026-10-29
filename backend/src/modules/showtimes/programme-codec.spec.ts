import { randomUUID } from "node:crypto";
import {
  encodeProgramme,
  ENVELOPE_LIMIT_BYTES,
  ProgrammeChunk,
  ProgrammeCollection,
} from "../../../programme-codec.cjs";
import { ExecutionContext } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { programmeChunkKey } from "./programme-throttle";

function decode(
  pages: ProgrammeChunk[],
): Record<ProgrammeCollection, unknown[]> {
  const result: Record<ProgrammeCollection, unknown[]> = {
    movies: [],
    cinemas: [],
    rooms: [],
    combos: [],
    showtimes: [],
  };
  const fragments = new Map<
    string,
    { collection: ProgrammeCollection; offset: number; text: string[] }
  >();
  for (const page of pages)
    for (const part of page.parts) {
      if ("fragment" in part) {
        const key = `${part.collection}:${String(part.offset)}`;
        const entry = fragments.get(key) ?? {
          collection: part.collection,
          offset: part.offset,
          text: [],
        };
        entry.text[part.fragment.index] = part.fragment.text;
        fragments.set(key, entry);
      } else {
        for (const [offset, row] of part.rows.entries())
          result[part.collection][part.offset + offset] = Object.fromEntries(
            part.keys.map((key, index) => {
              const cell = row[index];
              const value =
                part.stringColumns?.includes(index) && typeof cell === "number"
                  ? part.strings[cell]
                  : cell !== null &&
                      typeof cell === "object" &&
                      !Array.isArray(cell)
                    ? "s" in cell && typeof cell.s === "number"
                      ? part.strings[cell.s]
                      : "v" in cell
                        ? cell.v
                        : cell
                    : cell;
              return [key, value];
            }),
          );
      }
    }
  for (const entry of fragments.values())
    result[entry.collection][entry.offset] = JSON.parse(
      entry.text.join(""),
    ) as unknown;
  return result;
}
const empty = () => ({
  asOf: "2042-01-01T00:00:00.000Z",
  until: "2042-03-01T00:00:00.000Z",
  movies: [] as unknown[],
  cinemas: [] as unknown[],
  rooms: [] as unknown[],
  combos: [] as unknown[],
  showtimes: [] as unknown[],
});

describe("lossless bounded programme transport", () => {
  it("preserves every field, exact Decimal strings, Unicode, nulls and nested literals", () => {
    const original = empty();
    const repeated = "NOVA — tiếng Việt 😀";
    original.movies = [
      {
        id: randomUUID(),
        title: repeated,
        description: repeated,
        duration: 120,
        nullable: null,
        enabled: false,
        nested: { s: 1, v: [1, "x"] },
      },
      {
        id: randomUUID(),
        title: repeated,
        description: repeated,
        duration: 121,
        nullable: null,
        enabled: true,
        nested: [1, 2],
      },
      { id: randomUUID(), optionalField: "only here", price: "95000.00" },
    ];
    const { manifest, pages } = encodeProgramme(original);
    expect(decode(pages)).toEqual({
      movies: original.movies,
      cinemas: [],
      rooms: [],
      combos: [],
      showtimes: [],
    });
    expect(manifest.counts.movies).toBe(3);
    expect(manifest.chunks).toBe(pages.length);
    expect(
      pages
        .flatMap((page) => page.parts)
        .some((part) => "strings" in part && part.strings.includes(repeated)),
    ).toBe(true);
  });

  it("segments a legal oversized 20K Unicode description without dropping one code unit", () => {
    const original = empty();
    original.movies = [
      { id: randomUUID(), description: 'Tiếng Việt 😀\\"\n'.repeat(1250) },
    ];
    const { pages } = encodeProgramme(original);
    expect(pages.length).toBeGreaterThan(1);
    expect(decode(pages).movies).toEqual(original.movies);
    expect(
      pages.every((page) => page.parts.every((part) => "fragment" in part)),
    ).toBe(true);
    for (const data of pages)
      expect(
        Buffer.byteLength(
          JSON.stringify({
            success: true,
            data,
            message: "Request completed successfully.",
          }),
        ),
      ).toBeLessThan(ENVELOPE_LIMIT_BYTES);
  });

  it("retains 5760 independently identified screenings inside byte-bounded envelopes", () => {
    const original = empty();
    for (let index = 0; index < 5760; index++)
      original.showtimes.push({
        id: randomUUID(),
        movieId: `movie-${String(index % 24)}`,
        roomId: `room-${String(index % 48)}`,
        startTime: new Date(
          Date.UTC(
            2042,
            0,
            1 + Math.floor(index / 192),
            9 + (Math.floor(index / 48) % 4),
          ),
        ).toISOString(),
        endTime: new Date(
          Date.UTC(
            2042,
            0,
            1 + Math.floor(index / 192),
            12 + (Math.floor(index / 48) % 4),
          ),
        ).toISOString(),
        price: "95000.00",
        createdAt: original.asOf,
        updatedAt: original.asOf,
      });
    const { manifest, pages } = encodeProgramme(original);
    expect(manifest.counts.showtimes).toBe(5760);
    expect(decode(pages).showtimes).toEqual(original.showtimes);
    expect(new Set(pages.map((page) => page.index)).size).toBe(pages.length);
    for (const data of pages)
      expect(
        Buffer.byteLength(
          JSON.stringify({
            success: true,
            data,
            message: "Request completed successfully.",
          }),
        ),
      ).toBeLessThan(ENVELOPE_LIMIT_BYTES);
  });

  it("matches the exact legacy JSON source for repeated Dates, Decimal, nested JSON and nullable/omitted cells", () => {
    const date = new Date("2042-01-01T10:30:45.123Z");
    const original = {
      ...empty(),
      asOf: date,
      until: new Date(date.getTime() + 86400000),
      movies: Array.from({ length: 64 }, (_, index) => ({
        id: `movie-${String(index)}`,
        releaseDate: new Date(date.getTime()),
        createdAt: new Date(date.getTime()),
        updatedAt: new Date(date.getTime()),
        price: new Prisma.Decimal("999999999999.99"),
        title: 'Tiếng Việt 😀\n"',
        nullable: null,
        omitted: undefined,
        negativeZero: -0,
        notFinite: NaN,
        nested: {
          at: new Date(date.getTime()),
          list: [undefined, Infinity, null],
          amount: new Prisma.Decimal("0.01"),
        },
        keyAware: {
          toJSON(key: string) {
            return `JSON key: ${key}`;
          },
        },
      })),
    };
    const expected = JSON.stringify(original),
      encoded = encodeProgramme(original);
    expect(encoded.source).toBe(expected);
    expect(decode(encoded.pages).movies).toEqual(
      (JSON.parse(expected) as { movies: unknown[] }).movies,
    );
  });

  it("preserves custom Date/row toJSON behavior and an own __proto__ JSON field without prototype mutation", () => {
    const customDate = new Date("2042-01-01T00:00:00Z");
    customDate.toJSON = (key?: unknown) => `custom:${String(key)}`;
    const original = {
      ...empty(),
      movies: [
        Object.fromEntries([
          ["id", "own-prototype"],
          ["__proto__", { polluted: true }],
          ["specialDate", customDate],
          ["invalidDate", new Date("invalid")],
        ]),
        {
          toJSON(key: string) {
            return { id: "custom-row", arrayIndex: key };
          },
        },
      ],
    };
    const expected = JSON.stringify(original),
      encoded = encodeProgramme(original);
    expect(encoded.source).toBe(expected);
    expect(decode(encoded.pages).movies).toEqual(
      (JSON.parse(expected) as { movies: unknown[] }).movies,
    );
    expect(Object.hasOwn({}, "polluted")).toBe(false);
  });

  it("represents empty collections explicitly and dates identically to the legacy JSON", () => {
    const original = { ...empty(), asOf: new Date("2042-01-01T00:00:00Z") };
    const { manifest, pages } = encodeProgramme(
      original,
      Date.parse("2042-01-01T00:00:00Z"),
    );
    expect(manifest.asOf).toBe("2042-01-01T00:00:00.000Z");
    expect(manifest.expiresAt).toBe("2042-01-01T00:02:00.000Z");
    expect(manifest.counts).toEqual({
      movies: 0,
      cinemas: 0,
      rooms: 0,
      combos: 0,
      showtimes: 0,
    });
    expect(pages).toEqual([]);
  });
});

function key(
  index: string,
  snapshotId = randomUUID(),
  caller = "127.0.0.1",
): string {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ params: { index, snapshotId } }),
    }),
    getClass: () => ({ name: "ShowtimesController" }),
    getHandler: () => ({ name: "chunk" }),
  } as unknown as ExecutionContext;
  return programmeChunkKey(context, caller, "default");
}

describe("new immutable programme asset rate keys", () => {
  it("bounds valid chunks to eight buckets per caller regardless of snapshot UUID or index", () => {
    expect(
      new Set(Array.from({ length: 4096 }, (_, index) => key(String(index))))
        .size,
    ).toBe(8);
    expect(key("0")).toBe(key("8"));
    expect(key("0", randomUUID(), "127.0.0.1")).not.toBe(
      key("0", randomUUID(), "127.0.0.2"),
    );
  });
  it("puts malformed and out-of-bound indices in one bounded invalid bucket", () => {
    expect(
      new Set(
        ["-1", "4096", "9999999999", "NaN", "1x", ""].map((index) =>
          key(index),
        ),
      ).size,
    ).toBe(1);
    expect(key("NaN")).not.toBe(key("0"));
  });
});
