import "server-only";

import { importSupplierProduct } from "@/services/supplierImportService";
import type { SupplierDataProvider, SupplierProduct } from "@/lib/providers/supplier/types";

export function supplierProductFromImport(url: string, raw: Awaited<ReturnType<typeof importSupplierProduct>>): SupplierProduct {
  const product = raw.product;
  return {
    supplierUrl: product?.supplierUrl ?? url,
    platform: raw.source === "made_in_china" || raw.source === "generic_supplier" ? "unknown" : raw.source,
    productTitle: product?.title ?? "",
    originalTitle: product?.title ?? null,
    productImages: product?.productImages ?? [],
    supplierPriceMin: product?.priceTiers?.[0]?.price ?? product?.unitCost ?? null,
    supplierPriceMax: product?.priceTiers?.at(-1)?.price ?? product?.unitCost ?? null,
    currency: product?.currency ?? "USD",
    moq: product?.moq ?? null,
    variants: product?.variants ?? [],
    specs: Object.fromEntries(Object.entries(product?.specifications ?? {}).map(([key, value]) => [key, String(value)])),
    material: String(product?.specifications?.material ?? product?.specifications?.Material ?? "") || null,
    size: product?.dimensions ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.height} cm` : null,
    packageSize: product?.dimensions
      ? {
          lengthCm: product.dimensions.length,
          widthCm: product.dimensions.width,
          heightCm: product.dimensions.height,
        }
      : null,
    grossWeightKg: product?.weight ?? null,
    shippingPerUnit: product?.shippingEstimate ?? null,
    supplierName: product?.supplierName ?? null,
    raw,
  };
}

export const apifyAlibabaProvider: SupplierDataProvider = {
  name: "apify-alibaba",
  async extractSupplierProduct(url) {
    const result = await importSupplierProduct({ url, preferredProvider: "auto" });
    return supplierProductFromImport(url, result);
  },
};
