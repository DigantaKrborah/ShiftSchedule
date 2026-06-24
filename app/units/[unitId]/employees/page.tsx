import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmployeesClient } from "./_components/EmployeesClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) notFound();

  const employees = await prisma.employee.findMany({
    where: { unitId },
    orderBy: { seniorityIndex: "asc" },
  });

  return <EmployeesClient unitId={unitId} initialEmployees={employees} />;
}
