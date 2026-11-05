const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const displayDay = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
});
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
function date(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}
export function indexTickets(tickets) {
  return tickets.map((ticket) => {
    const start = date(ticket.startTime),
      booked = date(ticket.bookedAt || ticket.createdAt);
    return {
      ticket,
      viewingDay: start ? day.format(start) : "",
      bookedDay: booked ? day.format(booked) : "",
      start: start?.getTime() || 0,
      booked: booked?.getTime() || 0,
      text: fold(
        [
          ticket.ticketCode,
          ticket.orderCode,
          ticket.movie,
          ticket.cinema,
          ticket.room,
          start && displayDay.format(start),
          booked && displayDay.format(booked),
          start && day.format(start),
          booked && day.format(booked),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    };
  });
}
export function filterTickets(
  rows,
  {
    keyword = "",
    from = "",
    to = "",
    dateBasis = "viewing",
    status = "all",
    sort = "newest",
    now = Date.now(),
  } = {},
) {
  const search = fold(keyword.trim());
  if (from && to && from > to) return [];
  return rows
    .filter((row) => {
      const d = dateBasis === "booked" ? row.bookedDay : row.viewingDay;
      const t = row.ticket;
      return (
        (!search || row.text.includes(search)) &&
        (!from || d >= from) &&
        (!to || d <= to) &&
        (status === "all" ||
          (status === "used" && t.isCheckedIn) ||
          (status === "unused" &&
            !t.isCheckedIn &&
            Date.parse(t.endTime || t.startTime) >= now) ||
          (status === "past" && Date.parse(t.endTime || t.startTime) < now))
      );
    })
    .sort((a, b) =>
      sort === "showtime"
        ? a.start - b.start || a.ticket.id.localeCompare(b.ticket.id)
        : b.booked - a.booked || a.ticket.id.localeCompare(b.ticket.id),
    )
    .map((row) => row.ticket);
}
