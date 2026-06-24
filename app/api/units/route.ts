import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const units = await prisma.unit.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      personsPerShift = 3,
      shiftsPerDay = 3,
      weeklyOffDays = 1,
      minRestHours = 8,
      maxConsecutiveWorkDays = 9,
      minConsecutiveWorkDays = 3,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: {
        name: name.trim(),
        personsPerShift: Number(personsPerShift),
        shiftsPerDay: Number(shiftsPerDay),
        weeklyOffDays: Number(weeklyOffDays),
        minRestHours: Number(minRestHours),
        maxConsecutiveWorkDays: Number(maxConsecutiveWorkDays),
        minConsecutiveWorkDays: Number(minConsecutiveWorkDays),
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
