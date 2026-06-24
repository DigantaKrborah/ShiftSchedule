/** Pure date helpers — no timezone magic, all dates are treated as local calendar days. */

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  // Parse as local date (avoids UTC midnight shift on Windows)
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function dateDiffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

export function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

export function isInLeave(date: string, leaveIntervals: Array<{ startDate: string; endDate: string; employeeId: string }>, employeeId: string): boolean {
  return leaveIntervals.some(
    (l) => l.employeeId === employeeId && date >= l.startDate && date <= l.endDate
  );
}
