import "server-only";

import { ApifyClient } from "apify-client";
import type { RawSupplierProduct, SupplierPlatform } from "@/types/sellermap";

export type ApifyExtractionResult =
  | { ok: true; provider: "apify"; raw: RawSupplierProduct }
  | { ok: false; provider: "apify"; status: "not_configured" | "failed" | "blocked"; error: string };

function getApifyClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return null;
  return new ApifyClient({ token });
}

export function getApifyActorForPlatform(platform: SupplierPlatform): string | null {
  return getApifyActorsForPlatform(platform)[0] ?? null;
}

export function getApifyActorsForPlatform(platform: SupplierPlatform): string[] {
  if (platform === "alibaba") {
    return [process.env.APIFY_ALIBABA_ACTOR_ID, "happitap/alibaba-product-scraper", "toolsnmoreapi/Alibaba-Product-and-Vender-Finder"].filter(Boolean) as string[];
  }
  if (platform === "1688") {
    return [process.env.APIFY_1688_ACTOR_ID, "ecomscrape/1688-product-search-scraper", "futurizerush/1688-com-products-scraper"].filter(Boolean) as string[];
  }
  if (platform === "aliexpress") {
    return [process.env.APIFY_ALIEXPRESS_ACTOR_ID, "thirdwatch/aliexpress-product-scraper", "piotrv1001/aliexpress-listings-scraper"].filter(Boolean) as string[];
  }
  return [process.env.APIFY_GENERIC_SUPPLIER_ACTOR_ID, "toolsnmoreapi/Alibaba-Product-and-Vender-Finder"].filter(Boolean) as string[];
}

export async function runApifyActor(input: { actorId: string; payload: Record<string, unknown> }): Promise<RawSupplierProduct | null> {
  const client = getApifyClient();
  if (!client) return null;
  const run = await client.actor(input.actorId).call(input.payload);
  if (!run.defaultDatasetId) return null;
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
  return (items[0] as RawSupplierProduct | undefined) ?? null;
}

export async function extractWithApify(url: string, platform: SupplierPlatform): Promise<ApifyExtractionResult> {
  if (!process.env.APIFY_API_TOKEN) {
    return { ok: false, provider: "apify", status: "not_configured", error: "APIFY_API_TOKEN не задан." };
  }

  const actorIds = getApifyActorsForPlatform(platform);
  if (!actorIds.length) {
    return {
      ok: false,
      provider: "apify",
      status: "not_configured",
      error: `Apify actor для ${platform} не настроен.`,
    };
  }

  const errors: string[] = [];
  try {
    for (const actorId of actorIds) {
      try {
        // Update payload shape here if selected Apify actor requires different input.
        const raw = await runApifyActor({
          actorId,
          payload: {
            startUrls: [{ url }],
            maxItems: 1,
            proxyConfiguration: { useApifyProxy: true },
          },
        });
        if (raw) return { ok: true, provider: "apify", raw };
        errors.push(`${actorId}: no dataset item`);
      } catch (error) {
        errors.push(`${actorId}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    return { ok: false, provider: "apify", status: "blocked", error: errors.join(" | ") || "Apify не вернул данные по ссылке." };
  } catch (error) {
    return {
      ok: false,
      provider: "apify",
      status: "failed",
      error: error instanceof Error ? error.message : "Apify import failed.",
    };
  }
}
