// Calendar days in Vietnam. At least today + 30 days, including the end of next month.
const DAY = 86400000;
const MINUTE = 60000;
const dayKey = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const midnight = (value) =>
  new Date(`${dayKey(value)}T00:00:00+07:00`).getTime();
function programmeWindow(now = Date.now()) {
  const today = midnight(now);
  const local = new Date(today + 7 * 3600000);
  const nextMonthEnd =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 2, 0) - 7 * 3600000;
  const end = Math.max(today + 30 * DAY, nextMonthEnd);
  return { today, end, daysAhead: Math.round((end - today) / DAY) };
}
function filmDay(movie, side, day) {
  return (side === 0 ? [9, 17] : [13, 21]).map((hour) => ({
    movie,
    startTime: new Date(day + hour * 60 * MINUTE),
    endTime: new Date(day + (hour * 60 + movie.durationMinutes + 15) * MINUTE),
  }));
}
module.exports = { DAY, dayKey, midnight, programmeWindow, filmDay };
