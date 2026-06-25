import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genAI, AI_SMART, aiAvailable } from "@/lib/ai";
import { computeTallies } from "@/lib/engine";
import type { ScheduleCell } from "@/lib/engine";

type Params = Promise<{ unitId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  if (!aiAvailable()) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const { unitId } = await params;
  const { start, end } = await req.json() as { start: string; end: string };
  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const [unit, employees, entries] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.scheduleEntry.findMany({
      where: { unitId, date: { gte: new Date(start), lte: new Date(end) } },
    }),
  ]);

  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  if (entries.length === 0) {
    return NextResponse.json({ error: "No schedule found for this range" }, { status: 400 });
  }

  const cells: ScheduleCell[] = entries.map((e) => ({
    employeeId: e.employeeId,
    date: e.date.toISOString().slice(0, 10),
    shiftCode: e.shiftCode as ScheduleCell["shiftCode"],
    isManualOverride: e.isManualOverride,
    notes: e.notes,
  }));

  const tallies = computeTallies(cells, employees.map((e) => e.id));
  const dayCount = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  ) + 1;

  const rows = tallies.map((t) => {
    const emp = employees.find((e) => e.id === t.employeeId);
    return `${emp?.name ?? t.employeeId} | Hrs:${t.totalHours} | Off:${t.offDays} | D12:${t.d12Count} | N12:${t.n12Count} | Nights:${t.totalNights} | G-days:${t.gDays} | Cumulative12hr:${emp?.cumulative12hrCount ?? "?"}`;
  }).join("\n");

  const prompt = `You are a refinery shift scheduling analyst. Review this shift distribution and produce a fairness audit.

UNIT: ${unit.name}
PERIOD: ${start} to ${end} (${dayCount} days)
STAFF PER SHIFT: ${unit.personsPerShift}

TALLY DATA:
Employee | Hours | Off days | D12 duties | N12 duties | Night shifts | G-days | Cumulative 12hr
${rows}

Write a concise fairness audit covering:
1. **Hours distribution** – who has the most/least hours and whether the gap is significant
2. **Night shift burden** – is night duty (C and N12) spread fairly?
3. **12-hr duty distribution** – are D12/N12 duties shared equitably across eligible staff?
4. **Off-day fairness** – any employee with significantly fewer off days than peers?
5. **Overall verdict** – is the schedule fair, and the single most important corrective action (if any)?

Be specific with names and numbers. Keep total response under 300 words.`;

  const model = genAI.getGenerativeModel({ model: AI_SMART });
  let text: string;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ audit: text });
}
