const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  planDay,
  midnight,
  dayKey,
  programmeWindow,
  filmDay,
} = require("./advance-programme.cjs");
const movies = Array.from({ length: 16 }, (_, i) => ({
  id: `movie-${i}`,
  durationMinutes: [118, 145, 166, 201][i % 4],
}));
test("30 Vietnam days offer each film four periods in two distinct halls, without overlap", () => {
  const start = midnight("2026-10-23T23:40:00+07:00");
  for (let day = 1; day <= 30; day++) {
    const coverage = new Map(movies.map((movie) => [movie.id, []]));
    for (let hall = 0; hall < 16; hall++) {
      const plans = planDay(movies, hall, start + day * 86400000);
      for (const [index, plan] of plans.entries()) {
        assert.equal(
          plan.endTime - plan.startTime,
          (plan.movie.durationMinutes + 15) * 60000,
        );
        assert.equal(dayKey(plan.startTime), dayKey(start + day * 86400000));
        if (index) assert.ok(plans[index - 1].endTime <= plan.startTime);
        coverage.get(plan.movie.id).push({
          hall,
          hour: Number(
            new Intl.DateTimeFormat("en-GB", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              hourCycle: "h23",
            }).format(plan.startTime),
          ),
        });
      }
    }
    for (const shows of coverage.values()) {
      assert.equal(shows.length, 4);
      assert.equal(new Set(shows.map((show) => show.hall)).size, 2);
      assert.deepEqual(
        shows.map((show) => Math.floor(show.hour / 4)).sort(),
        [2, 3, 4, 5],
      );
    }
  }
});
test("Vietnam date boundaries remain stable across months and year changes", () => {
  assert.equal(dayKey("2026-10-31T18:00:00Z"), "2026-11-01");
  assert.equal(
    dayKey(midnight("2026-12-31T22:00:00+07:00") + 86400000),
    "2027-01-01",
  );
});
test("calendar includes 30 days ahead and the entire following month without a three-day cutoff", () => {
  for (const [now, end] of [
    ["2026-10-24T01:00:00+07:00", "2026-11-30"],
    ["2026-12-24T23:50:00+07:00", "2027-01-31"],
    ["2028-01-24T09:00:00+07:00", "2028-02-29"],
    ["2026-02-28T12:00:00+07:00", "2026-03-31"],
  ]) {
    const window = programmeWindow(now);
    assert.equal(dayKey(window.end), end);
    assert.ok(window.daysAhead >= 30 && window.daysAhead < 60);
  }
});
test("every early-screening film has four distinct hours in two collision-free rooms each day", () => {
  const { today, daysAhead } = programmeWindow("2026-10-24T01:00:00+07:00");
  for (let day = 0; day <= daysAhead; day++)
    for (const movie of movies) {
      const shows = [0, 1].flatMap((side) => {
        const plans = filmDay(movie, side, today + day * 86400000);
        assert.ok(plans[0].endTime <= plans[1].startTime);
        return plans;
      });
      assert.equal(
        new Set(shows.map((show) => show.startTime.toISOString())).size,
        4,
      );
      for (const show of shows)
        assert.equal(
          show.endTime - show.startTime,
          (movie.durationMinutes + 15) * 60000,
        );
    }
});
