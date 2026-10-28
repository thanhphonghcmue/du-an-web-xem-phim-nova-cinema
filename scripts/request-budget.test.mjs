import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { requestBudget, abortable } from "../frontend/src/api/budget.js";
import { holdSeconds } from "../frontend/src/holdDeadline.js";
const nativeFetch = globalThis.fetch;
async function fixture(t, handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = (url, options) => nativeFetch(base + url, options);
  t.after(async () => {
    globalThis.fetch = nativeFetch;
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  });
  return import(`../frontend/src/api/client.js?test=${Math.random()}`);
}
test("a hung response body cannot exceed the shared eight-second request budget", async (t) => {
  const api = await fixture(t, (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"success":true,"data":');
  });
  const start = performance.now();
  await assert.rejects(
    api.apiRequest("/held-body"),
    (error) => error.code === "REQUEST_TIMEOUT",
  );
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 7900 && elapsed < 9500);
  console.log(`stalled response body aborted after ${elapsed.toFixed(0)}ms`);
});
test("retry and first request share one deadline rather than renewing eight seconds", async (t) => {
  let calls = 0;
  const api = await fixture(t, (_req, res) => {
    calls++;
    if (calls === 1) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end('{"error":"SERVICE_UNAVAILABLE"}');
    }
  });
  const start = performance.now();
  await assert.rejects(
    api.apiRequest("/retry-stall"),
    (error) => error.code === "REQUEST_TIMEOUT",
  );
  assert.equal(calls, 2);
  assert.ok(performance.now() - start < 9500);
});
test("a caller signal still has a deadline and can cancel promptly", async (t) => {
  const api = await fixture(t, () => {}),
    controller = new AbortController();
  setTimeout(() => controller.abort(), 30);
  const start = performance.now();
  await assert.rejects(
    api.apiRequest("/cancel", { signal: controller.signal }),
    (error) => error.message === "Đã hủy yêu cầu.",
  );
  assert.ok(performance.now() - start < 1000);
});
test("already-aborted waits do not leave a rejected task unobserved", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    abortable(Promise.reject(new Error("owned task")), controller.signal),
  );
  await new Promise((done) => setTimeout(done, 0));
});
test("successful writes invalidate in-flight read reuse; public programme has a short cache", async (t) => {
  let gets = 0;
  const api = await fixture(t, (req, res) => {
    if (req.method === "GET") gets++;
    setTimeout(() => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success: true, data: { value: gets } }));
    }, 20);
  });
  await Promise.all([
    api.read("/showtimes/programme"),
    api.read("/showtimes/programme"),
    api.read("/showtimes/programme"),
  ]);
  await api.read("/showtimes/programme");
  assert.equal(gets, 1);
  await api.apiRequest("/movies", { method: "POST", body: "{}" });
  await api.read("/showtimes/programme");
  assert.equal(gets, 2);
});
test("unsafe commands are not blindly replayed on 503", async (t) => {
  let count = 0;
  const api = await fixture(t, (_req, res) => {
    count++;
    res.writeHead(503, { "content-type": "application/json" });
    res.end('{"error":"SERVICE_UNAVAILABLE"}');
  });
  await assert.rejects(
    api.apiRequest("/payments/create-sandbox-url", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(count, 1);
});
test("pagination accepts native empty pages and rejects unbounded or inconsistent metadata", async (t) => {
  let pages = 0,
    items = [],
    calls = 0;
  const api = await fixture(t, (_req, res) => {
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        data: { items, meta: { totalPages: pages } },
      }),
    );
  });
  assert.deepEqual(await api.apiList("/empty-room-seats"), []);
  for (const bad of [-1, 1001, 1.5, "2", null]) {
    pages = bad;
    await assert.rejects(api.apiList("/invalid-pages"));
  }
  pages = 0;
  items = [{ id: "unexpected" }];
  await assert.rejects(api.apiList("/nonempty-zero-pages"));
  assert.equal(calls, 7);
});
test("an independent budget cancels a non-network wait and cleans up", async () => {
  const budget = requestBudget(undefined, 30);
  try {
    await assert.rejects(
      abortable(new Promise(() => {}), budget.signal),
      (e) => e.name === "TimeoutError",
    );
  } finally {
    budget.dispose();
  }
});
test("hold countdown uses the server offset and cannot become negative or NaN", () => {
  assert.equal(holdSeconds(new Date(301000).toISOString(), 1000, 0), 300);
  assert.equal(holdSeconds(new Date(301000).toISOString(), 1000, 301001), 0);
  assert.equal(holdSeconds("invalid", 0, 0), 0);
});
