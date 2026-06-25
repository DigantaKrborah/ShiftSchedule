import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end   = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const [employees, entries] = await Promise.all([
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.scheduleEntry.findMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
        shiftCode: { in: ["L", "D12", "N12"] },
      },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  // Group entries per employee
  const leaveMap  = new Map<string, string[]>();
  const d12Map    = new Map<string, string[]>();
  const n12Map    = new Map<string, string[]>();
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

  const leave = employees.map((emp) => {
    const dates = leaveMap.get(emp.id) ?? [];
    return { employeeId: emp.id, dates, total: dates.length };
  });

  const twelveHr = employees.map((emp) => {
    const d12Dates = d12Map.get(emp.id) ?? [];
    const n12Dates = n12Map.get(emp.id) ?? [];
    return {
      employeeId: emp.id,
      d12Dates,
      n12Dates,
      d12Count: d12Dates.length,
      n12Count: n12Dates.length,
      total: d12Dates.length + n12Dates.length,
    };
  });

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      seniorityIndex: e.seniorityIndex,
      doesRotatingShift: e.doesRotatingShift,
    })),
    leave,
    twelveHr,
  });
}
