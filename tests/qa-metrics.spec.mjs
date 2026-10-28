import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

test("PERF-02 measures actual BFF catalogue/seat responses and reports unmet budgets honestly", async ({
  page,
}) => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );
  expect(fixture.prefix).toMatch(/^web-e2e-[a-f0-9]+$/);
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await page.goto("/");
  const measurements = [];
  for (const [resource, path] of [
    ["movies", "/movies?limit=100"],
    ["cinemas", "/cinemas?limit=100"],
    ["programme", "/showtimes/programme?days=60"],
    ["seats", `/showtimes/${fixture.showtime.id}/seats`],
  ]) {
    const samples = [];
    for (let index = 0; index < 10; index++) {
      const sample = await page.evaluate(
        async ({ path, resource }) => {
          const started = performance.now();
          const response = await fetch("/api/v1" + path, { cache: "no-store" });
          const headersAt = performance.now();
          const bytes = await response.arrayBuffer();
          const completedAt = performance.now();
          const data = JSON.parse(new TextDecoder().decode(bytes));
          const timing = performance.getEntriesByName(response.url).at(-1);
          const catalogue =
            resource === "programme" ? data.data.movies : data.data.items;
          return {
            status: response.status,
            success: data.success,
            ttfbMs: headersAt - started,
            lastByteMs: completedAt - started,
            decodedBytes: bytes.byteLength,
            wireBytes: timing?.encodedBodySize ?? null,
            seatsEmbeddedInCatalogue:
              resource === "seats"
                ? false
                : catalogue.some((item) => Array.isArray(item.seats)),
          };
        },
        { path, resource },
      );
      expect(sample.status).toBe(200);
      expect(sample.success).toBe(true);
      expect(sample.seatsEmbeddedInCatalogue).toBe(false);
      samples.push(sample);
    }
    const percentile = (key, ratio) =>
      [...samples].sort((a, b) => a[key] - b[key])[
        Math.ceil(samples.length * ratio) - 1
      ][key];
    const p95LastByteMs = percentile("lastByteMs", 0.95);
    const wireBytes = samples[0].wireBytes;
    measurements.push({
      resource,
      samples,
      p50LastByteMs: percentile("lastByteMs", 0.5),
      p95LastByteMs,
      budgets: {
        lastByteUnder30ms: p95LastByteMs < 30,
        wireUnder15KiB: wireBytes === null ? null : wireBytes < 15 * 1024,
        decodedJsonUnder15KiB: samples[0].decodedBytes < 15 * 1024,
      },
    });
  }
  const report = {
    measuredAt: new Date().toISOString(),
    frontend: "Next BFF",
    network: "loopback; includes first potentially cold sample; not WAN/SLA",
    samplesPerResource: 10,
    measurements,
  };
  if (process.env.NOVA_QA_METRICS_FILE) {
    mkdirSync(dirname(process.env.NOVA_QA_METRICS_FILE), { recursive: true });
    writeFileSync(
      process.env.NOVA_QA_METRICS_FILE,
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600 },
    );
  }
  for (const measurement of measurements)
    console.log(
      `PERF ${measurement.resource}: p95=${measurement.p95LastByteMs.toFixed(1)}ms, wire=${measurement.samples[0].wireBytes} bytes; budgets=${JSON.stringify(measurement.budgets)}`,
    );
});
