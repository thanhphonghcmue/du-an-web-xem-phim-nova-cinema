import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  matchesFood,
  normalizeFoodCart,
  readFoodCart,
  saveFoodCart,
} from "../src/foodCart.js";
test("cart drafts reject malformed, nonnumeric and nonfinite quantities", () => {
  for (const input of [null, [], 3, "hello"])
    assert.deepEqual(normalizeFoodCart(input), {});
  assert.deepEqual(
    normalizeFoodCart({ a: Infinity, b: NaN, c: "2", d: -4, e: 0, " ": 1 }),
    {},
  );
});
test("cart quantities are whole, capped at 20 and do not mutate inputs", () => {
  const input = Object.freeze({ a: 3.9, b: 400 });
  assert.deepEqual(normalizeFoodCart(input), { a: 3, b: 20 });
});
test("SSR and unavailable browser storage never crash a cart", () => {
  assert.deepEqual(readFoodCart(), {});
  assert.equal(saveFoodCart({ a: 1 }), false);
});
test("Vietnamese food search handles upper-case Đ and unaccented words", () => {
  const item = {
    name: "Trà Đào Cam Sả",
    description: "Thơm nhẹ",
    taste: "Thanh mát",
  };
  for (const query of ["tra dao", "TRÀ ĐÀO", "THANH MAT", "  cam sa  "])
    assert.equal(matchesFood(item, query), true);
  assert.equal(matchesFood(item, "chocolate"), false);
});
test("all 24 menu items have distinct packshots and stable original keys", () => {
  const { menu } = JSON.parse(
    readFileSync(new URL("../content/cinema.json", import.meta.url), "utf8"),
  );
  assert.equal(menu.length, 24);
  assert.equal(new Set(menu.map((item) => item.key)).size, 24);
  assert.deepEqual(
    menu.map((item) => item.artIndex).sort((a, b) => a - b),
    Array.from({ length: 24 }, (_, i) => i),
  );
  for (const item of menu)
    assert.ok(
      Number.isSafeInteger(item.price) &&
        item.price > 0 &&
        item.taste &&
        item.flavor &&
        item.serves,
    );
});
