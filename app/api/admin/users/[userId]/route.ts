import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = Promise<{ userId: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId } = await params;
  const { username, password, role, unitId } = await req.json();
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username, password, role, unitId: unitId || null },
    });
    return NextResponse.json({ id: user.id, username: user.username, role: user.role, unitId: user.unitId });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId } = await params;
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
