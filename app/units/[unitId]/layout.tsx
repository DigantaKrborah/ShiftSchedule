import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TabNav } from "./_components/TabNav";

export default async function UnitLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) notFound();

  return (
    <div>
      <div className="mb-1">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Units
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">{unit.name}</h1>
      <TabNav unitId={unitId} />
      {children}
    </div>
  );
}
