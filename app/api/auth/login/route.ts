import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username: string; password: string };
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
  const response = NextResponse.json({ ok: true, role: user.role, unitId: user.unitId });
  response.cookies.set("ss_session", session.token, {
    httpOnly: true, path: "/", expires: expiresAt, sameSite: "lax",
  });
  return response;
}
