import { DEFAULT_SHIFT_TIMES, ShiftCode, ShiftTime } from "./types";

/**
 * Returns the end hour of a shift on a given day index.
 * For overnight shifts (C, N12), end is on the next day.
 */
export function shiftEndHour(shift: ShiftCode, times: Record<ShiftCode, ShiftTime> = DEFAULT_SHIFT_TIMES): number {
  return times[shift].endHour;
}

export function shiftStartHour(shift: ShiftCode, times: Record<ShiftCode, ShiftTime> = DEFAULT_SHIFT_TIMES): number {
  return times[shift].startHour;
}

/**
 * Checks if placing `nextShift` on the day immediately after `prevShift`
 * satisfies the minimum rest constraint.
 *
 * Rest is measured from end-of-prevShift to start-of-nextShift on the next calendar day.
 * For cross-midnight shifts (endHour < startHour), the end is "tomorrow morning."
 */
export function hasEnoughRest(
  prevShift: ShiftCode,
  nextShift: ShiftCode,
  minRestHours: number,
  times: Record<ShiftCode, ShiftTime> = DEFAULT_SHIFT_TIMES
): boolean {
  if (prevShift === "OFF" || prevShift === "L" || nextShift === "OFF" || nextShift === "L") return true;

  const prevTime = times[prevShift];
  const nextTime = times[nextShift];

  // Hours from midnight of the NEXT day until next shift starts
  // prevEnd: if shift crosses midnight (endHour < startHour), end is on next calendar day
  const prevEndIsNextDay = prevTime.endHour <= prevTime.startHour && prevTime.durationHours > 0;
  // nextStart: 24 + start if on next day; 48 + start if two days out (not needed here)

  // We normalize: "midnight reference" = start of the NEXT calendar day (24:00 current = 0:00 next)
  // prevEnd in hours after "current day midnight"
  const prevEndAfterMidnight = prevEndIsNextDay
    ? prevTime.endHour           // e.g., C ends at 6 = 6 hours into next day
    : 24 + prevTime.endHour;     // B ends at 22 = 22 hours into current day; from next midnight = negative, handled below

  // nextStart in hours after "next day midnight"
  const nextStartAfterMidnight = nextTime.startHour; // e.g., A starts at 6

  // Rest hours = nextStart (next day) - prevEnd (possibly into next day)
  // Both measured from the boundary between day N and day N+1:
  const restHours = nextStartAfterMidnight + (prevEndIsNextDay ? 0 : 24) - (prevEndIsNextDay ? prevTime.endHour : prevTime.endHour);

  // Simplified calculation:
  // prevEndHour in "hours since start of current day"
  const prevEndHourInDay = prevEndIsNextDay
    ? prevTime.endHour + 24   // ends at 6 on next day = 30 hours from start of current day
    : prevTime.endHour;       // ends at 22 on current day

  // nextStartHour in "hours since start of next day" = nextTime.startHour + 24
  const nextStartHourFromCurrent = nextTime.startHour + 24;

  const actualRest = nextStartHourFromCurrent - prevEndHourInDay;
  void restHours;
  return actualRest >= minRestHours;
}

/** Quick lookup: which shifts are forbidden the day after `prevShift` given minRestHours. */
export function forbiddenNextDayShifts(
  prevShift: ShiftCode,
  minRestHours: number,
  times: Record<ShiftCode, ShiftTime> = DEFAULT_SHIFT_TIMES
): ShiftCode[] {
  const all: ShiftCode[] = ["A", "B", "C", "G", "D12", "N12", "OFF", "L"];
  return all.filter((s) => s !== "OFF" && s !== "L" && !hasEnoughRest(prevShift, s, minRestHours, times));
}
