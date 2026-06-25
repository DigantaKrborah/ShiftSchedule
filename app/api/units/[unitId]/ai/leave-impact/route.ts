import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genAI, AI_SMART, aiAvailable } from "@/lib/ai";

type Params = Promise<{ unitId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  if (!aiAvailable()) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const { unitId } = await params;
  const { employeeId, startDate, endDate } = await req.json();
  if (!employeeId || !startDate || !endDate) {
    return NextResponse.json({ error: "employeeId, startDate, endDate required" }, { status: 400 });
  }

  const [unit, employee, allEmployees, overlappingLeaves, scheduleEntries] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.employee.findMany({ where: { unitId }, orderBy: { seniorityIndex: "asc" } }),
    prisma.leaveRequest.findMany({
      where: {
        employee: { unitId },
        startDate: { lte: new Date(endDate) },
        endDate:   { gte: new Date(startDate) },
        NOT: { employeeId },
      },
      include: { employee: { select: { name: true } } },
    }),
    prisma.scheduleEntry.findMany({
      where: { unitId, date: { gte: new Date(startDate), lte: new Date(endDate) } },
    }),
  ]);

  if (!unit || !employee) {
    return NextResponse.json({ error: "Unit or employee not found" }, { status: 404 });
  }

  const dayCount = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ) + 1;

  const overlapLines = overlappingLeaves.map((l) => {
    const d1 = l.startDate.toISOString().slice(0, 10);
    const d2 = l.endDate.toISOString().slice(0, 10);
    return `  - ${l.employee.name}: ${d1} to ${d2} [${l.status}]`;
  }).join("\n") || "  None";

  const scheduleLines = scheduleEntries.length > 0
    ? scheduleEntries.reduce<Record<string, string[]>>((acc, e) => {
        const d = e.date.toISOString().slice(0, 10);
        if (!acc[d]) acc[d] = [];
        const emp = allEmployees.find((x) => x.id === e.employeeId);
        acc[d].push(`${emp?.name ?? e.employeeId}:${e.shiftCode}`);
        return acc;
      }, {})
    : null;

  const scheduleContext = scheduleLines
    ? Object.entries(scheduleLines)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, shifts]) => `  ${date}: ${shifts.join(", ")}`)
        .join("\n")
    : "  (Schedule not yet generated for this period)";

  const prompt = `You are a refinery shift scheduling assistant. Analyze the coverage risk of this leave request and respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON.

UNIT: ${unit.name}
Required staff per shift: ${unit.personsPerShift}
Total staff: ${allEmployees.length}

LEAVE REQUEST:
Employee: ${employee.name} (${employee.doesRotatingShift ? "Rotating A/B/C shifts" : "G-Fixed shift"})
Period: ${startDate} to ${endDate} (${dayCount} day${dayCount !== 1 ? "s" : ""})

OTHER OVERLAPPING LEAVES:
${overlapLines}

CURRENT SCHEDULE:
${scheduleContext}

Respond with exactly this JSON structure:
{
  "risk": "Low",
  "headline": "brief one-sentence summary",
  "details": "2-3 sentences on which days/shifts are most affected",
  "recommendation": "one concrete action for the supervisor"
}
risk must be exactly one of: Low, Medium, High`;

  const model = genAI.getGenerativeModel({
    model: AI_SMART,
    generationConfig: { responseMimeType: "application/json" },
  });

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: 500 });
  }

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "AI returned unexpected format", raw }, { status: 500 });
  }
}
