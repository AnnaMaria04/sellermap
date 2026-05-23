import type { SupplierDataProvider, SupplierProduct } from "@/lib/providers/supplier/types";

export function manualSupplierProduct(input: Partial<SupplierProduct> & { supplierUrl?: string }): SupplierProduct {
  return {
    supplierUrl: input.supplierUrl ?? "manual://supplier",
    platform: input.platform ?? "manual",
    productTitle: input.productTitle ?? "Товар поставщика",
    originalTitle: input.originalTitle ?? input.productTitle ?? null,
    productImages: input.productImages ?? [],
    supplierPriceMin: input.supplierPriceMin ?? null,
    supplierPriceMax: input.supplierPriceMax ?? input.supplierPriceMin ?? null,
    currency: input.currency ?? "USD",
    moq: input.moq ?? null,
    variants: input.variants ?? [],
    specs: input.specs ?? {},
    material: input.material ?? null,
    size: input.size ?? null,
    packageSize: input.packageSize ?? null,
    grossWeightKg: input.grossWeightKg ?? null,
    shippingPerUnit: input.shippingPerUnit ?? null,
    supplierName: input.supplierName ?? null,
    supplierRating: input.supplierRating ?? null,
    raw: input.raw ?? null,
  };
}

export const manualSupplierProvider: SupplierDataProvider = {
  name: "manual",
  async extractSupplierProduct(url) {
    return manualSupplierProduct({ supplierUrl: url });
  },
};
