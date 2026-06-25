// AI backend: Groq free tier (LLaMA models)
// Get a free key at https://console.groq.com → API Keys
// No credit card required. Free quota: 14,400 req/day.

const GROQ_BASE = "https://api.groq.com/openai/v1";

export const AI_SMART = "llama-3.3-70b-versatile";
export const AI_FAST  = "llama-3.1-8b-instant";

export function aiAvailable() {
  return !!process.env.GROQ_API_KEY;
}

interface ModelConfig {
  model: string;
  systemInstruction?: string;
  generationConfig?: { responseMimeType?: string };
}

function createModel(config: ModelConfig) {
  const { model, systemInstruction, generationConfig } = config;
  const jsonMode = generationConfig?.responseMimeType === "application/json";

  function buildMessages(prompt: string) {
    const msgs: { role: string; content: string }[] = [];
    if (systemInstruction) msgs.push({ role: "system", content: systemInstruction });
    msgs.push({ role: "user", content: prompt });
    return msgs;
  }

  async function generateContent(prompt: string) {
    const apiKey = process.env.GROQ_API_KEY ?? "";
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: buildMessages(prompt),
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API ${res.status}: ${errText}`);
    }
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content ?? "";
    return { response: { text: () => text } };
  }

  async function generateContentStream(prompt: string) {
    const apiKey = process.env.GROQ_API_KEY ?? "";
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: buildMessages(prompt), stream: true }),
    });
    if (!res.ok || !res.body) {
      const errText = res.body ? await res.text() : `HTTP ${res.status}`;
      throw new Error(`Groq API ${res.status}: ${errText}`);
    }

    async function* streamChunks() {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload) as {
              choices: { delta: { content?: string } }[];
            };
            const chunk = json.choices[0]?.delta?.content ?? "";
            yield { text: () => chunk };
          } catch { /* skip malformed SSE lines */ }
        }
      }
    }

    return { stream: streamChunks() };
  }

  return { generateContent, generateContentStream };
}

// Same interface as @google/generative-ai — no changes needed in route files
export const genAI = {
  getGenerativeModel: (config: ModelConfig) => createModel(config),
};
