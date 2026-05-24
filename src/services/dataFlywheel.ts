import "server-only";

import { calculateDailyMarketMetrics } from "@/lib/analysis/daily-market-metrics";
import type { DecisionResult } from "@/lib/analysis/decision-engine";
import type { UnitEconomicsResult } from "@/lib/analysis/economics";
import type { MarketAnalysis } from "@/lib/analysis/market-analysis";
import type { ProductFingerprint } from "@/lib/analysis/product-fingerprint";
import type { WBProduct } from "@/lib/providers/market/types";
import type { SupplierProduct } from "@/lib/providers/supplier/types";
import { supabaseRest } from "@/services/supabaseRest";

type PersistInput = {
  supplierProduct: SupplierProduct;
  fingerprint: ProductFingerprint;
  marketProducts: WBProduct[];
  marketAnalysis: MarketAnalysis;
  economics: UnitEconomicsResult;
  decision: DecisionResult;
  providersUsed: string[];
  warnings: string[];
};

async function insertOne<T extends { id: string }>(table: string, body: Record<string, unknown>) {
  const result = await supabaseRest<T[]>(table, { method: "POST", body: JSON.stringify(body) });
  return result.ok ? result.data[0]?.id ?? null : null;
}

function groupedByKeyword(products: WBProduct[]) {
  const groups = new Map<string, WBProduct[]>();
  for (const product of products) {
    const keyword = product.searchKeyword || "unknown";
    groups.set(keyword, [...(groups.get(keyword) ?? []), product]);
  }
  return groups;
}

export async function saveSupplierProduct(product: SupplierProduct) {
  return insertOne("supplier_products", {
    supplier_url: product.supplierUrl,
    platform: product.platform,
    title: product.productTitle,
    original_title: product.originalTitle,
    images: product.productImages,
    price_min: product.supplierPriceMin,
    price_max: product.supplierPriceMax,
    currency: product.currency,
    moq: product.moq,
    specs: product.specs,
    package_size: product.packageSize,
    gross_weight_kg: product.grossWeightKg,
    supplier_name: product.supplierName,
    raw_payload: product.raw,
  });
}

async function saveFingerprint(supplierProductId: string | null, fingerprint: ProductFingerprint) {
  if (!supplierProductId) return null;
  return insertOne("product_fingerprints", {
    supplier_product_id: supplierProductId,
    product_type: fingerprint.productType,
    target_customer: fingerprint.targetCustomer,
    use_case: fingerprint.useCase,
    key_features: fingerprint.keyFeatures,
    ru_keywords: fingerprint.ruKeywords,
    category_guess: fingerprint.categoryGuess,
    differentiation_angles: fingerprint.differentiationAngles,
    irrelevant_terms: fingerprint.irrelevantTermsToAvoid,
  });
}

async function saveMarketAnalysis(input: PersistInput, supplierProductId: string | null, fingerprintId: string | null) {
  if (!supplierProductId) return null;
  return insertOne("market_analyses", {
    supplier_product_id: supplierProductId,
    fingerprint_id: fingerprintId,
    analysis_json: {
      fingerprint: input.fingerprint,
      marketAnalysis: input.marketAnalysis,
      economics: input.economics,
      decision: input.decision,
      warnings: input.warnings,
      providersUsed: input.providersUsed,
    },
    opportunity_score: input.decision.opportunityScore,
    verdict: input.decision.verdict,
    confidence_level: input.decision.confidenceLevel,
  });
}

export async function saveWbSnapshots(products: WBProduct[], providersUsed: string[], categoryGuess?: string | null) {
  const groups = groupedByKeyword(products);

  for (const [keyword, rows] of groups.entries()) {
    const provider = providersUsed[0] ?? rows[0]?.source ?? "none";
    const metrics = calculateDailyMarketMetrics(keyword, rows, categoryGuess);
    await supabaseRest("wb_search_snapshots", {
      method: "POST",
      body: JSON.stringify({
        keyword,
        query: keyword,
        provider,
        result_count: rows.length,
        normalized_count: rows.length,
        products: rows,
        market_stats: metrics,
        raw_payload: rows,
      }),
    });
    await supabaseRest("daily_market_metrics", { method: "POST", body: JSON.stringify(metrics) });
  }

  const snapshotRows = products
    .filter((product) => product.nmId)
    .map((product) => ({
      nm_id: product.nmId,
      query: product.searchKeyword,
      provider: product.source,
      title: product.title,
      brand: product.brand,
      seller_name: product.sellerName,
      seller_id: product.sellerId,
      price_rub: product.priceRub,
      original_price_rub: product.originalPriceRub,
      rating: product.rating,
      review_count: product.reviewCount,
      image_url: product.imageUrl,
      product_url: product.productUrl,
      category: product.category,
      subject: product.subject,
      search_position: product.searchPosition,
      stock_signal: product.stockSignal,
      estimated_monthly_sales: product.estimatedMonthlySales,
      product,
      raw_payload: product.raw ?? product,
    }));
  if (snapshotRows.length) {
    await supabaseRest("wb_product_snapshots", { method: "POST", body: JSON.stringify(snapshotRows) });
  }
}

async function saveAnalysisCompetitors(marketAnalysisId: string | null, products: WBProduct[]) {
  if (!marketAnalysisId) return;
  const rows = products.slice(0, 50).map((product) => ({
    market_analysis_id: marketAnalysisId,
    nm_id: product.nmId,
    query: product.searchKeyword,
    title: product.title,
    seller_name: product.sellerName,
    price_rub: product.priceRub,
    review_count: product.reviewCount,
    rating: product.rating,
    search_position: product.searchPosition,
    image_url: product.imageUrl,
    source: product.source,
  }));
  if (rows.length) await supabaseRest("analysis_competitors", { method: "POST", body: JSON.stringify(rows) });
}

async function upsertTrackedProduct(product: WBProduct, sourceAnalysisId: string | null, keyword: string, priority: number) {
  if (!product.nmId) return;
  const existing = await supabaseRest<Array<{ id: string; priority: number | null; keywords: string[] | null }>>("tracked_products", {
    query: { select: "id,priority,keywords", nm_id: `eq.${product.nmId}`, limit: "1" },
  });
  const keywords = new Set([keyword, ...(existing.ok ? existing.data[0]?.keywords ?? [] : [])].filter(Boolean));
  const body = {
    title: product.title,
    image_url: product.imageUrl,
    product_url: product.productUrl,
    seller_name: product.sellerName,
    keywords: [...keywords],
    source_analysis_id: sourceAnalysisId,
    tracking_status: "active",
    priority: Math.min(priority, existing.ok ? existing.data[0]?.priority ?? priority : priority),
  };
  const id = existing.ok ? existing.data[0]?.id : null;
  if (id) {
    await supabaseRest("tracked_products", { method: "PATCH", query: { id: `eq.${id}` }, body: JSON.stringify(body) });
  } else {
    await supabaseRest("tracked_products", { method: "POST", body: JSON.stringify({ nm_id: product.nmId, ...body }) });
  }
}

async function upsertTrackedKeyword(keyword: string, categoryGuess: string, priority: number) {
  const existing = await supabaseRest<Array<{ id: string; priority: number | null }>>("tracked_keywords", {
    query: { select: "id,priority", keyword: `eq.${keyword}`, limit: "1" },
  });
  const body = {
    category_guess: categoryGuess,
    priority: Math.min(priority, existing.ok ? existing.data[0]?.priority ?? priority : priority),
    tracking_status: "active",
  };
  const id = existing.ok ? existing.data[0]?.id : null;
  if (id) {
    await supabaseRest("tracked_keywords", { method: "PATCH", query: { id: `eq.${id}` }, body: JSON.stringify(body) });
  } else {
    await supabaseRest("tracked_keywords", { method: "POST", body: JSON.stringify({ keyword, ...body }) });
  }
}

async function saveTrackingTargets(input: PersistInput, marketAnalysisId: string | null) {
  const sorted = [...input.marketProducts].sort((a, b) => (a.searchPosition ?? 999) - (b.searchPosition ?? 999)).slice(0, 20);
  for (const product of sorted) {
    const priority = product.searchPosition && product.searchPosition <= 5 ? 1 : (product.reviewCount ?? 0) > 1000 ? 2 : 4;
    await upsertTrackedProduct(product, marketAnalysisId, product.searchKeyword, priority);
  }
  for (const [index, keyword] of input.fingerprint.ruKeywords.slice(0, 5).entries()) {
    await upsertTrackedKeyword(keyword, input.fingerprint.categoryGuess, index + 1);
  }
}

export async function persistDataFlywheel(input: PersistInput) {
  const supplierProductId = await saveSupplierProduct(input.supplierProduct);
  const fingerprintId = await saveFingerprint(supplierProductId, input.fingerprint);
  const marketAnalysisId = await saveMarketAnalysis(input, supplierProductId, fingerprintId);
  await saveWbSnapshots(input.marketProducts, input.providersUsed, input.fingerprint.categoryGuess);
  await saveAnalysisCompetitors(marketAnalysisId, input.marketProducts);
  await saveTrackingTargets(input, marketAnalysisId);
  return { supplierProductId, fingerprintId, marketAnalysisId };
}
