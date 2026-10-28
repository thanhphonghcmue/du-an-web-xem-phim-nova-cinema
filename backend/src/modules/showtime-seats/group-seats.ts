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
    if (
      row.some(
        (seat, i) => i > 0 && (row[i - 1]?.column ?? -Infinity) > seat.column,
      )
    )
      row.sort((a, b) => a.column - b.column);
    const first = row[0];
    const last = row[row.length - 1];
    if (!first || !last) continue;
    const center = (first.column + last.column) / 2;
    // Counts use physical availability, even when the caller filters by seat type.
    // A contiguous choice can only create a new singleton immediately to its sides.
    const left: number[] = [],
      right: number[] = [];
    for (let i = 0; i < row.length; i++) {
      const current = row[i];
      left[i] =
        current?.status === "AVAILABLE"
          ? 1 +
            (i > 0 && row[i - 1]?.column === current.column - 1
              ? (left[i - 1] ?? 0)
              : 0)
          : 0;
    }
    for (let i = row.length - 1; i >= 0; i--) {
      const current = row[i];
      right[i] =
        current?.status === "AVAILABLE"
          ? 1 +
            (row[i + 1]?.column === current.column + 1
              ? (right[i + 1] ?? 0)
              : 0)
          : 0;
    }
    const byColumn = new Map(row.map((seat) => [seat.column, seat]));
    const invalidPairs: number[] = [0];
    for (let i = 0; i < row.length; i++) {
      const seat = row[i];
      if (!seat) continue;
      const partner = byColumn.get(
        seat.column % 2 ? seat.column + 1 : seat.column - 1,
      );
      invalidPairs[i + 1] =
        (invalidPairs[i] ?? 0) +
        Number(seat.type === "SWEETBOX" && partner?.type !== "SWEETBOX");
    }
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
      if (
        (row[start - 1]?.column === beginning.column - 1 &&
          left[start - 1] === 1) ||
        (row[index + 1]?.column === seat.column + 1 && right[index + 1] === 1)
      )
        continue;
      if (
        (beginning.type === "SWEETBOX" && beginning.column % 2 === 0) ||
        (seat.type === "SWEETBOX" && seat.column % 2 === 1) ||
        (invalidPairs[index + 1] ?? 0) - (invalidPairs[start] ?? 0) > 0
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
