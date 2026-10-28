/** Production-browser benchmark against ONLY the owned fullstack TEST_DATABASE fixture.
 * Build first, start NOVA_QA_PRODUCTION=1 node scripts/fullstack-test-server.cjs,
 * then node scripts/networkBenchmark.js --label before|after. Never logs payloads/secrets.
 */
import { chromium } from "@playwright/test";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { request as httpRequest } from "node:http";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { chooseOption, chooseDate } from "../tests/ui-choices.mjs";
import { startUiFreezeObserver } from "./lib/uiFreezeObserver.js";
const label = process.argv[process.argv.indexOf("--label") + 1];
if (!["before", "after"].includes(label))
  throw new Error("Use --label before|after");
const origin = `http://127.0.0.1:${Number(process.env.PLAYWRIGHT_PORT || 38173)}`;
const apiOrigin = `http://127.0.0.1:${Number(process.env.FULLSTACK_API_PORT || 38174)}`;
const f = JSON.parse(
  readFileSync(
    new URL("../.runtime/fullstack-test.json", import.meta.url),
    "utf8",
  ),
);
if (!/^web-e2e-[a-f0-9]+$/.test(f.prefix))
  throw new Error("An owned isolated fixture is required.");
const samples = [],
  checks = {};
let currentStep = "browser startup";
function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.qaAssertion = message;
    throw error;
  }
}
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(startUiFreezeObserver);
  await context.addInitScript(() => {
    // Playwright also injects into the initial opaque about:blank document.
    try {
      sessionStorage.setItem("nova-welcome-seen", "1");
    } catch {
      // Storage is unavailable there (and may be disabled by the browser).
    }
  });
  const errors = [],
    unexpectedResponses = [];
  context.on("page", (observed) => {
    observed.on("pageerror", () => errors.push("runtime"));
    observed.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().includes("Failed to load resource:")
      )
        errors.push("console");
    });
    observed.on("response", (response) => {
      if (response.status() < 400) return;
      const path = new URL(response.url()).pathname;
      const expected =
        (response.status() === 401 &&
          /^\/api\/v1\/(auth|users|bookings|tickets)/.test(path)) ||
        ([404, 409].includes(response.status()) &&
          /^\/api\/v1\/staff\/(verify|check-in)$/.test(path));
      if (!expected)
        unexpectedResponses.push({
          category: path.startsWith("/api/") ? "api" : "asset",
          status: response.status(),
        });
    });
  });
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator(".timeline-show").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const boot = await page.evaluate(() => globalThis.novaUiProbe.snapshot());
  const mark = await page.evaluate(() => globalThis.novaUiProbe.mark());
  // Repeat the actual cinema selection interaction; no synthetic busy-loop workload.
  const pickerTimes = [];
  for (let i = 0; i < 5; i++) {
    const started = performance.now();
    await page
      .getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true })
      .click();
    const dialog = page.getByRole("dialog").last();
    await dialog.locator('[role="option"]').first().click();
    await dialog.waitFor({ state: "hidden" });
    pickerTimes.push(+(performance.now() - started).toFixed(2));
  }
  await page.waitForTimeout(3000);
  const interaction = await page.evaluate(
    (s) => globalThis.novaUiProbe.snapshot(s),
    mark,
  );
  let networkProfile = "loopback";
  async function call(
    name,
    path,
    body,
    method = body ? "POST" : "GET",
    expected = 200,
  ) {
    currentStep = name;
    const result = await page.evaluate(
      async ({ path, body, method }) => {
        const started = performance.now();
        const r = await fetch("/api/v1" + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const headerAt = performance.now();
        const bytes = await r.arrayBuffer(),
          ended = performance.now();
        const timing = performance.getEntriesByName(r.url).at(-1);
        let payload;
        try {
          payload = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          payload = null;
        }
        return {
          status: r.status,
          payload,
          metric: {
            ttfbMs: +(headerAt - started).toFixed(2),
            lastByteMs: +(ended - started).toFixed(2),
            wireBodyBytes: timing?.encodedBodySize ?? null,
            decodedBodyBytes: bytes.byteLength,
            transferBytes: timing?.transferSize ?? null,
            encoding: r.headers.get("content-encoding") || "identity",
          },
        };
      },
      { path, body, method },
    );
    samples.push({
      name,
      layer: "browser-bff",
      networkProfile,
      ...result.metric,
      status: result.status,
    });
    assert(
      result.status === expected,
      `${name}: unexpected status ${result.status}`,
    );
    return result.payload?.data;
  }
  // Warm + repeated measurements are retained separately by sample order.
  for (let n = 0; n < 7; n++) {
    await call("UC03 movies", "/movies?limit=100");
    await call("UC03 cinemas", "/cinemas?limit=100");
    const programme = await call("UC03 programme", "/showtimes/programme");
    checks.catalogueCounts = Object.fromEntries(
      ["movies", "cinemas", "rooms", "showtimes", "combos"].map((key) => [
        key,
        programme[key].length,
      ]),
    );
    await call("UC04 seat map", `/showtimes/${f.showtime.id}/seats`);
  }
  // Native HTTP measurements retain actual encoded bytes (fetch auto-decompresses).
  for (const [name, path] of [
    ["UC03 movies", "/movies?limit=100"],
    ["UC03 cinemas", "/cinemas?limit=100"],
    ["UC03 programme", "/showtimes/programme"],
    ["UC04 seat map", `/showtimes/${f.showtime.id}/seats`],
  ]) {
    for (let n = 0; n < 5; n++)
      await new Promise((resolve, reject) => {
        const started = performance.now();
        const req = httpRequest(
          apiOrigin + "/api/v1" + path,
          { headers: { "Accept-Encoding": "gzip, br" } },
          (r) => {
            const headerAt = performance.now(),
              parts = [];
            r.on("data", (p) => parts.push(p));
            r.on("error", reject);
            r.on("end", () => {
              const end = performance.now(),
                wire = Buffer.concat(parts),
                encoding = r.headers["content-encoding"] || "identity";
              const decoded =
                encoding === "gzip"
                  ? gunzipSync(wire)
                  : encoding === "br"
                    ? brotliDecompressSync(wire)
                    : wire;
              if (r.statusCode !== 200) {
                reject(new Error("Native read failed"));
                return;
              }
              JSON.parse(decoded.toString("utf8"));
              samples.push({
                name,
                layer: "native-http",
                status: r.statusCode,
                ttfbMs: +(headerAt - started).toFixed(2),
                lastByteMs: +(end - started).toFixed(2),
                wireBodyBytes: wire.length,
                decodedBodyBytes: decoded.length,
                encoding,
              });
              resolve();
            });
          },
        );
        req.setTimeout(8000, () =>
          req.destroy(new Error("Native request timeout")),
        );
        req.on("error", reject);
        req.end();
      });
  }
  await call("login", "/auth/login", {
    email: f.accounts.customer.email,
    password: f.password,
  });
  await page.goto(origin + "/dat-ve");
  await chooseOption(page, "Chọn cụm rạp", f.cinema.id);
  await chooseOption(page, "Chọn phim", f.movie.id);
  await chooseDate(
    page,
    "Chọn ngày chiếu",
    new Date(f.showtime.startTime).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );
  await chooseOption(page, "Chọn suất chiếu", f.showtime.id);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
      .click();
    const pending = page.waitForResponse(
      (r) =>
        r.url().endsWith("/bookings/hold") && r.request().method() === "POST",
    );
    const start = performance.now();
    await page
      .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
      .click();
    const response = await pending;
    await response.finished();
    samples.push({
      name: "UC04 hold click",
      layer: "browser-ui",
      status: response.status(),
      lastByteMs: +(performance.now() - start).toFixed(2),
      decodedBodyBytes: (await response.body()).length,
    });
    assert(response.status() === 201, "Real UI hold failed");
    await page
      .getByRole("button", { name: "Hủy đơn & trả ghế", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
      .waitFor();
  }
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const map = await call("UC04 seat map", `/showtimes/${f.showtime.id}/seats`);
  const edge = map.seats.find((s) => s.row === "A" && s.column === 1);
  assert(edge, "Owned edge seat missing");
  for (let i = 0; i < 5; i++) {
    const held = await call(
      "UC04 hold",
      "/bookings/hold",
      { showtimeId: f.showtime.id, seatIds: [edge.seatId] },
      "POST",
      201,
    );
    checks.serverHoldSeconds = Math.round(
      (new Date(held.expiresAt || held.expiredAt) -
        new Date(held.serverTime || held.createdAt)) /
        1000,
    );
    await call("UC04 cancel", `/bookings/${held.id}/cancel`, {}, "POST");
  }
  const memberBefore = await call("UC05 membership", "/users/me");
  const party = f.menuCombos.find((c) => c.name.includes("Party")) || f.combo;
  const held = await call(
    "UC05 hold + Party combo",
    "/bookings/hold",
    {
      showtimeId: f.showtime.id,
      seatIds: [edge.seatId],
      comboItems: [{ comboId: party.id, quantity: 1 }],
    },
    "POST",
    201,
  );
  checks.partyPrice = Number(party.price);
  checks.serverComboAmount = Number(held.totalComboAmount);
  checks.memberDiscountAmount = Number(held.discountAmount);
  checks.serverFinalAmount = Number(held.finalAmount);
  const checkout = await call(
    "UC06 create Sandbox",
    "/payments/create-sandbox-url",
    { bookingId: held.id, returnUrl: origin + "/?booking=" + held.id },
    "POST",
    201,
  );
  const sandboxUrl = checkout.paymentUrl || checkout.url;
  assert(typeof sandboxUrl === "string", "Signed Sandbox URL missing");
  const paymentPage = await context.newPage();
  currentStep = "UC06 open signed Sandbox";
  await paymentPage.goto(sandboxUrl);
  const responsePromise = paymentPage.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes("/payments/sandbox/complete"),
  );
  const clickStarted = performance.now();
  await paymentPage
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  const response = await responsePromise;
  const paymentBytes = await response.body();
  samples.push({
    name: "UC06 Sandbox click",
    layer: "browser-native",
    status: response.status(),
    lastByteMs: +(performance.now() - clickStarted).toFixed(2),
    decodedBodyBytes: paymentBytes.length,
  });
  assert(response.status() === 200, "Sandbox confirmation failed");
  await paymentPage.close();
  let ticket;
  const ticketStart = performance.now();
  for (let i = 0; i < 40; i++) {
    const list = await call("UC07 QR poll", "/tickets/me?limit=100");
    ticket = list.items.find((t) => t.bookingId === held.id);
    if (ticket) break;
    await page.waitForTimeout(250);
  }
  checks.qrReadyMs = +(performance.now() - ticketStart).toFixed(2);
  checks.validQr = Boolean(
    ticket?.ticketHash && ticket?.qrCodeBase64?.startsWith("data:image/"),
  );
  assert(checks.validQr, "Real paid QR not issued");
  const memberAfter = await call("UC05 earned points", "/users/me");
  checks.earnedMemberPoints =
    memberAfter.cMemberPoints - memberBefore.cMemberPoints;
  await call("login staff", "/auth/login", {
    email: f.accounts.staff.email,
    password: f.password,
  });
  for (let i = 0; i < 5; i++)
    await call(
      "UC14 verify",
      "/staff/verify",
      { ticketHash: ticket.ticketHash, showtimeId: f.showtime.id },
      "POST",
    );
  await call(
    "UC14 wrong screening",
    "/staff/verify",
    { ticketHash: ticket.ticketHash, showtimeId: f.programmeShowtimes[0].id },
    "POST",
    409,
  );
  await call(
    "UC14 not found",
    "/staff/verify",
    { ticketHash: "0".repeat(64), showtimeId: f.showtime.id },
    "POST",
    404,
  );
  await call(
    "UC14 check-in",
    "/staff/check-in",
    { ticketHash: ticket.ticketHash },
    "POST",
  );
  await call(
    "UC14 already used",
    "/staff/check-in",
    { ticketHash: ticket.ticketHash },
    "POST",
    409,
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 40,
    downloadThroughput: 1250000,
    uploadThroughput: 250000,
  });
  networkProfile = "simulated-40ms-10Mbps";
  for (let i = 0; i < 5; i++) {
    await call("UC03 movies", "/movies?limit=100");
    await call("UC03 cinemas", "/cinemas?limit=100");
    await call("UC04 seat map", `/showtimes/${f.showtime.id}/seats`);
  }
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await cdp.detach();
  checks.consoleErrors = errors.filter(
    (kind) => kind !== "http-rejection",
  ).length;
  checks.unexpectedHttpResponses = unexpectedResponses;
  if (label === "after")
    assert(
      !unexpectedResponses.length && !checks.consoleErrors,
      "Unexpected HTTP or runtime errors detected",
    );
  const report = {
    label,
    measuredAt: new Date().toISOString(),
    baseline: "8f1b044",
    environment: {
      node: process.version,
      browser: browser.version(),
      frontend: "next start (webpack production)",
      backend:
        "NestJS/PostgreSQL 17.10 native + Redis 7.4.2 native; dedicated TEST_DATABASE; owned 60-day fixture",
      viewport: "1440x1000",
      network: "loopback, unthrottled; not WAN",
      sampleConvention:
        "all samples retained; first read may be cold; FPS is measured rAF cadence, not GPU frame presentation",
    },
    ui: { boot, interaction, pickerRoundTripMs: pickerTimes },
    checks,
    samples,
  };
  const output = resolve("docs/qa/measurements/" + label + ".json");
  mkdirSync(resolve("docs/qa/measurements"), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ output, checks, ui: report.ui }));
  await context.close();
} catch (error) {
  console.error(
    `Benchmark aborted at ${currentStep} (${error.name}). Check owned fixture readiness and assertions; request data was not logged.`,
  );
  console.error(
    JSON.stringify({
      assertion: error.qaAssertion,
      lastMetric: samples.at(-1),
      checks,
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
