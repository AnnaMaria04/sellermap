import { NextRequest, NextResponse } from "next/server";
import { extractWithApify } from "@/services/apifyClient";
import {
  detectMissingFields,
  detectSupplierPlatform,
  normalizeImages,
  normalizeMOQ,
  normalizePriceTiers,
  normalizeSpecifications,
  normalizeSupplierData,
} from "@/services/supplierImportService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const platform = detectSupplierPlatform(body.url);
    const result = await extractWithApify(body.url, platform);

    if (!result.ok) {
      return NextResponse.json({
        platform,
        provider: result.provider,
        status: result.status,
        error: result.error,
      });
    }

    const normalized = normalizeSupplierData(
      { ...result.raw, supplierUrl: body.url, productUrl: body.url },
      platform,
      result.provider,
    );
    const renderedText = (() => {
      try {
        return typeof result.raw.rendered === "string" ? result.raw.rendered : JSON.stringify(result.raw.rendered ?? "");
      } catch {
        return "";
      }
    })();
    const packagingIndex = renderedText.toLowerCase().indexOf("single package");
    const grossWeightIndex = renderedText.toLowerCase().indexOf("single gross");

    return NextResponse.json({
      platform,
      provider: result.provider,
      status: "success",
      rawKeys: Object.keys(result.raw),
      checks: {
        title: normalized.title,
        supplierName: normalized.supplierName,
        moq: normalizeMOQ(result.raw),
        priceTiers: normalizePriceTiers(result.raw),
        imageCount: normalizeImages(result.raw).length,
        specificationKeys: Object.keys(normalizeSpecifications(result.raw)).slice(0, 20),
        unitCost: normalized.unitCost,
        currency: normalized.currency,
        weight: normalized.weight,
        dimensions: normalized.dimensions,
        shippingEstimate: normalized.shippingEstimate,
        missingFields: detectMissingFields(normalized),
      },
      renderedDiagnostics: {
        type: typeof result.raw.rendered,
        hasSinglePackage: packagingIndex >= 0,
        hasSingleGrossWeight: grossWeightIndex >= 0,
        packageSnippet: packagingIndex >= 0 ? renderedText.slice(Math.max(0, packagingIndex - 120), packagingIndex + 220) : null,
        weightSnippet: grossWeightIndex >= 0 ? renderedText.slice(Math.max(0, grossWeightIndex - 120), grossWeightIndex + 220) : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Apify test failed." }, { status: 500 });
  }
}
