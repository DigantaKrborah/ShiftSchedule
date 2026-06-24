import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ unitId: string; leaveId: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { leaveId } = await params;
  try {
    await prisma.leaveRequest.delete({ where: { id: leaveId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
