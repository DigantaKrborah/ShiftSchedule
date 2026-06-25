import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export type AuthUser = {
  id: string;
  username: string;
  role: string;
  unitId: string | null;
};

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ss_session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return { id: session.user.id, username: session.user.username, role: session.user.role, unitId: session.user.unitId };
}

export async function requireSession(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function requireUnitAccess(unitId: string): Promise<AuthUser> {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.unitId !== unitId) redirect("/");
  return user;
}
