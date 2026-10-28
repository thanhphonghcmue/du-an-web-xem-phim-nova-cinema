export const calendarDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
export const calendarKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const vietnamDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
});
export const vietnamDay = (value) =>
  vietnamDateFormatter.format(new Date(value));
const friendlyFormatters = new Map(
  ["en", "vi"].map((language) => [
    language,
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : "vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }),
  ]),
);
export const friendlyDay = (key, language = "vi") =>
  friendlyFormatters
    .get(language === "en" ? "en" : "vi")
    .format(calendarDate(key));
const shortFormatters = new Map(
  ["en", "vi"].map((language) => [
    language,
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : "vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  ]),
);
const labels = new Map();
export function calendarLabel(key, language = "vi") {
  const locale = language === "en" ? "en" : "vi",
    cacheKey = `${locale}:${key}`;
  if (!labels.has(cacheKey)) {
    if (labels.size >= 512) labels.clear();
    labels.set(
      cacheKey,
      shortFormatters.get(locale).format(new Date(key + "T12:00:00+07:00")),
    );
  }
  return labels.get(cacheKey);
}

/** Relative labels use the cinema's Vietnam day, independently of browser timezone. */
export function relativeCinemaDay(key, language = "vi", now = Date.now()) {
  const today = vietnamDay(now),
    tomorrow = vietnamDay(now + 86400000);
  return key === today
    ? language === "en"
      ? "Today"
      : "Hôm nay"
    : key === tomorrow
      ? language === "en"
        ? "Tomorrow"
        : "Ngày mai"
      : "";
}
