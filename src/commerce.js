import catalog from "../content/cinema.json";

export const menuArtwork = catalog.menu;
export const menuCategories = [
  ["all", "Tất cả"],
  ["combo", "Combo siêu hời"],
  ["limited", "Bộ sưu tập NOVA"],
  ["popcorn", "Bắp đa vị"],
  ["drinks", "Nước mát"],
  ["snacks", "Đồ ăn nóng"],
];
export function menuDetails(combo) {
  return (
    menuArtwork.find((item) => item.name === combo.name) || {
      image: "/images/menu/party69.svg",
      category: "combo",
      badge: "NOVA MENU",
    }
  );
}
export function nextScreeningDate(movie) {
  if (movie.releaseDate) return movie.releaseDate.slice(0, 10);
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  const date = new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth() + 1,
      4 + ((movie.week || 1) - 1) * 7,
    ),
  );
  return date.toISOString().slice(0, 10);
}
export function downloadReminder(movie) {
  const date = nextScreeningDate(movie).replaceAll("-", "");
  const escape = (value) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  // Provisional catalog reminder, distinct from an issued ticket calendar.
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NOVA//Discovery//VI",
    "BEGIN:VEVENT",
    `UID:nova-discovery-${movie.artId || movie.id}@nova.local`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:${escape("NOVA · " + movie.title)}`,
    "DESCRIPTION:Lịch tái chiếu dự kiến trong dữ liệu minh họa. Chưa phải vé hoặc xác nhận đặt chỗ.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "nova-nhac-lich.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
