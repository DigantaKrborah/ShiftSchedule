import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string; entryId: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { entryId } = await params;
  try {
    const { shiftCode, notes } = await req.json();
    const entry = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: {
        shiftCode,
        ...(notes !== undefined && { notes }),
        isManualOverride: true,
      },
    });
    return NextResponse.json({
      ...entry,
      date: entry.date.toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
