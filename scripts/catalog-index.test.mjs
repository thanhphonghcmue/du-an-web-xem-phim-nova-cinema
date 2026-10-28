import test from "node:test";
import assert from "node:assert/strict";
import { createCatalogIndex } from "../src/catalogIndex.js";
import { calendarLabel } from "../src/bookingDates.js";
const data = {
  rooms: [
    { id: "r1", cinemaId: "c1" },
    { id: "r2", cinemaId: "c2" },
  ],
  showtimes: [
    {
      id: "old",
      movieId: "m1",
      roomId: "r1",
      startTime: "2026-10-27T14:00:00.000Z",
    },
    {
      id: "late",
      movieId: "m1",
      roomId: "r1",
      startTime: "2026-10-27T16:00:00.000Z",
    },
    {
      id: "next",
      movieId: "m1",
      roomId: "r1",
      startTime: "2026-10-27T18:00:00.000Z",
    },
    {
      id: "other",
      movieId: "m2",
      roomId: "r2",
      startTime: "2026-10-29T01:00:00.000Z",
    },
  ],
};
test("indexed dates expire after the final start and preserve Vietnam midnight boundaries", () => {
  const index = createCatalogIndex(data);
  assert.deepEqual(
    index.dates("c1", "m1", Date.parse("2026-10-27T15:00:00Z")),
    ["2026-10-27", "2026-10-28"],
  );
  assert.deepEqual(
    index.dates("c1", "m1", Date.parse("2026-10-27T16:01:00Z")),
    ["2026-10-28"],
  );
  assert.deepEqual(index.dates("c2", "m1", 0), []);
});
test("indexed room/film/day lookup never merges another cinema or changes API identities", () => {
  const index = createCatalogIndex(data);
  assert.deepEqual(
    index.at("c1", "m1", "2026-10-28").map((s) => s.id),
    ["next"],
  );
  assert.equal(index.at("c1", "m1", "2026-10-28")[0], data.showtimes[2]);
  assert.deepEqual(index.at("c2", "m1", "2026-10-28"), []);
  assert.deepEqual(
    index.select("c2", "m2").map((s) => s.id),
    ["other"],
  );
});
test("cached day labels match locale formatting and remain distinct per language", () => {
  for (const locale of ["vi", "en"]) {
    const expected = new Intl.DateTimeFormat(
      locale === "en" ? "en-GB" : "vi-VN",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      },
    ).format(new Date("2026-10-28T12:00:00+07:00"));
    assert.equal(calendarLabel("2026-10-28", locale), expected);
    assert.equal(calendarLabel("2026-10-28", locale), expected);
  }
});
