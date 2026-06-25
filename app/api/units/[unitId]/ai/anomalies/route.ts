import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genAI, AI_SMART, aiAvailable } from "@/lib/ai";

type Params = Promise<{ unitId: string }>;

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  if (!aiAvailable()) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const { unitId } = await params;

  const [unit, finalized] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.finalizedSchedule.findMany({
      where: { unitId },
      orderBy: { startDate: "asc" },
    }),
  ]);

  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  if (finalized.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 finalized schedules for pattern analysis" },
      { status: 400 }
    );
  }

  const scheduleStats = finalized.map((rec) => {
    const snap = JSON.parse(rec.snapshot) as {
      employees: { id: string; name: string }[];
      cells: { employeeId: string; shiftCode: string }[];
      flags: { date: string; level: string; message: string }[];
      tallies: { employeeId: string; offDays: number; d12Count: number; n12Count: number; totalNights: number; totalHours: number }[];
    };

    const empMap  = new Map(snap.employees.map((e) => [e.id, e.name]));
    const label   = rec.label || `${rec.startDate.toISOString().slice(0, 10)} – ${rec.endDate.toISOString().slice(0, 10)}`;
    const leaveDays  = snap.cells.filter((c) => c.shiftCode === "L").length;
    const d12Days    = snap.cells.filter((c) => c.shiftCode === "D12").length;
    const n12Days    = snap.cells.filter((c) => c.shiftCode === "N12").length;
    const tightDays  = snap.flags.filter((f) => f.level === "TIGHT").length;
    const infeasDays = snap.flags.filter((f) => f.level === "INFEASIBLE").length;

    const tallyLines = snap.tallies.map((t) =>
      `    ${empMap.get(t.employeeId) ?? t.employeeId}: Hrs=${t.totalHours} Off=${t.offDays} D12=${t.d12Count} N12=${t.n12Count} Nights=${t.totalNights}`
    ).join("\n");

    return `PERIOD: ${label}\n  Leaves:${leaveDays} D12:${d12Days} N12:${n12Days} Tight:${tightDays} Infeasible:${infeasDays}\n  Per-employee tallies:\n${tallyLines}`;
  }).join("\n\n---\n\n");

  const prompt = `You are a refinery workforce analytics assistant. Analyze historical shift schedule data and identify patterns, anomalies, and actionable insights.

UNIT: ${unit.name} (${unit.personsPerShift} staff per shift)

HISTORICAL DATA:
${scheduleStats}

Provide an analysis covering:
1. **Staffing trends** – is coverage getting better or worse? Any recurring TIGHT/INFEASIBLE days?
2. **Leave patterns** – is leave concentrated in certain periods? Same employees on leave together?
3. **12-hr duty burden** – are the same employees repeatedly doing D12/N12 across periods?
4. **Night shift fairness over time** – any employee consistently accumulating more nights than peers?
5. **Recommendations** – 2-3 specific, actionable suggestions for the supervisor

Be specific with names, dates, and numbers. Keep response under 400 words.`;

  const model = genAI.getGenerativeModel({ model: AI_SMART });
  let text: string;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ analysis: text });
}
