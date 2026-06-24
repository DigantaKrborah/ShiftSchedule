import { redirect } from "next/navigation";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  redirect(`/units/${unitId}/schedule`);
}
