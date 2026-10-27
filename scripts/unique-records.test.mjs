import test from "node:test";
import assert from "node:assert/strict";
import { uniqueRecords } from "../src/uniqueRecords.js";
test("latest duplicate record wins without changing its server ID", () => {
  const result = uniqueRecords([
    { id: "one", value: 1 },
    { id: "two" },
    { id: "one", value: 2 },
  ]);
  assert.deepEqual(result, [{ id: "one", value: 2 }, { id: "two" }]);
});
test("normalization never mutates API arrays or clones record identities", () => {
  const row = Object.freeze({ id: "one" });
  const input = Object.freeze([row, row]);
  assert.equal(uniqueRecords(input)[0], row);
  assert.equal(input.length, 2);
});
test("missing lists and malformed IDs cannot crash a list renderer", () => {
  assert.deepEqual(uniqueRecords(null), []);
  assert.deepEqual(
    uniqueRecords([null, {}, { id: "" }, { id: " " }, { id: 1 }]),
    [],
  );
});
test("seat snapshots use seatId without rewriting booking payload identifiers", () => {
  assert.deepEqual(
    uniqueRecords(
      [
        { seatId: "seat-a", status: "AVAILABLE" },
        { seatId: "seat-a", status: "SOLD" },
      ],
      "seatId",
    ),
    [{ seatId: "seat-a", status: "SOLD" }],
  );
});
