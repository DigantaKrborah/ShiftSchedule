import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTallies } from "@/lib/engine";
import type { ScheduleCell } from "@/lib/engine";

type Params = Promise<{ unitId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const records = await prisma.finalizedSchedule.findMany({
    where: { unitId },
    orderBy: { finalizedAt: "desc" },
    select: { id: true, startDate: true, endDate: true, label: true, finalizedAt: true },
  });
  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      label: r.label,
      finalizedAt: r.finalizedAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const { start, end, label = "" } = await req.json();
  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const [employees, entries, flags] = await Promise.all([
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.scheduleEntry.findMany({
      where: { unitId, date: { gte: new Date(start), lte: new Date(end) } },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    }),
    prisma.feasibilityFlag.findMany({
      where: { unitId, date: { gte: new Date(start), lte: new Date(end) } },
      orderBy: { date: "asc" },
    }),
  ]);

  if (entries.length === 0) {
    return NextResponse.json({ error: "No schedule entries found for this range" }, { status: 400 });
  }

  const cells: ScheduleCell[] = entries.map((e) => ({
    employeeId: e.employeeId,
    date: e.date.toISOString().slice(0, 10),
    shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
    isManualOverride: e.isManualOverride,
    notes: e.notes,
  }));

  const tallies = computeTallies(cells, employees.map((e) => e.id));

  const snapshot = JSON.stringify({
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      seniorityIndex: e.seniorityIndex,
      doesRotatingShift: e.doesRotatingShift,
    })),
    cells,
    flags: flags.map((f) => ({
      date: f.date.toISOString().slice(0, 10),
      level: f.level,
      message: f.message,
    })),
    tallies,
  });

  const record = await prisma.finalizedSchedule.create({
    data: {
      unitId,
      startDate: new Date(start),
      endDate: new Date(end),
      label,
      snapshot,
    },
  });

  return NextResponse.json({
    id: record.id,
    startDate: start,
    endDate: end,
    label: record.label,
    finalizedAt: record.finalizedAt.toISOString(),
  });
}
