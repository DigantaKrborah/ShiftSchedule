import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./_components/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { unitId } = await params;
  const { start: qStart, end: qEnd } = await searchParams;

  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const initStart = qStart ?? `${y}-${m}-01`;
  const initEnd   = qEnd   ?? `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) notFound();

  const [employees, entries] = await Promise.all([
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.scheduleEntry.findMany({
      where: {
        unitId,
        date: { gte: new Date(initStart), lte: new Date(initEnd) },
        shiftCode: { in: ["L", "D12", "N12"] },
      },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  const leaveMap = new Map<string, string[]>();
  const d12Map   = new Map<string, string[]>();
  const n12Map   = new Map<string, string[]>();
  for (const emp of employees) {
    leaveMap.set(emp.id, []);
    d12Map.set(emp.id,   []);
    n12Map.set(emp.id,   []);
  }
  for (const e of entries) {
    const d = e.date.toISOString().slice(0, 10);
    if      (e.shiftCode === "L")   leaveMap.get(e.employeeId)?.push(d);
    else if (e.shiftCode === "D12") d12Map.get(e.employeeId)?.push(d);
    else if (e.shiftCode === "N12") n12Map.get(e.employeeId)?.push(d);
  }

  const initialLeave = employees.map((emp) => {
    const dates = leaveMap.get(emp.id) ?? [];
    return { employeeId: emp.id, dates, total: dates.length };
  });
  const initialTwelveHr = employees.map((emp) => {
    const d12Dates = d12Map.get(emp.id) ?? [];
    const n12Dates = n12Map.get(emp.id) ?? [];
    return { employeeId: emp.id, d12Dates, n12Dates, d12Count: d12Dates.length, n12Count: n12Dates.length, total: d12Dates.length + n12Dates.length };
  });

  return (
    <Suspense fallback={<div className="text-gray-400 py-8 text-sm">Loading…</div>}>
      <ReportsClient
        unitId={unitId}
        initStart={initStart}
        initEnd={initEnd}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          seniorityIndex: e.seniorityIndex,
          doesRotatingShift: e.doesRotatingShift,
        }))}
        initialLeave={initialLeave}
        initialTwelveHr={initialTwelveHr}
      />
    </Suspense>
  );
}
