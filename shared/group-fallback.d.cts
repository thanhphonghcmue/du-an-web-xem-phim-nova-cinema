export function twoRowGroup(
  seats: readonly {
    seatId: string;
    row: string;
    column: number;
    type: string;
    status: string;
  }[],
  quantity: number,
  type?: string,
): string[];
