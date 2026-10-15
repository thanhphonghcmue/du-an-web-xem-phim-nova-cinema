export interface PhysicalSeatCandidate {
  id: string;
  seatRow: string;
  seatColumn: number;
}

/**
 * Validates that reserving requestedSeatIds does not create any new orphan seat
 * (an isolated available single seat) in any affected row.
 */
export function validateNoOrphanSeats(
  rowSeats: PhysicalSeatCandidate[],
  alreadyOccupiedSeatIds: ReadonlySet<string>,
  requestedSeatIds: ReadonlySet<string>,
): { hasOrphan: boolean; orphanSeat?: PhysicalSeatCandidate } {
  const byRow = new Map<string, PhysicalSeatCandidate[]>();
  for (const s of rowSeats) {
    const list = byRow.get(s.seatRow) ?? [];
    list.push(s);
    byRow.set(s.seatRow, list);
  }

  for (const [, seats] of byRow.entries()) {
    seats.sort((a, b) => a.seatColumn - b.seatColumn);

    const originalAvailable = new Set<string>();
    for (const s of seats) {
      if (!alreadyOccupiedSeatIds.has(s.id)) {
        originalAvailable.add(s.id);
      }
    }

    // Determine contiguous run size in original state
    const originalRunSize = new Map<string, number>();
    let currentOriginalRun: PhysicalSeatCandidate[] = [];
    for (const s of seats) {
      const isAvail = originalAvailable.has(s.id);
      const last = currentOriginalRun[currentOriginalRun.length - 1];
      const isContiguous = !last || s.seatColumn === last.seatColumn + 1;

      if (isAvail && isContiguous) {
        currentOriginalRun.push(s);
      } else {
        if (currentOriginalRun.length > 0) {
          for (const item of currentOriginalRun) {
            originalRunSize.set(item.id, currentOriginalRun.length);
          }
        }
        currentOriginalRun = isAvail ? [s] : [];
      }
    }
    if (currentOriginalRun.length > 0) {
      for (const item of currentOriginalRun) {
        originalRunSize.set(item.id, currentOriginalRun.length);
      }
    }

    // Determine contiguous run size in new state
    const newAvailable = new Set<string>();
    for (const s of seats) {
      if (originalAvailable.has(s.id) && !requestedSeatIds.has(s.id)) {
        newAvailable.add(s.id);
      }
    }

    let currentNewRun: PhysicalSeatCandidate[] = [];
    for (const s of seats) {
      const isAvail = newAvailable.has(s.id);
      const last = currentNewRun[currentNewRun.length - 1];
      const isContiguous = !last || s.seatColumn === last.seatColumn + 1;

      if (isAvail && isContiguous) {
        currentNewRun.push(s);
      } else {
        if (currentNewRun.length === 1) {
          const orphan = currentNewRun[0];
          if (orphan && (originalRunSize.get(orphan.id) ?? 0) >= 2) {
            return { hasOrphan: true, orphanSeat: orphan };
          }
        }
        currentNewRun = isAvail ? [s] : [];
      }
    }
    if (currentNewRun.length === 1) {
      const orphan = currentNewRun[0];
      if (orphan && (originalRunSize.get(orphan.id) ?? 0) >= 2) {
        return { hasOrphan: true, orphanSeat: orphan };
      }
    }
  }

  return { hasOrphan: false };
}
