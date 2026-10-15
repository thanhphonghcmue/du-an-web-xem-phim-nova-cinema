import { SeatType } from "@prisma/client";
import { findGroupSeats, GroupCandidate } from "./group-seats";
function row(
  label: string,
  columns: number[],
  type: SeatType = "STANDARD",
): GroupCandidate[] {
  return columns.map((column) => ({
    seatId: `${label}${String(column)}`,
    row: label,
    column,
    type,
    status: "AVAILABLE",
  }));
}
describe("group seat sliding windows", () => {
  it("selects a centered contiguous window and preserves input order", () => {
    const seats = row("A", [8, 1, 7, 2, 6, 3, 5, 4]);
    const before = [...seats];
    expect(findGroupSeats(seats, 3)).toEqual(["A3", "A4", "A5"]);
    expect(seats).toEqual(before);
  });
  it("uses physical row center, including unavailable end seats", () => {
    const seats = row("A", [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const seat of seats) if (seat.column <= 2) seat.status = "SOLD";
    expect(findGroupSeats(seats, 1)).toEqual(["A5"]);
  });
  it("never crosses a sold or held seat", () => {
    const seats = row("A", [1, 2, 3, 4, 5, 6, 7]);
    for (const seat of seats) if (seat.column === 4) seat.status = "SOLD";
    expect(findGroupSeats(seats, 4)).toEqual([]);
    expect(findGroupSeats(seats, 3)).toEqual(["A1", "A2", "A3"]);
  });
  it("never bridges missing physical columns or crosses rows", () => {
    expect(
      findGroupSeats([...row("A", [1, 2, 4, 5]), ...row("B", [1, 2])], 3),
    ).toEqual([]);
  });
  it("filters all seats by requested type without jumping across other types", () => {
    const seats = [
      ...row("A", [1, 2, 3], "STANDARD"),
      ...row("B", [1, 2, 3], "VIP"),
    ];
    expect(findGroupSeats(seats, 2, "VIP")).toEqual(["B1", "B2"]);
    expect(findGroupSeats(seats, 1, "SWEETBOX")).toEqual([]);
  });
  it("ranks distance before row label and uses row/column tie breakers", () => {
    expect(
      findGroupSeats(
        [...row("B", [1, 2, 3, 4, 5]), ...row("A", [1, 2, 3, 4])],
        3,
      ),
    ).toEqual(["B2", "B3", "B4"]);
    expect(
      findGroupSeats([...row("B", [1, 2, 3]), ...row("A", [1, 2, 3])], 2),
    ).toEqual(["A1", "A2"]);
  });
  it.each([0, 21, -1, 1.5])("rejects invalid quantity %s", (quantity) => {
    expect(findGroupSeats(row("A", [1, 2, 3]), quantity)).toEqual([]);
  });
  it("suggests only complete Sweetbox pairs, excluding orphan or held halves", () => {
    const seats = row("H", [1, 2, 3, 4], "SWEETBOX");
    expect(findGroupSeats(seats, 1, "SWEETBOX")).toEqual([]);
    expect(findGroupSeats(seats, 3)).toEqual([]);
    expect(findGroupSeats(seats, 2)).toEqual(["H1", "H2"]);
    expect(findGroupSeats(seats.slice(1), 2)).toEqual(["H3", "H4"]);
    expect(
      findGroupSeats(
        seats.map((s) => (s.column === 2 ? { ...s, status: "HOLDING" } : s)),
        2,
      ),
    ).toEqual(["H3", "H4"]);
  });
  it("handles empty/full rooms and a 20-seat window", () => {
    expect(findGroupSeats([], 1)).toEqual([]);
    expect(
      findGroupSeats(
        row("A", [1]).map((seat) => ({ ...seat, status: "SOLD" })),
        1,
      ),
    ).toEqual([]);
    expect(
      findGroupSeats(
        row(
          "A",
          Array.from({ length: 20 }, (_, i) => i + 1),
        ),
        20,
      ),
    ).toHaveLength(20);
  });
});
