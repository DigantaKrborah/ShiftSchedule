import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("ss_session")?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("ss_session");
  return response;
}
