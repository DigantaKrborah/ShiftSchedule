"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  level: "OK" | "INFO" | "TIGHT" | "INFEASIBLE";
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

interface FinalizedRecord {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  finalizedAt: string;
}

const SHIFTS: ShiftCode[] = ["A", "B", "C", "G", "D12", "N12", "OFF"];     // user-assignable
const LEGEND_SHIFTS: ShiftCode[] = ["A", "B", "C", "G", "D12", "N12", "OFF", "L"]; // all codes shown in legend
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ScheduleClient({
  unitId,
  unitName,
  personsPerShift,
  initStart,
  initEnd,
  employees,
  initialEntries,
  initialFlags,
  initialTallies,
}: {
  unitId: string;
  unitName: string;
  personsPerShift: number;
  initStart: string;
  initEnd: string;
  employees: EmpInfo[];
  initialEntries: ScheduleEntry[];
  initialFlags: FlagEntry[];
  initialTallies: Tally[];
}) {
  const [start, setStart]   = useState(initStart);
  const [end, setEnd]       = useState(initEnd);
  const [entries, setEntries]   = useState<ScheduleEntry[]>(initialEntries);
  const [flags, setFlags]       = useState<FlagEntry[]>(initialFlags);
  const [tallies, setTallies]   = useState<Tally[]>(initialTallies);
  const [loading, setLoading]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{ entryId: string } | null>(null);
  const [ssrRange] = useState(`${initStart}|${initEnd}`);

  // Finalized schedules
  const [finalizedList, setFinalizedList]   = useState<FinalizedRecord[]>([]);
  const [finalizeModal, setFinalizeModal]   = useState(false);
  const [finalizeLabel, setFinalizeLabel]   = useState("");
  const [finalizing, setFinalizing]         = useState(false);

  // AI — Feature 2: schedule query
  const [aiQuery, setAiQuery]       = useState("");
  const [aiAnswer, setAiAnswer]     = useState("");
  const [aiLoading, setAiLoading]   = useState(false);

  // AI — Feature 3: fairness audit
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult]   = useState("");
  const [auditModal, setAuditModal]     = useState(false);

  // AI — Feature 4: schedule summary (auto-generates finalize label)
  const [summaryLoading, setSummaryLoading] = useState(false);

  const dates = buildDateRange(start, end);

  const fetchSchedule = useCallback(async (s: string, e: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/units/${unitId}/schedule?start=${s}&end=${e}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setFlags(data.flags ?? []);
      setTallies(data.tallies ?? []);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  const fetchFinalized = useCallback(async () => {
    const res  = await fetch(`/api/units/${unitId}/finalized`);
    const data = await res.json();
    setFinalizedList(Array.isArray(data) ? data : []);
  }, [unitId]);

  useEffect(() => { fetchFinalized(); }, [fetchFinalized]);

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const res = await fetch(`/api/units/${unitId}/finalized`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, label: finalizeLabel.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Finalize failed");
        return;
      }
      setFinalizeModal(false);
      setFinalizeLabel("");
      await fetchFinalized();
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDeleteFinalized(id: string) {
    if (!confirm("Delete this finalized schedule? This cannot be undone.")) return;
    await fetch(`/api/units/${unitId}/finalized/${id}`, { method: "DELETE" });
    await fetchFinalized();
  }

  // AI — Feature 2: build compact schedule context and stream the answer
  function buildScheduleContext(): string {
    const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // Date-indexed section: for each day, list who is on which shift
    const dayLines = dates.map((d) => {
      const dow = DAY[new Date(d + "T00:00:00").getDay()];
      const byShift = new Map<string, string[]>();
      for (const emp of employees) {
        const code = entryMap.get(d)?.get(emp.id)?.shiftCode ?? "·";
        if (!byShift.has(code)) byShift.set(code, []);
        byShift.get(code)!.push(emp.name);
      }
      const parts = Array.from(byShift.entries())
        .map(([code, names]) => `${code}: ${names.join(", ")}`);
      return `${d} (${dow}): ${parts.join(" | ")}`;
    }).join("\n");

    // Tally section
    const tallyLines = employees.map((emp) => {
      const t = tallyMap.get(emp.id);
      return `  ${emp.name}: Hrs=${t?.totalHours ?? "-"} Off=${t?.offDays ?? "-"} D12=${t?.d12Count ?? "-"} N12=${t?.n12Count ?? "-"} Nights=${t?.totalNights ?? "-"}`;
    }).join("\n");

    const flagLines = flags.length
      ? "\nFLAGS:\n" + flags.map((f) => `  ${f.date} [${f.level}]: ${f.message}`).join("\n")
      : "";

    return `Unit: ${unitName} | Staff per shift: ${personsPerShift} | Period: ${start} to ${end}\n\nDAILY ASSIGNMENTS:\n${dayLines}\n\nEMPLOYEE TALLIES:\n${tallyLines}${flagLines}`;
  }

  async function handleAiQuery() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await fetch(`/api/units/${unitId}/ai/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: aiQuery, context: buildScheduleContext() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setAiAnswer(errData.error ?? "AI is unavailable.");
        return;
      }
      if (!res.body) { setAiAnswer("AI is unavailable."); return; }
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setAiAnswer(result);
      }
    } finally {
      setAiLoading(false);
    }
  }

  // AI — Feature 3: fairness audit
  async function handleFairnessAudit() {
    setAuditLoading(true);
    setAuditResult("");
    setAuditModal(true);
    try {
      const res  = await fetch(`/api/units/${unitId}/ai/fairness-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      const data = await res.json();
      if (!res.ok) { setAuditResult(data.error ?? "Audit failed"); return; }
      setAuditResult(data.audit);
    } finally {
      setAuditLoading(false);
    }
  }

  // AI — Feature 4: auto-generate a label for the finalize modal
  async function handleGenerateSummary() {
    setSummaryLoading(true);
    try {
      const res  = await fetch(`/api/units/${unitId}/ai/schedule-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      const data = await res.json();
      if (res.ok && data.summary) setFinalizeLabel(data.summary);
    } finally {
      setSummaryLoading(false);
    }
  }

  // Only fetch when the range changes away from the SSR-provided range
  useEffect(() => {
    if (`${start}|${end}` !== ssrRange) fetchSchedule(start, end);
  }, [start, end, ssrRange, fetchSchedule]);

  async function handleGenerate() {
    if (!start || !end || start > end) {
      alert("Please set a valid start and end date (start must be on or before end).");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/units/${unitId}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchSchedule(start, end);
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
    await fetchSchedule(start, end);
  }

  // Lookup maps
  const entryMap = new Map<string, Map<string, ScheduleEntry>>();
  for (const e of entries) {
    if (!entryMap.has(e.date)) entryMap.set(e.date, new Map());
    entryMap.get(e.date)!.set(e.employeeId, e);
  }
  const flagMap  = new Map<string, FlagEntry>();
  for (const f of flags) flagMap.set(f.date, f);
  const tallyMap = new Map<string, Tally>();
  for (const t of tallies) tallyMap.set(t.employeeId, t);

  const badFlags  = flags.filter((f) => f.level !== "OK" && f.level !== "INFO");
  const infoFlags = flags.filter((f) => f.level === "INFO");
  const rangeLabel = start && end
    ? `${formatDateLabel(start)} – ${formatDateLabel(end)}`
    : "Select a date range";

  return (
    <div>
      {/* Date range controls */}
      <div className="flex flex-wrap items-end gap-4 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
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

        <div className="flex items-center gap-2 pb-0.5">
          <button
            onClick={handleGenerate}
            disabled={generating || loading || !start || !end || start > end}
            className="bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating…" : "Generate Schedule"}
          </button>

          {entries.length > 0 && (
            <>
              <button
                onClick={handleFairnessAudit}
                disabled={auditLoading}
                title="AI Fairness Audit"
                className="border border-purple-300 text-purple-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-50 disabled:opacity-50 transition-colors"
              >
                {auditLoading ? "Auditing…" : "✦ AI Audit"}
              </button>
              <button
                onClick={() => { setFinalizeLabel(""); setFinalizeModal(true); }}
                className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors"
              >
                Finalize Schedule
              </button>
              <a
                href={`/api/units/${unitId}/schedule/export?start=${start}&end=${end}`}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Export Excel
              </a>
            </>
          )}

          {loading && <span className="text-sm text-gray-400">Loading…</span>}
        </div>

        {start && end && start <= end && (
          <div className="ml-auto text-sm text-gray-500 pb-0.5 self-end">
            {rangeLabel}
            <span className="ml-2 text-gray-400">({dates.length} day{dates.length !== 1 ? "s" : ""})</span>
          </div>
        )}
      </div>

      {/* Validation message */}
      {start && end && start > end && (
        <div className="mb-4 text-sm px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700">
          Start date must be on or before end date.
        </div>
      )}

      {/* Feasibility alerts — TIGHT/INFEASIBLE */}
      {badFlags.length > 0 && (
        <div className="mb-3 space-y-1.5">
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

      {/* INFO flags — coverage notes (blue, collapsible) */}
      {infoFlags.length > 0 && (
        <details className="mb-4 group">
          <summary className="cursor-pointer text-sm font-medium text-blue-700 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 list-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
            {infoFlags.length} leave coverage note{infoFlags.length !== 1 ? "s" : ""} — click to expand
          </summary>
          <div className="mt-1.5 space-y-1">
            {infoFlags.map((flag) => (
              <div key={flag.id} className="text-sm px-3 py-2 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
                <span className="font-semibold">{flag.date}</span> — {flag.message}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty state */}
      {entries.length === 0 && !loading && start && end && start <= end && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="mb-1 font-medium">No schedule for {rangeLabel}</p>
          <p className="text-sm">Click "Generate Schedule" to create one</p>
        </div>
      )}

      {/* Grid */}
      {entries.length > 0 && dates.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="text-xs border-collapse w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[10rem]">
                  Employee
                </th>
                {dates.map((date) => {
                  const d         = new Date(date + "T00:00:00");
                  const flag      = flagMap.get(date);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={date}
                      title={date}
                      className={`px-1 py-1.5 text-center font-medium text-gray-600 min-w-[2.75rem] border-r border-gray-100 ${
                        flag?.level === "INFEASIBLE" ? "bg-red-50"
                        : flag?.level === "TIGHT"    ? "bg-yellow-50"
                        : flag?.level === "INFO"     ? "bg-blue-50"
                        : isWeekend                  ? "bg-slate-50"
                        : ""
                      }`}
                    >
                      <div className="font-semibold">{d.getDate()}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{DAY_LABELS[d.getDay()]}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem] border-l border-gray-200">Hrs</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">Off</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">12hr</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[3rem]">Nts</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const tally = tallyMap.get(emp.id);
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
                return (
                  <tr key={emp.id} className={rowBg}>
                    <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-gray-200 ${rowBg}`}>
                      <div className="font-medium text-gray-800 leading-tight">{emp.name}</div>
                      <div className="text-[10px] text-gray-400">{emp.doesRotatingShift ? "Rotating" : "G-Fixed"}</div>
                    </td>
                    {dates.map((date) => {
                      const entry = entryMap.get(date)?.get(emp.id);
                      return (
                        <td key={date} className="px-0.5 py-0.5 text-center border-r border-gray-100">
                          {entry ? (
                            <button
                              onClick={() => setOverrideTarget({ entryId: entry.id })}
                              className={`rounded transition-opacity hover:opacity-80 ${entry.isManualOverride ? "ring-2 ring-violet-400 ring-offset-0" : ""}`}
                              title={entry.isManualOverride ? "Manual override — click to change" : "Click to override"}
                            >
                              <ShiftBadge code={entry.shiftCode} size="xs" />
                            </button>
                          ) : (
                            <span className="text-gray-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center text-gray-700 border-l border-gray-200">{tally?.totalHours ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center text-gray-700">{tally?.offDays ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center text-gray-700">{tally ? tally.d12Count + tally.n12Count : "—"}</td>
                    <td className="px-2 py-1.5 text-center text-gray-700">{tally?.totalNights ?? "—"}</td>
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
          {LEGEND_SHIFTS.map((s) => <ShiftBadge key={s} code={s} size="xs" />)}
          <span className="ml-2 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded ring-2 ring-violet-400 bg-white"></span>
            Manual override
          </span>
        </div>
      )}

      {/* Finalized schedules table */}
      {finalizedList.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span>
            Finalized Schedules
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Label / Date Range</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Finalized On</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {finalizedList.map((rec, idx) => {
                  const rangeStr = `${formatDateLabel(rec.startDate)} – ${formatDateLabel(rec.endDate)}`;
                  const displayLabel = rec.label || rangeStr;
                  return (
                    <tr key={rec.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{displayLabel}</div>
                        {rec.label && <div className="text-xs text-gray-400">{rangeStr}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {new Date(rec.finalizedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 flex items-center gap-2 justify-end">
                        <Link
                          href={`/units/${unitId}/finalized/${rec.id}`}
                          className="text-xs font-medium text-slate-700 border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteFinalized(rec.id)}
                          className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI — Feature 2: Schedule Query */}
      {entries.length > 0 && (
        <div className="mt-6 border border-purple-200 rounded-xl p-4 bg-purple-50/30">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">✦ Ask AI about this schedule</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAiQuery()}
              placeholder="e.g. Who is on B shift on June 15? How many 12hr duties does Carol have?"
              className="flex-1 border border-purple-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={handleAiQuery}
              disabled={aiLoading || !aiQuery.trim()}
              className="bg-purple-700 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading ? "…" : "Ask"}
            </button>
          </div>
          {aiAnswer && (
            <div className="mt-3 text-sm text-gray-700 bg-white border border-purple-100 rounded-lg px-4 py-3 whitespace-pre-wrap leading-relaxed">
              {aiAnswer}
            </div>
          )}
        </div>
      )}

      {/* AI — Feature 3: Fairness Audit Modal */}
      {auditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAuditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[36rem] max-w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">✦</span> AI Fairness Audit
              </p>
              <button onClick={() => setAuditModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {auditLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Analysing shift distribution…</div>
            ) : (
              <div className="flex-1 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {auditResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finalize modal */}
      {finalizeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setFinalizeModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-gray-900 mb-1">Finalize Schedule</p>
            <p className="text-sm text-gray-500 mb-4">
              Save a snapshot of <span className="font-medium text-gray-700">{formatDateLabel(start)} – {formatDateLabel(end)}</span> for future reference.
            </p>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Label <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="text-xs text-purple-700 hover:text-purple-900 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {summaryLoading ? "Generating…" : "✦ AI auto-label"}
                </button>
              </div>
              <input
                type="text"
                value={finalizeLabel}
                onChange={(e) => setFinalizeLabel(e.target.value)}
                placeholder="e.g. June 2026 Final"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex-1 bg-green-700 text-white py-2 rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {finalizing ? "Saving…" : "Finalize"}
              </button>
              <button
                onClick={() => setFinalizeModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setOverrideTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-64" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800 mb-3">Override Shift</p>
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
            <button onClick={() => setOverrideTarget(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
