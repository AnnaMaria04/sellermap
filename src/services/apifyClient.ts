import "server-only";

import { ApifyClient } from "apify-client";
import type { RawSupplierProduct, SupplierPlatform } from "@/types/sellermap";

export type ApifyExtractionResult =
  | { ok: true; provider: "apify"; raw: RawSupplierProduct }
  | { ok: false; provider: "apify"; status: "not_configured" | "failed" | "blocked"; error: string };

type RawAcceptanceResult = boolean | { ok: boolean; reason?: string };

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
    return [process.env.APIFY_ALIBABA_ACTOR_ID, "xtracto/alibaba-product-scraper", "happitap/alibaba-product-scraper", "toolsnmoreapi/Alibaba-Product-and-Vender-Finder"].filter(Boolean) as string[];
  }
  if (platform === "1688") {
    return [process.env.APIFY_1688_ACTOR_ID, "zen-studio/1688-wholesale-scraper", "prodiger/1688-scraper", "ecomscrape/1688-product-search-scraper", "futurizerush/1688-com-products-scraper"].filter(Boolean) as string[];
  }
  if (platform === "aliexpress") {
    return [process.env.APIFY_ALIEXPRESS_ACTOR_ID, "crawlerbros/aliexpress-scraper", "coladeu/aliexpress-product-details", "thirdwatch/aliexpress-product-scraper", "piotrv1001/aliexpress-listings-scraper"].filter(Boolean) as string[];
  }
  return [process.env.APIFY_GENERIC_SUPPLIER_ACTOR_ID, "toolsnmoreapi/Alibaba-Product-and-Vender-Finder"].filter(Boolean) as string[];
}

export async function runApifyActor(input: { actorId: string; payload: Record<string, unknown> }): Promise<RawSupplierProduct | null> {
  const client = getApifyClient();
  if (!client) return null;
  const run = await client.actor(input.actorId).call(input.payload);
  if (!run.defaultDatasetId) return null;
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const raw = items[0] as RawSupplierProduct | undefined;
  return raw && Object.keys(raw).length ? raw : null;
}

function payloadForActor(actorId: string, url: string) {
  if (actorId === "xtracto/alibaba-product-scraper") {
    return {
      productUrls: [{ url }],
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    };
  }

  if (actorId === "zen-studio/1688-wholesale-scraper") {
    const offerId = url.match(/offer\/(\d+)/i)?.[1] ?? url.match(/(\d{8,})/)?.[1];
    return offerId
      ? { offerIds: [offerId] }
      : {
          startUrls: [{ url }],
          maxItems: 1,
          proxyConfiguration: { useApifyProxy: true },
        };
  }

  if (actorId === "crawlerbros/aliexpress-scraper") {
    return {
      startUrls: [{ url }],
      type: "product",
    };
  }

  if (actorId === "coladeu/aliexpress-product-details") {
    const productId = url.match(/\/item\/(\d+)/i)?.[1] ?? url.match(/(\d{8,})/)?.[1];
    return productId ? { productIds: [productId] } : { productUrls: [url] };
  }

  return {
    startUrls: [{ url }],
    maxItems: 1,
    proxyConfiguration: { useApifyProxy: true },
  };
}

export async function extractWithApify(
  url: string,
  platform: SupplierPlatform,
  options: { acceptRaw?: (raw: RawSupplierProduct) => RawAcceptanceResult } = {},
): Promise<ApifyExtractionResult> {
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
          payload: payloadForActor(actorId, url),
        });
        if (raw) {
          const accepted = options.acceptRaw?.(raw) ?? true;
          const ok = typeof accepted === "boolean" ? accepted : accepted.ok;
          const reason = typeof accepted === "boolean" ? undefined : accepted.reason;
          if (ok) return { ok: true, provider: "apify", raw };
          errors.push(`${actorId}: ${reason ?? "identity mismatch"}`);
          continue;
        }
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
