import assert from "node:assert/strict";
import test from "node:test";
import { brotliDecompressSync, gunzipSync, gzipSync } from "node:zlib";
import {
  createCatalogueCompressor,
  immutableChunkCacheControl,
  preferredContentEncoding,
  reusableCatalogue,
} from "./catalog-compression.js";

test("Brotli and gzip representations preserve exact bytes with separate shared-cache entries", async () => {
  const compress = createCatalogueCompressor();
  const body = Buffer.from(
    JSON.stringify({
      title: "Lịch chiếu Việt Nam",
      rows: Array.from({ length: 100 }, (_, index) => ({
        id: index,
        room: "NOVA",
      })),
    }),
  );
  const gzip = await compress(body, true, "gzip");
  const br = await compress(body, true, "br");
  assert.deepEqual(gunzipSync(gzip), body);
  assert.deepEqual(brotliDecompressSync(br), body);
  assert.notDeepEqual(gzip, br);
  assert.strictEqual(await compress(body, true, "gzip"), gzip);
  assert.strictEqual(await compress(body, true, "br"), br);
  await assert.rejects(
    compress(body, true, "unsupported"),
    /Unsupported content encoding/,
  );
});

test("content negotiation preserves explicit identity/gzip and rejects q=0 or malformed weights", () => {
  for (const [header, expected] of [
    [undefined, null],
    ["identity", null],
    ["gzip", "gzip"],
    ["gzip, deflate, br, zstd", "br"],
    ["br;q=0,gzip;q=1", "gzip"],
    ["br;q=0.5,gzip;q=1", "gzip"],
    ["gzip;q=0.5,br;q=0.9", "br"],
    ["gzip;q=0,br;q=0", null],
    ["br;q=0.5,identity;q=1", null],
    ["br;q=1.000,gzip;q=0.900", "br"],
    ["br;q=2,gzip", "gzip"],
    ["BR; Q=0.8,gzip;q=0.5", "br"],
    ["br;q=0,*;q=0.8", "gzip"],
  ])
    assert.equal(preferredContentEncoding(header), expected, header);
});

test("gzip representation reuse preserves exact fresh bytes and coalesces compression only", async () => {
  let calls = 0;
  const compress = createCatalogueCompressor({
    compress: (bytes) => {
      calls++;
      return gzipSync(bytes);
    },
  });
  const first = Buffer.from('{"data":{"title":"Phim hiện tại"}}');
  const [a, b] = await Promise.all([
    compress(first, true),
    compress(first, true),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(gunzipSync(a), first);
  assert.deepEqual(gunzipSync(b), first);
  const edited = Buffer.from('{"data":{"title":"Phim đã sửa"}}');
  assert.deepEqual(gunzipSync(await compress(edited, true)), edited);
  assert.equal(calls, 2);
  await compress(first, false);
  await compress(first, false);
  assert.equal(calls, 4);
});

test("gzip memory bounds and expiry evict representations without changing responses", async () => {
  let clock = 0;
  let calls = 0;
  const compress = createCatalogueCompressor({
    compress: (bytes) => {
      calls++;
      return gzipSync(bytes);
    },
    maxEntries: 1,
    maxBytes: 64,
    ttlMs: 5,
    now: () => clock,
  });
  const a = Buffer.from("a"),
    b = Buffer.from("b");
  await compress(a, true);
  await compress(b, true);
  assert.deepEqual(gunzipSync(await compress(a, true)), a);
  assert.equal(calls, 3);
  clock = 6;
  await compress(a, true);
  assert.equal(calls, 4);
  const uncached = createCatalogueCompressor({
    maxBytes: 1,
    compress: (bytes) => {
      calls++;
      return gzipSync(bytes);
    },
  });
  await uncached(a, true);
  await uncached(a, true);
  assert.equal(calls, 6);
});

test("failed compression is retried and dynamic/private endpoints never opt into reuse", async () => {
  let calls = 0;
  const compress = createCatalogueCompressor({
    compress: (bytes) => {
      if (++calls === 1) throw new Error("temporary encoder failure");
      return gzipSync(bytes);
    },
  });
  const body = Buffer.from("fresh backend bytes");
  await assert.rejects(compress(body, true), /temporary encoder failure/);
  assert.deepEqual(gunzipSync(await compress(body, true)), body);
  assert.equal(calls, 2);
  for (const endpoint of [
    "/showtimes/uuid/seats",
    "/showtimes/capacities",
    "/rooms/uuid/seats",
    "/bookings/me",
    "/tickets/me",
    "/users/me",
    "/auth/refresh",
  ])
    assert.equal(reusableCatalogue("GET", endpoint), false);
  assert.equal(reusableCatalogue("POST", "/movies"), false);
  assert.equal(reusableCatalogue("GET", "/movies"), true);
  assert.equal(reusableCatalogue("GET", "/showtimes/programme"), true);
});

test("only successful immutable snapshot chunks opt into bounded browser cache", () => {
  const endpoint =
    "/showtimes/programme/chunks/12345678-1234-1234-1234-123456789abc/0";
  const now = Date.parse("2026-10-29T00:00:00Z");
  const expiresAt = "2026-10-29T00:01:05Z";
  assert.equal(reusableCatalogue("GET", endpoint), true);
  assert.equal(
    immutableChunkCacheControl("GET", endpoint, 200, expiresAt, now),
    "private, max-age=65, immutable",
  );
  assert.equal(
    immutableChunkCacheControl(
      "GET",
      endpoint,
      200,
      "2026-10-29T01:00:00Z",
      now,
    ),
    "private, max-age=120, immutable",
  );
  for (const [method, path, status, expires] of [
    ["GET", endpoint, 404, expiresAt],
    ["POST", endpoint, 200, expiresAt],
    ["GET", "/showtimes/programme/manifest", 200, expiresAt],
    ["GET", "/showtimes/programme", 200, expiresAt],
    ["GET", "/users/me", 200, expiresAt],
    ["GET", "/showtimes/uuid/seats", 200, expiresAt],
    ["GET", endpoint, 200, "invalid-date"],
    ["GET", endpoint, 200, "2026-10-28T00:00:00Z"],
  ])
    assert.equal(
      immutableChunkCacheControl(method, path, status, expires, now),
      "no-store",
    );
});
