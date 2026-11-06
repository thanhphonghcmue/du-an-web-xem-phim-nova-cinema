import { test, expect } from "@playwright/test";
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
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
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
  await form.getByRole("button", { name: "Tra cứu vé", exact: true }).click();
  const result = page.locator(".ticket-lookup-result");
  await expect(result).toContainText("NOVA-20261102-8F9A");
  await expect(result).toContainText("Dune: Hành Tinh Cát 2");
  await expect(result).toContainText("Hall 1");
  await expect(result).toContainText("F8 (VIP)");
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
test("TC_FR09_02 valid V1 upload decodes actual QR bytes despite a fake filename; confirmation atomically consumes the seat", async ({
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
  await page
    .getByRole("button", { name: "Xác nhận soát vé", exact: true })
    .click();
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
    (r) => r.url().endsWith("/staff/verify") && r.request().method() === "POST",
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
  await page.getByRole("button", { name: "Tra cứu vé", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Hệ thống bảo mật không hiển thị" }),
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
