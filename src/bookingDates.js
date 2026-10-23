export const calendarDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
export const calendarKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const vietnamDay = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export const friendlyDay = (key) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(calendarDate(key));
