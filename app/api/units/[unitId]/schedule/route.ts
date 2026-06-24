import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTallies } from "@/lib/engine";
import type { ScheduleCell } from "@/lib/engine";

type Params = Promise<{ unitId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  const [entries, flags, employees] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    }),
    prisma.feasibilityFlag.findMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
      },
    }),
    prisma.employee.findMany({ where: { unitId }, select: { id: true } }),
  ]);

  const cells: ScheduleCell[] = entries.map((e) => ({
    employeeId: e.employeeId,
    date: e.date.toISOString().slice(0, 10),
    shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
    isManualOverride: e.isManualOverride,
    notes: e.notes,
  }));

  const tallies = computeTallies(cells, employees.map((e) => e.id));

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      date: e.date.toISOString().slice(0, 10),
      shiftCode: e.shiftCode,
      isManualOverride: e.isManualOverride,
      notes: e.notes,
    })),
    flags: flags.map((f) => ({
      id: f.id,
      date: f.date.toISOString().slice(0, 10),
      level: f.level,
      message: f.message,
    })),
    tallies,
  });
}
