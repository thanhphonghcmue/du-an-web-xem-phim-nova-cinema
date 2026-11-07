import test from "node:test";
import assert from "node:assert/strict";
import {
  rankedCombos,
  recommended,
  comboTasteLabel,
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

test("FR12 generic legacy PARTY metadata does not recommend drinks or displace the configured group combo", () => {
  const generic = { ...party, id: "drink", suggestedMinSeats: 1 };
  assert.equal(recommended(generic, 4), false);
  assert.equal(rankedCombos([generic, party], 4, "all")[0].id, party.id);
  assert.equal(rankedCombos([pair, solo, party], 1, "all")[0].id, solo.id);
  assert.equal(rankedCombos([solo, party, pair], 2, "all")[0].id, pair.id);
});

test("FR12 exact seed taste labels still filter with canonical chips", () => {
  const sweet = { ...solo, tasteTag: "Ngọt Caramel" };
  const cheese = { ...pair, tasteTag: "Phô Mai Hoàng Kim" };
  assert.deepEqual(rankedCombos([cheese, sweet], 1, "NGỌT"), [sweet]);
  assert.deepEqual(rankedCombos([sweet, cheese], 2, "PHÔ_MAI"), [cheese]);
  assert.equal(comboTasteLabel(sweet), "Ngọt Caramel");
  assert.equal(comboTasteLabel(cheese), "Phô Mai Hoàng Kim");
});

test("FR12 canonical seed names take precedence over other eligible products without changing their cart IDs", () => {
  const standardSolo = { ...solo, name: "Single / Solo Combo" };
  const custom = { ...solo, id: "custom", name: "00 Custom" };
  assert.equal(
    rankedCombos([custom, standardSolo], 1, "all")[0].id,
    standardSolo.id,
  );
  const standardParty = { ...party, name: "Party Combo 69K", price: "71000" };
  assert.equal(
    rankedCombos([{ ...party, id: "other" }, standardParty], 4, "all")[0].id,
    standardParty.id,
  );
});
