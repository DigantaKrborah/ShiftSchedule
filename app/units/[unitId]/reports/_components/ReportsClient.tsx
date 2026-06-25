"use client";

import { useState, useEffect, useCallback } from "react";

interface EmpInfo {
  id: string;
  name: string;
  seniorityIndex: number;
  doesRotatingShift: boolean;
}

interface LeaveRow {
  employeeId: string;
  dates: string[];
  total: number;
}

interface TwelveHrRow {
  employeeId: string;
  d12Dates: string[];
  n12Dates: string[];
  d12Count: number;
  n12Count: number;
  total: number;
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatRangeLabel(start: string, end: string) {
  return `${new Date(start + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(end + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function ReportsClient({
  unitId,
  initStart,
  initEnd,
  employees,
  initialLeave,
  initialTwelveHr,
}: {
  unitId: string;
  initStart: string;
  initEnd: string;
  employees: EmpInfo[];
  initialLeave: LeaveRow[];
  initialTwelveHr: TwelveHrRow[];
}) {
  const [start, setStart]       = useState(initStart);
  const [end, setEnd]           = useState(initEnd);
  const [leave, setLeave]       = useState<LeaveRow[]>(initialLeave);
  const [twelveHr, setTwelveHr] = useState<TwelveHrRow[]>(initialTwelveHr);
  const [loading, setLoading]   = useState(false);
  const [ssrRange]              = useState(`${initStart}|${initEnd}`);

  // AI — Feature 5: anomaly detection
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyResult, setAnomalyResult]   = useState("");

  const empMap = new Map(employees.map((e) => [e.id, e]));

  async function handleAnomalyDetection() {
    setAnomalyLoading(true);
    setAnomalyResult("");
    try {
      const res  = await fetch(`/api/units/${unitId}/ai/anomalies`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setAnomalyResult(data.error ?? "Analysis failed"); return; }
      setAnomalyResult(data.analysis);
    } finally {
      setAnomalyLoading(false);
    }
  }

  const fetchReports = useCallback(async (s: string, e: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/units/${unitId}/reports?start=${s}&end=${e}`);
      const data = await res.json();
      setLeave(data.leave ?? []);
      setTwelveHr(data.twelveHr ?? []);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (`${start}|${end}` !== ssrRange) fetchReports(start, end);
  }, [start, end, ssrRange, fetchReports]);

  // Totals
  const totalLeaveDays   = leave.reduce((s, r) => s + r.total, 0);
  const totalD12         = twelveHr.reduce((s, r) => s + r.d12Count, 0);
  const totalN12         = twelveHr.reduce((s, r) => s + r.n12Count, 0);
  const totalTwelveHr    = twelveHr.reduce((s, r) => s + r.total, 0);

  const validRange = start && end && start <= end;

  return (
    <div className="space-y-8">

      {/* Date range control */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End date</label>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        {loading && <span className="text-sm text-gray-400 self-end pb-1.5">Loading…</span>}
        {validRange && (
          <span className="ml-auto text-sm text-gray-500 self-end pb-1.5">
            {formatRangeLabel(start, end)}
          </span>
        )}
      </div>

      {start && end && start > end && (
        <p className="text-sm px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700">
          Start date must be on or before end date.
        </p>
      )}

      {/* ── Leave Summary ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-[#fbcfe8] border border-pink-300"></span>
          Leave Summary
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 w-8">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 min-w-[10rem]">Employee</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Leave Dates</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-700 w-24">Total Days</th>
              </tr>
            </thead>
            <tbody>
              {leave.map((row, idx) => {
                const emp = empMap.get(row.employeeId);
                if (!emp) return null;
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
                return (
                  <tr key={row.employeeId} className={`border-b border-gray-100 ${rowBg}`}>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{emp.seniorityIndex}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-[11px] text-gray-400">{emp.doesRotatingShift ? "Rotating" : "G-Fixed"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.dates.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.dates.map((d) => (
                            <span
                              key={d}
                              className="inline-block bg-[#fbcfe8] text-pink-900 text-[11px] font-medium px-1.5 py-0.5 rounded"
                            >
                              {fmt(d)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-semibold ${row.total > 0 ? "text-pink-700" : "text-gray-400"}`}>
                        {row.total}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 font-semibold text-gray-700 text-sm">
                  Total
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {totalLeaveDays} leave day{totalLeaveDays !== 1 ? "s" : ""} across all employees
                </td>
                <td className="px-4 py-2.5 text-center font-bold text-pink-700 text-base">
                  {totalLeaveDays}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── 12hr Duty Summary ─────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-[#fed7aa] border border-orange-300"></span>
          <span className="inline-block w-3 h-3 rounded bg-[#fecaca] border border-red-300"></span>
          12-Hour Duty Summary
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 w-8">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 min-w-[10rem]">Employee</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">D12 Dates <span className="font-normal text-gray-400">(06:00–18:00)</span></th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">N12 Dates <span className="font-normal text-gray-400">(18:00–06:00)</span></th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-16">D12</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-16">N12</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {twelveHr.map((row, idx) => {
                const emp = empMap.get(row.employeeId);
                if (!emp) return null;
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
                return (
                  <tr key={row.employeeId} className={`border-b border-gray-100 ${rowBg}`}>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{emp.seniorityIndex}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-[11px] text-gray-400">{emp.doesRotatingShift ? "Rotating" : "G-Fixed"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.d12Dates.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.d12Dates.map((d) => (
                            <span key={d} className="inline-block bg-[#fed7aa] text-orange-900 text-[11px] font-medium px-1.5 py-0.5 rounded">
                              {fmt(d)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.n12Dates.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.n12Dates.map((d) => (
                            <span key={d} className="inline-block bg-[#fecaca] text-red-900 text-[11px] font-medium px-1.5 py-0.5 rounded">
                              {fmt(d)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-semibold ${row.d12Count > 0 ? "text-orange-700" : "text-gray-400"}`}>
                        {row.d12Count}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-semibold ${row.n12Count > 0 ? "text-red-700" : "text-gray-400"}`}>
                        {row.n12Count}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold text-base ${row.total > 0 ? "text-slate-800" : "text-gray-400"}`}>
                        {row.total}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 font-semibold text-gray-700 text-sm">Total</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{totalD12} D12 shift{totalD12 !== 1 ? "s" : ""}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{totalN12} N12 shift{totalN12 !== 1 ? "s" : ""}</td>
                <td className="px-3 py-2.5 text-center font-bold text-orange-700">{totalD12}</td>
                <td className="px-3 py-2.5 text-center font-bold text-red-700">{totalN12}</td>
                <td className="px-3 py-2.5 text-center font-bold text-slate-800 text-base">{totalTwelveHr}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* AI — Feature 5: Anomaly Detection */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-purple-600">✦</span> AI Pattern Insights
          </h2>
          <button
            onClick={handleAnomalyDetection}
            disabled={anomalyLoading}
            className="text-sm bg-purple-700 text-white px-4 py-1.5 rounded-md font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {anomalyLoading ? "Analysing…" : "Analyse Historical Patterns"}
          </button>
        </div>
        {!anomalyResult && !anomalyLoading && (
          <p className="text-sm text-gray-400 italic">
            Requires at least 2 finalized schedules. Click the button to detect patterns across periods.
          </p>
        )}
        {anomalyLoading && (
          <div className="text-sm text-gray-400 py-4 text-center">Analysing finalized schedule history…</div>
        )}
        {anomalyResult && (
          <div className="border border-purple-200 rounded-xl bg-purple-50/30 px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {anomalyResult}
          </div>
        )}
      </section>

    </div>
  );
}
