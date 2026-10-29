import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import codec from "../backend/programme-codec.cjs";
import {
  decodeProgramme,
  loadProgramme,
} from "../frontend/src/api/programme-transport.js";

function fixture(count = 800) {
  const movieId = randomUUID(),
    roomId = randomUUID();
  return {
    movies: [
      {
        id: movieId,
        title: "Phim Việt",
        description: "Đầy đủ dữ liệu",
        extra: { s: "literal object", nested: [1, null] },
      },
    ],
    cinemas: [{ id: randomUUID(), name: "Rạp thử" }],
    rooms: [{ id: roomId, roomType: "IMAX_70MM_LASER", totalSeats: 240 }],
    combos: [
      { id: randomUUID(), price: "69000.00", isActive: true, imageUrl: null },
    ],
    showtimes: Array.from({ length: count }, (_, i) => ({
      id: randomUUID(),
      movieId,
      roomId,
      startTime: new Date(Date.UTC(2030, 0, 1) + i * 9000000).toISOString(),
      endTime: new Date(
        Date.UTC(2030, 0, 1) + i * 9000000 + 8100000,
      ).toISOString(),
      baseTicketPrice: "90000.00",
      createdAt: "2026-10-29T00:00:00.000Z",
      updatedAt: "2026-10-29T00:00:00.000Z",
    })),
    asOf: "2026-10-29T00:00:00.000Z",
    until: "2031-01-01T00:00:00.000Z",
  };
}
const signal = () => new AbortController().signal;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("columnar pages retain every field and UUID for a 12000-screening catalogue", () => {
  const original = fixture(12000),
    { manifest, pages } = codec.encodeProgramme(original);
  assert.ok(
    pages.length > 60,
    "Exercise the real large programme rather than a tiny six-film fixture",
  );
  for (const data of [manifest, ...pages]) {
    const size = Buffer.byteLength(
      JSON.stringify({
        success: true,
        data,
        message: "Request completed successfully.",
      }),
    );
    assert.ok(
      size < 15 * 1024,
      `An actual JSON response exceeded the budget: ${size}`,
    );
  }
  assert.deepEqual(decodeProgramme(manifest, pages.toReversed()), original);
});

test("oversized Vietnamese descriptions and literal objects round-trip without truncation", () => {
  const original = fixture(0);
  original.movies[0].description = 'Ánh sáng 🎬 \\ "\n'.repeat(3500);
  original.movies.push({ id: randomUUID(), alternate: true });
  const { manifest, pages } = codec.encodeProgramme(original);
  assert.ok(pages.some((p) => p.parts.some((part) => part.fragment)));
  assert.deepEqual(decodeProgramme(manifest, pages), original);
});

test("missing, mixed, repeated chunks and invalid dictionary references fail closed", () => {
  const { manifest, pages } = codec.encodeProgramme(fixture());
  assert.throws(() => decodeProgramme(manifest, pages.slice(1)));
  for (const corrupt of [
    (p) => {
      p[1] = p[0];
    },
    (p) => {
      p[0].snapshotId = randomUUID();
    },
    (p) => {
      p[0].parts[0].rows[0][0] = { s: 999999 };
    },
    (p) => {
      p[0].parts[0].offset = 999999;
    },
  ]) {
    const changed = plain(pages);
    corrupt(changed);
    assert.throws(() => decodeProgramme(manifest, changed));
  }
});

test("loader bounds simultaneous requests to four and reconstructs the complete snapshot", async () => {
  const original = fixture(2500),
    { manifest, pages } = codec.encodeProgramme(original);
  let active = 0,
    maxActive = 0;
  const result = await loadProgramme(async (path, options) => {
    if (path.endsWith("/manifest")) return manifest;
    active++;
    maxActive = Math.max(active, maxActive);
    try {
      assert.equal(options.cache, "force-cache");
      await new Promise((done) => setTimeout(done, 2));
      return pages[Number(path.split("/").at(-1))];
    } finally {
      active--;
    }
  }, signal());
  assert.equal(maxActive, 4);
  assert.deepEqual(result, original);
});

test("only unsupported or explicitly oversized transport falls back; backend outages remain failures", async () => {
  const original = fixture(0);
  for (const unsupported of [
    { status: 404 },
    { status: 422, code: "PROGRAMME_TRANSPORT_TOO_LARGE" },
  ]) {
    const calls = [];
    assert.deepEqual(
      await loadProgramme(async (path) => {
        calls.push(path);
        if (path.endsWith("/manifest"))
          throw Object.assign(new Error("unsupported"), unsupported);
        return original;
      }, signal()),
      original,
    );
    assert.deepEqual(calls, [
      "/showtimes/programme/manifest",
      "/showtimes/programme",
    ]);
  }
  let failedCalls = 0;
  await assert.rejects(
    loadProgramme(async () => {
      failedCalls++;
      throw Object.assign(new Error("offline"), { status: 503 });
    }, signal()),
  );
  assert.equal(failedCalls, 1);
});

test("expired immutable snapshot is retried once without mixing old/new rows", async () => {
  const first = codec.encodeProgramme(fixture(0));
  const original = fixture(2),
    next = codec.encodeProgramme(original);
  let manifests = 0;
  const result = await loadProgramme(async (path) => {
    if (path.endsWith("/manifest"))
      return ++manifests === 1 ? first.manifest : next.manifest;
    if (path.includes(first.manifest.snapshotId))
      throw Object.assign(new Error("expired"), { status: 410 });
    return next.pages[Number(path.split("/").at(-1))];
  }, signal());
  assert.equal(manifests, 2);
  assert.deepEqual(result, original);
});
