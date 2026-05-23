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
  if (platform === "alibaba") return process.env.APIFY_ALIBABA_ACTOR_ID ?? null;
  if (platform === "1688") return process.env.APIFY_1688_ACTOR_ID ?? null;
  if (platform === "aliexpress") return process.env.APIFY_ALIEXPRESS_ACTOR_ID ?? null;
  return process.env.APIFY_GENERIC_SUPPLIER_ACTOR_ID ?? null;
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

  const actorId = getApifyActorForPlatform(platform);
  if (!actorId) {
    return {
      ok: false,
      provider: "apify",
      status: "not_configured",
      error: `Apify actor для ${platform} не настроен.`,
    };
  }

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
    if (!raw) {
      return { ok: false, provider: "apify", status: "blocked", error: "Apify не вернул данные по ссылке." };
    }
    return { ok: true, provider: "apify", raw };
  } catch (error) {
    return {
      ok: false,
      provider: "apify",
      status: "failed",
      error: error instanceof Error ? error.message : "Apify import failed.",
    };
  }
}
