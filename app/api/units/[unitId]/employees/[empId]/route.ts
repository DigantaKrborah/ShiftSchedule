import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string; empId: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { empId } = await params;
  try {
    const body = await req.json();
    const employee = await prisma.employee.update({
      where: { id: empId },
      data: {
        name: body.name?.trim(),
        doesRotatingShift: body.doesRotatingShift,
        eligibleGShift: body.eligibleGShift,
        eligibleTwelveHr: body.eligibleTwelveHr,
        givesLeaveBackup: body.givesLeaveBackup,
      },
    });
    return NextResponse.json(employee);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { empId } = await params;
  try {
    await prisma.employee.delete({ where: { id: empId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
