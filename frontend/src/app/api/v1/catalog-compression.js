import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const gzipBytes = promisify(gzip);
const brotliBytes = promisify(brotliCompress);

export function preferredContentEncoding(header) {
  const quality = new Map();
  for (const part of (header || "").split(",")) {
    const match = part
      .trim()
      .match(
        /^(br|gzip|identity|\*)(?:\s*;\s*q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i,
      );
    if (match) quality.set(match[1].toLowerCase(), Number(match[2] ?? 1));
  }
  const accepted = (encoding) => quality.get(encoding) ?? quality.get("*") ?? 0;
  const br = accepted("br"),
    gzip = accepted("gzip");
  const selected = br > 0 && br >= gzip ? "br" : gzip > 0 ? "gzip" : null;
  if (selected && (quality.get("identity") ?? 0) > accepted(selected))
    return null;
  return selected;
}

// Chỉ tái dùng biểu diễn nén của đúng những byte vừa đọc từ backend.
// Đây không phải cache dữ liệu: mỗi request vẫn kiểm tra upstream/rate limit.
export function createCatalogueCompressor({
  compress = (bytes, encoding) =>
    encoding === "br"
      ? brotliBytes(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } })
      : gzipBytes(bytes, { level: 4 }),
  maxEntries = 64,
  maxBytes = 8 * 1024 * 1024,
  ttlMs = 60_000,
  now = Date.now,
} = {}) {
  const entries = new Map();
  let size = 0;
  const remove = (key) => {
    const entry = entries.get(key);
    if (entry) size -= entry.size;
    entries.delete(key);
  };
  const trim = () => {
    for (const [key, entry] of entries) {
      if (entry.until <= now()) remove(key);
    }
    while (entries.size > maxEntries || size > maxBytes)
      remove(entries.keys().next().value);
  };
  return async (bytes, reuse = false, encoding = "gzip") => {
    if (!["br", "gzip"].includes(encoding))
      throw new Error("Unsupported content encoding.");
    if (!reuse || maxEntries <= 0 || maxBytes <= 0)
      return compress(bytes, encoding);
    const key = `${encoding}:${createHash("sha256").update(bytes).digest("hex")}`;
    trim();
    const existing = entries.get(key);
    if (existing) {
      entries.delete(key);
      entries.set(key, existing);
      return existing.pending;
    }
    const entry = { size: 0, until: now() + ttlMs };
    entry.pending = Promise.resolve()
      .then(() => compress(bytes, encoding))
      .then((encoded) => {
        if (entries.get(key) === entry) {
          entry.size = encoded.byteLength;
          size += entry.size;
          trim();
        }
        return encoded;
      })
      .catch((error) => {
        if (entries.get(key) === entry) remove(key);
        throw error;
      });
    entries.set(key, entry);
    trim();
    return entry.pending;
  };
}

export const compressCatalogue = createCatalogueCompressor();

// Không tái dùng dữ liệu giữ ghế, capacity, phiên đăng nhập hoặc đơn hàng.
export const reusableCatalogue = (method, endpoint) =>
  method === "GET" &&
  (/^\/(movies|cinemas|combos)(\/[^/]+)?$/.test(endpoint) ||
    endpoint === "/showtimes/programme" ||
    immutableProgrammeChunk(endpoint));

const immutableProgrammeChunk = (endpoint) =>
  /^\/showtimes\/programme\/chunks\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\/(?:0|[1-9]\d*)$/i.test(
    endpoint,
  );

// Chỉ chunk của snapshot bất biến có TTL; manifest và mọi API hiện hữu vẫn no-store.
export function immutableChunkCacheControl(
  method,
  endpoint,
  status,
  expiresAt,
  now = Date.now(),
) {
  if (method !== "GET" || status !== 200 || !immutableProgrammeChunk(endpoint))
    return "no-store";
  const remaining = Math.floor((Date.parse(expiresAt) - now) / 1000);
  if (!Number.isFinite(remaining) || remaining <= 0) return "no-store";
  return `private, max-age=${Math.min(remaining, 120)}, immutable`;
}
