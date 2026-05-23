import { NextRequest, NextResponse } from "next/server";
import { calculateUnitEconomics, buildEconomicsInput, type UnitEconomicsInput } from "@/lib/analysis/economics";
import { makeDecision } from "@/lib/analysis/decision-engine";
import { analyzeMarket } from "@/lib/analysis/market-analysis";
import { fingerprintSupplierProduct } from "@/lib/analysis/product-fingerprint";
import { searchMarketProducts } from "@/lib/providers/market";
import { supplierProductFromImport } from "@/lib/providers/supplier/apify-alibaba-provider";
import { manualSupplierProduct } from "@/lib/providers/supplier/manual-provider";
import type { SupplierProduct } from "@/lib/providers/supplier/types";
import { importSupplierProduct } from "@/services/supplierImportService";
import { supabaseRest } from "@/services/supabaseRest";

async function saveSupplier(product: SupplierProduct) {
  const result = await supabaseRest<Array<{ id: string }>>("supplier_products", {
    method: "POST",
    body: JSON.stringify({
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
    }),
  });
  return result.ok ? result.data[0]?.id ?? null : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    supplierUrl?: string;
    manualSupplierData?: Partial<SupplierProduct>;
    userCostAssumptions?: Partial<UnitEconomicsInput>;
  };

  if (!body.supplierUrl && !body.manualSupplierData) {
    return NextResponse.json({ error: "supplierUrl or manualSupplierData required" }, { status: 400 });
  }

  const warnings: string[] = [];
  let supplierProduct: SupplierProduct;
  if (body.supplierUrl) {
    const imported = await importSupplierProduct({ url: body.supplierUrl, preferredProvider: "auto" });
    if (!imported.product) {
      supplierProduct = manualSupplierProduct({ supplierUrl: body.supplierUrl, ...body.manualSupplierData });
      warnings.push(imported.error ?? "Автоимпорт поставщика не дал товар, используется ручной черновик.");
    } else {
      supplierProduct = supplierProductFromImport(body.supplierUrl, imported);
      warnings.push(...imported.warnings);
    }
  } else {
    supplierProduct = manualSupplierProduct(body.manualSupplierData ?? {});
  }

  const supplierProductId = await saveSupplier(supplierProduct);
  const fingerprint = fingerprintSupplierProduct(supplierProduct);
  if (supplierProductId) {
    await supabaseRest("product_fingerprints", {
      method: "POST",
      body: JSON.stringify({
        supplier_product_id: supplierProductId,
        product_type: fingerprint.productType,
        target_customer: fingerprint.targetCustomer,
        use_case: fingerprint.useCase,
        key_features: fingerprint.keyFeatures,
        ru_keywords: fingerprint.ruKeywords,
        category_guess: fingerprint.categoryGuess,
        differentiation_angles: fingerprint.differentiationAngles,
      }),
    });
  }

  const marketLookup = await searchMarketProducts(fingerprint.ruKeywords, 80);
  warnings.push(...marketLookup.warnings);
  const marketAnalysis = analyzeMarket(supplierProduct, fingerprint, marketLookup.products);
  warnings.push(...marketAnalysis.warnings);
  const economicsInput = buildEconomicsInput(supplierProduct, marketAnalysis, body.userCostAssumptions);
  const economics = calculateUnitEconomics(economicsInput, marketAnalysis);
  const decision = makeDecision({ supplier: supplierProduct, fingerprint, market: marketAnalysis, economics });

  if (supplierProductId) {
    await supabaseRest("market_analyses", {
      method: "POST",
      body: JSON.stringify({
        supplier_product_id: supplierProductId,
        analysis_json: { fingerprint, marketAnalysis, economics, decision, warnings },
        opportunity_score: decision.opportunityScore,
        verdict: decision.verdict,
        confidence_level: decision.confidenceLevel,
      }),
    });
    const primaryKeyword = fingerprint.ruKeywords[0] ?? supplierProduct.productTitle;
    await supabaseRest("wb_search_snapshots", {
      method: "POST",
      body: JSON.stringify({
        keyword: primaryKeyword,
        query: primaryKeyword,
        provider: marketLookup.providersUsed[0] ?? "none",
        result_count: marketLookup.products.length,
        raw_payload: marketLookup.products,
      }),
    });
    if (marketLookup.products.length) {
      await supabaseRest("wb_product_snapshots", {
        method: "POST",
        body: JSON.stringify(
          marketLookup.products.map((product) => ({
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
            raw_payload: product.raw,
          })),
        ),
      });
    }
  }

  return NextResponse.json({
    supplierProduct,
    fingerprint,
    marketAnalysis,
    economics,
    decision,
    debug: {
      providersUsed: marketLookup.providersUsed,
      warnings: [...new Set(warnings)],
      supplierProductId,
    },
  });
}
