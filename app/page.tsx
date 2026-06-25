import { prisma } from "@/lib/prisma";
import { computeManpower } from "@/lib/engine";
import { requireSession } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SHIFT_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#60a5fa", C: "#2563eb", G: "#22c55e",
  D12: "#f97316", N12: "#ea580c",
  L: "#ec4899", OFF: "#9ca3af",
};

function classifyShift(code: string): "working" | "twelveHr" | "leave" | "off" {
  if (code === "L") return "leave";
  if (code === "OFF") return "off";
  if (code === "D12" || code === "N12") return "twelveHr";
  return "working";
}

export default async function HomePage() {
  const user = await requireSession();

  // Build today as UTC midnight so it matches stored dates (new Date("YYYY-MM-DD") = UTC midnight)
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const today = new Date(todayStr);

  const [units, todayEntries] = await Promise.all([
    prisma.unit.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scheduleEntry.findMany({
      where: { date: today },
    }),
  ]);

  // Per-unit today stats
  const unitStats = units.map((unit) => {
    const entries = todayEntries.filter(e => e.unitId === unit.id);
    const counts = { working: 0, twelveHr: 0, leave: 0, off: 0 };
    const shiftCounts: Record<string, number> = {};
    for (const e of entries) {
      const cat = classifyShift(e.shiftCode);
      counts[cat]++;
      shiftCounts[e.shiftCode] = (shiftCounts[e.shiftCode] ?? 0) + 1;
    }
    const manpower = computeManpower(
      { id: unit.id, personsPerShift: unit.personsPerShift, shiftsPerDay: unit.shiftsPerDay, weeklyOffDays: unit.weeklyOffDays, minRestHours: unit.minRestHours, maxConsecutiveWorkDays: unit.maxConsecutiveWorkDays, minConsecutiveWorkDays: unit.minConsecutiveWorkDays },
      unit._count.employees,
    );
    return { unit, manpower, counts, shiftCounts, total: entries.length };
  });

  // Global totals
  const totalStaff = units.reduce((s, u) => s + u._count.employees, 0);
  const totalWorking = unitStats.reduce((s, u) => s + u.counts.working, 0);
  const totalLeave = unitStats.reduce((s, u) => s + u.counts.leave, 0);
  const totalTwelveHr = unitStats.reduce((s, u) => s + u.counts.twelveHr, 0);

  const todayFmt = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const hasScheduleToday = todayEntries.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{todayFmt}</p>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/units/new" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            + New Unit
          </Link>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Staff", value: totalStaff, color: "bg-slate-100 text-slate-700", icon: "👥" },
          { label: "Working Today", value: totalWorking, color: "bg-blue-50 text-blue-700", icon: "🔧" },
          { label: "On Leave", value: totalLeave, color: "bg-pink-50 text-pink-700", icon: "🏖" },
          { label: "12hr Duties", value: totalTwelveHr, color: "bg-orange-50 text-orange-700", icon: "⏰" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 flex items-center gap-4 ${s.color} border border-opacity-20 border-current`}>
            <div className="text-3xl">{s.icon}</div>
            <div>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm font-medium opacity-80">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {!hasScheduleToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
          No schedule has been generated for today. Working/Leave/12hr counts show 0. Go to a unit&apos;s Schedule tab and generate a schedule to see live data.
        </div>
      )}

      {/* Unit cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {unitStats.map(({ unit, manpower, counts, shiftCounts, total }) => {
          const statusClass = manpower.status === "BALANCED" ? "bg-green-100 text-green-800" : manpower.status === "SHORT" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
          const canAccess = user.role === "ADMIN" || user.unitId === unit.id;

          // Stacked bar segments
          const shiftOrder = ["A", "B", "C", "G", "D12", "N12", "L", "OFF"];
          const barTotal = Math.max(total, 1);
          const segments = shiftOrder.map(code => ({ code, count: shiftCounts[code] ?? 0, color: SHIFT_COLORS[code] })).filter(s => s.count > 0);

          return (
            <div key={unit.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-gray-900 leading-tight">{unit.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${statusClass}`}>{manpower.status}</span>
              </div>

              <div className="text-xs text-gray-400 mb-3">{manpower.actualEmployees} / {manpower.requiredEmployees} staff · {unit.personsPerShift}/shift</div>

              {/* Today stats */}
              <div className="grid grid-cols-3 gap-1 mb-3 text-center">
                <div className="bg-blue-50 rounded-lg py-2">
                  <div className="text-lg font-bold text-blue-700">{counts.working}</div>
                  <div className="text-xs text-blue-500">Working</div>
                </div>
                <div className="bg-pink-50 rounded-lg py-2">
                  <div className="text-lg font-bold text-pink-700">{counts.leave}</div>
                  <div className="text-xs text-pink-500">On Leave</div>
                </div>
                <div className="bg-orange-50 rounded-lg py-2">
                  <div className="text-lg font-bold text-orange-700">{counts.twelveHr}</div>
                  <div className="text-xs text-orange-500">12hr Duty</div>
                </div>
              </div>

              {/* Shift distribution bar */}
              {total > 0 ? (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Today&apos;s shift distribution</div>
                  <div className="flex h-3 rounded-full overflow-hidden gap-px">
                    {segments.map(s => (
                      <div key={s.code} style={{ width: `${(s.count / barTotal) * 100}%`, backgroundColor: s.color }} title={`${s.code}: ${s.count}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {segments.map(s => (
                      <span key={s.code} className="text-xs text-gray-500 flex items-center gap-0.5">
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
                        {s.code}: {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic mb-3">No schedule for today</div>
              )}

              <div className="mt-auto">
                {canAccess ? (
                  <Link href={`/units/${unit.id}/schedule`} className="block text-center bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                    Open Schedule →
                  </Link>
                ) : (
                  <div className="block text-center bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg text-sm">
                    No access
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {units.length === 0 && (
          <div className="col-span-4 text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-lg mb-1">No units yet</p>
            {user.role === "ADMIN" && <p className="text-sm">Click &quot;+ New Unit&quot; to get started</p>}
          </div>
        )}
      </div>

      {/* Comparison chart — horizontal stacked bars */}
      {unitStats.length > 0 && hasScheduleToday && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Unit Comparison — Today</h2>
          <p className="text-xs text-gray-400 mb-4">Staff distribution by category across all units</p>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {[
              { label: "Working (A/B/C/G)", color: "#3b82f6" },
              { label: "12hr Duty", color: "#f97316" },
              { label: "On Leave", color: "#ec4899" },
              { label: "Off", color: "#9ca3af" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {unitStats.map(({ unit, counts, total }) => {
              const t = Math.max(total, 1);
              return (
                <div key={unit.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-36 truncate shrink-0">{unit.name}</span>
                  <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-gray-100">
                    {counts.working > 0 && <div style={{ width: `${(counts.working / t) * 100}%`, backgroundColor: "#3b82f6" }} title={`Working: ${counts.working}`} className="flex items-center justify-center text-white text-xs font-medium">{counts.working > 1 ? counts.working : ""}</div>}
                    {counts.twelveHr > 0 && <div style={{ width: `${(counts.twelveHr / t) * 100}%`, backgroundColor: "#f97316" }} title={`12hr: ${counts.twelveHr}`} className="flex items-center justify-center text-white text-xs font-medium">{counts.twelveHr > 1 ? counts.twelveHr : ""}</div>}
                    {counts.leave > 0 && <div style={{ width: `${(counts.leave / t) * 100}%`, backgroundColor: "#ec4899" }} title={`Leave: ${counts.leave}`} className="flex items-center justify-center text-white text-xs font-medium">{counts.leave > 1 ? counts.leave : ""}</div>}
                    {counts.off > 0 && <div style={{ width: `${(counts.off / t) * 100}%`, backgroundColor: "#9ca3af" }} title={`Off: ${counts.off}`} className="flex items-center justify-center text-white text-xs font-medium">{counts.off > 1 ? counts.off : ""}</div>}
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right shrink-0">{total} scheduled</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
