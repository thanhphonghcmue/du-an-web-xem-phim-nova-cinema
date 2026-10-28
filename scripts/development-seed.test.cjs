const test = require("node:test"),
  assert = require("node:assert/strict");
const { createDemoData } = require("../backend/standalone-server.cjs");
test("native RAM seed keeps four requested roles, 50000 member points and every real catalogue relationship", () => {
  const data = createDemoData(),
    accounts = require("../content/development-accounts.json");
  assert.equal(data.cinemas.length, 4);
  assert.equal(data.movies.length, 24);
  assert.ok(data.showtimes.length > 1000);
  for (const definition of accounts) {
    const account = data.accounts.find((a) => a.email === definition.email);
    assert.ok(account);
    assert.equal(account.role, definition.role);
    assert.equal(account.cMemberPoints, definition.points);
  }
  for (const type of ["cinemas", "movies", "rooms", "showtimes", "combos"])
    assert.equal(new Set(data[type].map((r) => r.id)).size, data[type].length);
  const rooms = new Map(data.rooms.map((r) => [r.id, r])),
    movies = new Set(data.movies.map((m) => m.id)),
    cinemas = new Set(data.cinemas.map((c) => c.id));
  for (const room of rooms.values()) assert.ok(cinemas.has(room.cinemaId));
  for (const show of data.showtimes) {
    assert.ok(rooms.has(show.roomId));
    assert.ok(movies.has(show.movieId));
  }
  assert.ok(
    data.combos.some((c) => c.name.includes("Party") && c.price === "69000.00"),
  );
  const again = createDemoData();
  assert.deepEqual(
    again.cinemas.map((c) => c.id),
    data.cinemas.map((c) => c.id),
  );
});
