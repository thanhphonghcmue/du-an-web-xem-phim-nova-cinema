import test from "node:test";
import assert from "node:assert/strict";
import {
  rankedCombos,
  recommended,
} from "../frontend/src/comboRecommendations.js";
const solo = {
  id: "solo",
  badgeLabel: "SOLO",
  suggestedMinSeats: 1,
  suggestedMaxSeats: 1,
  tasteTag: "NGỌT",
  price: "49000",
};
const pair = {
  id: "pair",
  badgeLabel: "COUPLE",
  suggestedMinSeats: 2,
  suggestedMaxSeats: 2,
  tasteTag: "PHÔ_MAI",
  price: "89000",
};
const party = {
  id: "party",
  badgeLabel: "PARTY",
  suggestedMinSeats: 3,
  suggestedMaxSeats: null,
  tasteTag: "MIX",
  price: "69000",
};
test("FR12 recommendation uses persisted seat bounds and never suggests a party combo to a solo customer", () => {
  assert.equal(recommended(solo, 1), true);
  assert.equal(recommended(pair, 2), true);
  assert.equal(recommended(party, 1), false);
  assert.equal(recommended(party, 20), true);
  assert.equal(recommended(pair, 3), false);
});
test("FR12 chips and Party69 ordering preserve IDs, leave inputs untouched and exclude hidden items", () => {
  const rows = [pair, solo, { ...solo, id: "hidden", isActive: false }, party];
  assert.deepEqual(
    rankedCombos(rows, 3, "all").map((c) => c.id),
    ["party", "pair", "solo"],
  );
  assert.deepEqual(rankedCombos(rows, 2, "PHÔ_MAI"), [pair]);
  assert.equal(rows[0], pair);
});
