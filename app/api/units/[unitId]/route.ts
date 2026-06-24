import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(unit);
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  try {
    const body = await req.json();
    const unit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        name: body.name?.trim(),
        personsPerShift: Number(body.personsPerShift),
        shiftsPerDay: Number(body.shiftsPerDay),
        weeklyOffDays: Number(body.weeklyOffDays),
        minRestHours: Number(body.minRestHours),
        maxConsecutiveWorkDays: Number(body.maxConsecutiveWorkDays),
        minConsecutiveWorkDays: Number(body.minConsecutiveWorkDays),
      },
    });
    return NextResponse.json(unit);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  try {
    await prisma.unit.delete({ where: { id: unitId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
