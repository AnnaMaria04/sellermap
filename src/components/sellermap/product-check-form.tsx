"use client";

import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Package, RefreshCw, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EconomicsResult } from "@/lib/economics/calculateEconomics";
import type { SupplierFieldSource, SupplierImportResponse, SupplierPriceTier } from "@/lib/integrations/suppliers/types";
import { createDraftFromImport, saveDraft } from "@/services/draftStorage";
import { formatRub } from "@/lib/utils";

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

const sourceLabels: Record<SupplierFieldSource, string> = {
  apify: "Apify",
  supplier_import: "Импорт",
  manual: "Ручной ввод",
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
  wb_api: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  mpstats: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  yandex_gpt: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
  rule_based: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
  missing: "bg-[var(--c-red-dim)] text-[var(--c-red)]",
  demo: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
};

function usdToRub(value: number | null) {
  return value ? Math.round(value * 92) : "";
}

function cnyToRub(value: number | null) {
  return value ? Math.round(value * 12.8) : "";
}

function unitCostToRub(imported: SupplierImportResponse) {
  const unitCost = imported.product?.unitCost;
  if (!unitCost) return "";
  if (imported.product?.currency === "USD") return String(usdToRub(unitCost));
  if (imported.product?.currency === "CNY") return String(cnyToRub(unitCost));
  return String(Math.round(unitCost));
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

export function ProductCheckForm() {
  const router = useRouter();
  const [state, setState] = useState<CheckPageState>("empty");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [imported, setImported] = useState<SupplierImportResponse | null>(null);
  const [fields, setFields] = useState<CalculatorFields>(initialFields);
  const [fieldSources, setFieldSources] = useState<Record<string, SupplierFieldSource>>({});
  const [error, setError] = useState("");
  const [economics, setEconomics] = useState<EconomicsResult | null>(null);

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
      setFieldSources(data.fieldSources);
      const mapped: Partial<CalculatorFields> = {
        productTitle: data.product.title ?? "",
        supplierName: data.product.supplierName ?? "",
        productCostRub: unitCostToRub(data),
        supplierDeliveryCost: data.product.shippingEstimate ? String(data.product.shippingEstimate) : "",
        logisticsEstimate: data.product.shippingEstimate ? String(data.product.shippingEstimate) : "",
        weight: data.product.weight ? String(data.product.weight) : "",
        dimensions: data.product.dimensions
          ? [data.product.dimensions.length, data.product.dimensions.width, data.product.dimensions.height].filter(Boolean).join(" x ")
          : "",
        selectedQuantity: String(data.product.selectedQuantity ?? data.product.moq ?? 100),
        exchangeRate: data.product.currency === "CNY" ? "12.5" : data.product.currency === "USD" ? "90" : "1",
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
      setState(data.status === "success" ? "import_success" : "import_partial");
    } catch {
      setError("Поставщик не ответил. Попробуйте ещё раз или введите данные вручную.");
      setState("import_failed");
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
    setFields((current) => ({ ...current, [key]: value }));
    setFieldSources((current) => ({ ...current, [key]: "manual" }));
  }

  function updateQuantity(value: string) {
    updateField("selectedQuantity", value);
    if (!imported?.product) return;
    const tier = bestTier(imported.product.priceTiers, Number(value));
    if (!tier) return;
    const rubValue =
      tier.currency === "RUB" ? Math.round(tier.price) : Math.round(tier.price * Number(fields.exchangeRate || (tier.currency === "CNY" ? 12.5 : 90)));
    updateField("productCostRub", String(rubValue));
  }

  useEffect(() => {
    if (!canCalculate(fields)) return;

    const controller = new AbortController();
    fetch("/api/wb/economics/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        sellingPrice: Number(fields.plannedSellingPrice),
        productCost: Number(fields.productCostRub),
        currency: "RUB",
        packagingCost: Number(fields.packagingCost),
        supplierDeliveryCost: Number(fields.supplierDeliveryCost || 0),
        commissionPercent: Number(fields.commissionRate),
        logisticsCost: Number(fields.logisticsEstimate),
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
    let draftId = "";
    if (imported?.product) {
      const draft = createDraftFromImport(imported);
      draft.product.productCostRub = Number(fields.productCostRub) || null;
      draft.product.plannedSellingPrice = Number(fields.plannedSellingPrice) || null;
      draft.product.packagingCost = Number(fields.packagingCost) || null;
      draft.product.supplierDeliveryCost = Number(fields.supplierDeliveryCost) || null;
      draft.product.logisticsCost = Number(fields.logisticsEstimate) || null;
      draft.product.commissionPercent = Number(fields.commissionRate) || null;
      draft.product.exchangeRateToRub = Number(fields.exchangeRate) || null;
      draft.economics = economics;
      saveDraft(draft);
      draftId = draft.id;
    }
    const params = new URLSearchParams({
      supplierUrl,
      name: fields.productTitle || imported?.product?.title || "Товар поставщика",
      cost: fields.productCostRub,
      price: fields.plannedSellingPrice,
      packaging: fields.packagingCost,
      supplierShipping: fields.supplierDeliveryCost,
      moq: fields.selectedQuantity,
      weight: fields.weight,
      dimensions: fields.dimensions,
    });
    if (draftId) params.set("draftId", draftId);
    router.push(`/result?${params.toString()}`);
  }

  const showForm = ["import_success", "import_partial", "manual_mode", "ready_to_calculate"].includes(state);

  return (
    <Card className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--c-text)]">
          Проверка товара
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--c-text2)]">
          Начните со ссылки поставщика. SellerMap подготовит черновик экономики, а затем сравнит товар с рынком WB.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
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
              Импортировать и проанализировать
            </Button>
          </div>
        </label>
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

      {showForm && (
        <div className="mt-6 space-y-5">
          {missingRequired.length > 0 && (
            <div className="rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-4 text-sm text-[var(--c-amber)]">
              Добавьте недостающие поля для точного расчёта маржи: {missingRequired.join(", ")}.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Название товара" source={fieldSources.title ?? fieldSources.productTitle}>
              <Input value={fields.productTitle} onChange={(event) => updateField("productTitle", event.target.value)} />
            </Field>
            <Field label="Поставщик" source={fieldSources.supplierName}>
              <Input value={fields.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} />
            </Field>
            <Field label="Партия, шт." source={fieldSources.moq}>
              <Input type="number" value={fields.selectedQuantity} onChange={(event) => updateQuantity(event.target.value)} />
            </Field>
            <Field label="Себестоимость товара, ₽/шт." source={fieldSources.unitCost}>
              <Input type="number" value={fields.productCostRub} onChange={(event) => updateField("productCostRub", event.target.value)} />
            </Field>
            {imported?.product?.currency && imported.product.currency !== "RUB" && (
              <Field label={`${imported.product.currency}/RUB курс`} source="manual">
                <Input type="number" value={fields.exchangeRate} onChange={(event) => updateField("exchangeRate", event.target.value)} />
              </Field>
            )}
            <Field label="Плановая цена WB, ₽" source={fieldSources.manual}>
              <Input type="number" value={fields.plannedSellingPrice} onChange={(event) => updateField("plannedSellingPrice", event.target.value)} />
            </Field>
            <Field label="Комиссия WB, %" source={fieldSources.manual}>
              <Input type="number" value={fields.commissionRate} onChange={(event) => updateField("commissionRate", event.target.value)} />
            </Field>
            <Field label="Логистика WB, ₽/шт." source={fieldSources.shippingEstimate}>
              <Input type="number" value={fields.logisticsEstimate} onChange={(event) => updateField("logisticsEstimate", event.target.value)} />
            </Field>
            <Field label="Упаковка, ₽/шт." source={fieldSources.manual}>
              <Input type="number" value={fields.packagingCost} onChange={(event) => updateField("packagingCost", event.target.value)} />
            </Field>
            <Field label="Доставка поставщика, ₽/шт." source={fieldSources.shippingEstimate}>
              <Input type="number" value={fields.supplierDeliveryCost} onChange={(event) => updateField("supplierDeliveryCost", event.target.value)} />
            </Field>
            <Field label="Вес, кг" source={fieldSources.weight}>
              <Input type="number" value={fields.weight} onChange={(event) => updateField("weight", event.target.value)} />
            </Field>
            <Field label="Габариты, см" source={fieldSources.dimensions}>
              <Input value={fields.dimensions} onChange={(event) => updateField("dimensions", event.target.value)} placeholder="30 x 20 x 8" />
            </Field>
            <Field label="Реклама, % от цены" source={fieldSources.manual}>
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
              Перейти к проверке рынка WB
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
  children,
}: {
  label: string;
  source?: SupplierFieldSource;
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
