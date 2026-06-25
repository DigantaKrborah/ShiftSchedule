// Pure engine types — no DB or React imports

export type ShiftCode = "A" | "B" | "C" | "G" | "D12" | "N12" | "OFF" | "L";

export type FeasibilityLevel = "OK" | "INFO" | "TIGHT" | "INFEASIBLE";

export interface ShiftTime {
  code: ShiftCode;
  startHour: number; // 0-23
  endHour: number;   // 0-23 (next day if < startHour)
  durationHours: number;
}

export const DEFAULT_SHIFT_TIMES: Record<ShiftCode, ShiftTime> = {
  A:   { code: "A",   startHour: 6,  endHour: 14, durationHours: 8 },
  B:   { code: "B",   startHour: 14, endHour: 22, durationHours: 8 },
  C:   { code: "C",   startHour: 22, endHour: 6,  durationHours: 8 },
  G:   { code: "G",   startHour: 8,  endHour: 16, durationHours: 8 },
  D12: { code: "D12", startHour: 6,  endHour: 18, durationHours: 12 },
  N12: { code: "N12", startHour: 18, endHour: 6,  durationHours: 12 },
  OFF: { code: "OFF", startHour: 0,  endHour: 0,  durationHours: 0 },
  L:   { code: "L",   startHour: 0,  endHour: 0,  durationHours: 0 },
};

/** Clock hours covered by a shift (for hour-by-hour coverage checks). */
export function getShiftHours(shift: ShiftCode, times: Record<ShiftCode, ShiftTime> = DEFAULT_SHIFT_TIMES): number[] {
  if (shift === "OFF" || shift === "L") return [];
  const t = times[shift];
  const hours: number[] = [];
  let h = t.startHour;
  for (let i = 0; i < t.durationHours; i++) {
    hours.push(h % 24);
    h = (h + 1) % 24;
  }
  return hours;
}

export interface EngineEmployee {
  id: string;
  name?: string;            // optional — used only for flag messages
  seniorityIndex: number;  // 0 = most senior
  doesRotatingShift: boolean;
  eligibleGShift: boolean;
  eligibleTwelveHr: boolean;
  givesLeaveBackup: boolean;
  cumulative12hrCount: number; // running total, never reset
}

/** One absence event for a single date — passed to coverAbsences. */
export interface AbsentEntry {
  empId: string;
  name?: string;
  originalShift: ShiftCode; // the shift they vacated
}

export interface UnitConfig {
  id: string;
  personsPerShift: number;
  shiftsPerDay: number;
  weeklyOffDays: number;
  minRestHours: number;
  maxConsecutiveWorkDays: number;
  minConsecutiveWorkDays: number;
  shiftTimes?: Partial<Record<ShiftCode, ShiftTime>>;
}

export interface LeaveInterval {
  employeeId: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  status: "PLANNED" | "EMERGENCY";
}

export interface ScheduleCell {
  employeeId: string;
  date: string; // YYYY-MM-DD
  shiftCode: ShiftCode;
  isManualOverride: boolean;
  notes: string;
}

export interface FeasibilityFlag {
  unitId: string;
  date: string;
  level: FeasibilityLevel;
  message: string;
  suggestion: SuggestedRota;
}

export interface SuggestedRota {
  description: string;
  assignments: Array<{ employeeId: string; shiftCode: ShiftCode }>;
}

export interface EngineResult {
  cells: ScheduleCell[];
  flags: FeasibilityFlag[];
  tallies: EmployeeTally[];
}

export interface EmployeeTally {
  employeeId: string;
  offDays: number;
  d12Count: number;
  n12Count: number;
  totalNights: number;  // C + N12
  totalHours: number;
  gDays: number;
}

export interface ManpowerStats {
  slotsPerWeek: number;
  workingDaysEach: number;
  requiredEmployees: number;
  surplusPersonDays: number;
  actualEmployees: number;
  status: "BALANCED" | "SHORT" | "SURPLUS";
}
