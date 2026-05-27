// YandexGPT — Russian LLM (Yandex Cloud). Used for AI replies/summaries so the
// product stays compliant (152-ФЗ, data residency) and reliable for RU users.
// Needs YANDEX_AI_API_KEY + YANDEX_FOLDER_ID. Server-side only.
const COMPLETION_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

function yandexToken() {
  return process.env.YANDEX_AI_API_KEY;
}
function yandexFolder() {
  return process.env.YANDEX_FOLDER_ID;
}

export function yandexConfigured(): boolean {
  return !!yandexToken() && !!yandexFolder();
}

interface YandexResponse {
  result?: { alternatives?: { message?: { text?: string } }[] };
}

/** Single-shot completion. Returns the text, or null on failure/misconfig. */
export async function yandexComplete(
  system: string,
  user: string,
  opts?: { temperature?: number; maxTokens?: number; model?: string },
): Promise<string | null> {
  const key = yandexToken();
  const folder = yandexFolder();
  if (!key || !folder) return null;

  const model = opts?.model ?? "yandexgpt-lite";
  try {
    const res = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${key}`,
        "x-folder-id": folder,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelUri: `gpt://${folder}/${model}/latest`,
        completionOptions: {
          stream: false,
          temperature: opts?.temperature ?? 0.5,
          maxTokens: String(opts?.maxTokens ?? 400),
        },
        messages: [
          { role: "system", text: system },
          { role: "user", text: user },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[yandexgpt] ${res.status}: ${t.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as YandexResponse;
    return data.result?.alternatives?.[0]?.message?.text?.trim() ?? null;
  } catch (e) {
    console.error("[yandexgpt] failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
