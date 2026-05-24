import "server-only";

import type { RawSupplierProduct, SupplierPlatform } from "@/types/sellermap";

type OwnSupplierCollectorResponse = {
  status: "success" | "partial" | "failed";
  source: "own-supplier";
  platform: SupplierPlatform | "unknown";
  url: string;
  product: RawSupplierProduct | null;
  warnings: string[];
  debug?: {
    durationMs: number;
    collector: string;
  };
};

export type OwnSupplierExtractionResult =
  | { ok: true; provider: "own_supplier"; raw: RawSupplierProduct; warnings: string[] }
  | { ok: false; provider: "own_supplier"; status: "not_configured" | "failed" | "blocked"; error: string; warnings: string[] };

function getBaseUrl() {
  return process.env.OWN_SUPPLIER_COLLECTOR_BASE_URL ?? process.env.OWN_WB_COLLECTOR_BASE_URL ?? null;
}

function getApiKey() {
  return process.env.OWN_SUPPLIER_COLLECTOR_API_KEY ?? process.env.OWN_WB_COLLECTOR_API_KEY ?? null;
}

export function isOwnSupplierCollectorConfigured() {
  return Boolean(getBaseUrl() && getApiKey() && process.env.ENABLE_OWN_SUPPLIER_COLLECTOR !== "false");
}

export async function extractWithOwnSupplierCollector(url: string): Promise<OwnSupplierExtractionResult> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  if (!baseUrl || !apiKey || process.env.ENABLE_OWN_SUPPLIER_COLLECTOR === "false") {
    return {
      ok: false,
      provider: "own_supplier",
      status: "not_configured",
      error: "Own supplier collector is not configured.",
      warnings: [],
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/supplier`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(Number(process.env.OWN_SUPPLIER_COLLECTOR_TIMEOUT_MS ?? 12000)),
    });
    if (!response.ok) {
      return {
        ok: false,
        provider: "own_supplier",
        status: response.status === 401 || response.status === 403 ? "blocked" : "failed",
        error: `Own supplier collector returned ${response.status}.`,
        warnings: [],
      };
    }
    const json = (await response.json()) as OwnSupplierCollectorResponse;
    if (!json.product || json.status === "failed") {
      return {
        ok: false,
        provider: "own_supplier",
        status: "failed",
        error: json.warnings.join(" | ") || "Own supplier collector returned no product.",
        warnings: json.warnings,
      };
    }
    return {
      ok: true,
      provider: "own_supplier",
      raw: {
        ...json.product,
        productUrl: url,
        supplierUrl: url,
        providerWarnings: json.warnings,
      },
      warnings: json.warnings,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "own_supplier",
      status: "failed",
      error: error instanceof Error ? error.message : "Own supplier collector failed.",
      warnings: [],
    };
  }
}
