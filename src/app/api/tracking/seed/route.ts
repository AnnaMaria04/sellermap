import { NextRequest, NextResponse } from "next/server";
import { supabaseRest } from "@/services/supabaseRest";

type SeedKeywordInput = {
  keyword: string;
  categoryGuess?: string;
  priority?: number;
};

type TrackedKeywordRow = {
  id: string;
  priority: number | null;
};

const DEFAULT_KEYWORDS: SeedKeywordInput[] = [
  { keyword: "акриловый маркер", categoryGuess: "Канцтовары", priority: 1 },
  { keyword: "маркер POSCA", categoryGuess: "Канцтовары", priority: 1 },
  { keyword: "дорожный органайзер", categoryGuess: "Аксессуары для путешествий", priority: 2 },
  { keyword: "органайзер для косметики", categoryGuess: "Аксессуары для путешествий", priority: 2 },
  { keyword: "настольная лампа LED", categoryGuess: "Дом и сад", priority: 3 },
  { keyword: "рюкзак городской 30 литров", categoryGuess: "Сумки и рюкзаки", priority: 3 },
  { keyword: "чехол для iPhone", categoryGuess: "Аксессуары для телефона", priority: 4 },
];

function unauthorized(req: NextRequest) {
  if (!process.env.CRON_SECRET) return process.env.NODE_ENV === "production";
  const authorization = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = req.headers.get("x-cron-secret") ?? authorization ?? req.nextUrl.searchParams.get("secret");
  return secret !== process.env.CRON_SECRET;
}

async function upsertKeyword(input: SeedKeywordInput) {
  const keyword = input.keyword.trim();
  if (!keyword) return { keyword, action: "skipped" as const };

  const existing = await supabaseRest<TrackedKeywordRow[]>("tracked_keywords", {
    query: { select: "id,priority", keyword: `eq.${keyword}`, limit: "1" },
  });

  const body = {
    category_guess: input.categoryGuess ?? null,
    priority: Math.min(input.priority ?? 5, existing.ok ? existing.data[0]?.priority ?? input.priority ?? 5 : input.priority ?? 5),
    tracking_status: "active",
  };

  const id = existing.ok ? existing.data[0]?.id : null;
  if (id) {
    await supabaseRest("tracked_keywords", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: JSON.stringify(body),
    });
    return { keyword, action: "updated" as const };
  }

  await supabaseRest("tracked_keywords", {
    method: "POST",
    body: JSON.stringify({ keyword, ...body }),
  });
  return { keyword, action: "inserted" as const };
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const requestedKeywords: unknown[] = Array.isArray(body.keywords) ? body.keywords : DEFAULT_KEYWORDS;
  const normalized = requestedKeywords
    .map((item: unknown): SeedKeywordInput | null => {
      if (typeof item === "string") return { keyword: item };
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.keyword !== "string") return null;
      return {
        keyword: row.keyword,
        categoryGuess: typeof row.categoryGuess === "string" ? row.categoryGuess : undefined,
        priority: typeof row.priority === "number" ? row.priority : undefined,
      };
    })
    .filter((item): item is SeedKeywordInput => Boolean(item))
    .slice(0, Number(process.env.INTERNAL_MAX_KEYWORDS ?? 25));

  const results = [];
  for (const keyword of normalized) {
    results.push(await upsertKeyword(keyword));
  }

  return NextResponse.json({
    ok: true,
    seeded: results.length,
    inserted: results.filter((item) => item.action === "inserted").length,
    updated: results.filter((item) => item.action === "updated").length,
    skipped: results.filter((item) => item.action === "skipped").length,
    results,
  });
}
