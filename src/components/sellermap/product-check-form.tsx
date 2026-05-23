"use client";

import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Package, RefreshCw, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ManualCompetitorInput } from "@/components/ManualCompetitorInput";
import { MarketTargetStep } from "@/components/MarketTargetStep";
import { WbCategoryCommissionStep } from "@/components/WbCategoryCommissionStep";
import type { EconomicsResult } from "@/lib/economics/calculateEconomics";
import type { SupplierFieldSource, SupplierImportResponse, SupplierPriceTier } from "@/lib/integrations/suppliers/types";
import { createDraftFromImport, saveDraft, updateDraftField, updateMarketAnalysis, updateMarketTarget } from "@/services/draftStorage";
import { calculateUnitEconomics } from "@/services/economicsCalculator";
import { formatRub } from "@/lib/utils";
import type { CommissionMatch, CompetitorProduct, Dimensions, MarketAnalysisResult, MarketTarget, SupplierCurrency } from "@/types/sellermap";

type CheckPageState =
  | "empty"
  | "validating_url"
  | "importing"
  | "import_success"
  | "import_partial"
  | "import_blocked"
  | "identity_mismatch"
  | "import_failed"
  | "manual_mode"
  | "ready_to_calculate";

type CalculatorFields = {
  productTitle: string;
  supplierName: string;
  productCostRub: string;
  plannedSellingPrice: string;
  commissionRate: string;
  logisticsEstimate: string;
  packagingCost: string;
  supplierDeliveryCost: string;
  storageCost: string;
  returnReservePercent: string;
  taxPercent: string;
  adBudgetPercent: string;
  weight: string;
  dimensions: string;
  selectedQuantity: string;
  exchangeRate: string;
};

const loadingSteps = [
  "Определяем площадку",
  "Запускаем импорт через Apify",
  "Извлекаем название и изображения",
  "Ищем MOQ и ценовые уровни",
  "Ищем характеристики, вес и габариты",
  "Проверяем, совпадает ли товар со ссылкой",
  "Готовим черновик экономики",
];

const steps = ["Поставщик", "Рынок WB", "Экономика", "Решение"];

const demoImports: Array<{ label: string; data: SupplierImportResponse }> = [
  {
    label: "Лампа LED",
    data: {
      source: "alibaba",
      provider: "demo",
      status: "success",
      confidence: 0.92,
      product: {
        title: "Настольная лампа LED с диммером и USB",
        supplierName: "Guangzhou LightTech",
        supplierUrl: "demo://supplier/led-lamp",
        productUrl: "demo://supplier/led-lamp",
        productImages: [],
        priceTiers: [
          { minQty: 50, maxQty: 199, price: 18.5, currency: "CNY" },
          { minQty: 200, maxQty: 499, price: 16.8, currency: "CNY" },
          { minQty: 500, maxQty: null, price: 15.9, currency: "CNY" },
        ],
        moq: 50,
        selectedQuantity: 50,
        unitCost: 18.5,
        currency: "CNY",
        variants: ["белый", "черный"],
        specifications: { category: "Дом и сад", packing: "картонная коробка" },
        weight: 0.42,
        dimensions: { length: 22, width: 14, height: 10, unit: "cm" },
        shippingEstimate: 11,
        leadTime: 14,
        category: "Дом и сад",
      },
      fieldSources: {
        title: "demo",
        supplierName: "demo",
        productImages: "demo",
        moq: "demo",
        unitCost: "demo",
        weight: "demo",
        dimensions: "demo",
        shippingEstimate: "demo",
      },
      missingFields: [],
      warnings: ["Демо-товар: данные поставщика тестовые, рынок WB ищется через настоящий provider."],
      rawDebug: { urlTokens: ["led", "lamp"], matchedTokens: ["lamp"], providerErrors: [] },
    },
  },
  {
    label: "Рюкзак 30L",
    data: {
      source: "1688",
      provider: "demo",
      status: "success",
      confidence: 0.9,
      product: {
        title: "Городской рюкзак 30 литров водонепроницаемый",
        supplierName: "Yiwu Bag Factory",
        supplierUrl: "demo://supplier/backpack-30l",
        productUrl: "demo://supplier/backpack-30l",
        productImages: [],
        priceTiers: [{ minQty: 100, maxQty: null, price: 42, currency: "CNY" }],
        moq: 100,
        selectedQuantity: 100,
        unitCost: 42,
        currency: "CNY",
        variants: ["черный", "серый"],
        specifications: { category: "Рюкзаки", material: "Oxford" },
        weight: 0.75,
        dimensions: { length: 45, width: 30, height: 15, unit: "cm" },
        shippingEstimate: 18,
        leadTime: 18,
        category: "Рюкзаки",
      },
      fieldSources: { title: "demo", supplierName: "demo", moq: "demo", unitCost: "demo", weight: "demo", dimensions: "demo", shippingEstimate: "demo" },
      missingFields: [],
      warnings: ["Демо-товар: данные поставщика тестовые, рынок WB ищется через настоящий provider."],
      rawDebug: { urlTokens: ["backpack", "30l"], matchedTokens: ["backpack"], providerErrors: [] },
    },
  },
  {
    label: "Чехол iPhone",
    data: {
      source: "aliexpress",
      provider: "demo",
      status: "success",
      confidence: 0.88,
      product: {
        title: "Силиконовый чехол для iPhone прозрачный",
        supplierName: "Shenzhen Phone Accessories",
        supplierUrl: "demo://supplier/iphone-case",
        productUrl: "demo://supplier/iphone-case",
        productImages: [],
        priceTiers: [{ minQty: 20, maxQty: null, price: 0.82, currency: "USD" }],
        moq: 20,
        selectedQuantity: 100,
        unitCost: 0.82,
        currency: "USD",
        variants: ["iPhone 13", "iPhone 14", "iPhone 15"],
        specifications: { category: "Аксессуары", material: "TPU" },
        weight: 0.05,
        dimensions: { length: 18, width: 10, height: 2, unit: "cm" },
        shippingEstimate: 0.2,
        leadTime: 10,
        category: "Аксессуары",
      },
      fieldSources: { title: "demo", supplierName: "demo", moq: "demo", unitCost: "demo", weight: "demo", dimensions: "demo", shippingEstimate: "demo" },
      missingFields: [],
      warnings: ["Демо-товар: данные поставщика тестовые, рынок WB ищется через настоящий provider."],
      rawDebug: { urlTokens: ["iphone", "case"], matchedTokens: ["case"], providerErrors: [] },
    },
  },
  {
    label: "Поп-ит",
    data: {
      source: "alibaba",
      provider: "demo",
      status: "success",
      confidence: 0.86,
      product: {
        title: "Игрушка антистресс поп-ит силиконовая",
        supplierName: "Dongguan Toy Supplier",
        supplierUrl: "demo://supplier/pop-it",
        productUrl: "demo://supplier/pop-it",
        productImages: [],
        priceTiers: [{ minQty: 100, maxQty: null, price: 0.55, currency: "USD" }],
        moq: 100,
        selectedQuantity: 300,
        unitCost: 0.55,
        currency: "USD",
        variants: ["круг", "квадрат"],
        specifications: { category: "Игрушки", material: "silicone" },
        weight: 0.08,
        dimensions: { length: 14, width: 14, height: 2, unit: "cm" },
        shippingEstimate: 0.15,
        leadTime: 12,
        category: "Игрушки",
      },
      fieldSources: { title: "demo", supplierName: "demo", moq: "demo", unitCost: "demo", weight: "demo", dimensions: "demo", shippingEstimate: "demo" },
      missingFields: [],
      warnings: ["Демо-товар: данные поставщика тестовые, рынок WB ищется через настоящий provider."],
      rawDebug: { urlTokens: ["pop", "it"], matchedTokens: ["pop"], providerErrors: [] },
    },
  },
];

const sourceLabels: Record<SupplierFieldSource, string> = {
  apify: "Apify",
  supplier_import: "Импорт",
  manual: "Ручной ввод",
  default: "по умолчанию",
  cbr: "ЦБ РФ",
  reserve: "резерв",
  wb_tariff: "тариф WB",
  wb_market: "рынок WB",
  wb_api: "WB API",
  mpstats: "MPStats",
  yandex_gpt: "YandexGPT",
  rule_based: "Правила",
  missing: "Не заполнено",
  demo: "Демо",
};

const sourceClasses: Record<SupplierFieldSource, string> = {
  apify: "bg-[var(--c-green-dim)] text-[var(--c-green)]",
  supplier_import: "bg-[var(--c-green-dim)] text-[var(--c-green)]",
  manual: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  default: "bg-[var(--c-bg3)] text-[var(--c-text3)]",
  cbr: "bg-[var(--c-green-dim)] text-[var(--c-green)]",
  reserve: "bg-[var(--c-bg3)] text-[var(--c-text3)]",
  wb_tariff: "bg-[var(--c-bg3)] text-[var(--c-text3)]",
  wb_market: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  wb_api: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  mpstats: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  yandex_gpt: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  rule_based: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
  missing: "bg-[var(--c-red-dim)] text-[var(--c-red)]",
  demo: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
};

type ExchangeRates = {
  USD: number;
  CNY: number;
  EUR: number;
  source: "cbr" | "reserve";
};

function currencyToRub(value: number | null, currency: SupplierCurrency | undefined, rates: ExchangeRates) {
  if (!value) return "";
  if (currency === "RUB") return String(Math.round(value));
  return String(Math.round(value * (rates[currency ?? "USD"] ?? rates.USD)));
}

function unitCostToRub(imported: SupplierImportResponse, rates: ExchangeRates) {
  const unitCost = imported.product?.unitCost;
  if (!unitCost) return "";
  return currencyToRub(unitCost, imported.product?.currency, rates);
}

function bestTier(tiers: SupplierPriceTier[], quantity: number) {
  return tiers.find((tier) => quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) ?? tiers[0];
}

function initialFields(): CalculatorFields {
  return {
    productTitle: "",
    supplierName: "",
    productCostRub: "",
    plannedSellingPrice: "",
    commissionRate: "15",
    logisticsEstimate: "",
    packagingCost: "",
    supplierDeliveryCost: "",
    storageCost: "20",
    returnReservePercent: "5",
    taxPercent: "6",
    adBudgetPercent: "10",
    weight: "",
    dimensions: "",
    selectedQuantity: "100",
    exchangeRate: "90",
  };
}

function canCalculate(fields: CalculatorFields) {
  return Boolean(
    Number(fields.productCostRub) > 0 &&
      Number(fields.plannedSellingPrice) > 0 &&
      Number(fields.commissionRate) > 0 &&
      Number(fields.logisticsEstimate) > 0 &&
      Number(fields.packagingCost) > 0,
  );
}

function formatDimensions(dimensions: Dimensions | null | undefined) {
  if (!dimensions?.length || !dimensions.width || !dimensions.height) return "";
  return `${dimensions.length} x ${dimensions.width} x ${dimensions.height}`;
}

function parseDimensionsText(value: string): Dimensions | null {
  const parts = value
    .replace(/,/g, ".")
    .split(/[xх*×\s]+/i)
    .map(Number)
    .filter((part) => Number.isFinite(part) && part > 0);
  if (parts.length < 3) return null;
  return { length: parts[0], width: parts[1], height: parts[2], unit: "cm" };
}

function estimateWbLogistics(weightKg: number, dimensionsText = "") {
  const sides = dimensionsText
    .replace(/,/g, ".")
    .split(/[xх*×\s]+/i)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (sides.some((side) => side > 120)) return 350;
  if (weightKg > 5) return 180;
  if (weightKg > 1) return 125;
  if (weightKg > 0.5) return 90;
  return 65;
}

function defaultPackaging(weightKg: number) {
  if (weightKg > 2) return 80;
  if (weightKg > 0.5) return 50;
  return 30;
}

function estimateCommission(title = "", category = "") {
  const text = `${title} ${category}`.toLowerCase();
  if (/одеж|куртк|плать|брюк|футбол|пухов/.test(text)) return 22;
  if (/обув|кроссов|ботин|сапог/.test(text)) return 20;
  if (/электрон|науш|телефон|кабел|гаджет/.test(text)) return 12;
  if (/красот|космет|уход|makeup|beauty/.test(text)) return 17;
  if (/дом|декор|кухн|интерьер/.test(text)) return 17;
  if (/игруш|toy/.test(text)) return 17;
  if (/спорт|fitness|тренаж/.test(text)) return 17;
  if (/авто|car/.test(text)) return 12;
  if (/канц|офис|marker|маркер|ручк|карандаш|posca|paint marker/.test(text)) return 15;
  return 15;
}

function defaultSellingPrice(productCostRub: number) {
  return productCostRub > 0 ? Math.round(productCostRub * 3.5) : "";
}

function marketDifficultyLabel(value: string | null | undefined) {
  if (value === "high") return "высокая";
  if (value === "medium") return "средняя";
  if (value === "low") return "низкая";
  return "неизвестно";
}

function getCachedExchangeRates(): ExchangeRates {
  if (typeof window === "undefined") return { USD: 90, CNY: 12.5, EUR: 98, source: "reserve" };
  try {
    const cached = JSON.parse(window.localStorage.getItem("sellermap:cbr-rates") ?? "null") as (ExchangeRates & { fetchedAt: number }) | null;
    if (cached && Date.now() - cached.fetchedAt < 4 * 60 * 60 * 1000) return cached;
  } catch {
    // ignore cache parse errors
  }
  return { USD: 90, CNY: 12.5, EUR: 98, source: "reserve" };
}

export function ProductCheckForm() {
  const router = useRouter();
  const [state, setState] = useState<CheckPageState>("empty");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [imported, setImported] = useState<SupplierImportResponse | null>(null);
  const [fields, setFields] = useState<CalculatorFields>(initialFields);
  const [fieldSources, setFieldSources] = useState<Record<string, SupplierFieldSource>>({});
  const [error, setError] = useState("");
  const [economics, setEconomics] = useState<EconomicsResult | null>(null);
  const [marketTarget, setMarketTarget] = useState<MarketTarget | null>(null);
  const [manualCompetitors, setManualCompetitors] = useState<CompetitorProduct[]>([]);
  const [market, setMarket] = useState<MarketAnalysisResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [commission, setCommission] = useState<CommissionMatch | null>(null);
  const [draftId, setDraftId] = useState<string>("");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(getCachedExchangeRates);
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!Number(fields.productCostRub)) missing.push("себестоимость");
    if (!Number(fields.plannedSellingPrice)) missing.push("цена продажи");
    if (!Number(fields.commissionRate)) missing.push("комиссия");
    if (!Number(fields.logisticsEstimate)) missing.push("логистика");
    if (!Number(fields.packagingCost)) missing.push("упаковка");
    return missing;
  }, [fields]);
  const readyForEconomics = canCalculate(fields);
  const activeStep = imported?.product || state === "manual_mode" ? (marketTarget ? (readyForEconomics ? 4 : 3) : 2) : 1;

  useEffect(() => {
    const key = "sellermap:cbr-rates";
    if (exchangeRates.source === "cbr") return;

    fetch("https://www.cbr-xml-daily.ru/daily_json.js")
      .then((response) => response.json())
      .then((data) => {
        const next: ExchangeRates = {
          USD: Number(data?.Valute?.USD?.Value) || 90,
          CNY: Number(data?.Valute?.CNY?.Value) || 12.5,
          EUR: Number(data?.Valute?.EUR?.Value) || 98,
          source: "cbr",
        };
        window.localStorage.setItem(key, JSON.stringify({ ...next, fetchedAt: Date.now() }));
        setExchangeRates(next);
        setFieldSources((current) => ({ ...current, exchangeRate: "cbr" }));
      })
      .catch(() => {
        setFieldSources((current) => ({ ...current, exchangeRate: "reserve" }));
      });
  }, [exchangeRates.source]);

  function applyImportedData(data: SupplierImportResponse, sourceOverride?: SupplierFieldSource) {
    if (!data.product) return null;
    setImported(data);
    setSupplierUrl(data.product.supplierUrl || data.product.productUrl);

    const weight = data.product.weight ?? 0;
    const dimensions = formatDimensions(data.product.dimensions);
    const sourceCurrency = data.product.currency;
    const sourceCost = data.product.unitCost;
    const exchangeRate = sourceCurrency === "RUB" ? 1 : exchangeRates[sourceCurrency] ?? exchangeRates.USD;
    const productCostRub = Number(unitCostToRub(data, exchangeRates));
    const supplierDeliveryRub = data.product.shippingEstimate
      ? Math.round(data.product.shippingEstimate * exchangeRate)
      : "";
    const logisticsDefault = estimateWbLogistics(weight, dimensions);
    const packagingDefault = defaultPackaging(weight);
    const commissionDefault = estimateCommission(data.product.title ?? "", data.product.category ?? "");
    const plannedPriceDefault = productCostRub ? defaultSellingPrice(productCostRub) : "";
    const importedSource = sourceOverride ?? data.fieldSources.unitCost ?? "apify";

    setFieldSources({
      ...data.fieldSources,
      productTitle: sourceOverride ?? data.fieldSources.title ?? "apify",
      selectedQuantity: sourceOverride ?? data.fieldSources.moq ?? "apify",
      productCostRub: importedSource,
      exchangeRate: exchangeRates.source === "cbr" ? "cbr" : "reserve",
      supplierDeliveryCost: supplierDeliveryRub ? importedSource : "missing",
      logisticsEstimate: "wb_tariff",
      packagingCost: "default",
      plannedSellingPrice: plannedPriceDefault ? "default" : "missing",
      commissionRate: "wb_tariff",
      adBudgetPercent: "default",
      taxPercent: "default",
      returnReservePercent: "default",
      storageCost: "default",
    });

    setFieldNotes({
      productCostRub: sourceCost ? `${sourceCost} ${sourceCurrency} × ${exchangeRate.toFixed(2)}` : "",
      plannedSellingPrice: plannedPriceDefault ? "расчётный ориентир: себестоимость × 3.5" : "",
      logisticsEstimate: "оценка по тарифу WB, подтвердите в актуальном калькуляторе",
      packagingCost: "расчётный минимум",
      exchangeRate: exchangeRates.source === "cbr" ? "курс ЦБ РФ, кэш 4 часа" : "резервный курс",
      commissionRate: "локальная таблица комиссий WB",
    });

    setFields((current) => ({
      ...current,
      productTitle: data.product?.title ?? "",
      supplierName: data.product?.supplierName ?? "",
      productCostRub: productCostRub ? String(productCostRub) : "",
      plannedSellingPrice: plannedPriceDefault ? String(plannedPriceDefault) : "",
      commissionRate: String(commissionDefault),
      packagingCost: String(packagingDefault),
      supplierDeliveryCost: supplierDeliveryRub ? String(supplierDeliveryRub) : "",
      logisticsEstimate: String(logisticsDefault),
      weight: weight ? String(weight) : "",
      dimensions,
      selectedQuantity: String(data.product?.selectedQuantity ?? data.product?.moq ?? 100),
      exchangeRate: String(exchangeRate),
    }));

    const draft = createDraftFromImport(data);
    draft.product.productCostRub = productCostRub || null;
    draft.product.plannedSellingPrice = typeof plannedPriceDefault === "number" ? plannedPriceDefault : null;
    draft.product.packagingCost = packagingDefault;
    draft.product.supplierDeliveryCost = supplierDeliveryRub ? Number(supplierDeliveryRub) : null;
    draft.product.logisticsCost = logisticsDefault;
    draft.product.commissionPercent = commissionDefault;
    draft.product.exchangeRateToRub = exchangeRate;
    draft.fieldSources = {
      ...draft.fieldSources,
      productCostRub: importedSource,
      plannedSellingPrice: plannedPriceDefault ? "default" : "missing",
      packagingCost: "default",
      logisticsCost: "wb_tariff",
      commissionPercent: "wb_tariff",
      exchangeRateToRub: exchangeRates.source === "cbr" ? "cbr" : "reserve",
    };
    saveDraft(draft);
    setDraftId(draft.id);
    return draft;
  }

  function selectDemoProduct(data: SupplierImportResponse) {
    setError("");
    const draft = applyImportedData(data, "demo");
    setState("import_success");
    if (draft && data.product?.title) void lookupMarketByTitle(data.product.title, draft.id, { allowDirectFallback: true });
  }

  async function importSupplier(url = supplierUrl, mode: "replace" | "missing_only" = "replace") {
    if (!url.trim()) return;
    setState("validating_url");
    try {
      new URL(url);
    } catch {
      setError("Укажите корректную ссылку поставщика.");
      setState("import_failed");
      return;
    }
    setState("importing");
    setError("");

    try {
      const response = await fetch("/api/supplier/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as SupplierImportResponse & { error?: string };
      if (data.status === "blocked" || data.status === "not_configured") {
        setImported(data);
        setError(data.error ?? "Автоматический импорт не смог прочитать страницу поставщика.");
        setState("import_blocked");
        return;
      }
      if (data.status === "identity_mismatch") {
        setImported(data);
        setError(data.error ?? "Найденные данные не похожи на товар из ссылки.");
        setState("identity_mismatch");
        return;
      }
      if (!response.ok || data.status === "failed" || !data.product) {
        setError(data.error ?? "Не удалось импортировать данные поставщика.");
        setState("import_failed");
        return;
      }

      setImported(data);
      setSupplierUrl(data.product.supplierUrl || data.product.productUrl);
      const weight = data.product.weight ?? 0;
      const dimensions = formatDimensions(data.product.dimensions);
      const sourceCurrency = data.product.currency;
      const sourceCost = data.product.unitCost;
      const exchangeRate = sourceCurrency === "RUB" ? 1 : exchangeRates[sourceCurrency] ?? exchangeRates.USD;
      const productCostRub = Number(unitCostToRub(data, exchangeRates));
      const supplierDeliveryRub = data.product.shippingEstimate
        ? Math.round(data.product.shippingEstimate * exchangeRate)
        : "";
      const logisticsDefault = estimateWbLogistics(weight, dimensions);
      const packagingDefault = defaultPackaging(weight);
      const commissionDefault = estimateCommission(data.product.title ?? "", data.product.category ?? "");
      const plannedPriceDefault = productCostRub ? defaultSellingPrice(productCostRub) : "";

      setFieldSources({
        ...data.fieldSources,
        productTitle: data.fieldSources.title ?? "apify",
        selectedQuantity: data.fieldSources.moq ?? "apify",
        productCostRub: data.fieldSources.unitCost ?? "apify",
        exchangeRate: exchangeRates.source === "cbr" ? "cbr" : "reserve",
        supplierDeliveryCost: supplierDeliveryRub ? "apify" : "missing",
        logisticsEstimate: "wb_tariff",
        packagingCost: "default",
        plannedSellingPrice: plannedPriceDefault ? "default" : "missing",
        commissionRate: "wb_tariff",
        adBudgetPercent: "default",
        taxPercent: "default",
        returnReservePercent: "default",
        storageCost: "default",
      });

      setFieldNotes({
        productCostRub: sourceCost ? `${sourceCost} ${sourceCurrency} × ${exchangeRate.toFixed(2)}` : "",
        plannedSellingPrice: plannedPriceDefault ? "расчётный ориентир: себестоимость × 3.5" : "",
        logisticsEstimate: "оценка по тарифу WB, подтвердите в актуальном калькуляторе",
        packagingCost: "расчётный минимум",
        exchangeRate: exchangeRates.source === "cbr" ? "курс ЦБ РФ, кэш 4 часа" : "резервный курс",
        commissionRate: "локальная таблица комиссий WB",
      });

      const mapped: Partial<CalculatorFields> = {
        productTitle: data.product.title ?? "",
        supplierName: data.product.supplierName ?? "",
        productCostRub: productCostRub ? String(productCostRub) : "",
        plannedSellingPrice: plannedPriceDefault ? String(plannedPriceDefault) : "",
        commissionRate: String(commissionDefault),
        packagingCost: String(packagingDefault),
        supplierDeliveryCost: supplierDeliveryRub ? String(supplierDeliveryRub) : "",
        logisticsEstimate: String(logisticsDefault),
        weight: weight ? String(weight) : "",
        dimensions,
        selectedQuantity: String(data.product.selectedQuantity ?? data.product.moq ?? 100),
        exchangeRate: String(exchangeRate),
      };

      setFields((current) => {
        if (mode === "missing_only") {
          return Object.fromEntries(
            Object.entries(current).map(([key, value]) => [
              key,
              value || mapped[key as keyof CalculatorFields] || value,
            ]),
          ) as CalculatorFields;
        }
        return { ...current, ...mapped };
      });
      const draft = createDraftFromImport(data);
      draft.product.productCostRub = productCostRub || null;
      draft.product.plannedSellingPrice = typeof plannedPriceDefault === "number" ? plannedPriceDefault : null;
      draft.product.packagingCost = packagingDefault;
      draft.product.supplierDeliveryCost = supplierDeliveryRub ? Number(supplierDeliveryRub) : null;
      draft.product.logisticsCost = logisticsDefault;
      draft.product.commissionPercent = commissionDefault;
      draft.product.exchangeRateToRub = exchangeRate;
      draft.fieldSources = {
        ...draft.fieldSources,
        productCostRub: "apify",
        plannedSellingPrice: plannedPriceDefault ? "default" : "missing",
        packagingCost: "default",
        logisticsCost: "wb_tariff",
        commissionPercent: "wb_tariff",
        exchangeRateToRub: exchangeRates.source === "cbr" ? "cbr" : "reserve",
      };
      saveDraft(draft);
      setDraftId(draft.id);
      void fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          supplier_url: data.product.supplierUrl || data.product.productUrl,
          supplier_platform: data.source,
          supplier_name: data.product.supplierName,
          product_title: data.product.title,
          moq: data.product.moq,
          unit_cost_usd: data.product.unitCost,
          currency: data.product.currency,
          weight_kg: data.product.weight,
          dimensions,
          shipping_estimate_usd: data.product.shippingEstimate,
          images: data.product.productImages,
          price_tiers: data.product.priceTiers,
          specs: data.product.specifications,
        }),
      });
      void lookupMarketByTitle(data.product.title ?? "", draft.id);
      setState(data.status === "success" ? "import_success" : "import_partial");
    } catch {
      setError("Поставщик не ответил. Попробуйте ещё раз или введите данные вручную.");
      setState("import_failed");
    }
  }

  async function lookupMarketByTitle(title: string, currentDraftId?: string, options: { allowDirectFallback?: boolean } = {}) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setMarketLoading(true);
    try {
      const keywordResponse = await fetch("/api/check/extract-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle }),
      });
      const keywordData = (await keywordResponse.json()) as { keyword?: string };
      const keyword = keywordData.keyword?.trim() || cleanTitle.split(/\s+/).slice(0, 4).join(" ");
      const target: MarketTarget = { mode: "keyword", keyword, source: "generated" };
      setMarketTarget(target);
      if (currentDraftId) updateMarketTarget(currentDraftId, target);

      const marketResponse = await fetch("/api/market/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, allowDirectFallback: options.allowDirectFallback }),
      });
      const nextMarket = (await marketResponse.json()) as MarketAnalysisResult;
      setMarket(nextMarket);
      if (currentDraftId) updateMarketAnalysis(currentDraftId, nextMarket);

      const medianPrice = nextMarket.marketStats?.medianPrice;
      if (medianPrice && fieldSources.plannedSellingPrice !== "manual") {
        setFields((current) => ({ ...current, plannedSellingPrice: String(medianPrice) }));
        setFieldSources((current) => ({ ...current, plannedSellingPrice: "wb_market" }));
        setFieldNotes((current) => ({ ...current, plannedSellingPrice: "предложение рынка: медиана WB" }));
        if (currentDraftId) updateDraftField(currentDraftId, "plannedSellingPrice", medianPrice, "wb_market");
      }
    } catch {
      setMarket({
        provider: "none",
        status: "failed",
        competitors: [],
        marketStats: null,
        warnings: ["Автоматический поиск похожих товаров WB не выполнен. Можно продолжить с экономикой или добавить конкурентов вручную."],
      });
    } finally {
      setMarketLoading(false);
    }
  }

  async function reimportSupplier() {
    const choice = window.prompt(
      "Как обновить данные? Введите 1 — только пустые поля, 2 — перезаписать автополя, 3 — отмена.",
      "1",
    );
    if (choice === "1") await importSupplier(supplierUrl, "missing_only");
    if (choice === "2") await importSupplier(supplierUrl, "replace");
  }

  function updateField(key: keyof CalculatorFields, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if ((key === "weight" || key === "dimensions") && fieldSources.logisticsEstimate !== "manual") {
        const weight = Number(key === "weight" ? value : current.weight);
        if (Number.isFinite(weight) && weight > 0) next.logisticsEstimate = String(estimateWbLogistics(weight, key === "dimensions" ? value : current.dimensions));
      }
      if (key === "weight" && fieldSources.packagingCost !== "manual") {
        const weight = Number(value);
        if (Number.isFinite(weight) && weight > 0) next.packagingCost = String(defaultPackaging(weight));
      }
      return next;
    });
    setFieldSources((current) => ({
      ...current,
      [key]: "manual",
      ...((key === "weight" || key === "dimensions") && current.logisticsEstimate !== "manual" ? { logisticsEstimate: "wb_tariff" as SupplierFieldSource } : {}),
      ...(key === "weight" && current.packagingCost !== "manual" ? { packagingCost: "default" as SupplierFieldSource } : {}),
    }));
    setFieldNotes((current) => ({ ...current, [key]: "" }));
  }

  function updateQuantity(value: string) {
    updateField("selectedQuantity", value);
    if (!imported?.product) return;
    const tier = bestTier(imported.product.priceTiers, Number(value));
    if (!tier) return;
    const rubValue =
      tier.currency === "RUB" ? Math.round(tier.price) : Math.round(tier.price * Number(fields.exchangeRate || (tier.currency === "CNY" ? 12.5 : tier.currency === "EUR" ? 98 : 90)));
    updateField("productCostRub", String(rubValue));
  }

  async function chooseMarketTarget(target: MarketTarget) {
    setMarketTarget(target);
    if (draftId) updateMarketTarget(draftId, target);
    if (target.mode === "skip") {
      setMarket(null);
      return;
    }
    setMarketLoading(true);
    try {
      const response = await fetch("/api/market/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, manualCompetitors }),
      });
      const nextMarket = await response.json() as MarketAnalysisResult;
      setMarket(nextMarket);
      if (draftId) updateMarketAnalysis(draftId, nextMarket);
      const medianPrice = nextMarket.marketStats?.medianPrice;
      if (medianPrice && fieldSources.plannedSellingPrice !== "manual") {
        setFields((current) => ({ ...current, plannedSellingPrice: String(medianPrice) }));
        setFieldSources((current) => ({ ...current, plannedSellingPrice: "wb_market" }));
        setFieldNotes((current) => ({ ...current, plannedSellingPrice: "предложение рынка: медиана WB" }));
        if (draftId) updateDraftField(draftId, "plannedSellingPrice", medianPrice, "wb_market");
      }
    } catch {
      setMarket({
        provider: "none",
        status: "failed",
        competitors: [],
        marketStats: null,
        warnings: ["Не удалось получить данные конкурентов. Добавьте конкурентов вручную или продолжайте только с экономикой."],
      });
    } finally {
      setMarketLoading(false);
    }
  }

  async function refreshManualMarket(nextCompetitors: CompetitorProduct[]) {
    setManualCompetitors(nextCompetitors);
    if (nextCompetitors.length === 0) return;
    const response = await fetch("/api/market/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: { mode: "manual", source: "manual" },
        manualCompetitors: nextCompetitors,
      }),
    });
    setMarket(await response.json());
    setMarketTarget({ mode: "manual", source: "manual" });
  }

  function applyCommission(match: CommissionMatch) {
    setCommission(match);
    updateField("commissionRate", String(match.commissionPercent));
    setFieldSources((current) => ({ ...current, commissionPercent: match.source === "wb_api" ? "wb_api" : "manual" }));
  }

  useEffect(() => {
    if (!canCalculate(fields)) return;

    const controller = new AbortController();
    fetch("/api/economics/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        sellingPrice: Number(fields.plannedSellingPrice),
        productCostRub: Number(fields.productCostRub),
        currency: "RUB",
        packagingCost: Number(fields.packagingCost),
        supplierDeliveryCost: Number(fields.supplierDeliveryCost || 0),
        commissionPercent: Number(fields.commissionRate),
        wbLogisticsCost: Number(fields.logisticsEstimate),
        storageCost: Number(fields.storageCost || 0),
        returnReservePercent: Number(fields.returnReservePercent || 0),
        taxPercent: Number(fields.taxPercent || 0),
        adBudgetPercent: Number(fields.adBudgetPercent || 0),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setEconomics(data.error ? null : data);
        if (!data.error) setState("ready_to_calculate");
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [fields]);

  function continueToResult() {
    if (!Number(fields.productCostRub)) {
      setError("Укажите себестоимость товара. Без неё расчёт невозможен.");
      setFieldSources((current) => ({ ...current, productCostRub: "missing" }));
      return;
    }

    let finalFields = fields;
    if (!Number(fields.plannedSellingPrice)) {
      const fallbackPrice =
        market?.marketStats?.medianPrice ??
        defaultSellingPrice(Number(fields.productCostRub));
      if (fallbackPrice) {
        finalFields = { ...fields, plannedSellingPrice: String(fallbackPrice) };
        setFields(finalFields);
        setFieldSources((current) => ({ ...current, plannedSellingPrice: market?.marketStats?.medianPrice ? "wb_market" : "default" }));
        setFieldNotes((current) => ({
          ...current,
          plannedSellingPrice: market?.marketStats?.medianPrice ? "предложение рынка: медиана WB" : "расчётный ориентир: себестоимость × 3.5",
        }));
        setError("Цена установлена по медиане рынка — вы можете изменить её.");
      }
    }

    let nextDraftId = draftId;
    const importForDraft =
      imported?.product
        ? imported
        : ({
            source: "generic_supplier",
            provider: "manual",
            status: "partial",
            confidence: 0.4,
            product: {
              title: fields.productTitle || "Товар",
              supplierName: fields.supplierName || null,
              supplierUrl,
              productUrl: supplierUrl,
              productImages: [],
              priceTiers: [],
              moq: Number(fields.selectedQuantity) || null,
              selectedQuantity: Number(fields.selectedQuantity) || null,
              unitCost: Number(fields.productCostRub) || null,
              currency: "RUB",
              variants: [],
              specifications: {},
              weight: Number(fields.weight) || null,
              dimensions: null,
              shippingEstimate: Number(fields.supplierDeliveryCost) || null,
              leadTime: null,
            },
            fieldSources,
            missingFields: missingRequired,
            warnings: ["Данные введены вручную."],
            rawDebug: { urlTokens: [], matchedTokens: [], providerErrors: [] },
          } as SupplierImportResponse);
    if (importForDraft.product) {
      const draft = createDraftFromImport(importForDraft);
      if (nextDraftId) draft.id = nextDraftId;
      const parsedDimensions = parseDimensionsText(finalFields.dimensions);
      const nextEconomics = canCalculate(finalFields)
        ? calculateUnitEconomics({
            sellingPrice: Number(finalFields.plannedSellingPrice),
            productCostRub: Number(finalFields.productCostRub),
            currency: "RUB",
            packagingCost: Number(finalFields.packagingCost),
            supplierDeliveryCost: Number(finalFields.supplierDeliveryCost || 0),
            commissionPercent: Number(finalFields.commissionRate),
            wbLogisticsCost: Number(finalFields.logisticsEstimate),
            storageCost: Number(finalFields.storageCost || 0),
            returnReservePercent: Number(finalFields.returnReservePercent || 0),
            taxPercent: Number(finalFields.taxPercent || 0),
            adBudgetPercent: Number(finalFields.adBudgetPercent || 0),
          })
        : null;
      draft.product.title = finalFields.productTitle || draft.product.title;
      draft.product.supplierName = finalFields.supplierName || draft.product.supplierName;
      draft.product.selectedQuantity = Number(finalFields.selectedQuantity) || draft.product.selectedQuantity;
      draft.product.weight = Number(finalFields.weight) || null;
      draft.product.dimensions = parsedDimensions;
      draft.product.productCostRub = Number(finalFields.productCostRub) || null;
      draft.product.plannedSellingPrice = Number(finalFields.plannedSellingPrice) || null;
      draft.product.packagingCost = Number(finalFields.packagingCost) || null;
      draft.product.supplierDeliveryCost = Number(finalFields.supplierDeliveryCost) || null;
      draft.product.logisticsCost = Number(finalFields.logisticsEstimate) || null;
      draft.product.commissionPercent = Number(finalFields.commissionRate) || null;
      draft.product.exchangeRateToRub = Number(finalFields.exchangeRate) || null;
      draft.product.storageCost = Number(finalFields.storageCost) || 0;
      draft.product.taxPercent = Number(finalFields.taxPercent) || 0;
      draft.product.adBudgetPercent = Number(finalFields.adBudgetPercent) || 0;
      draft.product.returnReservePercent = Number(finalFields.returnReservePercent) || 0;
      draft.marketTarget = marketTarget;
      draft.market = market;
      draft.commission = commission;
      draft.economics = nextEconomics ?? economics;
      draft.missingFields = missingRequired;
      draft.fieldSources = fieldSources;
      saveDraft(draft);
      nextDraftId = draft.id;
      setDraftId(draft.id);
      window.localStorage.setItem("sellermap:lastDraftId", draft.id);
    }
    router.push(nextDraftId ? `/result/${nextDraftId}` : "/result");
  }

  const showForm = ["import_success", "import_partial", "manual_mode", "ready_to_calculate"].includes(state);

  return (
    <Card className="p-6 lg:p-8">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--c-text)] md:text-5xl">
          Проверь товар до закупки
        </h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[var(--c-text2)]">
          Рассчитайте реальную прибыль на WB/Ozon до того, как купите партию товара.
        </p>
      </div>

      <div className="mb-6 grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`rounded-lg border p-3 text-sm ${
              activeStep >= index + 1
                ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                : "border-[var(--c-border)] bg-[var(--c-bg2)] text-[var(--c-text3)]"
            }`}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--c-border2)] bg-[var(--c-bg2)] p-5 md:p-7">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-text3)]">
          Товар от поставщика
        </p>
        <div className="mb-4 inline-flex rounded-xl bg-[var(--c-bg3)] p-1">
          {["Alibaba", "AliExpress", "1688.com"].map((platform) => (
            <button
              key={platform}
              type="button"
              className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                supplierUrl.toLowerCase().includes(platform.toLowerCase().replace(".com", ""))
                  ? "border border-[var(--c-border2)] bg-[var(--c-bg2)] text-[var(--c-text)]"
                  : "text-[var(--c-text3)]"
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
        <label>
          <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">
            Вставьте ссылку Alibaba / 1688 / поставщика
          </span>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={supplierUrl}
              onChange={(event) => setSupplierUrl(event.target.value)}
              placeholder="https://www.alibaba.com/product-detail/..."
            />
            <Button type="button" onClick={() => importSupplier()} disabled={state === "importing"}>
              {state === "importing" ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />}
              Извлечь данные
            </Button>
          </div>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--c-text3)]">
          <span>Демо:</span>
          {demoImports.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => selectDemoProduct(item.data)}
              className="rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-1 font-semibold transition hover:border-[var(--c-border2)] hover:text-[var(--c-text)]"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setState("manual_mode");
            setFieldSources({});
          }}
          className="mt-3 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          Ввести вручную
        </button>
      </div>

      {(state === "validating_url" || state === "importing") && (
        <div className="mt-5 grid gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
          {loadingSteps.map((step) => (
            <p key={step} className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
              <Loader2 size={14} className="animate-spin text-[var(--c-green)]" />
              {step}
            </p>
          ))}
        </div>
      )}

      {state === "import_blocked" && (
        <FallbackState
          title="Автоматический импорт не смог прочитать страницу поставщика."
          text={error || "Apify или HTML/meta импорт недоступен для этой страницы."}
          onRetry={() => importSupplier()}
          onManual={() => setState("manual_mode")}
        />
      )}

      {state === "identity_mismatch" && (
        <FallbackState
          title="Найденные данные не похожи на товар из ссылки. Мы не применили эти данные."
          text={`URL tokens: ${imported?.rawDebug.urlTokens.join(", ") || "не найдены"}. Совпадения: ${imported?.rawDebug.matchedTokens.join(", ") || "нет"}.`}
          onRetry={() => importSupplier()}
          onManual={() => setState("manual_mode")}
        />
      )}

      {state === "import_failed" && (
        <div className="mt-5 rounded-xl border border-[var(--c-red)]/40 bg-[var(--c-red-dim)] p-4">
          <p className="flex items-center gap-2 font-semibold text-[var(--c-red)]">
            <AlertTriangle size={17} />
            {error || "Импорт не выполнен."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => importSupplier()}>
              Повторить
            </Button>
            <Button type="button" variant="secondary" onClick={() => setState("manual_mode")}>
              Ввести вручную
            </Button>
          </div>
        </div>
      )}

      {imported?.product && state !== "importing" && state !== "import_failed" && state !== "import_blocked" && state !== "identity_mismatch" && (
        <ImportedSummary imported={imported} />
      )}

      {(imported?.product || state === "manual_mode") && (
        <div className="mt-6 space-y-5">
          <p className="section-kicker border-t-0 pt-0">Платформа и налог</p>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Автопоиск похожих товаров WB</p>
                <p className="mt-1 text-xs text-[var(--c-text2)]">
                  SellerMap сам подбирает поисковый запрос и проверяет конкурентов через подключённый market provider.
                </p>
              </div>
              <span className="rounded-full bg-[var(--c-bg3)] px-3 py-1 text-xs font-semibold text-[var(--c-text2)]">
                {marketLoading ? "ищем..." : marketTarget?.keyword ? `ключ: ${marketTarget.keyword}` : "ожидает товара"}
              </span>
            </div>
            {marketLoading && (
              <p className="mt-3 flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <Loader2 size={14} className="animate-spin text-[var(--c-green)]" />
                Ищем похожие товары на WB и считаем медиану рынка.
              </p>
            )}
            {market && (
              <p className="mt-3 text-xs text-[var(--c-text3)]">
                Источник: {market.provider}. {market.warnings[0] ?? "Точные продажи показываются только если провайдер их возвращает."}
              </p>
            )}
          </div>
          <MarketTargetStep
            productTitle={fields.productTitle || imported?.product?.title || ""}
            specifications={imported?.product?.specifications}
            onSelect={chooseMarketTarget}
          />
          {market && market.status !== "success" && (
            <div className="rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-4 text-sm text-[var(--c-amber)]">
              Данные конкурентов недоступны: {market.warnings.join(" ") || "подключите MPStats или введите конкурентов вручную."}
            </div>
          )}
          <ManualCompetitorInput competitors={manualCompetitors} onChange={refreshManualMarket} />
          {market?.marketStats && (
            <div className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 md:grid-cols-4">
              <Metric label="Медиана рынка" value={market.marketStats.medianPrice ? formatRub(market.marketStats.medianPrice) : "—"} />
              <Metric label="Конкурентов" value={String(market.marketStats.competitorCount ?? 0)} />
              <Metric label="Барьер отзывов" value={String(market.marketStats.reviewBarrier ?? "—")} />
              <Metric label="Сложность" value={marketDifficultyLabel(market.marketStats.marketDifficulty)} />
            </div>
          )}
          <WbCategoryCommissionStep title={fields.productTitle} commissionPercent={fields.commissionRate} onChange={applyCommission} />
        </div>
      )}

      {showForm && (
        <div className="mt-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-4 text-sm text-[var(--c-amber)]">
              {error}
            </div>
          )}
          {missingRequired.length > 0 && (
            <div className="rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-4 text-sm text-[var(--c-amber)]">
              Добавьте недостающие поля для точного расчёта маржи: {missingRequired.join(", ")}.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Название товара" source={fieldSources.productTitle ?? fieldSources.title} note={fieldNotes.productTitle}>
              <Input value={fields.productTitle} onChange={(event) => updateField("productTitle", event.target.value)} />
            </Field>
            <Field label="Поставщик" source={fieldSources.supplierName} note={fieldNotes.supplierName}>
              <Input value={fields.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} />
            </Field>
            <Field label="Партия, шт." source={fieldSources.selectedQuantity ?? fieldSources.moq} note={fieldNotes.selectedQuantity}>
              <Input type="number" value={fields.selectedQuantity} onChange={(event) => updateQuantity(event.target.value)} />
            </Field>
            <Field label="Себестоимость товара, ₽/шт." source={fieldSources.productCostRub ?? fieldSources.unitCost} note={fieldNotes.productCostRub}>
              <Input type="number" value={fields.productCostRub} onChange={(event) => updateField("productCostRub", event.target.value)} />
            </Field>
            {imported?.product?.currency && imported.product.currency !== "RUB" && (
              <Field label={`${imported.product.currency}/RUB курс`} source={fieldSources.exchangeRate} note={fieldNotes.exchangeRate}>
                <Input type="number" value={fields.exchangeRate} onChange={(event) => updateField("exchangeRate", event.target.value)} />
              </Field>
            )}
            <Field label="Плановая цена WB, ₽" source={fieldSources.plannedSellingPrice} note={fieldNotes.plannedSellingPrice}>
              <Input type="number" value={fields.plannedSellingPrice} onChange={(event) => updateField("plannedSellingPrice", event.target.value)} />
            </Field>
            <Field label="Комиссия WB, %" source={fieldSources.commissionRate} note={fieldNotes.commissionRate}>
              <Input type="number" value={fields.commissionRate} onChange={(event) => updateField("commissionRate", event.target.value)} />
            </Field>
            <Field label="Логистика WB, ₽/шт." source={fieldSources.logisticsEstimate} note={fieldNotes.logisticsEstimate}>
              <Input type="number" value={fields.logisticsEstimate} onChange={(event) => updateField("logisticsEstimate", event.target.value)} />
            </Field>
            <Field label="Упаковка, ₽/шт." source={fieldSources.packagingCost} note={fieldNotes.packagingCost}>
              <Input type="number" value={fields.packagingCost} onChange={(event) => updateField("packagingCost", event.target.value)} />
            </Field>
            <Field label="Доставка поставщика, ₽/шт." source={fieldSources.supplierDeliveryCost ?? fieldSources.shippingEstimate} note={fieldNotes.supplierDeliveryCost}>
              <Input type="number" value={fields.supplierDeliveryCost} onChange={(event) => updateField("supplierDeliveryCost", event.target.value)} />
            </Field>
            <Field label="Вес, кг" source={fieldSources.weight} note={fieldNotes.weight}>
              <Input type="number" value={fields.weight} onChange={(event) => updateField("weight", event.target.value)} />
            </Field>
            <Field label="Габариты упаковки, см" source={fieldSources.dimensions} note={fieldNotes.dimensions || "для расчёта логистики и хранения WB, не размер самого товара"}>
              <Input value={fields.dimensions} onChange={(event) => updateField("dimensions", event.target.value)} placeholder="30 x 20 x 8" />
            </Field>
            <Field label="Реклама, % от цены" source={fieldSources.adBudgetPercent} note={fieldNotes.adBudgetPercent}>
              <Input type="number" value={fields.adBudgetPercent} onChange={(event) => updateField("adBudgetPercent", event.target.value)} />
            </Field>
          </div>

          {imported?.product?.priceTiers.length ? (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
              <p className="text-sm font-semibold">Ценовые уровни поставщика</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {imported.product.priceTiers.map((tier) => (
                  <div key={`${tier.minQty}-${tier.maxQty ?? "plus"}`} className="rounded-lg bg-[var(--c-bg2)] p-3 text-sm">
                    <p className="font-semibold">
                      {tier.minQty}–{tier.maxQty ?? "∞"} шт.
                    </p>
                    <p className="mt-1 text-[var(--c-green)]">
                      {tier.price} {tier.currency}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {readyForEconomics && economics ? (
            <div className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4 md:grid-cols-4">
              <Metric label="Прибыль / шт." value={formatRub(economics.profitPerUnit)} />
              <Metric label="Маржа" value={`${economics.marginPercent}%`} />
              <Metric label="Безубыточность" value={formatRub(economics.breakEvenPrice)} />
              <Metric label="Безопасная цена" value={`${formatRub(economics.safePriceMin)}–${formatRub(economics.safePriceMax)}`} />
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4 text-sm text-[var(--c-text2)]">
              Калькулятор маржи появится после заполнения себестоимости, цены продажи, комиссии, логистики и упаковки.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={continueToResult} disabled={!canCalculate(fields)}>
              <CheckCircle2 size={16} />
              Сформировать решение
            </Button>
            <Button type="button" variant="secondary" onClick={reimportSupplier} disabled={!supplierUrl}>
              <RefreshCw size={16} />
              Повторно импортировать
            </Button>
            <Button type="button" variant="secondary" onClick={() => setState("manual_mode")}>
              Ввести вручную
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ImportedSummary({ imported }: { imported: SupplierImportResponse }) {
  if (!imported.product) return null;
  const image = imported.product.productImages[0];
  return (
    <div className="mt-5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="grid gap-4 md:grid-cols-[96px_1fr]">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-[var(--c-bg3)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="text-[var(--c-text3)]" />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-green)]">
            {imported.source} · {imported.provider} · уверенность {Math.round(imported.confidence * 100)}%
          </p>
          <h2 className="font-display mt-2 text-xl font-semibold">{imported.product.title || "Название не найдено"}</h2>
          <p className="mt-2 text-sm text-[var(--c-text2)]">
            {imported.product.supplierName || "Поставщик не найден"} · MOQ {imported.product.moq ?? "не найден"} · партия {imported.product.selectedQuantity ?? "не выбрана"} шт. ·{" "}
            {imported.product.unitCost ? `${imported.product.unitCost} ${imported.product.currency}` : "цена не найдена"}
          </p>
          {imported.product.productImages.length > 0 && (
            <p className="mt-2 text-xs text-[var(--c-amber)]">
              Изображение поставщика — требуется проверка WB. Не загружено на WB.
            </p>
          )}
          {imported.warnings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imported.warnings.map((warning) => (
                <span key={warning} className="rounded-full bg-[var(--c-amber-dim)] px-3 py-1 text-xs text-[var(--c-amber)]">
                  {warning}
                </span>
              ))}
            </div>
          )}
          {imported.missingFields.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--c-amber-dim)] px-3 py-2 text-sm text-[var(--c-amber)]">
              <Package size={15} />
              Не найдены: {imported.missingFields.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FallbackState({
  title,
  text,
  onRetry,
  onManual,
}: {
  title: string;
  text: string;
  onRetry: () => void;
  onManual: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-4">
      <p className="flex items-center gap-2 font-semibold text-[var(--c-amber)]">
        <AlertTriangle size={17} />
        {title}
      </p>
      <p className="mt-2 text-sm text-[var(--c-text2)]">{text}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FallbackCard title="Вставить HTML страницы" text="Если Alibaba блокирует импорт, откройте страницу, скопируйте HTML и вставьте его в следующем шаге." />
        <FallbackCard title="Загрузить скриншоты" text="Подготовлено для OCR/AI: название, цена, MOQ, характеристики и доставка." />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onRetry}>
          Попробовать снова
        </Button>
        <Button type="button" variant="secondary" onClick={onManual}>
          Ввести вручную
        </Button>
      </div>
    </div>
  );
}

function FallbackCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-3">
      <p className="font-semibold text-[var(--c-text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--c-text2)]">{text}</p>
    </div>
  );
}

function Field({
  label,
  source,
  note,
  children,
}: {
  label: string;
  source?: SupplierFieldSource;
  note?: string;
  children: React.ReactNode;
}) {
  const effectiveSource = source ?? "missing";
  return (
    <label>
      <span className="mb-2 flex items-center justify-between gap-2 text-sm font-medium text-[var(--c-text)]">
        {label}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceClasses[effectiveSource]}`}>
          {sourceLabels[effectiveSource]}
        </span>
      </span>
      {children}
      {note ? <span className="mt-1 block text-xs text-[var(--c-text3)]">{note}</span> : null}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg2)] p-3">
      <p className="text-xs font-semibold text-[var(--c-text3)]">{label}</p>
      <p className="font-display mt-1 text-lg font-semibold text-[var(--c-green)] tabular">{value}</p>
    </div>
  );
}
