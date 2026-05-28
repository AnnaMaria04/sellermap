// DeepSeek — OpenAI-compatible chat completion API. Better at analytical
// reasoning than YandexGPT for the "why did X happen / what should I do" prompts
// the insights engine needs. Hosted in China; use for business analytics, not
// for personal-data prompts (where YandexGPT is the 152-ФЗ-clean default).
// Needs DEEPSEEK_API_KEY. Server-side only.
const COMPLETION_URL = "https://api.deepseek.com/chat/completions";

function deepseekKey() {
  return process.env.DEEPSEEK_API_KEY;
}

export function deepseekConfigured(): boolean {
  return !!deepseekKey();
}

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
}

/** Single-shot completion. Returns the text, or null on failure/misconfig. */
export async function deepseekComplete(
  system: string,
  user: string,
  opts?: { temperature?: number; maxTokens?: number; model?: string },
): Promise<string | null> {
  const key = deepseekKey();
  if (!key) return null;

  const model = opts?.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  try {
    const res = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: opts?.temperature ?? 0.5,
        max_tokens: opts?.maxTokens ?? 800,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[deepseek] ${res.status}: ${txt.slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as DeepSeekResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error("[deepseek] failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
