import type { ManpowerStats, UnitConfig } from "./types";

export function computeManpower(config: UnitConfig, actualEmployees: number): ManpowerStats {
  const slotsPerWeek = config.personsPerShift * config.shiftsPerDay * 7;
  const workingDaysEach = 7 - config.weeklyOffDays;
  const requiredEmployees = Math.ceil(slotsPerWeek / workingDaysEach);
  const surplusPersonDays = actualEmployees * workingDaysEach - slotsPerWeek;

  let status: ManpowerStats["status"];
  if (actualEmployees === requiredEmployees) status = "BALANCED";
  else if (actualEmployees < requiredEmployees) status = "SHORT";
  else status = "SURPLUS";

  return {
    slotsPerWeek,
    workingDaysEach,
    requiredEmployees,
    surplusPersonDays,
    actualEmployees,
    status,
  };
}
