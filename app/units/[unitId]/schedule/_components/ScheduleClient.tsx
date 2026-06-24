"use client";

import { useState, useEffect, useCallback } from "react";
import ShiftBadge from "@/app/_components/ShiftBadge";
import type { ShiftCode } from "@/lib/engine";

interface EmpInfo {
  id: string;
  name: string;
  seniorityIndex: number;
  doesRotatingShift: boolean;
}

interface ScheduleEntry {
  id: string;
  employeeId: string;
  date: string;
  shiftCode: ShiftCode;
  isManualOverride: boolean;
}

interface FlagEntry {
  id: string;
  date: string;
  level: "OK" | "TIGHT" | "INFEASIBLE";
  message: string;
}

interface Tally {
  employeeId: string;
  offDays: number;
  d12Count: number;
  n12Count: number;
  totalNights: number;
  totalHours: number;
  gDays: number;
}

const SHIFTS: ShiftCode[] = ["A", "B", "C", "G", "D12", "N12", "OFF"];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildMonthDates(year: number, month: number): string[] {
  const lastDay = new Date(year, month, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
}

export function ScheduleClient({
  unitId,
  employees,
}: {
  unitId: string;
  employees: EmpInfo[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{ entryId: string } | null>(null);

  const dates = buildMonthDates(year, month);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/units/${unitId}/schedule?start=${startDate}&end=${endDate}`
      );
      const data = await res.json();
      setEntries(data.entries ?? []);
      setFlags(data.flags ?? []);
      setTallies(data.tallies ?? []);
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/units/${unitId}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startDate, end: endDate }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchSchedule();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleOverride(entryId: string, shiftCode: ShiftCode) {
    setOverrideTarget(null);
    await fetch(`/api/units/${unitId}/schedule/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftCode }),
    });
    await fetchSchedule();
  }

  // Build lookup maps
  const entryMap = new Map<string, Map<string, ScheduleEntry>>();
  for (const e of entries) {
    if (!entryMap.has(e.date)) entryMap.set(e.date, new Map());
    entryMap.get(e.date)!.set(e.employeeId, e);
  }

  const flagMap = new Map<string, FlagEntry>();
  for (const f of flags) flagMap.set(f.date, f);

  const tallyMap = new Map<string, Tally>();
  for (const t of tallies) tallyMap.set(t.employeeId, t);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const badFlags = flags.filter((f) => f.level !== "OK");

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg leading-none"
          >
            ‹
          </button>
          <span className="font-semibold w-36 text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg leading-none"
          >
            ›
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating…" : "Generate Schedule"}
        </button>

        {entries.length > 0 && (
          <a
            href={`/api/units/${unitId}/schedule/export?start=${startDate}&end=${endDate}`}
            className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Export Excel
          </a>
        )}

        {loading && <span className="text-sm text-gray-400">Loading…</span>}
      </div>

      {/* Feasibility alerts */}
      {badFlags.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {badFlags.map((flag) => (
            <div
              key={flag.id}
              className={`text-sm px-3 py-2 rounded-md border ${
                flag.level === "INFEASIBLE"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-yellow-50 text-yellow-800 border-yellow-200"
              }`}
            >
              <span className="font-semibold">{flag.date}</span> — {flag.message}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="mb-1 font-medium">No schedule for {monthLabel}</p>
          <p className="text-sm">Click "Generate Schedule" to create one</p>
        </div>
      )}

      {/* Grid */}
      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="text-xs border-collapse w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[10rem]">
                  Employee
                </th>
                {dates.map((date) => {
                  const d = new Date(date + "T00:00:00");
                  const flag = flagMap.get(date);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={date}
                      title={date}
                      className={`px-1 py-1.5 text-center font-medium text-gray-600 min-w-[2.75rem] border-r border-gray-100 ${
                        flag?.level === "INFEASIBLE"
                          ? "bg-red-50"
                          : flag?.level === "TIGHT"
                          ? "bg-yellow-50"
                          : isWeekend
                          ? "bg-slate-50"
                          : ""
                      }`}
                    >
                      <div className="font-semibold">{d.getDate()}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {DAY_LABELS[d.getDay()]}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem] border-l border-gray-200">
                  Hrs
                </th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">
                  Off
                </th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">
                  12hr
                </th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">
                  Nts
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const tally = tallyMap.get(emp.id);
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
                return (
                  <tr key={emp.id} className={rowBg}>
                    <td
                      className={`sticky left-0 z-10 px-3 py-1.5 border-r border-gray-200 ${rowBg}`}
                    >
                      <div className="font-medium text-gray-800 leading-tight">
                        {emp.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {emp.doesRotatingShift ? "Rotating" : "G-Fixed"}
                      </div>
                    </td>
                    {dates.map((date) => {
                      const entry = entryMap.get(date)?.get(emp.id);
                      return (
                        <td
                          key={date}
                          className="px-0.5 py-0.5 text-center border-r border-gray-100"
                        >
                          {entry ? (
                            <button
                              onClick={() => setOverrideTarget({ entryId: entry.id })}
                              className={`rounded transition-opacity hover:opacity-80 ${
                                entry.isManualOverride
                                  ? "ring-2 ring-violet-400 ring-offset-0"
                                  : ""
                              }`}
                              title={
                                entry.isManualOverride
                                  ? "Manual override — click to change"
                                  : "Click to override"
                              }
                            >
                              <ShiftBadge code={entry.shiftCode} size="xs" />
                            </button>
                          ) : (
                            <span className="text-gray-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center text-gray-700 border-l border-gray-200">
                      {tally?.totalHours ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-700">
                      {tally?.offDays ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-700">
                      {tally ? tally.d12Count + tally.n12Count : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-700">
                      {tally?.totalNights ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 items-center text-xs text-gray-500">
          <span>Shifts:</span>
          {SHIFTS.map((s) => (
            <ShiftBadge key={s} code={s} size="xs" />
          ))}
          <span className="ml-2 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded ring-2 ring-violet-400 bg-white"></span>
            Manual override
          </span>
        </div>
      )}

      {/* Override modal */}
      {overrideTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOverrideTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-5 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-800 mb-3">
              Override Shift
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SHIFTS.map((code) => (
                <button
                  key={code}
                  onClick={() => handleOverride(overrideTarget.entryId, code)}
                  className="flex items-center justify-center p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                >
                  <ShiftBadge code={code} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setOverrideTarget(null)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
