/**
 * Main scheduling engine entry point.
 * Pure TypeScript — no DB or React imports.
 */

import type {
  AbsentEntry,
  EngineEmployee,
  EngineResult,
  FeasibilityFlag,
  LeaveInterval,
  ScheduleCell,
  ShiftCode,
  UnitConfig,
} from "./types";
import { computeManpower } from "./manpower";
import { buildBaseRotation, applySurplusGShifts } from "./rotation";
import { coverAbsences } from "./coverage";
import { computeTallies } from "./tallies";
import { dateRange, isInLeave } from "./dates";

export * from "./types";
export * from "./manpower";
export * from "./dates";
export * from "./rest";
export * from "./tallies";

/**
 * Generate a full schedule for the given date range.
 */
export function generateSchedule(
  config: UnitConfig,
  employees: EngineEmployee[],
  leaves: LeaveInterval[],
  startDate: string,
  endDate: string,
  existingCells?: ScheduleCell[] // manual overrides to preserve
): EngineResult {
  const dates = dateRange(startDate, endDate);
  if (dates.length === 0 || employees.length === 0) {
    return { cells: [], flags: [], tallies: [] };
  }

  // 1. Build baseline rotation
  // Deep-copy employees so 12hr count mutations don't leak
  const emps: EngineEmployee[] = employees.map((e) => ({ ...e }));
  const rotation = buildBaseRotation(emps, config, startDate, endDate);

  // 2. Apply surplus G shifts
  applySurplusGShifts(rotation, emps, config, startDate, endDate);

  // 3. Apply leaves (mark absent employees) and record original shifts
  // If the rotation already says OFF (natural rest day), keep OFF.
  // If they would have been working, mark as L and record the vacated shift.
  const absentByDate = new Map<string, AbsentEntry[]>(); // date → absent entries
  for (const date of dates) {
    for (const emp of emps) {
      if (isInLeave(date, leaves, emp.id)) {
        const baseShift = rotation.get(emp.id)?.get(date);
        if (baseShift === "OFF") continue; // natural rest day — leave doesn't vacate a shift
        rotation.get(emp.id)?.set(date, "L");
        if (!absentByDate.has(date)) absentByDate.set(date, []);
        absentByDate.get(date)!.push({ empId: emp.id, name: emp.name, originalShift: baseShift! });
      }
    }
  }

  // 4. Apply manual overrides (preserve them)
  const overrideMap = new Map<string, ShiftCode>(); // `${date}:${empId}` -> shift
  if (existingCells) {
    for (const cell of existingCells) {
      if (cell.isManualOverride) {
        overrideMap.set(`${cell.date}:${cell.employeeId}`, cell.shiftCode);
      }
    }
    for (const [key, shift] of overrideMap) {
      const [date, empId] = key.split(":");
      rotation.get(empId)?.set(date, shift);
    }
  }

  // 5. Cover absences day by day
  const flags: FeasibilityFlag[] = [];
  const prevDayMap = new Map<string, Map<string, ShiftCode>>();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const prevDate = i > 0 ? dates[i - 1] : null;

    // Build today's assignment map
    const dayAssignments = new Map<string, ShiftCode>();
    for (const emp of emps) {
      const shift = rotation.get(emp.id)?.get(date);
      if (shift) dayAssignments.set(emp.id, shift);
    }

    const prevDay = prevDate ? prevDayMap.get(prevDate) : undefined;
    const absentEntries = absentByDate.get(date) ?? [];
    const flag = coverAbsences(date, dayAssignments, emps, prevDay, config, config.id, absentEntries);
    if (flag) flags.push(flag);

    // Write back the (possibly updated) assignments to rotation
    for (const [empId, shift] of dayAssignments) {
      rotation.get(empId)?.set(date, shift);
    }

    prevDayMap.set(date, new Map(dayAssignments));
  }

  // 6. Flatten to ScheduleCell[]
  const cells: ScheduleCell[] = [];
  for (const emp of emps) {
    for (const date of dates) {
      const shift = rotation.get(emp.id)?.get(date) ?? "OFF";
      const key = `${date}:${emp.id}`;
      cells.push({
        employeeId: emp.id,
        date,
        shiftCode: shift,
        isManualOverride: overrideMap.has(key),
        notes: "",
      });
    }
  }

  // 7. Compute tallies
  const tallies = computeTallies(cells, emps.map((e) => e.id));

  return { cells, flags, tallies };
}

export { computeManpower };
