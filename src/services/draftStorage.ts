import type { DecisionResult, EconomicsResult, FieldSource, MarketAnalysisResult, MarketTarget, ProductAnalysisDraft, SupplierImportResponse } from "@/types/sellermap";

const KEY = "sellermap:drafts";

function readAll(): Record<string, ProductAnalysisDraft> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, ProductAnalysisDraft>;
  } catch {
    return {};
  }
}

function writeAll(drafts: Record<string, ProductAnalysisDraft>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function saveDraft(draft: ProductAnalysisDraft) {
  const drafts = readAll();
  drafts[draft.id] = draft;
  writeAll(drafts);
}

export function getDraft(draftId: string) {
  return readAll()[draftId] ?? null;
}

export function createDraftFromSupplierImport(importResponse: SupplierImportResponse): ProductAnalysisDraft {
  const product = importResponse.product;
  const draft: ProductAnalysisDraft = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceUrl: product?.productUrl ?? null,
    sourcePlatform: importResponse.source,
    sourceProvider: importResponse.provider,
    importStatus: importResponse.status,
    importConfidence: importResponse.confidence,
    confidence: importResponse.confidence,
    product: {
      title: product?.title ?? null,
      supplierName: product?.supplierName ?? null,
      supplierUrl: product?.supplierUrl ?? null,
      productUrl: product?.productUrl ?? null,
      images: product?.productImages ?? [],
      moq: product?.moq ?? null,
      priceTiers: product?.priceTiers ?? [],
      selectedQuantity: product?.selectedQuantity ?? null,
      unitCost: product?.unitCost ?? null,
      currency: product?.currency ?? "RUB",
      exchangeRateToRub: product?.currency === "RUB" ? 1 : null,
      productCostRub: null,
      plannedSellingPrice: null,
      category: product?.category ?? null,
      weight: product?.weight ?? null,
      dimensions: product?.dimensions ?? null,
      packagingCost: null,
      supplierDeliveryCost: product?.shippingEstimate ?? null,
      logisticsCost: product?.shippingEstimate ?? null,
      commissionPercent: null,
      storageCost: 20,
      taxPercent: 6,
      adBudgetPercent: 10,
      returnReservePercent: 5,
    },
    marketTarget: null,
    fieldSources: importResponse.fieldSources,
    missingFields: importResponse.missingFields,
    warnings: importResponse.warnings,
    commission: null,
    economics: null,
    priceScenarios: [],
    dataConfidence: null,
    decision: null,
    actionPlan: [],
    wbConnection: null,
    market: null,
    recommendations: [],
  };
  saveDraft(draft);
  return draft;
}

export const createDraftFromImport = createDraftFromSupplierImport;

export function updateDraftField(draftId: string, field: string, value: unknown, source: FieldSource) {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const updated = {
    ...draft,
    product: { ...draft.product, [field]: value },
    fieldSources: { ...draft.fieldSources, [field]: source },
  };
  saveDraft(updated);
  return updated;
}

export function updateMarketTarget(draftId: string, target: MarketTarget) {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const updated = { ...draft, marketTarget: target };
  saveDraft(updated);
  return updated;
}

export function updateEconomicsInput(draftId: string, partialInput: Partial<ProductAnalysisDraft["product"]>) {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const updated = { ...draft, product: { ...draft.product, ...partialInput } };
  saveDraft(updated);
  return updated;
}

export function updateMarketAnalysis(draftId: string, market: MarketAnalysisResult) {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const updated = { ...draft, market };
  saveDraft(updated);
  return updated;
}

export function updateDecision(draftId: string, decision: DecisionResult, economics?: EconomicsResult) {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const updated = { ...draft, decision, economics: economics ?? draft.economics };
  saveDraft(updated);
  return updated;
}

export function clearDraft(draftId: string) {
  const drafts = readAll();
  delete drafts[draftId];
  writeAll(drafts);
}

export function mergeReimportedDraft(
  existingDraft: ProductAnalysisDraft,
  newImport: SupplierImportResponse,
  mode: "missing_only" | "overwrite_autofilled" | "overwrite_all",
) {
  const incoming = createDraftFromImport(newImport);
  const merged: ProductAnalysisDraft = {
    ...existingDraft,
    importStatus: newImport.status,
    importConfidence: newImport.confidence,
    confidence: newImport.confidence,
    missingFields: newImport.missingFields,
    warnings: newImport.warnings,
  };

  Object.entries(incoming.product).forEach(([key, value]) => {
    const source = existingDraft.fieldSources[key];
    const current = existingDraft.product[key as keyof ProductAnalysisDraft["product"]];
    if (mode === "missing_only" && (current === null || current === "" || current === undefined)) {
      Object.assign(merged.product, { [key]: value });
    }
    if (mode === "overwrite_autofilled" && source !== "manual") {
      Object.assign(merged.product, { [key]: value });
    }
    if (mode === "overwrite_all") {
      Object.assign(merged.product, { [key]: value });
    }
  });

  saveDraft(merged);
  return merged;
}
