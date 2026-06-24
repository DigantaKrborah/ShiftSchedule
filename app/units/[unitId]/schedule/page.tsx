import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "./_components/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const [unit, employees] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.employee.findMany({
      where: { unitId },
      orderBy: { seniorityIndex: "asc" },
    }),
  ]);
  if (!unit) notFound();

  return (
    <ScheduleClient
      unitId={unitId}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        seniorityIndex: e.seniorityIndex,
        doesRotatingShift: e.doesRotatingShift,
      }))}
    />
  );
}
