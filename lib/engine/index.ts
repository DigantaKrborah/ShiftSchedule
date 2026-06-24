/**
 * Main scheduling engine entry point.
 * Pure TypeScript — no DB or React imports.
 */

import type {
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

  // 3. Apply leaves (mark absent employees)
  for (const date of dates) {
    for (const emp of emps) {
      if (isInLeave(date, leaves, emp.id)) {
        rotation.get(emp.id)?.set(date, "OFF"); // temporary marker — will be replaced
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

    // Mark absent employees clearly (they show as "OFF" in dayAssignments from step 3)
    // But we need to know WHO is absent vs. genuinely OFF for coverage logic.
    // Re-mark: an employee is "absent" if they have a leave entry for this date.
    const absentIds = new Set(
      emps.filter((e) => isInLeave(date, leaves, e.id)).map((e) => e.id)
    );

    // For coverage, we temporarily set absent employees to a "no-show" marker.
    // The rotation gave them OFF — we keep that and let coverAbsences figure out the gap.
    // Actually coverAbsences works by detecting which rotating shifts are under pps.
    // Absent employees are already set to OFF above (they vacate the rotating shift).

    const prevDay = prevDate ? prevDayMap.get(prevDate) : undefined;
    const flag = coverAbsences(date, dayAssignments, emps, prevDay, config, config.id);
    if (flag) flags.push(flag);

    // Write back the (possibly updated) assignments to rotation
    for (const [empId, shift] of dayAssignments) {
      rotation.get(empId)?.set(date, shift);
    }

    prevDayMap.set(date, new Map(dayAssignments));
    void absentIds;
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
