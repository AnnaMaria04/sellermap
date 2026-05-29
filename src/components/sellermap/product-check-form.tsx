"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Loader2,
  Package,
  RefreshCw,
  Upload,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { parseWbUrl } from "@/lib/parseWbUrl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRub } from "@/lib/utils";

/* ─── Schema ─────────────────────────────────────────────── */

const schema = z.object({
  // Step 1 – supplier / product basics
  productUrl: z.string().optional(),
  productName: z.string().min(2, "Укажите название товара для анализа."),
  category: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  packagingCost: z.coerce.number().min(0).optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  // Step 2 – market / logistics
  marketCommission: z.coerce.number().min(0).max(100).optional(),
  logistics: z.coerce.number().min(0).optional(),
  adsReserve: z.coerce.number().min(0).optional(),
  returnReserve: z.coerce.number().min(0).optional(),
  // Step 3 – competitors (free text, optional)
  competitorUrls: z.string().optional(),
  competitorNotes: z.string().optional(),
  // Step 4 – review (read-only summary, no extra fields)
});

type FormValues = z.input<typeof schema>;

type WbPreview = {
  nmId: number;
  name: string;
  brand?: string;
  category?: string;
  price?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
};

type WbConnStatus = "idle" | "loading" | "ok" | "error";

/* ─── Step labels ─────────────────────────────────────────── */

const STEPS = [
  "Товар",
  "Рынок",
  "Конкуренты",
  "Итог",
] as const;

/* ─── Component ───────────────────────────────────────────── */

export function ProductCheckForm() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0-3
  const [preview, setPreview] = useState<WbPreview | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [wbStatus, setWbStatus] = useState<WbConnStatus>("idle");

  const {
    register,
    setValue,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: "Дорожный органайзер для косметики, складной",
      category: "Аксессуары для путешествий",
      purchaseCost: 900,
      sellingPrice: 2490,
      packagingCost: 95,
      marketCommission: 15,
      logistics: 238,
      adsReserve: 300,
      returnReserve: 135,
    },
  });

  /* ── WB URL auto-fill ──────────────────────────────────── */
  const productUrl = register("productUrl");

  async function handleUrlChange(value: string) {
    const nmId = parseWbUrl(value);
    if (!nmId) return;
    setUrlLoading(true);
    try {
      const res = await fetch(`/api/wb-product?nm=${nmId}`);
      const data = await res.json();
      if (!data.error) {
        setValue("productName", data.name);
        setValue("category", data.category);
        if (typeof data.price === "number") setValue("sellingPrice", data.price);
        setPreview(data);
      }
    } finally {
      setUrlLoading(false);
    }
  }

  /* ── WB API connection test ────────────────────────────── */
  async function checkWbConnection() {
    setWbStatus("loading");
    try {
      const res = await fetch("/api/wb-product?nm=123456789");
      if (res.status === 200 || res.status === 404) {
        // 404 means API reached but product not found — connection works
        setWbStatus("ok");
      } else {
        setWbStatus("error");
      }
    } catch {
      setWbStatus("error");
    }
  }

  /* ── Step validation + advance ─────────────────────────── */
  const stepFields: (keyof FormValues)[][] = [
    ["productName"],         // step 0 – required
    [],                      // step 1 – all optional
    [],                      // step 2 – all optional
    [],                      // step 3 – summary only
  ];

  async function advance() {
    const fieldsToValidate = stepFields[step];
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final step — serialize and navigate
      const formData = getValues();
      sessionStorage.setItem("analysis_input", JSON.stringify(formData));
      router.push("/result");
    }
  }

  /* ── Per-step "Next" disabled check ───────────────────── */
  const productName = watch("productName");
  const isNextDisabled = step === 0 && (!productName || productName.trim().length < 2);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Card className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--c-text)]">
            Проверить товар
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--c-text2)]">
            Вставьте ссылку на WB, название товара или нишу. Демо-режим
            использует тестовые данные до подключения реальных источников.
          </p>
        </div>
        <span className="hidden rounded-full bg-[var(--c-bg3)] px-3 py-1 text-xs font-semibold text-[var(--c-text3)] sm:inline-flex">
          Демо-режим
        </span>
      </div>

      {/* Step progress — full bar on sm+, compact text on mobile */}
      <div className="mb-6">
        {/* Mobile: compact step indicator */}
        <p className="text-sm font-medium text-[var(--c-text2)] sm:hidden">
          Шаг {step + 1} из {STEPS.length} — <span className="text-[var(--c-text)]">{STEPS[step]}</span>
        </p>
        {/* Desktop: full progress bar */}
        <div className="hidden items-center gap-2 sm:flex">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => idx < step && setStep(idx)}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition
                  ${idx === step
                    ? "bg-[var(--c-green)] text-[var(--c-bg)]"
                    : idx < step
                    ? "cursor-pointer bg-[var(--c-green-dim)] text-[var(--c-green)]"
                    : "bg-[var(--c-bg3)] text-[var(--c-text3)]"
                  }`}
              >
                {idx + 1}
              </button>
              <span className={`text-xs font-medium ${idx === step ? "text-[var(--c-text)]" : "text-[var(--c-text3)]"}`}>
                {label}
              </span>
              {idx < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-[var(--c-border2)]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 0: Товар / Supplier ── */}
      {step === 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">
              Ссылка на товар Wildberries
            </span>
            <div className="relative">
              <Input
                className="h-11 text-base"
                placeholder="https://wildberries.ru/catalog/178293402/detail.aspx"
                {...productUrl}
                onChange={(event) => {
                  productUrl.onChange(event);
                  void handleUrlChange(event.target.value);
                }}
              />
              {urlLoading && (
                <Loader2 className="absolute right-3 top-3 animate-spin text-[var(--c-green)]" size={18} />
              )}
            </div>
          </label>

          {preview && (
            <div className="sm:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
                  <Package size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--c-text)]">{preview.name}</p>
                  <p className="mt-1 text-sm text-[var(--c-text2)]">
                    {preview.brand ?? "Бренд не указан"} · {preview.category ?? "Категория не указана"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--c-text2)]">
                    Цена: {typeof preview.price === "number" ? formatRub(preview.price) : "не получена"} ·
                    Рейтинг: {typeof preview.rating === "number" ? `${preview.rating}★` : "нет данных"} ·{" "}
                    {typeof preview.reviewCount === "number"
                      ? `${preview.reviewCount.toLocaleString("ru-RU")} отз.`
                      : "отзывы не получены"}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--c-green)]">
                    <CheckCircle2 size={16} />
                    Данные загружены с Wildberries
                  </p>
                </div>
              </div>
            </div>
          )}

          <Field label="Название товара *" error={errors.productName?.message}>
            <Input className="h-11 text-base" {...register("productName")} />
          </Field>
          <Field label="Категория / ниша">
            <Input className="h-11 text-base" {...register("category")} />
          </Field>
          <Field label="Себестоимость (₽)">
            <Input className="h-11 text-base" type="number" {...register("purchaseCost")} />
          </Field>
          <Field label="Планируемая цена продажи (₽)">
            <Input className="h-11 text-base" type="number" {...register("sellingPrice")} />
          </Field>
          <Field label="Стоимость упаковки (₽/шт)">
            <Input className="h-11 text-base" type="number" {...register("packagingCost")} />
          </Field>
          <Field label="Вес (кг)">
            <Input className="h-11 text-base" placeholder="0.4" {...register("weight")} />
          </Field>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">
              Габариты (см)
            </span>
            <Input className="h-11 text-base" placeholder="30 x 20 x 8" {...register("dimensions")} />
          </label>
        </div>
      )}

      {/* ── Step 1: Рынок / Market ── */}
      {step === 1 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field label="Комиссия маркетплейса (%)">
            <Input className="h-11 text-base" type="number" {...register("marketCommission")} />
          </Field>
          <Field label="Логистика WB (₽/шт)">
            <Input className="h-11 text-base" type="number" {...register("logistics")} />
          </Field>
          <Field label="Резерв рекламы (₽/шт)">
            <Input className="h-11 text-base" type="number" {...register("adsReserve")} />
          </Field>
          <Field label="Резерв возвратов (₽/шт)">
            <Input className="h-11 text-base" type="number" {...register("returnReserve")} />
          </Field>

          {/* WB API connection widget */}
          <div className="sm:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <p className="text-sm font-semibold text-[var(--c-text)]">WB API</p>
            <p className="mt-1 text-xs text-[var(--c-text3)]">
              Нажмите, чтобы проверить доступность WB API. Реальный артикул не нужен.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={checkWbConnection}
                disabled={wbStatus === "loading"}
              >
                {wbStatus === "loading" ? (
                  <><Loader2 size={14} className="animate-spin" /> Проверка…</>
                ) : (
                  <><RefreshCw size={14} /> Проверить подключение</>
                )}
              </Button>
              {wbStatus === "ok" && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-green)]">
                  <CheckCircle2 size={15} /> Подключено ✓
                </span>
              )}
              {wbStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-red)]">
                  <XCircle size={15} /> Ошибка подключения
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Конкуренты ── */}
      {step === 2 && (
        <div className="grid gap-4">
          <Field label="Ссылки на конкурентов (по одной на строку)">
            <textarea
              {...register("competitorUrls")}
              rows={5}
              placeholder={"https://wildberries.ru/catalog/111/detail.aspx\nhttps://wildberries.ru/catalog/222/detail.aspx"}
              className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </Field>
          <Field label="Заметки о конкурентах">
            <textarea
              {...register("competitorNotes")}
              rows={3}
              placeholder="Сильные и слабые стороны, ценовой диапазон…"
              className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </Field>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 text-sm text-[var(--c-text2)]">
            Анализ конкурентов по ссылкам доступен с подключённым WB API.
            Без него используются демо-данные.
          </div>
        </div>
      )}

      {/* ── Step 3: Итог / Summary ── */}
      {step === 3 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <SummaryRow label="Товар" value={watch("productName")} />
          <SummaryRow label="Категория" value={watch("category") ?? "—"} />
          <SummaryRow
            label="Себестоимость"
            value={watch("purchaseCost") ? formatRub(Number(watch("purchaseCost"))) : "—"}
          />
          <SummaryRow
            label="Цена продажи"
            value={watch("sellingPrice") ? formatRub(Number(watch("sellingPrice"))) : "—"}
          />
          <SummaryRow
            label="Упаковка"
            value={watch("packagingCost") ? formatRub(Number(watch("packagingCost"))) : "—"}
          />
          <SummaryRow
            label="Комиссия"
            value={watch("marketCommission") ? `${watch("marketCommission")}%` : "—"}
          />
          <SummaryRow
            label="Логистика"
            value={watch("logistics") ? formatRub(Number(watch("logistics"))) : "—"}
          />
          <SummaryRow
            label="Резерв рекламы"
            value={watch("adsReserve") ? formatRub(Number(watch("adsReserve"))) : "—"}
          />
          <div className="sm:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-green-dim)] p-4 text-sm text-[var(--c-green)]">
            Всё готово. Нажмите «Смотреть результат» — данные будут сохранены
            и переданы на страницу анализа.
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {step > 0 && (
            <Button variant="secondary" type="button" onClick={() => setStep(step - 1)} className="w-full sm:w-auto">
              Назад
            </Button>
          )}
          {step === 0 && (
            <Button variant="secondary" type="button" className="w-full sm:w-auto">
              <Upload size={16} />
              Загрузить CSV
            </Button>
          )}
          {step === 0 && (
            <Button variant="secondary" type="button" className="w-full sm:w-auto">
              <Database size={16} />
              Подключить Wildberries API
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={advance}
          disabled={isNextDisabled}
          className="w-full sm:w-auto"
        >
          {step < 3 ? (
            <>
              Далее
              <ChevronRight size={16} />
            </>
          ) : (
            <>
              <WandSparkles size={16} />
              Смотреть результат
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-sm text-[var(--c-text3)]">
        Доступность данных зависит от подключённых источников.
      </p>
    </Card>
  );
}

/* ─── Small helpers ───────────────────────────────────────── */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-[var(--c-red)]">{error}</span>}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-3">
      <p className="text-[11px] font-medium text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--c-text)]">{value}</p>
    </div>
  );
}
