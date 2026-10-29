const collections = ["movies", "cinemas", "rooms", "combos", "showtimes"];
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const invalid = () =>
  new Error("Dữ liệu lịch chiếu chưa đầy đủ. Vui lòng tải lại.");
const integer = (value, min, max) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

export function validateManifest(manifest) {
  if (
    manifest?.version !== 1 ||
    manifest.encoding !== "columnar-v1" ||
    !uuid.test(manifest.snapshotId) ||
    !integer(manifest.chunks, 0, 4096) ||
    !Number.isFinite(Date.parse(manifest.asOf)) ||
    !Number.isFinite(Date.parse(manifest.until)) ||
    !Number.isFinite(Date.parse(manifest.expiresAt)) ||
    !collections.every((name) =>
      integer(manifest.counts?.[name], 0, name === "showtimes" ? 20000 : 2000),
    )
  )
    throw invalid();
  return manifest;
}

// Chỉ giải mã bản ghi thật. Không suy diễn ID, ngày hoặc suất từ một mẫu lịch.
export function decodeProgramme(input, chunks) {
  const manifest = validateManifest(input);
  if (!Array.isArray(chunks) || chunks.length !== manifest.chunks)
    throw invalid();
  const data = Object.fromEntries(
    collections.map((name) => [name, new Array(manifest.counts[name])]),
  );
  const filled = Object.fromEntries(
    collections.map((name) => [name, new Set()]),
  );
  const seen = new Set();
  const fragments = new Map();
  function put(collection, offset, row) {
    if (
      !integer(offset, 0, manifest.counts[collection] - 1) ||
      filled[collection].has(offset) ||
      !row ||
      typeof row !== "object" ||
      Array.isArray(row)
    )
      throw invalid();
    data[collection][offset] = row;
    filled[collection].add(offset);
  }
  for (const chunk of chunks) {
    if (
      chunk?.version !== 1 ||
      chunk.snapshotId !== manifest.snapshotId ||
      !integer(chunk.index, 0, manifest.chunks - 1) ||
      seen.has(chunk.index) ||
      !Array.isArray(chunk.parts)
    )
      throw invalid();
    seen.add(chunk.index);
    for (const part of chunk.parts) {
      if (
        !collections.includes(part?.collection) ||
        !integer(part.offset, 0, manifest.counts[part.collection] - 1)
      )
        throw invalid();
      const { collection, offset } = part;
      if (part.fragment) {
        const { index, total, text } = part.fragment;
        if (
          !integer(total, 1, 128) ||
          !integer(index, 0, total - 1) ||
          typeof text !== "string"
        )
          throw invalid();
        const key = `${collection}:${offset}`;
        const group = fragments.get(key) || {
          collection,
          offset,
          total,
          pieces: new Map(),
        };
        if (group.total !== total || group.pieces.has(index)) throw invalid();
        group.pieces.set(index, text);
        fragments.set(key, group);
        continue;
      }
      const { keys, strings, rows } = part;
      const stringColumns = part.stringColumns || [];
      if (
        !Array.isArray(keys) ||
        keys.length === 0 ||
        keys.length > 100 ||
        !keys.every((key) => typeof key === "string") ||
        new Set(keys).size !== keys.length ||
        !Array.isArray(strings) ||
        !strings.every((value) => typeof value === "string") ||
        !Array.isArray(rows) ||
        rows.length === 0 ||
        !Array.isArray(stringColumns) ||
        !stringColumns.every((column) => integer(column, 0, keys.length - 1)) ||
        new Set(stringColumns).size !== stringColumns.length
      )
        throw invalid();
      rows.forEach((cells, index) => {
        if (!Array.isArray(cells) || cells.length !== keys.length)
          throw invalid();
        const values = cells.map((cell, column) => {
          if (stringColumns.includes(column) && typeof cell === "number") {
            if (!integer(cell, 0, strings.length - 1)) throw invalid();
            return strings[cell];
          }
          if (cell === null || typeof cell !== "object") return cell;
          if (Object.keys(cell).length !== 1) throw invalid();
          if (Object.hasOwn(cell, "s")) {
            if (!integer(cell.s, 0, strings.length - 1)) throw invalid();
            return strings[cell.s];
          }
          if (Object.hasOwn(cell, "v")) return cell.v;
          throw invalid();
        });
        put(
          collection,
          offset + index,
          Object.fromEntries(keys.map((key, i) => [key, values[i]])),
        );
      });
    }
  }
  for (const { collection, offset, total, pieces } of fragments.values()) {
    if (pieces.size !== total) throw invalid();
    const text = Array.from({ length: total }, (_, index) =>
      pieces.get(index),
    ).join("");
    if (text.length > 200000) throw invalid();
    put(collection, offset, JSON.parse(text));
  }
  if (!collections.every((name) => filled[name].size === manifest.counts[name]))
    throw invalid();
  return { ...data, asOf: manifest.asOf, until: manifest.until };
}

export async function loadProgramme(request, signal) {
  // Khi rolling deploy gặp backend cũ, chỉ fallback vì endpoint chưa tồn tại.
  // Lỗi mạng/503 không được biến thành catalogue giả hoặc đổi nguồn dữ liệu.
  for (let attempt = 0; attempt < 2; attempt++) {
    let manifest;
    try {
      manifest = validateManifest(
        await request("/showtimes/programme/manifest", { signal }),
      );
    } catch (error) {
      if (
        error.status === 404 ||
        (error.status === 422 && error.code === "PROGRAMME_TRANSPORT_TOO_LARGE")
      )
        return request("/showtimes/programme", { signal });
      throw error;
    }
    const chunks = new Array(manifest.chunks);
    let next = 0;
    const controller = new AbortController();
    const groupSignal = AbortSignal.any([signal, controller.signal]);
    try {
      await Promise.all(
        Array.from({ length: Math.min(4, manifest.chunks) }, async () => {
          while (next < chunks.length) {
            const index = next++;
            chunks[index] = await request(
              `/showtimes/programme/chunks/${manifest.snapshotId}/${index}`,
              { signal: groupSignal, cache: "force-cache" },
            );
          }
        }),
      );
      return decodeProgramme(manifest, chunks);
    } catch (error) {
      controller.abort();
      if (error.status !== 410 || attempt !== 0) throw error;
    }
  }
  throw invalid();
}
