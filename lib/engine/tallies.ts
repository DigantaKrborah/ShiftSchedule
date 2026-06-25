import type { EmployeeTally, ScheduleCell, ShiftCode } from "./types";
import { DEFAULT_SHIFT_TIMES } from "./types";

export function computeTallies(
  cells: ScheduleCell[],
  employeeIds: string[]
): EmployeeTally[] {
  const map = new Map<string, EmployeeTally>();
  for (const id of employeeIds) {
    map.set(id, { employeeId: id, offDays: 0, d12Count: 0, n12Count: 0, totalNights: 0, totalHours: 0, gDays: 0 });
  }

  for (const cell of cells) {
    const t = map.get(cell.employeeId);
    if (!t) continue;
    const sh = cell.shiftCode as ShiftCode;
    switch (sh) {
      case "OFF": t.offDays++; break;
      case "L":   break; // leave day — neither rest nor work hours
      case "D12": t.d12Count++; t.totalHours += 12; break;
      case "N12": t.n12Count++; t.totalNights++; t.totalHours += 12; break;
      case "C":   t.totalNights++; t.totalHours += 8; break;
      case "G":   t.gDays++; t.totalHours += 8; break;
      default:    t.totalHours += DEFAULT_SHIFT_TIMES[sh]?.durationHours ?? 8; break;
    }
  }

  return [...map.values()];
}
