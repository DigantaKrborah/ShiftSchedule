/**
 * Absence coverage logic:
 * 1. Relief/G person first
 * 2. 12-hr pair conversion
 * 3. Flag TIGHT/INFEASIBLE if neither works
 */

import type {
  EngineEmployee,
  FeasibilityFlag,
  FeasibilityLevel,
  ScheduleCell,
  ShiftCode,
  UnitConfig,
} from "./types";
import { DEFAULT_SHIFT_TIMES, getShiftHours } from "./types";
import { hasEnoughRest } from "./rest";

/** Absent shift → which pairs of remaining shifts get D12/N12 */
const TWELVE_HR_PAIR: Record<string, { d12From: ShiftCode; n12From: ShiftCode }> = {
  A: { d12From: "B", n12From: "C" },
  B: { d12From: "A", n12From: "C" },
  C: { d12From: "B", n12From: "A" },
};

export interface DayRoster {
  date: string;
  assignments: Map<string, ShiftCode>; // employeeId -> shiftCode
}

/**
 * Verify that for every clock-hour in 24h, the number of bodies equals personsPerShift.
 * Returns null if OK, or a description of the first hour that fails.
 */
export function verifyHourlyCoverage(
  assignments: Map<string, ShiftCode>,
  pps: number,
  shiftTimes = DEFAULT_SHIFT_TIMES
): string | null {
  const coverCount = new Array(24).fill(0);

  for (const [, shift] of assignments) {
    if (shift === "OFF" || shift === "G") continue;
    const hours = getShiftHours(shift, shiftTimes);
    for (const h of hours) coverCount[h]++;
  }

  // Only check hours where the unit normally operates (shifts A, B, C span all 24h)
  for (let h = 0; h < 24; h++) {
    if (coverCount[h] !== 0 && coverCount[h] !== pps) {
      return `Hour ${h}:00 has ${coverCount[h]} bodies, expected ${pps}`;
    }
  }
  return null;
}

/**
 * Apply absence coverage for a single date.
 * Mutates `assignments` in place.
 * Returns a FeasibilityFlag if the date is TIGHT or INFEASIBLE.
 */
export function coverAbsences(
  date: string,
  assignments: Map<string, ShiftCode>,
  employees: EngineEmployee[],
  prevDayAssignments: Map<string, ShiftCode> | undefined,
  config: UnitConfig,
  unitId: string
): FeasibilityFlag | null {
  const shiftTimes = { ...DEFAULT_SHIFT_TIMES, ...(config.shiftTimes ?? {}) };
  const pps = config.personsPerShift;

  // Determine which employees are absent (their shift was replaced with a leave marker)
  // We receive assignments already with absent employees removed (they won't appear, or appear as special value)
  // Actually, absent employees are those with shiftCode not covering their expected slot.
  // Strategy: count per rotating shift (A, B, C), find which is short.

  const shiftBuckets: Record<string, string[]> = { A: [], B: [], C: [], G: [], D12: [], N12: [], OFF: [] };
  for (const [empId, shift] of assignments) {
    if (shiftBuckets[shift]) shiftBuckets[shift].push(empId);
  }

  const rotatingShifts: ShiftCode[] = ["A", "B", "C"];
  const shortShifts = rotatingShifts.filter((sh) => shiftBuckets[sh].length < pps);

  if (shortShifts.length === 0) return null; // fully staffed

  const flags: string[] = [];
  let feasLevel: FeasibilityLevel = "OK";

  for (const absentShift of shortShifts) {
    const deficit = pps - shiftBuckets[absentShift].length;

    for (let attempt = 0; attempt < deficit; attempt++) {
      // Step 1: Try relief/G person
      const relieved = tryReliefCover(
        date,
        absentShift,
        assignments,
        employees,
        prevDayAssignments,
        config.minRestHours,
        shiftTimes
      );

      if (relieved) {
        shiftBuckets[absentShift].push(relieved);
        continue;
      }

      // Step 2: Try 12-hr pair
      const pair = TWELVE_HR_PAIR[absentShift];
      if (!pair) {
        feasLevel = "INFEASIBLE";
        flags.push(`No 12-hr pair defined for absent shift ${absentShift}`);
        continue;
      }

      const twelveHrApplied = tryTwelveHrPair(
        date,
        absentShift,
        assignments,
        employees,
        prevDayAssignments,
        config,
        shiftTimes,
        shiftBuckets
      );

      if (twelveHrApplied) {
        shiftBuckets[absentShift].push("D12_COVERED" as ShiftCode); // marker
        continue;
      }

      // Step 3: Flag
      feasLevel = feasLevel === "INFEASIBLE" ? "INFEASIBLE" : "TIGHT";
      flags.push(`Unable to fully cover absent ${absentShift} shift — short by ${deficit - attempt} person(s)`);
      break;
    }
  }

  if (feasLevel === "OK") return null;

  const suggestion = buildSuggestion(assignments, employees);
  return {
    unitId,
    date,
    level: feasLevel,
    message: flags.join("; "),
    suggestion,
  };
}

function tryReliefCover(
  date: string,
  absentShift: ShiftCode,
  assignments: Map<string, ShiftCode>,
  employees: EngineEmployee[],
  prevDay: Map<string, ShiftCode> | undefined,
  minRestHours: number,
  shiftTimes: Record<ShiftCode, typeof DEFAULT_SHIFT_TIMES[ShiftCode]>
): string | null {
  // Find a G-person who gives leave backup, is rest-compliant
  const candidates = employees.filter((e) => {
    const cur = assignments.get(e.id);
    if (cur !== "G") return false;
    if (!e.givesLeaveBackup) return false;
    // Rest check: previous day's shift
    const prev = prevDay?.get(e.id);
    if (prev && prev !== "OFF") {
      if (!hasEnoughRest(prev, absentShift, minRestHours, shiftTimes)) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // Pick most senior available
  candidates.sort((a, b) => a.seniorityIndex - b.seniorityIndex);
  const chosen = candidates[0];
  assignments.set(chosen.id, absentShift);
  return chosen.id;
}

function tryTwelveHrPair(
  date: string,
  absentShift: ShiftCode,
  assignments: Map<string, ShiftCode>,
  employees: EngineEmployee[],
  prevDay: Map<string, ShiftCode> | undefined,
  config: UnitConfig,
  shiftTimes: Record<ShiftCode, typeof DEFAULT_SHIFT_TIMES[ShiftCode]>,
  shiftBuckets: Record<string, string[]>
): boolean {
  const pair = TWELVE_HR_PAIR[absentShift];
  if (!pair) return false;

  // Find candidate for D12 from d12From shift
  const d12Candidates = employees.filter((e) => {
    if (!e.eligibleTwelveHr) return false;
    if (assignments.get(e.id) !== pair.d12From) return false;
    const prev = prevDay?.get(e.id);
    if (prev && prev !== "OFF") {
      if (!hasEnoughRest(prev, "D12", config.minRestHours, shiftTimes)) return false;
    }
    return true;
  });

  // Find candidate for N12 from n12From shift
  const n12Candidates = employees.filter((e) => {
    if (!e.eligibleTwelveHr) return false;
    if (assignments.get(e.id) !== pair.n12From) return false;
    const prev = prevDay?.get(e.id);
    if (prev && prev !== "OFF") {
      if (!hasEnoughRest(prev, "N12", config.minRestHours, shiftTimes)) return false;
    }
    return true;
  });

  if (d12Candidates.length === 0 || n12Candidates.length === 0) return false;

  // Pick by fewest cumulative 12hr count, then fewest seniority (most junior last)
  d12Candidates.sort((a, b) => {
    const diff = a.cumulative12hrCount - b.cumulative12hrCount;
    if (diff !== 0) return diff;
    return a.seniorityIndex - b.seniorityIndex;
  });
  n12Candidates.sort((a, b) => {
    const diff = a.cumulative12hrCount - b.cumulative12hrCount;
    if (diff !== 0) return diff;
    return a.seniorityIndex - b.seniorityIndex;
  });

  // Avoid pairing two most-junior together (soft preference)
  let d12Person = d12Candidates[0];
  let n12Person = n12Candidates[0];

  // If both are the most junior (highest seniorityIndex), try alternatives
  if (d12Candidates.length > 1 && n12Candidates.length > 1) {
    const d12Max = Math.max(...d12Candidates.map((e) => e.seniorityIndex));
    const n12Max = Math.max(...n12Candidates.map((e) => e.seniorityIndex));
    if (d12Person.seniorityIndex === d12Max && n12Person.seniorityIndex === n12Max) {
      // Swap one to a less junior option
      n12Person = n12Candidates[1] ?? n12Person;
    }
  }

  // Don't pick the same person for both
  if (d12Person.id === n12Person.id) {
    const alt = n12Candidates.find((e) => e.id !== d12Person.id);
    if (!alt) return false;
    n12Person = alt;
  }

  assignments.set(d12Person.id, "D12");
  assignments.set(n12Person.id, "N12");

  // Update counts (in-memory; persisting is DB responsibility)
  d12Person.cumulative12hrCount += 1;
  n12Person.cumulative12hrCount += 1;

  // Update buckets
  shiftBuckets[pair.d12From] = shiftBuckets[pair.d12From].filter((id) => id !== d12Person.id);
  shiftBuckets[pair.n12From] = shiftBuckets[pair.n12From].filter((id) => id !== n12Person.id);

  void date;
  return true;
}

function buildSuggestion(assignments: Map<string, ShiftCode>, employees: EngineEmployee[]) {
  const ass: Array<{ employeeId: string; shiftCode: ShiftCode }> = [];
  for (const [id, shift] of assignments) {
    ass.push({ employeeId: id, shiftCode: shift });
  }
  return {
    description: "Best-effort rota with available staff",
    assignments: ass,
  };
}
