import { NextRequest, NextResponse } from "next/server";
import { genAI, AI_SMART, aiAvailable } from "@/lib/ai";

type Params = Promise<{ unitId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  if (!aiAvailable()) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  void params;

  const { question, context } = await req.json() as { question: string; context: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const model = genAI.getGenerativeModel({
    model: AI_SMART,
    systemInstruction:
      "You are a refinery shift scheduling assistant. Answer questions about the shift schedule concisely and accurately using the provided data. If the answer is not in the data, say so clearly. Keep answers under 150 words unless a list is needed.",
  });

  let result: Awaited<ReturnType<typeof model.generateContentStream>>;
  try {
    result = await model.generateContentStream(
      `SCHEDULE DATA:\n${context}\n\nQUESTION: ${question}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: 500 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(new TextEncoder().encode(`\n[Error: ${msg}]`));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
