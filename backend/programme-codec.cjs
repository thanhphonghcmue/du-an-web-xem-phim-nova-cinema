const { randomUUID } = require("node:crypto");
const ENVELOPE_LIMIT_BYTES = 15 * 1024;
const RETENTION_SECONDS = 120;
const REUSE_SECONDS = 30;
const MAX_CHUNKS = 4096;
const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
class ProgrammeTransportTooLarge extends Error {
  constructor() {
    super("Programme snapshot exceeds the bounded transport size.");
    this.name = "ProgrammeTransportTooLarge";
  }
}
const COLLECTIONS = ["movies", "cinemas", "rooms", "combos", "showtimes"];
const envelopeBytes = (data) =>
  Buffer.byteLength(
    JSON.stringify({
      success: true,
      data,
      message: "Request completed successfully.",
    }),
  );

function rowPart(collection, offset, records) {
  const keys = Object.keys(records[0]);
  const counts = new Map();
  for (const record of records)
    for (const value of Object.values(record))
      if (typeof value === "string")
        counts.set(value, (counts.get(value) || 0) + 1);
  const stringColumns = keys.flatMap((key, index) =>
    records.every(
      (record) => record[key] === null || typeof record[key] === "string",
    )
      ? [index]
      : [],
  );
  const strings = [...counts]
    .filter(([value, count]) => value.length > 3 && count > 1)
    .map(([value]) => value);
  const dictionary = new Map(strings.map((value, index) => [value, index]));
  return {
    collection,
    offset,
    keys,
    strings,
    stringColumns,
    rows: records.map((record) =>
      keys.map((key, columnIndex) => {
        const value = record[key];
        const reference =
          typeof value === "string" ? dictionary.get(value) : undefined;
        if (reference !== undefined)
          return stringColumns.includes(columnIndex)
            ? reference
            : { s: reference };
        return value !== null && typeof value === "object"
          ? { v: value }
          : value;
      }),
    ),
  };
}

// Native Prisma DTOs contain many equal Date instances. Normalize those flat
// cells once per timestamp; JSON.stringify otherwise invokes Date.toJSON for
// every copy and a whole-document JSON.parse then clones the same data again.
function canonicalProgramme(programme) {
  const dates = new Map();
  function valueForKey(value, key) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return value;
    if (typeof value === "number")
      return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
    if (
      value instanceof Date &&
      Object.getPrototypeOf(value) === Date.prototype &&
      Reflect.ownKeys(value).length === 0
    ) {
      const timestamp = value.getTime();
      if (!Number.isFinite(timestamp)) return null;
      if (!dates.has(timestamp)) dates.set(timestamp, value.toISOString());
      return dates.get(timestamp);
    }
    // Preserve custom toJSON(key), Decimal strings, nested arrays/objects,
    // omitted undefined/function/symbol cells and their existing JSON semantics.
    return JSON.parse(JSON.stringify({ [key]: value }))[key];
  }
  function rowForIndex(row, index) {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(row)) ||
      "toJSON" in row
    )
      return valueForKey(row, String(index));
    const normalized = {};
    for (const key of Object.keys(row)) {
      const value = valueForKey(row[key], key);
      if (value === undefined) continue;
      if (key === "__proto__")
        Object.defineProperty(normalized, key, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else normalized[key] = value;
    }
    return normalized;
  }
  if (
    !programme ||
    typeof programme !== "object" ||
    Object.getPrototypeOf(programme) !== Object.prototype ||
    "toJSON" in programme
  )
    return JSON.parse(JSON.stringify(programme));
  const normalized = {};
  for (const key of Object.keys(programme)) {
    const original = programme[key];
    const value =
      COLLECTIONS.includes(key) &&
      Array.isArray(original) &&
      Object.getPrototypeOf(original) === Array.prototype &&
      !("toJSON" in original)
        ? original.map(rowForIndex)
        : valueForKey(original, key);
    if (value === undefined) continue;
    if (key === "__proto__")
      Object.defineProperty(normalized, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    else normalized[key] = value;
  }
  return normalized;
}

/** Versioned transport only: every original row/field/value survives reconstruction. */
function encodeProgramme(programme, now = Date.now()) {
  const original = canonicalProgramme(programme);
  const source = JSON.stringify(original);
  if (Buffer.byteLength(source) > MAX_SNAPSHOT_BYTES)
    throw new ProgrammeTransportTooLarge();
  const snapshotId = randomUUID();
  const pages = [];
  const chunk = (part) => ({
    version: 1,
    snapshotId,
    index: pages.length,
    parts: [part],
  });
  for (const collection of COLLECTIONS) {
    const records = original[collection];
    if (!Array.isArray(records))
      throw new Error("Programme collection must be an array.");
    for (let offset = 0; offset < records.length;) {
      const shape = JSON.stringify(Object.keys(records[offset]));
      let end = offset + 1;
      while (
        end < records.length &&
        end - offset < 256 &&
        JSON.stringify(Object.keys(records[end])) === shape
      )
        end++;
      let count = end - offset,
        best = 0,
        part;
      // A measured size ratio normally finds a safe batch in two passes. Rebuilding
      // every midpoint used eight dictionary/JSON passes per page on large schedules.
      // Keep 1 KiB headroom because smaller batches may share fewer dictionary values.
      while (count >= 1) {
        const candidate = rowPart(
          collection,
          offset,
          records.slice(offset, offset + count),
        );
        const bytes = envelopeBytes(chunk(candidate));
        if (bytes < ENVELOPE_LIMIT_BYTES) {
          best = count;
          part = candidate;
          break;
        }
        if (count === 1) break;
        count = Math.max(
          1,
          Math.min(
            count - 1,
            Math.floor((count * (ENVELOPE_LIMIT_BYTES - 1024)) / bytes),
          ),
        );
      }
      if (best) {
        pages.push(chunk(part));
        offset += best;
      } else {
        // Legal 20K movie descriptions cannot fit one response. Explicit fragments
        // retain their complete JSON text, including Unicode/escapes, without truncation.
        const text = JSON.stringify(records[offset]);
        const fragments = [];
        for (let position = 0; position < text.length;) {
          let left = 1,
            right = text.length - position,
            length = 0;
          while (left <= right) {
            const middle = Math.floor((left + right) / 2);
            const candidate = {
              collection,
              offset,
              fragment: {
                index: fragments.length,
                total: 999999,
                text: text.slice(position, position + middle),
              },
            };
            if (envelopeBytes(chunk(candidate)) < ENVELOPE_LIMIT_BYTES) {
              length = middle;
              left = middle + 1;
            } else right = middle - 1;
          }
          if (!length)
            throw new Error(
              "Programme fragment cannot fit the transport budget.",
            );
          fragments.push(text.slice(position, position + length));
          position += length;
        }
        for (const [index, text] of fragments.entries())
          pages.push(
            chunk({
              collection,
              offset,
              fragment: { index, total: fragments.length, text },
            }),
          );
        offset++;
      }
      if (pages.length > MAX_CHUNKS) throw new ProgrammeTransportTooLarge();
    }
  }
  const manifest = {
    version: 1,
    encoding: "columnar-v1",
    snapshotId,
    asOf: original.asOf,
    until: original.until,
    expiresAt: new Date(now + RETENTION_SECONDS * 1000).toISOString(),
    counts: Object.fromEntries(
      COLLECTIONS.map((name) => [name, original[name].length]),
    ),
    chunks: pages.length,
  };
  for (const data of [manifest, ...pages])
    if (envelopeBytes(data) >= ENVELOPE_LIMIT_BYTES)
      throw new Error("Programme chunk exceeds the HTTP JSON byte budget.");
  return { manifest, pages, source };
}
module.exports = {
  encodeProgramme,
  ProgrammeTransportTooLarge,
  MAX_SNAPSHOT_BYTES,
  ENVELOPE_LIMIT_BYTES,
  RETENTION_SECONDS,
  REUSE_SECONDS,
  MAX_CHUNKS,
  COLLECTIONS,
};
