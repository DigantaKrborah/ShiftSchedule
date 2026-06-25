/**
 * Baseline rotation builder.
 * Pattern: B B A A C C OFF  (7-day repeating cycle)
 * Each employee gets a phase offset so that on any given day the unit has the right
 * number of people on each shift.
 */

import type { EngineEmployee, ShiftCode, UnitConfig } from "./types";
import { dateRange } from "./dates";

const BASE_CYCLE: ShiftCode[] = ["B", "B", "A", "A", "C", "C", "OFF"];
// 2-shift variant: 3 days A + 3 days B + 1 OFF (no C shift)
const TWO_SHIFT_CYCLE: ShiftCode[] = ["A", "A", "A", "B", "B", "B", "OFF"];

/**
 * Assigns phase offsets to employees so that each day has exactly `personsPerShift`
 * on each of the `shiftsPerDay` shifts (A, B, C or a subset), and each employee gets
 * `weeklyOffDays` off per 7 days.
 *
 * For 3-shift, 1-off-day units: the 7-day cycle already has 2B+2A+2C+1OFF.
 * With 3 persons/shift and 7 employees we have 3 groups of 7 employees, phase-shifted by 1.
 * Actually: to get 3 on each shift, we need groups of 3 phased by 7/3 ≈ 2.33 days — not integer.
 * The standard industry solution: use the "B B A A C C OFF" cycle for each employee,
 * with phase offset = floor(employeeIndex * 7 / personsPerShift).
 * This works when totalRotatingEmployees is a multiple of personsPerShift (i.e., balanced).
 *
 * For unbalanced counts (surplus), surplus employees get G-shift on extra days.
 */
export function buildBaseRotation(
  employees: EngineEmployee[],
  config: UnitConfig,
  startDate: string,
  endDate: string
): Map<string, Map<string, ShiftCode>> {
  // employeeId -> date -> shiftCode
  const schedule = new Map<string, Map<string, ShiftCode>>();
  const dates = dateRange(startDate, endDate);

  const rotatingEmployees = employees.filter((e) => e.doesRotatingShift);
  const nonRotatingEmployees = employees.filter((e) => !e.doesRotatingShift);

  const N = rotatingEmployees.length;
  const pps = config.personsPerShift;

  // Sort by seniority
  rotatingEmployees.sort((a, b) => a.seniorityIndex - b.seniorityIndex);

  for (const emp of rotatingEmployees) {
    schedule.set(emp.id, new Map());
  }
  for (const emp of nonRotatingEmployees) {
    schedule.set(emp.id, new Map());
  }

  if (N === 0) return schedule;

  // Choose cycle based on how many shifts this unit runs
  const baseCycle = config.shiftsPerDay === 2 ? TWO_SHIFT_CYCLE : BASE_CYCLE;

  // Build the "effective cycle length" = 7 (one OFF per 7 days).
  const cycleLength = 7;

  for (let i = 0; i < N; i++) {
    const emp = rotatingEmployees[i];
    const empSchedule = schedule.get(emp.id)!;
    // Phase offset in days
    const phaseOffset = Math.floor(i * cycleLength / pps);

    for (const date of dates) {
      // Day index from start of time (use a fixed epoch for determinism)
      const epoch = new Date(2024, 0, 1); // 2024-01-01 as reference Monday
      const d = new Date(date + "T00:00:00");
      const dayIndex = Math.floor((d.getTime() - epoch.getTime()) / 86400000);
      const cycleDay = ((dayIndex - phaseOffset) % cycleLength + cycleLength) % cycleLength;
      empSchedule.set(date, baseCycle[cycleDay]);
    }
  }

  // Non-rotating employees: assign G on working days, OFF on off days
  // They follow their own 7-day cycle: 6 working + 1 off (by default)
  for (let i = 0; i < nonRotatingEmployees.length; i++) {
    const emp = nonRotatingEmployees[i];
    const empSchedule = schedule.get(emp.id)!;
    // Space their off days evenly, staggered by index
    const offOffset = i; // stagger offs
    for (const date of dates) {
      const epoch = new Date(2024, 0, 1);
      const d = new Date(date + "T00:00:00");
      const dayIndex = Math.floor((d.getTime() - epoch.getTime()) / 86400000);
      const cycleDay = ((dayIndex - offOffset) % 7 + 7) % 7;
      empSchedule.set(date, cycleDay === 6 ? "OFF" : (emp.eligibleGShift ? "G" : "A"));
    }
  }

  return schedule;
}

/**
 * Distributes surplus G-days across eligible rotating employees.
 * `surplusDays` = total extra working-days per week beyond the required slots.
 * On days where a shift would be over-staffed, the surplus employee is moved to G.
 */
export function applySurplusGShifts(
  schedule: Map<string, Map<string, ShiftCode>>,
  employees: EngineEmployee[],
  config: UnitConfig,
  startDate: string,
  endDate: string
): void {
  const dates = dateRange(startDate, endDate);
  const pps = config.personsPerShift;

  // Count each employee's G days so we can distribute fairly
  const gDayCount = new Map<string, number>();
  for (const emp of employees) gDayCount.set(emp.id, 0);

  for (const date of dates) {
    // Count how many are on each rotating shift
    const counts: Record<ShiftCode, string[]> = {
      A: [], B: [], C: [], G: [], D12: [], N12: [], OFF: [], L: [],
    };

    for (const emp of employees) {
      const shift = schedule.get(emp.id)?.get(date);
      if (shift) counts[shift].push(emp.id);
    }

    // For each rotating shift that is over-staffed, move surplus to G
    const rotatingShifts: ShiftCode[] = config.shiftsPerDay === 2 ? ["A", "B"] : ["A", "B", "C"];
    for (const sh of rotatingShifts) {
      const onShift = counts[sh];
      if (onShift.length <= pps) continue;

      const surplus = onShift.length - pps;
      // Pick the G-eligible employees with fewest G-days so far
      const eligible = onShift
        .map((id) => employees.find((e) => e.id === id)!)
        .filter((e) => e.eligibleGShift && e.doesRotatingShift)
        .sort((a, b) => (gDayCount.get(a.id) ?? 0) - (gDayCount.get(b.id) ?? 0));

      for (let k = 0; k < Math.min(surplus, eligible.length); k++) {
        const emp = eligible[k];
        schedule.get(emp.id)!.set(date, "G");
        gDayCount.set(emp.id, (gDayCount.get(emp.id) ?? 0) + 1);
      }
    }
  }
}
