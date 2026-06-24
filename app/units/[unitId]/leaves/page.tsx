import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeavesClient } from "./_components/LeavesClient";

export const dynamic = "force-dynamic";

export default async function LeavesPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) notFound();

  const [employees, leaves] = await Promise.all([
    prisma.employee.findMany({
      where: { unitId },
      orderBy: { seniorityIndex: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { employee: { unitId } },
      include: { employee: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return (
    <LeavesClient
      unitId={unitId}
      employees={employees.map((e) => ({ id: e.id, name: e.name }))}
      initialLeaves={leaves.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: l.employee.name,
        startDate: l.startDate.toISOString().slice(0, 10),
        endDate: l.endDate.toISOString().slice(0, 10),
        reason: l.reason,
        status: l.status as "PLANNED" | "EMERGENCY",
      }))}
    />
  );
}
