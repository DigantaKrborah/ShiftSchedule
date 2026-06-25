import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UsersClient from "./_components/UsersClient";

export default async function UsersPage() {
  await requireAdmin();
  const [users, units] = await Promise.all([
    prisma.user.findMany({
      include: { unit: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
  ]);
  const userRows = users.map(u => ({ id: u.id, username: u.username, password: u.password, role: u.role, unitId: u.unitId, unitName: u.unit?.name ?? null }));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UsersClient initialUsers={userRows} units={units.map(u => ({ id: u.id, name: u.name }))} />
    </div>
  );
}
