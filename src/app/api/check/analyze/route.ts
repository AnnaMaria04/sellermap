import { NextRequest, NextResponse } from "next/server";
import { calculateUnitEconomics, buildEconomicsInput, type UnitEconomicsInput } from "@/lib/analysis/economics";
import { makeDecision } from "@/lib/analysis/decision-engine";
import { analyzeMarket } from "@/lib/analysis/market-analysis";
import { fingerprintSupplierProduct } from "@/lib/analysis/product-fingerprint";
import { searchMarketProducts } from "@/lib/providers/market";
import { supplierProductFromImport } from "@/lib/providers/supplier/apify-alibaba-provider";
import { manualSupplierProduct } from "@/lib/providers/supplier/manual-provider";
import type { SupplierProduct } from "@/lib/providers/supplier/types";
import { persistDataFlywheel } from "@/services/dataFlywheel";
import { importSupplierProduct } from "@/services/supplierImportService";

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
      warnings.push(...(imported.rawDebug?.providerErrors ?? []));
    } else {
      supplierProduct = supplierProductFromImport(body.supplierUrl, imported);
      warnings.push(...imported.warnings);
      warnings.push(...(imported.rawDebug?.providerErrors ?? []));
    }
  } else {
    supplierProduct = manualSupplierProduct(body.manualSupplierData ?? {});
  }

  const fingerprint = fingerprintSupplierProduct(supplierProduct);
  const analyzeKeywordLimit = Number(process.env.CHECK_ANALYZE_KEYWORD_LIMIT ?? 1);
  const analyzeResultLimit = Number(process.env.CHECK_ANALYZE_RESULT_LIMIT ?? 30);
  const marketLookup = await searchMarketProducts(fingerprint.ruKeywords.slice(0, analyzeKeywordLimit), analyzeResultLimit);
  warnings.push(...marketLookup.warnings);
  const marketAnalysis = analyzeMarket(supplierProduct, fingerprint, marketLookup.products);
  warnings.push(...marketAnalysis.warnings);
  const economicsInput = buildEconomicsInput(supplierProduct, marketAnalysis, body.userCostAssumptions);
  const economics = calculateUnitEconomics(economicsInput, marketAnalysis);
  const decision = makeDecision({ supplier: supplierProduct, fingerprint, market: marketAnalysis, economics });
  const persisted = await persistDataFlywheel({
    supplierProduct,
    fingerprint,
    marketProducts: marketLookup.products,
    marketAnalysis,
    economics,
    decision,
    providersUsed: marketLookup.providersUsed,
    warnings,
  });

  return NextResponse.json({
    supplierProduct,
    fingerprint,
    marketAnalysis,
    economics,
    decision,
    debug: {
      providersUsed: marketLookup.providersUsed,
      warnings: [...new Set(warnings)],
      ...persisted,
    },
  });
}
