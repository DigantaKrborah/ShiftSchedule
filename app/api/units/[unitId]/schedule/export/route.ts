import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

type Params = Promise<{ unitId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { unitId } = await params;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const [unit, employees, entries] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.employee.findMany({
      where: { unitId },
      orderBy: { seniorityIndex: "asc" },
    }),
    prisma.scheduleEntry.findMany({
      where: {
        unitId,
        date: { gte: new Date(start), lte: new Date(end) },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  // Build date list
  const dates: string[] = [];
  let cur = new Date(start + "T00:00:00");
  const endD = new Date(end + "T00:00:00");
  while (cur <= endD) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  // Build lookup: date → empId → shiftCode
  const lookup = new Map<string, Map<string, string>>();
  for (const e of entries) {
    const date = e.date.toISOString().slice(0, 10);
    if (!lookup.has(date)) lookup.set(date, new Map());
    lookup.get(date)!.set(e.employeeId, e.shiftCode);
  }

  // Header rows
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const headerDates = ["", ...dates.map((d) => d.slice(8))]; // day number
  const headerDays = [
    "",
    ...dates.map((d) => {
      const dt = new Date(d + "T00:00:00");
      return dayNames[dt.getDay()];
    }),
  ];

  // Data rows
  const rows: (string | number)[][] = [headerDates, headerDays];
  for (const emp of employees) {
    const row: (string | number)[] = [emp.name];
    for (const date of dates) {
      row.push(lookup.get(date)?.get(emp.id) ?? "");
    }
    rows.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [{ wch: 20 }, ...dates.map(() => ({ wch: 6 }))];

  XLSX.utils.book_append_sheet(wb, ws, "Schedule");

  const arr: number[] = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const buf = new Uint8Array(arr);

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${unit.name}-schedule-${start}.xlsx"`,
    },
  });
}
