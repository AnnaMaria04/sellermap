import type {
  CalculatorDraft,
  SupplierImportedProduct,
  SupplierImportResponse,
  SupplierPlatform,
  SupplierPriceTier,
} from "./types";

const REQUIRED_IMPORT_FIELDS = ["weight", "dimensions", "shippingEstimate"] as const;

export function detectSupplierPlatform(url: string): SupplierPlatform {
  const normalized = url.toLowerCase();
  if (normalized.includes("alibaba.com")) return "alibaba";
  if (normalized.includes("1688.com")) return "1688";
  if (normalized.includes("made-in-china.com")) return "made_in_china";
  return "generic_supplier";
}

export function calculateBestPriceTier(priceTiers: SupplierPriceTier[], selectedQuantity: number) {
  return (
    priceTiers.find((tier) => selectedQuantity >= tier.minQty && (tier.maxQty === null || selectedQuantity <= tier.maxQty)) ??
    priceTiers[0] ??
    null
  );
}

export function detectMissingFields(productData: SupplierImportedProduct) {
  return REQUIRED_IMPORT_FIELDS.filter((field) => productData[field] === null || productData[field] === "");
}

export function normalizeSupplierData(productData: SupplierImportedProduct): SupplierImportResponse {
  const selectedTier = calculateBestPriceTier(productData.priceTiers, productData.selectedQuantity);
  const product = {
    ...productData,
    unitCost: selectedTier?.price ?? productData.unitCost,
    currency: selectedTier?.currency ?? productData.currency,
  };
  const missingFields = detectMissingFields(product);
  const partial = missingFields.length > 0;

  return {
    source: detectSupplierPlatform(product.supplierUrl),
    status: partial ? "partial" : "success",
    confidence: partial ? 0.68 : 0.84,
    product,
    fieldSources: {
      title: "mock",
      supplierName: "mock",
      productImages: "mock",
      moq: product.moq ? "mock" : "missing",
      unitCost: product.unitCost ? "mock" : "missing",
      weight: product.weight ? "mock" : "missing",
      dimensions: product.dimensions ? "mock" : "missing",
      shippingEstimate: product.shippingEstimate ? "mock" : "missing",
    },
    missingFields,
  };
}

export function extractAlibabaProduct(url: string): SupplierImportedProduct {
  return {
    title: "Дорожный органайзер для косметики, складной",
    supplierName: "Yiwu Travel Goods Co.",
    supplierUrl: url,
    productImages: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    ],
    priceTiers: [
      { minQty: 100, maxQty: 499, price: 2.4, currency: "USD" },
      { minQty: 500, maxQty: 999, price: 2.1, currency: "USD" },
      { minQty: 1000, maxQty: null, price: 1.85, currency: "USD" },
    ],
    moq: 100,
    selectedQuantity: 500,
    unitCost: 2.1,
    currency: "USD",
    variants: ["черный", "бежевый", "розовый"],
    specifications: {
      material: "Oxford fabric",
      package: "individual polybag",
    },
    weight: null,
    dimensions: null,
    shippingEstimate: null,
    leadTime: 18,
  };
}

export function extract1688Product(url: string): SupplierImportedProduct {
  return {
    ...extractAlibabaProduct(url),
    supplierName: "1688 фабрика, Иу",
    priceTiers: [
      { minQty: 50, maxQty: 299, price: 15.8, currency: "CNY" },
      { minQty: 300, maxQty: 999, price: 13.9, currency: "CNY" },
      { minQty: 1000, maxQty: null, price: 12.6, currency: "CNY" },
    ],
    moq: 50,
    selectedQuantity: 300,
    currency: "CNY",
    unitCost: 13.9,
  };
}

export function extractGenericSupplierProduct(url: string): SupplierImportedProduct {
  return {
    ...extractAlibabaProduct(url),
    title: "Товар поставщика",
    supplierName: "Поставщик",
    productImages: [],
    priceTiers: [],
    moq: null,
    selectedQuantity: 100,
    unitCost: null,
    currency: "USD",
    leadTime: null,
  };
}

export async function importSupplierProduct(url: string): Promise<SupplierImportResponse> {
  const source = detectSupplierPlatform(url);
  if (!/^https?:\/\//i.test(url)) {
    return {
      source,
      status: "failed",
      confidence: 0,
      product: extractGenericSupplierProduct(url),
      fieldSources: {},
      missingFields: ["supplierUrl"],
      error: "Укажите корректную ссылку поставщика.",
    };
  }

  const rawData =
    source === "alibaba"
      ? extractAlibabaProduct(url)
      : source === "1688"
        ? extract1688Product(url)
        : extractGenericSupplierProduct(url);

  return normalizeSupplierData(rawData);
}

export function mapSupplierDataToCalculator(productData: SupplierImportedProduct): CalculatorDraft {
  return {
    productCost: productData.unitCost,
    plannedSellingPrice: null,
    commissionRate: 15,
    logisticsEstimate: productData.shippingEstimate,
    packagingCost: null,
    supplierDeliveryCost: productData.shippingEstimate,
    weight: productData.weight,
    dimensions: productData.dimensions,
    selectedQuantity: productData.selectedQuantity,
    currency: productData.currency,
  };
}
