import test from "node:test";
import assert from "node:assert/strict";
import { ticketQrData, ticketPng } from "../frontend/src/ticketQr.js";
import { revenueCsv } from "../frontend/src/api/revenueCsv.js";
import { apiErrorMessage } from "../frontend/src/api/errorMessage.js";
const ticket = {
  id: "39cd8d10-446c-4057-a455-8d3b746c6028",
  bookingId: "84828076-f89c-4aa0-b6af-9ae7639a3bcd",
  orderCode: "NOVA-" + "a".repeat(32),
  ticketHash: "b".repeat(64),
};
test("a real-format ticket renders the server admission hash, never the order code", () => {
  assert.equal(ticketQrData(ticket).value, ticket.ticketHash);
  assert.notEqual(ticketQrData(ticket).value, ticket.orderCode);
});
for (const value of [
  null,
  {},
  { orderCode: ticket.orderCode },
  { ...ticket, ticketHash: "" },
  { ...ticket, id: "NC-123456" },
  { ...ticket, ticketHash: [ticket.ticketHash] },
])
  test(`missing or invalid admission data stays a placeholder: ${JSON.stringify(value).slice(0, 65)}`, () =>
    assert.equal(ticketQrData(value), null));
test("a missing PNG does not invalidate a real admission hash; external image URLs are rejected", () => {
  assert.equal(ticketPng(ticket), null);
  assert.ok(ticketQrData(ticket));
  assert.equal(
    ticketPng({ qrCodeBase64: "https://example.test/not-a-ticket" }),
    null,
  );
});
test("CSV preserves server Decimal strings above Number.MAX_SAFE_INTEGER and reports its actual period", () => {
  const csv = revenueCsv(
    {
      netRevenue: "9999999999999900.01",
      ticketRevenue: "9999999999999901.01",
      comboRevenue: "0.00",
      discountAmount: "1.00",
      paidBookingCount: 10000,
      ticketCount: 20000,
    },
    { from: "2026-10-01", to: "2026-10-27" },
    new Date("2026-10-27T00:00:00Z"),
  );
  assert.ok(csv.includes('"9999999999999900.01"'));
  assert.ok(csv.includes('"2026-10-27"'));
  assert.ok(!csv.includes("CHI TIẾT CÁC ĐƠN"));
});
test("an internal failure is readable in Vietnamese and does not expose a driver message", () => {
  const message = apiErrorMessage(
    { error: "INTERNAL_ERROR", message: "DriverError: implementation detail" },
    500,
    "vi",
  );
  assert.match(message, /Máy chủ/);
  assert.ok(!message.includes("DriverError"));
});
test("permission failures remain errors with actionable role guidance", () => {
  assert.match(
    apiErrorMessage({ error: "FORBIDDEN", message: "Forbidden" }, 403, "vi"),
    /quyền/,
  );
  assert.equal(
    apiErrorMessage(
      { error: "FORBIDDEN", message: "Staff access required." },
      403,
      "en",
    ),
    "Staff access required.",
  );
});
