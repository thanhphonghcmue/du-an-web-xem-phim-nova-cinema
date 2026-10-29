import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { decodeProgramme } from "../frontend/src/api/programme-transport.js";

const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );
const collections = ["movies", "cinemas", "rooms", "combos", "showtimes"];
const percentile = (values, ratio) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * ratio) - 1];

function saveMetric(name, data) {
  const path = process.env.NOVA_QA_OPTIMIZATION_METRICS_FILE;
  if (!path) return;
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      { ...previous, measuredAt: new Date().toISOString(), [name]: data },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  req("dotenv").config({
    path: new URL("../backend/.env", import.meta.url).pathname,
    quiet: true,
  });
  const f = fixture();
  expect(f.prefix).toMatch(/^web-e2e-[a-f0-9]+$/);
  const Redis = req("ioredis");
  const redis = new Redis({
    host: process.env.TEST_REDIS_HOST,
    port: Number(process.env.TEST_REDIS_PORT),
    password: process.env.TEST_REDIS_PASSWORD,
    db: Number(process.env.TEST_REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  try {
    const keys = await redis.keys(f.prefix + ":throttle:*");
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
});

async function measuredFetch(page, path, cache = "no-store") {
  return page.evaluate(
    async ({ path, cache }) => {
      const started = performance.now();
      const response = await fetch("/api/v1" + path, { cache });
      const headersAt = performance.now();
      const bytes = await response.arrayBuffer();
      const completedAt = performance.now();
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      const timing = performance.getEntriesByName(response.url).at(-1);
      return {
        status: response.status,
        payload,
        sample: {
          ttfbMs: headersAt - started,
          lastByteMs: completedAt - started,
          decodedHttpJsonBytes: bytes.byteLength,
          wireBytes: timing?.encodedBodySize ?? null,
          transferBytes: timing?.transferSize ?? null,
          cacheControl: response.headers.get("cache-control"),
          contentEncoding:
            response.headers.get("content-encoding") || "identity",
        },
      };
    },
    { path, cache },
  );
}

test("PERF-OPT structured snapshots preserve every catalogue field and report cold, warm, per-chunk and aggregate sizes separately", async ({
  page,
}) => {
  test.setTimeout(120000);
  const f = fixture();
  // Origin context only: do not silently warm the application manifest before measuring.
  await page.goto("/api/v1/runtime");
  const signedIn = await page.request.post("/api/v1/auth/login", {
    data: { email: f.accounts.admin.email, password: f.password },
  });
  expect(signedIn.status()).toBe(200);
  const originalResponse = await page.request.get(
    `/api/v1/movies/${f.movie.id}`,
  );
  expect(originalResponse.status()).toBe(200);
  const original = (await originalResponse.json()).data;
  const previous = await measuredFetch(
    page,
    "/showtimes/programme/manifest?days=60",
  );
  expect(previous.status).toBe(200);
  const editedDescription = `${original.description} · owned optimization fixture`;
  try {
    expect(
      (
        await page.request.patch(`/api/v1/movies/${f.movie.id}`, {
          data: { description: editedDescription },
        })
      ).status(),
    ).toBe(200);
    // A real owned Admin write invalidates the old revision, forcing this cold rebuild.
    const cold = await measuredFetch(
      page,
      "/showtimes/programme/manifest?days=60",
    );
    expect(cold.status).toBe(200);
    expect(cold.payload.success).toBe(true);
    const manifest = cold.payload.data;
    expect(manifest.encoding).toBe("columnar-v1");
    expect(manifest.snapshotId).not.toBe(previous.payload.data.snapshotId);
    expect(cold.sample.cacheControl).toBe("no-store");
    expect(cold.sample.decodedHttpJsonBytes).toBeLessThan(15 * 1024);
    expect(manifest.chunks).toBeGreaterThan(0);
    expect(manifest.chunks).toBeLessThanOrEqual(4096);

    const warmManifest = [];
    for (let index = 0; index < 10; index++) {
      const result = await measuredFetch(
        page,
        "/showtimes/programme/manifest?days=60",
      );
      expect(result.status).toBe(200);
      expect(result.payload.data.snapshotId).toBe(manifest.snapshotId);
      warmManifest.push(result.sample);
    }
    const chunks = [],
      chunkSamples = [];
    let next = 0;
    const allChunksStarted = performance.now();
    await Promise.all(
      Array.from({ length: Math.min(4, manifest.chunks) }, async () => {
        while (next < manifest.chunks) {
          const index = next++;
          const path = `/showtimes/programme/chunks/${manifest.snapshotId}/${index}`;
          const result = await measuredFetch(page, path, "force-cache");
          expect(result.status).toBe(200);
          expect(result.payload.success).toBe(true);
          expect(result.payload.data.snapshotId).toBe(manifest.snapshotId);
          expect(result.payload.data.index).toBe(index);
          expect(result.sample.decodedHttpJsonBytes).toBeLessThan(15 * 1024);
          expect(result.sample.cacheControl).toMatch(
            /^private, max-age=\d+, immutable$/,
          );
          const age = Number(
            result.sample.cacheControl.match(/max-age=(\d+)/)[1],
          );
          expect(age).toBeGreaterThan(0);
          expect(age).toBeLessThanOrEqual(120);
          chunks[index] = result.payload.data;
          chunkSamples[index] = result.sample;
        }
      }),
    );
    const allChunksCompletedMs = performance.now() - allChunksStarted;
    const rebuilt = await decodeProgramme(manifest, chunks);
    const legacy = await measuredFetch(page, "/showtimes/programme?days=60");
    expect(legacy.status).toBe(200);
    for (const name of collections) {
      expect(rebuilt[name]).toHaveLength(manifest.counts[name]);
      const sort = (rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
      // Exact fields, IDs, money strings and timestamps; not just row counts.
      expect(sort(rebuilt[name])).toEqual(sort(legacy.payload.data[name]));
      expect(rebuilt[name].every((row) => !Array.isArray(row.seats))).toBe(
        true,
      );
    }
    expect(
      rebuilt.movies.find((row) => row.id === f.movie.id).description,
    ).toBe(editedDescription);
    const warmChunk = [];
    for (let index = 0; index < 10; index++) {
      const result = await measuredFetch(
        page,
        `/showtimes/programme/chunks/${manifest.snapshotId}/0`,
        "no-store",
      );
      expect(result.status).toBe(200);
      expect(result.payload.data).toEqual(chunks[0]);
      warmChunk.push(result.sample);
    }
    const rawCatalogueBytes = Buffer.byteLength(JSON.stringify(rebuilt));
    const aggregateDecodedHttpJsonBytes =
      cold.sample.decodedHttpJsonBytes +
      chunkSamples.reduce(
        (sum, sample) => sum + sample.decodedHttpJsonBytes,
        0,
      );
    const aggregateWireBytes = [cold.sample, ...chunkSamples].every(
      (sample) => sample.wireBytes !== null,
    )
      ? [cold.sample, ...chunkSamples].reduce(
          (sum, sample) => sum + sample.wireBytes,
          0,
        )
      : null;
    const metric = {
      layer:
        "production browser -> Next BFF -> native Nest/PostgreSQL/Redis; loopback, not WAN/SLA",
      encoding: manifest.encoding,
      coldDefinition:
        "first manifest immediately after owned Admin description write; prior revision was read and new snapshot ID asserted",
      counts: manifest.counts,
      chunks: manifest.chunks,
      coldManifest: cold.sample,
      warmManifest,
      firstPassChunkSamples: chunkSamples,
      warmChunkNetworkSamples: warmChunk,
      warmManifestP95Ms: percentile(
        warmManifest.map((sample) => sample.lastByteMs),
        0.95,
      ),
      firstPassChunksP95Ms: percentile(
        chunkSamples.map((sample) => sample.lastByteMs),
        0.95,
      ),
      warmChunkNetworkP95Ms: percentile(
        warmChunk.map((sample) => sample.lastByteMs),
        0.95,
      ),
      allChunksCompletedMs,
      reconstructedCatalogueJsonBytes: rawCatalogueBytes,
      legacyDecodedHttpJsonBytes: legacy.sample.decodedHttpJsonBytes,
      aggregateDecodedHttpJsonBytes,
      aggregateWireBytes,
      maxChunkDecodedHttpJsonBytes: Math.max(
        ...chunkSamples.map((sample) => sample.decodedHttpJsonBytes),
      ),
      budgets: {
        coldManifestUnder30ms: cold.sample.lastByteMs < 30,
        warmManifestP95Under30ms:
          percentile(
            warmManifest.map((sample) => sample.lastByteMs),
            0.95,
          ) < 30,
        firstPassChunksP95Under30ms:
          percentile(
            chunkSamples.map((sample) => sample.lastByteMs),
            0.95,
          ) < 30,
        warmChunkNetworkP95Under30ms:
          percentile(
            warmChunk.map((sample) => sample.lastByteMs),
            0.95,
          ) < 30,
        everyChunkHttpJsonUnder15KiB: chunkSamples.every(
          (sample) => sample.decodedHttpJsonBytes < 15 * 1024,
        ),
        reconstructedCatalogueJsonUnder15KiB: rawCatalogueBytes < 15 * 1024,
        aggregateHttpJsonUnder15KiB: aggregateDecodedHttpJsonBytes < 15 * 1024,
      },
      note: "Per-chunk HTTP JSON budget is separate from the full reconstructed catalogue and total transfer. Existing legacy endpoint metrics remain unchanged in qa-metrics.spec.mjs.",
    };
    saveMetric("structuredTransport", metric);
    console.log(
      `PERF-OPT chunks=${manifest.chunks}, warm manifest p95=${metric.warmManifestP95Ms.toFixed(1)}ms, warm chunk network p95=${metric.warmChunkNetworkP95Ms.toFixed(1)}ms; budgets=${JSON.stringify(metric.budgets)}`,
    );
  } finally {
    expect(
      (
        await page.request.patch(`/api/v1/movies/${f.movie.id}`, {
          data: { description: original.description },
        })
      ).status(),
    ).toBe(200);
  }
});

test("PERF-OPT active frontend uses complete structured snapshots and reload reuses immutable browser chunks", async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests = [];
  const negotiationTasks = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  page.on("response", (response) => {
    if (
      response.ok() &&
      new URL(response.url()).pathname.startsWith(
        "/api/v1/showtimes/programme/chunks/",
      )
    )
      negotiationTasks.push(
        (async () => {
          // Persist only Accept-Encoding, never cookies or authorization headers.
          const offered =
            (await response.request().allHeaders())["accept-encoding"] || "";
          return {
            offered,
            selected: response.headers()["content-encoding"] || "identity",
            decodedBytes: (await response.body()).byteLength,
          };
        })().catch(() => ({ captureFailed: true })),
      );
  });
  await page.goto("/");
  await expect(page.locator("#movies .discovery-film").first()).toBeVisible({
    timeout: 30000,
  });
  expect(requests).toContain("/api/v1/showtimes/programme/manifest");
  expect(
    requests.some((path) =>
      path.startsWith("/api/v1/showtimes/programme/chunks/"),
    ),
  ).toBe(true);
  expect(requests).not.toContain("/api/v1/showtimes/programme");
  const displayedMovies = await page.locator("#movies .discovery-film").count();
  const before = await page.request.get(
    "/api/v1/showtimes/programme/manifest?days=60",
  );
  expect(before.status()).toBe(200);
  const manifest = (await before.json()).data;
  expect(displayedMovies).toBe(manifest.counts.movies);
  await page.reload();
  await expect(page.locator("#movies .discovery-film")).toHaveCount(
    displayedMovies,
  );
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) =>
        entry.name.includes("/api/v1/showtimes/programme/chunks/"),
      )
      .map((entry) => ({
        durationMs: entry.duration,
        transferBytes: entry.transferSize,
        decodedHttpJsonBytes: entry.decodedBodySize,
        wireBytes: entry.encodedBodySize,
      })),
  );
  expect(resources).toHaveLength(manifest.chunks);
  expect(resources.every((entry) => entry.transferBytes === 0)).toBe(true);
  const negotiation = await Promise.all(negotiationTasks);
  expect(negotiation.every((entry) => !entry.captureFailed)).toBe(true);
  const quality = (header, encoding) => {
    const part = header
      .split(",")
      .find((part) => part.trim().split(";")[0] === encoding);
    return part ? Number(part.match(/;\s*q=([\d.]+)/)?.[1] ?? 1) : 0;
  };
  const offeredBrotli = negotiation.filter(
    (entry) =>
      entry.decodedBytes >= 1024 &&
      quality(entry.offered, "br") > 0 &&
      quality(entry.offered, "br") >= quality(entry.offered, "gzip"),
  );
  for (const entry of offeredBrotli) expect(entry.selected).toBe("br");
  saveMetric("activeFrontend", {
    displayedMovies,
    expectedMovies: manifest.counts.movies,
    chunks: manifest.chunks,
    reloadedChunkResources: resources,
    browserCacheHits: resources.filter((entry) => entry.transferBytes === 0)
      .length,
    contentNegotiation: negotiation,
    eligibleBrowserBrotliResponses: offeredBrotli.length,
    note: "transferSize=0 verifies browser HTTP cache, not a sub-30ms backend roundtrip; manifest remains network/no-store.",
  });
});
