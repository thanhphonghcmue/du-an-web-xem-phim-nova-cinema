import { test, expect } from "@playwright/test";
import { verifyRuntimeConsole } from "./runtime-console.mjs";
verifyRuntimeConsole(test, expect);
import { readFileSync } from "node:fs";
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );
test.beforeEach(async () => {
  const { createRequire } = await import("node:module");
  const req = createRequire(
    new URL("../backend/package.json", import.meta.url),
  );
  const Redis = req("ioredis");
  const redis = new Redis({
    host: process.env.TEST_REDIS_HOST,
    port: Number(process.env.TEST_REDIS_PORT),
    password: process.env.TEST_REDIS_PASSWORD,
    db: Number(process.env.TEST_REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  try {
    const keys = await redis.keys(fixture().prefix + ":throttle:*");
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
});
async function login(page, role) {
  const f = fixture();
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        data: { email: f.accounts[role].email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  await page.addInitScript(() => {
    // Script khởi tạo Playwright cũng chạy trong iframe email sandbox.
    if (window.top !== window) return;
    try {
      sessionStorage.setItem("nova-welcome-seen", "1");
    } catch {
      /* Storage có thể bị chặn. */
    }
  });
}
async function staff(page) {
  await login(page, "staff");
  await page.goto("/staff");
  await expect(
    page.getByRole("button", { name: "Kiểm tra vé", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "📷 Quét QR Vé Hợp Lệ (V1 / 8F9A)",
      exact: true,
    }),
  ).toBeVisible();
}
test("FR09 single lookup V1 resolves exact aliases and QR JSON, hides the general wallet, preserves a separate QR for F09", async ({
  page,
}) => {
  await login(page, "cmember");
  await page.goto("/tai-khoan");
  const form = page.getByRole("region", { name: "Tra cứu mã vé riêng lẻ" });
  await form.getByLabel("Mã vé riêng lẻ", { exact: true }).fill("V1");
  await form
    .getByRole("button", { name: "🔍 Tìm kiếm / Tra cứu vé", exact: true })
    .click();
  const result = page.locator(".ticket-lookup-result");
  await expect(result).toContainText("NOVA-20261102-8F9A");
  await expect(result).toContainText("Dune: Hành Tinh Cát 2");
  await expect(result).toContainText("Hall 1");
  await expect(result).toContainText("F08 (VIP)");
  await expect(result).toContainText("Ghế trong đơn đã thanh toán: F08, F09");
  await expect(result).toContainText("315.270");
  await expect(result).toContainText("19:30 - Hôm nay");
  await expect(result).toContainText("1x Party Combo 69K");
  await expect(result.locator("svg.ticket-qr-svg")).toBeVisible();
  await expect(page.locator(".ticket-search-bar")).toBeHidden();
  for (const code of [
    "8F9A",
    "NOVA-20261102-8F9A",
    JSON.stringify({ ticketCode: "V1" }),
  ]) {
    const r = await page.request.get("/api/v1/tickets/lookup", {
      params: { code },
    });
    expect(r.status()).toBe(200);
    expect((await r.json()).data.ticket.ticketCode).toBe("NOVA-20261102-8F9A");
  }
  const other = await page.request.get("/api/v1/tickets/lookup?code=V1B");
  expect(other.status()).toBe(200);
  const row = (await other.json()).data.ticket;
  expect(row.seats).toHaveLength(1);
  expect(row.seats[0].label).toBe("F9");
});

test("TC-12/TC-13 staff single lookup is read-only, shows booking context and rejects fake codes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await staff(page);
  const before = await page.request.get("/api/v1/staff/tickets/lookup?code=V1");
  expect(before.status()).toBe(200);
  const prior = (await before.json()).data.ticket;
  const panel = page.getByRole("region", { name: "Tra cứu mã vé riêng lẻ" });
  await panel.getByLabel("Mã vé riêng lẻ", { exact: true }).fill("V1");
  await panel
    .getByRole("button", { name: "🔍 Tìm kiếm / Tra cứu vé", exact: true })
    .click();
  await expect(panel.locator(".ticket-lookup-result")).toContainText("315.270");
  await expect(panel.locator(".ticket-lookup-result")).toContainText(
    "F08, F09",
  );
  const after = await page.request.get("/api/v1/staff/tickets/lookup?code=V1");
  expect((await after.json()).data.ticket.isCheckedIn).toBe(prior.isCheckedIn);
  await panel
    .getByLabel("Mã vé riêng lẻ", { exact: true })
    .fill("QR_INVALID_999");
  await panel
    .getByRole("button", { name: "🔍 Tìm kiếm / Tra cứu vé", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "Không tìm thấy mã vé hoặc mã vé không hợp lệ!",
  );
  await expect(panel.locator(".ticket-lookup-result")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("TC_FR09_02 valid V1 upload decodes actual QR bytes despite a fake filename; verification automatically consumes the seat", async ({
  page,
}) => {
  await login(page, "cmember");
  const r = await page.request.get("/api/v1/tickets/lookup?code=V1");
  expect(r.status()).toBe(200);
  const ticket = (await r.json()).data.ticket;
  await page.request.post("/api/v1/auth/logout");
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    }),
  );
  await staff(page);
  await page
    .locator(".qr-capture")
    .getByRole("button", { name: "📷 Quét QR vé", exact: true })
    .click();
  await expect(page.locator(".qr-capture")).toContainText("Chế độ mô phỏng");
  await page.getByLabel("Chọn ảnh mã QR").setInputFiles({
    name: "QR_INVALID_999.png",
    mimeType: "image/png",
    buffer: Buffer.from(ticket.qrCodeBase64.split(",")[1], "base64"),
  });
  await expect(page.locator(".admission-result.valid")).toContainText(
    "NOVA-20261102-8F9A",
  );
  await expect(page.locator(".admission-result.valid")).toContainText(
    "Soát vé thành công - Hợp lệ",
  );
  const repeated = await page.request.post("/api/v1/staff/verify-ticket", {
    data: { code: "8F9A", showtimeId: fixture().admissionFixtures.showtimeId },
  });
  expect(repeated.status()).toBe(409);
  const body = await repeated.json();
  expect(body.statusType).toBe("ALREADY_USED");
  expect(body.details.checkedInAt).toBeTruthy();
});
test("TC_FR09_03 reused code shows the stored check-in time; V2 shows sixteen minutes, and two gates cannot consume V1B twice", async ({
  page,
}) => {
  await staff(page);
  await page.getByLabel("Mã đọc từ QR").fill("V1");
  await page.getByRole("button", { name: "Kiểm tra vé", exact: true }).click();
  const red = page.locator(".admission-result.invalid");
  await expect(red).toContainText("Vé đã được sử dụng!");
  await expect(red).toContainText("Quét lần trước lúc");
  await expect(
    red.getByRole("button", { name: "Xác nhận soát vé" }),
  ).toHaveCount(0);
  await page.getByLabel("Mã đọc từ QR").fill("V2");
  await page.getByRole("button", { name: "Kiểm tra vé", exact: true }).click();
  await expect(red).toContainText(/Cách đây \d+ phút/);
  const results = await Promise.all(
    [1, 2].map(() =>
      page.request.post("/api/v1/staff/checkin", {
        data: {
          code: "V1B",
          showtimeId: fixture().admissionFixtures.showtimeId,
        },
      }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
});
test("TC_FR09_04 arbitrary fake code reaches the API; wrong-showtime V3 stays unused", async ({
  page,
}) => {
  await staff(page);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/staff/verify-ticket") &&
      r.request().method() === "POST",
  );
  await page.getByLabel("Mã đọc từ QR").fill("QR_INVALID_999");
  await page.getByRole("button", { name: "Kiểm tra vé", exact: true }).click();
  expect((await response).status()).toBe(404);
  await expect(page.locator(".admission-result.invalid")).toContainText(
    "Mã vé không tồn tại hoặc không hợp lệ!",
  );
  await page
    .getByRole("button", {
      name: "📷 Quét QR Vé Sai Suất (21:45)",
      exact: true,
    })
    .click();
  await expect(page.locator(".admission-result.warning")).toContainText(
    "SAI SUẤT CHIẾU",
  );
  const wrong = await page.request.post("/api/v1/staff/checkin", {
    data: { code: "V3", showtimeId: fixture().admissionFixtures.showtimeId },
  });
  expect(wrong.status()).toBe(409);
});
test("FR09 fake/foreign lookup returns 404 data:null; no fallback tickets, no unauthenticated short-code lookup, no customer check-in", async ({
  page,
  browser,
}) => {
  await login(page, "cmember");
  await page.goto("/tai-khoan");
  await page
    .getByLabel("Mã vé riêng lẻ", { exact: true })
    .fill("QR_INVALID_999");
  await page
    .getByRole("button", { name: "🔍 Tìm kiếm / Tra cứu vé", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Hệ thống từ chối mã giả" }),
  ).toBeVisible();
  await expect(page.locator(".ticket-lookup-result")).toHaveCount(0);
  await expect(page.locator(".ticket-search-bar")).toBeHidden();
  const fake = await page.request.get(
    "/api/v1/tickets/lookup?code=QR_INVALID_999",
  );
  expect(fake.status()).toBe(404);
  expect((await fake.json()).data).toBeNull();
  for (const code of [
    "FAKE_123",
    "FAKE123",
    "V999",
    "ABCXYZ",
    "V999_FAKE",
    "' OR '1'='1'; --",
    "<script>alert('x')</script>",
  ]) {
    const rejected = await page.request.get("/api/v1/tickets/lookup", {
      params: { code },
    });
    expect(rejected.status()).toBe(404);
    expect((await rejected.json()).data).toBeNull();
  }

  const other = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  try {
    expect(
      (await other.request.get("/api/v1/tickets/lookup?code=V1")).status(),
    ).toBe(401);
    const f = fixture();
    await other.request.post("/api/v1/auth/login", {
      data: { email: f.accounts.customer.email, password: f.password },
    });
    const foreign = await other.request.get("/api/v1/tickets/lookup?code=V1");
    expect(foreign.status()).toBe(404);
    expect((await foreign.json()).data).toBeNull();
    expect(
      (
        await other.request.post("/api/v1/staff/checkin", {
          data: { code: "V1" },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await other.close();
  }
});

test("FR09 a slow QR image cannot overwrite a newer scan or submit after the scanner closes", async ({
  page,
}) => {
  await login(page, "cmember");
  const tickets = [];
  for (const code of ["V1", "V1B"]) {
    const response = await page.request.get("/api/v1/tickets/lookup", {
      params: { code },
    });
    expect(response.status()).toBe(200);
    tickets.push((await response.json()).data.ticket);
  }
  await page.addInitScript(() => {
    const decode = window.createImageBitmap.bind(window);
    let number = 0;
    window.createImageBitmap = async (...args) => {
      const turn = ++number;
      if (turn === 1 || turn === 3)
        await new Promise((resolve) => {
          window.releaseQrDecode = resolve;
          window.qrWaiting = turn;
        });
      const bitmap = await decode(...args);
      if (turn === 1 || turn === 3) window.qrResolved = turn;
      return bitmap;
    };
  });
  await page.goto("/ve");
  await page
    .getByRole("button", { name: "📷 Quét mã QR vé", exact: true })
    .click();
  const file = (index) => ({
    name: "qr.png",
    mimeType: "image/png",
    buffer: Buffer.from(tickets[index].qrCodeBase64.split(",")[1], "base64"),
  });
  const upload = page.getByLabel("Chọn ảnh mã QR", { exact: true });
  let lookups = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/v1/tickets/lookup") lookups++;
  });
  await upload.setInputFiles(file(0));
  await expect.poll(() => page.evaluate(() => window.qrWaiting)).toBe(1);
  await upload.setInputFiles(file(1));
  await expect(page.locator(".ticket-lookup-result")).toContainText(
    tickets[1].ticketCode,
  );
  await page.evaluate(() => window.releaseQrDecode());
  await expect.poll(() => page.evaluate(() => window.qrResolved)).toBe(1);
  expect(lookups).toBe(1);
  await expect(page.locator(".ticket-lookup-result")).toContainText(
    tickets[1].ticketCode,
  );
  await upload.setInputFiles(file(0));
  await expect.poll(() => page.evaluate(() => window.qrWaiting)).toBe(3);
  await page
    .getByRole("button", { name: "📷 Quét mã QR vé", exact: true })
    .first()
    .click();
  await expect(page.locator(".qr-capture")).toHaveCount(0);
  await page.evaluate(() => window.releaseQrDecode());
  await expect.poll(() => page.evaluate(() => window.qrResolved)).toBe(3);
  expect(lookups).toBe(1);
});

test("FR09 one-click scan uses database fixtures, resets only V1, and repeats the full valid-used-invalid cycle", async ({
  page,
}) => {
  await staff(page);
  const meta = await page.request.get("/api/v1/staff/demo-fixtures");
  const data = (await meta.json()).data;
  expect(data.tickets.find((t) => t.code === "V1").ticketCode).toBe(
    "NOVA-20261102-8F9A",
  );
  const reset = page.getByRole("button", {
    name: "🔄 Reset trạng thái vé mẫu (Để test lại từ TC_FR09_02)",
    exact: true,
  });
  await reset.click();
  const checkbox = page.getByRole("checkbox", {
    name: "Tự động check-in khi kiểm tra vé",
    exact: true,
  });
  await expect(checkbox).toBeChecked();
  await page
    .getByRole("button", {
      name: "📷 Quét QR Vé Hợp Lệ (V1 / 8F9A)",
      exact: true,
    })
    .click();
  const green = page.locator(".admission-result.valid");
  await expect(green).toContainText("Soát vé thành công - Hợp lệ");
  await expect(green).toContainText("Trạng thái vé: Đã sử dụng / Đã check-in");
  await expect(
    page.getByRole("button", { name: "Xác nhận soát vé", exact: true }),
  ).toHaveCount(0);
  const prior = await page.request.post("/api/v1/staff/verify-ticket", {
    data: { code: "V1" },
  });
  expect(prior.status()).toBe(409);
  const usedAt = (await prior.json()).details.checkedInAt;
  await page
    .getByRole("button", {
      name: "📲 Quét lại QR Vé Đã Soát (Test Lần 2 - TC_FR09_03)",
      exact: true,
    })
    .click();
  await expect(page.locator(".admission-result.invalid")).toContainText(
    "Vé đã được sử dụng!",
  );
  await expect(page.locator(".admission-result.invalid")).toContainText(
    "Thời gian soát vé lần trước:",
  );
  const after = await page.request.post("/api/v1/staff/verify-ticket", {
    data: { code: "V1" },
  });
  expect((await after.json()).details.checkedInAt).toBe(usedAt);
  await reset.click();
  await page.getByLabel("Mã đọc từ QR").fill("8F9A");
  await page.getByRole("button", { name: "Kiểm tra vé", exact: true }).click();
  await expect(green).toContainText("Soát vé thành công - Hợp lệ");
  await page
    .getByRole("button", {
      name: "📷 Quét QR Giả / Không tồn tại (QR_INVALID_999)",
      exact: true,
    })
    .click();
  await expect(page.locator(".admission-result.invalid")).toContainText(
    "Mã vé không tồn tại hoặc không hợp lệ!",
  );
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await reset.scrollIntoViewIfNeeded();
    await expect(reset).toBeInViewport({ ratio: 1 });
    const box = await reset.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});
