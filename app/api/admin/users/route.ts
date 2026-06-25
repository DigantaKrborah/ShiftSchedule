import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    include: { unit: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users.map(u => ({ id: u.id, username: u.username, password: u.password, role: u.role, unitId: u.unitId, unitName: u.unit?.name ?? null })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, password, role, unitId } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 });
  try {
    const user = await prisma.user.create({
      data: { username, password, role: role ?? "UNIT_USER", unitId: unitId || null },
    });
    return NextResponse.json({ id: user.id, username: user.username, role: user.role, unitId: user.unitId });
  } catch {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }
}
