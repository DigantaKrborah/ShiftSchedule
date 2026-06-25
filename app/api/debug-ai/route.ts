import { NextResponse } from "next/server";
import { genAI, AI_SMART, aiAvailable } from "@/lib/ai";

export async function GET() {
  const key = process.env.GROQ_API_KEY ?? "";
  const info = {
    keySet: !!key,
    keyPrefix: key.slice(0, 12) + "...",
    model: AI_SMART,
    aiAvailable: aiAvailable(),
  };

  if (!aiAvailable()) return NextResponse.json({ ...info, result: "no key" });

  try {
    const model = genAI.getGenerativeModel({ model: AI_SMART });
    const result = await model.generateContent("Reply with only the word: OK");
    return NextResponse.json({ ...info, result: result.response.text().trim() });
  } catch (err) {
    return NextResponse.json({ ...info, result: "error", error: String(err) }, { status: 500 });
  }
}
