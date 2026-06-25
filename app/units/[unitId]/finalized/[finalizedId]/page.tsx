import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ShiftBadge from "@/app/_components/ShiftBadge";
import type { ShiftCode } from "@/lib/engine";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const LEGEND_SHIFTS: ShiftCode[] = ["A", "B", "C", "G", "D12", "N12", "OFF", "L"];

function buildDateRange(start: string, end: string) {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface SnapshotEmployee { id: string; name: string; seniorityIndex: number; doesRotatingShift: boolean }
interface SnapshotCell     { employeeId: string; date: string; shiftCode: string; isManualOverride: boolean }
interface SnapshotFlag     { date: string; level: string; message: string }
interface SnapshotTally    { employeeId: string; offDays: number; d12Count: number; n12Count: number; totalNights: number; totalHours: number; gDays: number }

export default async function FinalizedViewPage({
  params,
}: {
  params: Promise<{ unitId: string; finalizedId: string }>;
}) {
  const { unitId, finalizedId } = await params;

  const [unit, record] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.finalizedSchedule.findFirst({ where: { id: finalizedId, unitId } }),
  ]);

  if (!unit || !record) notFound();

  const startDate = record.startDate.toISOString().slice(0, 10);
  const endDate   = record.endDate.toISOString().slice(0, 10);
  const label     = record.label || `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
  const snapshot  = JSON.parse(record.snapshot) as {
    employees: SnapshotEmployee[];
    cells:     SnapshotCell[];
    flags:     SnapshotFlag[];
    tallies:   SnapshotTally[];
  };

  const dates     = buildDateRange(startDate, endDate);
  const entryMap  = new Map<string, Map<string, SnapshotCell>>();
  for (const c of snapshot.cells) {
    if (!entryMap.has(c.date)) entryMap.set(c.date, new Map());
    entryMap.get(c.date)!.set(c.employeeId, c);
  }
  const flagMap  = new Map<string, SnapshotFlag>();
  for (const f of snapshot.flags) flagMap.set(f.date, f);
  const tallyMap = new Map<string, SnapshotTally>();
  for (const t of snapshot.tallies) tallyMap.set(t.employeeId, t);

  const badFlags  = snapshot.flags.filter((f) => f.level !== "OK" && f.level !== "INFO");
  const infoFlags = snapshot.flags.filter((f) => f.level === "INFO");

  return (
    <div className="max-w-full px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/units/${unitId}/schedule`}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back to Schedule
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Finalized schedule: <span className="font-medium text-gray-700">{label}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Finalized on {fmtDateTime(record.finalizedAt.toISOString())}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          Finalized
        </span>
      </div>

      {/* Feasibility alerts */}
      {badFlags.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {badFlags.map((flag, i) => (
            <div key={i} className={`text-sm px-3 py-2 rounded-md border ${
              flag.level === "INFEASIBLE"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-yellow-50 text-yellow-800 border-yellow-200"
            }`}>
              <span className="font-semibold">{flag.date}</span> — {flag.message}
            </div>
          ))}
        </div>
      )}
      {infoFlags.length > 0 && (
        <details className="mb-4 group">
          <summary className="cursor-pointer text-sm font-medium text-blue-700 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 list-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
            {infoFlags.length} leave coverage note{infoFlags.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-1.5 space-y-1">
            {infoFlags.map((flag, i) => (
              <div key={i} className="text-sm px-3 py-2 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
                <span className="font-semibold">{flag.date}</span> — {flag.message}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Read-only grid */}
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
                  <th key={date} title={date} className={`px-1 py-1.5 text-center font-medium text-gray-600 min-w-[2.75rem] border-r border-gray-100 ${
                    flag?.level === "INFEASIBLE" ? "bg-red-50"
                    : flag?.level === "TIGHT"    ? "bg-yellow-50"
                    : flag?.level === "INFO"     ? "bg-blue-50"
                    : isWeekend                  ? "bg-slate-50"
                    : ""
                  }`}>
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
            {snapshot.employees.map((emp, idx) => {
              const tally = tallyMap.get(emp.id);
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
              return (
                <tr key={emp.id} className={rowBg}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-gray-200 ${rowBg}`}>
                    <div className="font-medium text-gray-800 leading-tight">{emp.name}</div>
                    <div className="text-[10px] text-gray-400">{emp.doesRotatingShift ? "Rotating" : "G-Fixed"}</div>
                  </td>
                  {dates.map((date) => {
                    const cell = entryMap.get(date)?.get(emp.id);
                    return (
                      <td key={date} className="px-0.5 py-0.5 text-center border-r border-gray-100">
                        {cell ? (
                          <span className={cell.isManualOverride ? "rounded ring-2 ring-violet-400 ring-offset-0 inline-block" : ""}>
                            <ShiftBadge code={cell.shiftCode as ShiftCode} size="xs" />
                          </span>
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

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2 items-center text-xs text-gray-500">
        <span>Shifts:</span>
        {LEGEND_SHIFTS.map((s) => <ShiftBadge key={s} code={s} size="xs" />)}
        <span className="ml-2 flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded ring-2 ring-violet-400 bg-white"></span>
          Manual override
        </span>
      </div>
    </div>
  );
}
