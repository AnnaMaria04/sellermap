import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

let client: Anthropic | null = null;

const DICTIONARY: Array<[RegExp, string]> = [
  [/posca|paint marker|acrylic marker|marker pen/i, "акриловый маркер"],
  [/permanent marker/i, "перманентный маркер"],
  [/makeup|cosmetic|beauty/i, "косметичка"],
  [/bag|organizer|case/i, "органайзер"],
  [/phone case|iphone case/i, "чехол для телефона"],
  [/water bottle|thermos/i, "термос бутылка"],
  [/toy|kids/i, "игрушка"],
  [/desk lamp|table lamp|настольная лампа/i, "настольная лампа"],
  [/lamp|light/i, "светильник"],
];

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY required");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function POST(req: NextRequest) {
  const { title } = await req.json() as { title?: string };
  if (!title) return NextResponse.json({ error: "title обязателен" }, { status: 400 });

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: `Переведи название товара в поисковый запрос для Wildberries (2–4 слова на русском, без лишних слов). Только запрос, без объяснений.\n\nТовар: ${title}`,
        },
      ],
    });
    const keyword =
      message.content[0].type === "text" ? message.content[0].text.trim() : title;
    return NextResponse.json({ keyword });
  } catch {
    const mapped = DICTIONARY.find(([pattern]) => pattern.test(title))?.[1];
    const fallback =
      mapped ??
      title
        .replace(/\b(high|quality|factory|wholesale|custom|new|hot|sale|for|with|and)\b/gi, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(" ");
    return NextResponse.json({ keyword: fallback });
  }
}
