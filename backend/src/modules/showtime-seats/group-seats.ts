import { SeatType } from "@prisma/client";
export interface GroupCandidate {
  seatId: string;
  row: string;
  column: number;
  type: SeatType;
  status: string;
}
// Sort once, scan contiguous runs, retain only the best window's bounds, copy IDs once.
export function findGroupSeats(
  seats: readonly GroupCandidate[],
  quantity: number,
  type?: SeatType,
): string[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return [];
  const rows = new Map<string, GroupCandidate[]>();
  for (const seat of seats) {
    const row = rows.get(seat.row) ?? [];
    row.push(seat);
    rows.set(seat.row, row);
  }
  let best:
    { row: GroupCandidate[]; start: number; distance: number } | undefined;
  for (const label of [...rows.keys()].sort()) {
    const row = rows.get(label);
    if (!row?.length) continue;
    row.sort((a, b) => a.column - b.column);
    const first = row[0];
    const last = row[row.length - 1];
    if (!first || !last) continue;
    const center = (first.column + last.column) / 2;
    let run = 0;
    let previous: number | undefined;
    for (let index = 0; index < row.length; index++) {
      const seat = row[index];
      if (!seat) continue;
      if (
        seat.status !== "AVAILABLE" ||
        (type !== undefined && seat.type !== type)
      ) {
        run = 0;
        previous = undefined;
        continue;
      }
      run =
        previous !== undefined && seat.column === previous + 1 ? run + 1 : 1;
      previous = seat.column;
      if (run < quantity) continue;
      const start = index - quantity + 1;
      const beginning = row[start];
      if (!beginning) continue;
      const window = row.slice(start, index + 1);
      if (
        window.some(
          (candidate) =>
            candidate.type === "SWEETBOX" &&
            !window.some(
              (partner) =>
                partner.type === "SWEETBOX" &&
                partner.column ===
                  (candidate.column % 2 === 1
                    ? candidate.column + 1
                    : candidate.column - 1),
            ),
        )
      )
        continue;
      const distance = Math.abs((beginning.column + seat.column) / 2 - center);
      // Rows and columns are already ordered, so equal scores retain the deterministic first candidate.
      if (!best || distance < best.distance) best = { row, start, distance };
    }
  }
  return best
    ? best.row
        .slice(best.start, best.start + quantity)
        .map((seat) => seat.seatId)
    : [];
}
