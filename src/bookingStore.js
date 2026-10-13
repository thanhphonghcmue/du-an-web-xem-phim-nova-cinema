export const HOLD_MS = 5 * 60 * 1000;
const PREFIX = "nova-seats-v1:";
export const rows = "ABCDEFGH".split("");
export const seats = rows.flatMap((row, ri) =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `${row}${i + 1}`,
    row,
    number: i + 1,
    type: ri === 7 ? "sweet" : ri >= 3 && ri <= 5 ? "vip" : "standard",
    price: ri === 7 ? 110000 : ri >= 3 && ri <= 5 ? 120000 : 90000,
  })),
);
export function readSeats(showId) {
  const raw = localStorage.getItem(PREFIX + showId);
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!data) {
    data = {};
    [
      "B5",
      "B6",
      "C8",
      "C9",
      "C10",
      "D3",
      "D4",
      "E13",
      "E14",
      "F9",
      "F10",
      "G16",
      "G17",
      "H3",
      "H4",
    ].forEach((id) => {
      data[id] = { status: "sold" };
    });
    // Dữ liệu demo cố định theo suất; màu chỉ báo luôn dựa trên trạng thái ghế được lưu.
    const showTime = showId.split("|").at(-1);
    if (showTime === "22:30")
      seats
        .filter((s) => s.row !== "A")
        .forEach((s) => {
          data[s.id] = { status: "sold" };
        });
    if (showTime === "16:45")
      seats
        .filter(
          (s) =>
            "BCDEF".includes(s.row) ||
            (s.row === "G" && s.number >= 5 && s.number <= 10),
        )
        .forEach((s) => {
          data[s.id] = { status: "sold" };
        });
    ["D10", "D11", "E7", "E8"].forEach((id) => {
      data[id] = {
        status: "held",
        owner: "demo-other",
        expires: Date.now() + 90000,
      };
    });
    localStorage.setItem(PREFIX + showId, JSON.stringify(data));
  }
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, s]) => s.status === "sold" || s.expires > Date.now(),
    ),
  );
}
export async function updateSeats(showId, updater) {
  const operation = () => {
    const current = readSeats(showId);
    const next = updater(current);
    localStorage.setItem(PREFIX + showId, JSON.stringify(next));
    window.dispatchEvent(new Event("nova-seats"));
    return next;
  };
  return navigator.locks
    ? navigator.locks.request(PREFIX + showId, operation)
    : operation();
}
export function ownSeats(data, owner) {
  return Object.keys(data).filter(
    (id) => data[id].status === "held" && data[id].owner === owner,
  );
}
export function findGroup(data, count) {
  for (const row of ["E", "D", "F", "C", "B", "G", "A"]) {
    const available = seats.filter((s) => s.row === row);
    const starts = Array.from({ length: 21 - count }, (_, i) => i).sort(
      (a, b) => Math.abs(a + count / 2 - 10) - Math.abs(b + count / 2 - 10),
    );
    for (const start of starts) {
      const candidate = available.slice(start, start + count);
      if (candidate.length === count && candidate.every((s) => !data[s.id]))
        return candidate.map((s) => s.id);
    }
  }
  return null;
}
