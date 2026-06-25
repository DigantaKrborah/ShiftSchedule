import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string; finalizedId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { unitId, finalizedId } = await params;
  const record = await prisma.finalizedSchedule.findFirst({
    where: { id: finalizedId, unitId },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: record.id,
    unitId: record.unitId,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    label: record.label,
    finalizedAt: record.finalizedAt.toISOString(),
    snapshot: JSON.parse(record.snapshot),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { unitId, finalizedId } = await params;
  const record = await prisma.finalizedSchedule.findFirst({ where: { id: finalizedId, unitId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.finalizedSchedule.delete({ where: { id: finalizedId } });
  return NextResponse.json({ ok: true });
}
