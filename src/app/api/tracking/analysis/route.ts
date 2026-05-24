import { NextRequest, NextResponse } from "next/server";
import type { WBProduct } from "@/lib/providers/market/types";
import { supabaseRest } from "@/services/supabaseRest";

type StoredAnalysis = {
  id: string;
  analysis_json: {
    fingerprint?: {
      ruKeywords?: string[];
      categoryGuess?: string;
    };
    marketProducts?: WBProduct[];
    marketAnalysis?: {
      competitors?: WBProduct[];
    };
    supplierProduct?: {
      productTitle?: string;
    };
  };
};

type ExistingProduct = {
  id: string;
  priority: number | null;
  keywords: string[] | null;
};

type ExistingKeyword = {
  id: string;
  priority: number | null;
};

async function upsertTrackedKeyword(keyword: string, categoryGuess: string | null, priority: number) {
  const existing = await supabaseRest<ExistingKeyword[]>("tracked_keywords", {
    query: { select: "id,priority", keyword: `eq.${keyword}`, limit: "1" },
  });
  const id = existing.ok ? existing.data[0]?.id : null;
  const body = {
    category_guess: categoryGuess,
    priority: Math.min(priority, existing.ok ? existing.data[0]?.priority ?? priority : priority),
    tracking_status: "active",
  };
  if (id) {
    await supabaseRest("tracked_keywords", { method: "PATCH", query: { id: `eq.${id}` }, body: JSON.stringify(body) });
  } else {
    await supabaseRest("tracked_keywords", { method: "POST", body: JSON.stringify({ keyword, ...body }) });
  }
}

async function upsertTrackedProduct(product: WBProduct, analysisId: string, priority: number) {
  if (!product.nmId) return;
  const existing = await supabaseRest<ExistingProduct[]>("tracked_products", {
    query: { select: "id,priority,keywords", nm_id: `eq.${product.nmId}`, limit: "1" },
  });
  const keywords = new Set([product.searchKeyword, ...(existing.ok ? existing.data[0]?.keywords ?? [] : [])].filter(Boolean));
  const id = existing.ok ? existing.data[0]?.id : null;
  const body = {
    title: product.title,
    image_url: product.imageUrl,
    product_url: product.productUrl,
    seller_name: product.sellerName,
    keywords: [...keywords],
    source_analysis_id: analysisId,
    tracking_status: "active",
    priority: Math.min(priority, existing.ok ? existing.data[0]?.priority ?? priority : priority),
  };
  if (id) {
    await supabaseRest("tracked_products", { method: "PATCH", query: { id: `eq.${id}` }, body: JSON.stringify(body) });
  } else {
    await supabaseRest("tracked_products", { method: "POST", body: JSON.stringify({ nm_id: product.nmId, ...body }) });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { analysisId?: string };
  if (!body.analysisId) return NextResponse.json({ error: "analysisId required" }, { status: 400 });

  const result = await supabaseRest<StoredAnalysis[]>("market_analyses", {
    query: { select: "id,analysis_json", id: `eq.${body.analysisId}`, limit: "1" },
  });
  if (!result.ok) return NextResponse.json({ error: result.error, status: result.status }, { status: 200 });
  const row = result.data[0];
  if (!row) return NextResponse.json({ error: "analysis not found" }, { status: 404 });

  const fingerprint = row.analysis_json?.fingerprint;
  const products = row.analysis_json?.marketProducts ?? row.analysis_json?.marketAnalysis?.competitors ?? [];
  const keywords = [...new Set((fingerprint?.ruKeywords ?? products.map((product) => product.searchKeyword)).filter(Boolean))].slice(0, 7);

  for (const [index, keyword] of keywords.entries()) {
    await upsertTrackedKeyword(keyword, fingerprint?.categoryGuess ?? null, index + 1);
  }
  for (const product of products.slice(0, 12)) {
    const priority = product.searchPosition && product.searchPosition <= 5 ? 1 : (product.reviewCount ?? 0) > 1000 ? 2 : 4;
    await upsertTrackedProduct(product, body.analysisId, priority);
  }

  return NextResponse.json({
    ok: true,
    analysisId: body.analysisId,
    trackedKeywords: keywords.length,
    trackedProducts: products.slice(0, 12).length,
    message: "Ниша поставлена в отслеживание. История начнёт улучшать confidence после ежедневных снимков.",
  });
}
