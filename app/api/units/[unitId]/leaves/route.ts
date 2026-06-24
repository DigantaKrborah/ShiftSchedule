import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employee: { unitId },
      ...(start && end
        ? { startDate: { lte: new Date(end) }, endDate: { gte: new Date(start) } }
        : {}),
    },
    include: { employee: true },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(
    leaves.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employee.name,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      reason: l.reason,
      status: l.status,
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  try {
    const body = await req.json();
    const { employeeId, startDate, endDate, reason = "", status = "PLANNED" } = body;

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "employeeId, startDate and endDate are required" },
        { status: 400 }
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be on or before endDate" },
        { status: 400 }
      );
    }

    // Verify employee belongs to unit
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, unitId },
    });
    if (!emp) {
      return NextResponse.json({ error: "Employee not found in unit" }, { status: 404 });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status,
      },
    });

    return NextResponse.json(
      {
        ...leave,
        startDate: leave.startDate.toISOString().slice(0, 10),
        endDate: leave.endDate.toISOString().slice(0, 10),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
