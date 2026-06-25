import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { computeTallies } from "@/lib/engine";
import type { ScheduleCell } from "@/lib/engine";
import { ScheduleClient } from "./_components/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { unitId } = await params;
  const { start: qStart, end: qEnd } = await searchParams;

  // Default to current calendar month
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const initStart = qStart ?? `${y}-${m}-01`;
  const initEnd   = qEnd   ?? `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

  const [unit, employees, entries, flags] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.scheduleEntry.findMany({
      where: { unitId, date: { gte: new Date(initStart), lte: new Date(initEnd) } },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    }),
    prisma.feasibilityFlag.findMany({
      where: { unitId, date: { gte: new Date(initStart), lte: new Date(initEnd) } },
    }),
  ]);
  if (!unit) notFound();

  const cells: ScheduleCell[] = entries.map((e) => ({
    employeeId: e.employeeId,
    date: e.date.toISOString().slice(0, 10),
    shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
    isManualOverride: e.isManualOverride,
    notes: e.notes,
  }));
  const tallies = computeTallies(cells, employees.map((e) => e.id));

  return (
    <Suspense fallback={<div className="text-gray-400 py-8 text-sm">Loading…</div>}>
      <ScheduleClient
        unitId={unitId}
        unitName={unit.name}
        personsPerShift={unit.personsPerShift}
        initStart={initStart}
        initEnd={initEnd}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          seniorityIndex: e.seniorityIndex,
          doesRotatingShift: e.doesRotatingShift,
        }))}
        initialEntries={entries.map((e) => ({
          id: e.id,
          employeeId: e.employeeId,
          date: e.date.toISOString().slice(0, 10),
          shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
          isManualOverride: e.isManualOverride,
        }))}
        initialFlags={flags.map((f) => ({
          id: f.id,
          date: f.date.toISOString().slice(0, 10),
          level: f.level as "OK" | "TIGHT" | "INFEASIBLE",
          message: f.message,
        }))}
        initialTallies={tallies}
      />
    </Suspense>
  );
}
