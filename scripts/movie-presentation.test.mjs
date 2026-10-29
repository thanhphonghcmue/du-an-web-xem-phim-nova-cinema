import test from "node:test";
import assert from "node:assert/strict";
import {
  youtubeTrailerId,
  createMovieAvailability,
  normalizeSearchText,
} from "../frontend/src/moviePresentation.js";
import { vietnamDay } from "../frontend/src/bookingDates.js";

test("search normalizes uppercase Đ, decomposed accents and missing fields consistently", () => {
  assert.equal(normalizeSearchText("ĐÀ NẴNG"), "da nang");
  assert.equal(normalizeSearchText("Đa\u0300 Na\u0306\u0303ng"), "da nang");
  assert.equal(
    normalizeSearchText("Dune: Hành Tinh Cát 2"),
    "dune: hanh tinh cat 2",
  );
  assert.equal(normalizeSearchText(null), "");
});

test("bad or unsupported trailers do not prevent rendering the remaining catalogue", () => {
  for (const value of [
    null,
    undefined,
    "",
    " ",
    "/relative",
    "not a URL",
    "javascript:alert(1)",
    "https://example.test/?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=bad",
  ])
    assert.equal(youtubeTrailerId(value, "fallback"), "fallback");
  assert.equal(youtubeTrailerId("not a URL"), undefined);
});

test("YouTube watch, shortened, embed and shorts links preserve the exact playable ID", () => {
  for (const value of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
    "https://youtu.be/dQw4w9WgXcQ?si=hello",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
  ])
    assert.equal(youtubeTrailerId(value), "dQw4w9WgXcQ");
});

test("movie availability uses Vietnam midnight and expires at the exact final start without rebuilding", () => {
  const old = Object.freeze({
    movieId: "old",
    startTime: "2026-10-29T01:00:00Z",
  });
  const input = Object.freeze([
    old,
    Object.freeze({ movieId: "later", startTime: "2026-10-29T17:30:00Z" }),
    Object.freeze({ movieId: "old", startTime: "invalid" }),
    Object.freeze({ movieId: "", startTime: "2026-10-29T18:30:00Z" }),
  ]);
  const availability = createMovieAvailability(input, vietnamDay);
  const now = Date.parse("2026-10-29T02:00:00Z");
  assert.equal(availability.hasFuture("old", now), false);
  assert.equal(availability.hasDay("old", "2026-10-29", now), false);
  assert.equal(availability.hasFuture("later", now), true);
  assert.equal(availability.hasDay("later", "2026-10-29", now), false);
  assert.equal(availability.hasDay("later", "2026-10-30", now), true);
  assert.equal(
    availability.hasFuture("later", Date.parse("2026-10-29T17:30:00Z")),
    false,
  );
  assert.equal(availability.hasFuture("missing", now), false);
  assert.equal(input[0], old);
});
