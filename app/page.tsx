import { prisma } from "@/lib/prisma";
import { computeManpower } from "@/lib/engine";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const units = await prisma.unit.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Units</h1>
        <Link
          href="/units/new"
          className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          + New Unit
        </Link>
      </div>

      {units.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-lg mb-1">No units yet</p>
          <p className="text-sm">Create your first unit to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {units.map((unit) => {
            const stats = computeManpower(
              {
                id: unit.id,
                personsPerShift: unit.personsPerShift,
                shiftsPerDay: unit.shiftsPerDay,
                weeklyOffDays: unit.weeklyOffDays,
                minRestHours: unit.minRestHours,
                maxConsecutiveWorkDays: unit.maxConsecutiveWorkDays,
                minConsecutiveWorkDays: unit.minConsecutiveWorkDays,
              },
              unit._count.employees
            );

            const statusClass =
              stats.status === "BALANCED"
                ? "bg-green-100 text-green-800"
                : stats.status === "SHORT"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800";

            return (
              <div
                key={unit.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">{unit.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                    {stats.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5 mb-4 flex-1">
                  <div>
                    {stats.actualEmployees} / {stats.requiredEmployees} employees
                  </div>
                  <div>
                    {unit.personsPerShift}/shift · {unit.shiftsPerDay} shifts · {unit.weeklyOffDays} off/wk
                  </div>
                </div>
                <Link
                  href={`/units/${unit.id}/schedule`}
                  className="block text-center bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Open Schedule →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
