import test from "node:test";
import assert from "node:assert/strict";
import { sandboxCheckout } from "../frontend/src/sandboxCheckout.js";
const order = {
  id: "b14b4be9-ccea-4d0e-877c-de6371db76b1",
  orderCode: "NOVA-" + "ab".repeat(16),
  finalAmount: "315270.00",
};
function link(changes = {}) {
  return (
    "https://sandbox.example/api/v1/payments/sandbox?" +
    new URLSearchParams({
      bookingId: order.id,
      orderCode: order.orderCode,
      transactionCode: "txn-fixture",
      amount: "315270.00",
      timestamp: "123456",
      returnUrl: "http://localhost:3000/?booking=" + order.id,
      signature: "test-only",
      ...changes,
    })
  );
}
test("signed checkout keeps all server fields and decimal price without inventing identifiers", () => {
  const payload = sandboxCheckout(link(), order);
  assert.equal(payload.bookingId, order.id);
  assert.equal(payload.amount, order.finalAmount);
  assert.equal(payload.signature, "test-only");
  assert.equal(Object.keys(payload).length, 7);
});
test("checkout rejects another booking, price, order, missing or duplicate signed fields", () => {
  for (const change of [
    { bookingId: "other" },
    { amount: "1000" },
    { orderCode: "other" },
    { signature: "" },
  ])
    assert.throws(() => sandboxCheckout(link(change), order));
  assert.throws(() => sandboxCheckout(link() + "&bookingId=other", order));
});
test("checkout never follows another endpoint or a URL with embedded credentials", () => {
  assert.throws(() =>
    sandboxCheckout(link().replace("/sandbox?", "/webhook?"), order),
  );
  assert.throws(() =>
    sandboxCheckout(
      link().replace("https://", "https://user:password@"),
      order,
    ),
  );
});
