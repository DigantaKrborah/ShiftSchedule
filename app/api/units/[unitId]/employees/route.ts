import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const employees = await prisma.employee.findMany({
    where: { unitId },
    orderBy: { seniorityIndex: "asc" },
  });
  return NextResponse.json(employees);
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Auto-assign seniority index as next available
    const maxSeniority = await prisma.employee.aggregate({
      where: { unitId },
      _max: { seniorityIndex: true },
    });
    const seniorityIndex = (maxSeniority._max.seniorityIndex ?? -1) + 1;

    const employee = await prisma.employee.create({
      data: {
        unitId,
        name: body.name.trim(),
        seniorityIndex,
        doesRotatingShift: body.doesRotatingShift ?? true,
        eligibleGShift: body.eligibleGShift ?? true,
        eligibleTwelveHr: body.eligibleTwelveHr ?? true,
        givesLeaveBackup: body.givesLeaveBackup ?? true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
