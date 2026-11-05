import test from "node:test";
import assert from "node:assert/strict";
import { extractCode, admissionTicket } from "../frontend/src/admission.js";
test("seat codes and QR fragment URLs preserve the whole normalized identifier", () => {
  assert.equal(extractCode(" nv-abcd2345 "), "ABCD2345");
  assert.equal(
    extractCode(`https://nova.example/ve#${"AB".repeat(32)}`),
    "ab".repeat(32),
  );
  assert.equal(extractCode("not-abcd2345-extra"), "not-abcd2345-extra");
});

test("manual admission normalizes complete QR and supported RAM identifiers", () => {
  assert.equal(extractCode(" " + "AB".repeat(32) + " "), "ab".repeat(32));
  assert.equal(
    extractCode("nova-" + "ab".repeat(16)),
    "NOVA-" + "AB".repeat(16),
  );
  assert.equal(extractCode(null), "");
  assert.equal(extractCode({ code: "ab".repeat(32) }), "");
});

test("QR URLs read explicit ticket parameters without truncating arbitrary text", () => {
  const hash = "ab".repeat(32);
  assert.equal(
    extractCode(`https://example.test/ticket?ticketHash=${hash}`),
    hash,
  );
  for (const bad of [
    hash + "f",
    "f" + hash + "f",
    "<script>" + hash + "</script>",
    `javascript:${hash}`,
  ]) {
    assert.equal(extractCode(bad), bad);
  }
});

test("a complete admission response retains the server seat and screening data", () => {
  const ticket = {
    movie: "Phim Việt",
    cinema: "NOVA",
    room: "Phòng 1",
    orderCode: "NOVA-test",
    startTime: "2026-11-05T11:30:00Z",
    seats: [{ label: "A1", type: "VIP" }],
  };
  assert.equal(admissionTicket(ticket), ticket);
});

test("missing admission data becomes an actionable error before rendering or check-in", () => {
  const ticket = {
    movie: "Phim Việt",
    cinema: "NOVA",
    room: "Phòng 1",
    orderCode: "NOVA-test",
    startTime: "2026-11-05T11:30:00Z",
    seats: [{ label: "A1" }],
  };
  for (const invalid of [
    null,
    {},
    { ...ticket, seats: null },
    { ...ticket, seats: [] },
    { ...ticket, seats: [null] },
    { ...ticket, startTime: "bad" },
    { ...ticket, movie: null },
  ]) {
    assert.throws(() => admissionTicket(invalid), {
      code: "TICKET_RESPONSE_INVALID",
    });
  }
});
