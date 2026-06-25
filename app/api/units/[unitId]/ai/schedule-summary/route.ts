import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genAI, AI_FAST, aiAvailable } from "@/lib/ai";

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

  const [unit, entries, flags] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.scheduleEntry.findMany({
      where: { unitId, date: { gte: new Date(start), lte: new Date(end) } },
    }),
    prisma.feasibilityFlag.findMany({
      where: { unitId, date: { gte: new Date(start), lte: new Date(end) } },
    }),
  ]);

  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const leaveDays  = entries.filter((e) => e.shiftCode === "L").length;
  const d12Days    = entries.filter((e) => e.shiftCode === "D12").length;
  const n12Days    = entries.filter((e) => e.shiftCode === "N12").length;
  const tightDays  = flags.filter((f) => f.level === "TIGHT").length;
  const infeasDays = flags.filter((f) => f.level === "INFEASIBLE").length;
  const dayCount   = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  ) + 1;

  const startFmt = new Date(start + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const endFmt   = new Date(end   + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const prompt = `Generate a concise label for a finalized refinery shift schedule — suitable for a file archive entry, under 15 words.

UNIT: ${unit.name}
PERIOD: ${startFmt} – ${endFmt} (${dayCount} days)
LEAVE DAYS: ${leaveDays}
12-HR DUTIES (D12+N12): ${d12Days + n12Days}
TIGHT DAYS: ${tightDays}
INFEASIBLE DAYS: ${infeasDays}

Reply with ONLY the label text — no quotes, no punctuation at the end, no explanation.
Examples:
June 2026 — 4 leaves, 6 twelve-hr duties, 2 tight days
Jul–Aug 2026 · clean rotation, no coverage issues
Q3 2026 · high leave load, 3 infeasible days flagged`;

  const model = genAI.getGenerativeModel({ model: AI_FAST });
  let summary: string;
  try {
    const result = await model.generateContent(prompt);
    summary = result.response.text().trim().replace(/^["']|["']$/g, "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ summary });
}
