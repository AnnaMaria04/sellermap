import { NextResponse } from "next/server";
import { apifyWbProvider } from "@/lib/providers/market/apify-wb-provider";
import { cacheProvider } from "@/lib/providers/market/cache-provider";
import { directWbProvider } from "@/lib/providers/market/direct-wb-provider";
import { mpstatsProvider } from "@/lib/providers/market/mpstats-provider";
import { isSupabaseConfigured } from "@/services/supabaseRest";

export async function GET() {
  const market = await Promise.all([
    cacheProvider.getProviderHealth?.(),
    apifyWbProvider.getProviderHealth?.(),
    mpstatsProvider.getProviderHealth?.(),
    directWbProvider.getProviderHealth?.(),
  ]);
  return NextResponse.json({
    market,
    supplier: {
      apifyConfigured: Boolean(process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN),
      alibabaActor: process.env.APIFY_ALIBABA_ACTOR_ID ?? process.env.ALIBABA_ACTOR_ID ?? null,
    },
    ai: {
      provider: process.env.AI_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : process.env.YANDEXGPT_API_KEY ? "yandex_gpt" : "none"),
      configured: Boolean(process.env.OPENAI_API_KEY ?? process.env.YANDEXGPT_API_KEY ?? process.env.ANTHROPIC_API_KEY),
    },
    supabase: {
      configured: isSupabaseConfigured(),
    },
  });
}
