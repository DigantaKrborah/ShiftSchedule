import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSchedule } from "@/lib/engine";
import type { ScheduleCell } from "@/lib/engine";

type Params = Promise<{ unitId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  try {
    const { start, end } = await req.json();
    if (!start || !end) {
      return NextResponse.json({ error: "start and end required" }, { status: 400 });
    }

    const [unit, employees, leaves, manualOverrides] = await Promise.all([
      prisma.unit.findUnique({ where: { id: unitId } }),
      prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
      prisma.leaveRequest.findMany({
        where: {
          employee: { unitId },
          startDate: { lte: new Date(end) },
          endDate: { gte: new Date(start) },
        },
      }),
      prisma.scheduleEntry.findMany({
        where: {
          unitId,
          isManualOverride: true,
          date: { gte: new Date(start), lte: new Date(end) },
        },
      }),
    ]);

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const engineEmployees = employees.map((e) => ({
      id: e.id,
      seniorityIndex: e.seniorityIndex,
      doesRotatingShift: e.doesRotatingShift,
      eligibleGShift: e.eligibleGShift,
      eligibleTwelveHr: e.eligibleTwelveHr,
      givesLeaveBackup: e.givesLeaveBackup,
      cumulative12hrCount: e.cumulative12hrCount,
    }));

    const engineLeaves = leaves.map((l) => ({
      employeeId: l.employeeId,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      status: l.status as "PLANNED" | "EMERGENCY",
    }));

    const existingCells: ScheduleCell[] = manualOverrides.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().slice(0, 10),
      shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
      isManualOverride: true,
      notes: e.notes,
    }));

    const config = {
      id: unit.id,
      personsPerShift: unit.personsPerShift,
      shiftsPerDay: unit.shiftsPerDay,
      weeklyOffDays: unit.weeklyOffDays,
      minRestHours: unit.minRestHours,
      maxConsecutiveWorkDays: unit.maxConsecutiveWorkDays,
      minConsecutiveWorkDays: unit.minConsecutiveWorkDays,
    };

    const result = generateSchedule(
      config,
      engineEmployees,
      engineLeaves,
      start,
      end,
      existingCells
    );

    // Persist: delete existing entries in range, then bulk-insert generated ones
    await prisma.scheduleEntry.deleteMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
      },
    });

    if (result.cells.length > 0) {
      await prisma.scheduleEntry.createMany({
        data: result.cells.map((cell) => ({
          unitId,
          date: new Date(cell.date),
          employeeId: cell.employeeId,
          shiftCode: cell.shiftCode,
          isManualOverride: cell.isManualOverride,
          notes: cell.notes,
        })),
      });
    }

    await prisma.feasibilityFlag.deleteMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
      },
    });

    if (result.flags.length > 0) {
      await prisma.feasibilityFlag.createMany({
        data: result.flags.map((flag) => ({
          unitId,
          date: new Date(flag.date),
          level: flag.level,
          message: flag.message,
          suggestion: JSON.stringify(flag.suggestion),
        })),
      });
    }

    return NextResponse.json({
      cells: result.cells,
      flags: result.flags,
      tallies: result.tallies,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generate failed" }, { status: 500 });
  }
}
