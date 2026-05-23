"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Database, Link as LinkIcon, Loader2, Package, Upload, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { parseWbUrl } from "@/lib/parseWbUrl";
import { getWBCommission } from "@/lib/wbCommissions";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRub } from "@/lib/utils";

const schema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().min(2, "Укажите название товара для анализа."),
  category: z.string().optional(),
  purchaseCost: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  packagingCost: z.coerce.number().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
});

type WbPreview = {
  nmId: number;
  name: string;
  brand?: string;
  category?: string;
  price?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  commission?: number;
};

export function ProductCheckForm({ onWbConnect }: { onWbConnect?: () => void } = {}) {
  const [preview, setPreview] = useState<WbPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: "Дорожный органайзер для косметики, складной",
      category: "Аксессуары для путешествий",
      purchaseCost: 900,
      sellingPrice: 2490,
      packagingCost: 95,
    },
  });

  const productUrl = register("productUrl");

  async function handleUrlChange(value: string) {
    const nmId = parseWbUrl(value);
    if (!nmId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/wb-product?nm=${nmId}`);
      const data = await res.json();
      if (!data.error) {
        setValue("productName", data.name);
        setValue("category", data.category);
        if (typeof data.price === "number") setValue("sellingPrice", data.price);
        const commission = getWBCommission(data.category ?? "");
        setPreview({ ...data, commission });
        onWbConnect?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 lg:p-8">
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

      <form className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">
            Ссылка на товар Wildberries
          </span>
          <div className="relative">
            <Input
              placeholder="https://wildberries.ru/catalog/178293402/detail.aspx"
              {...productUrl}
              onChange={(event) => {
                productUrl.onChange(event);
                void handleUrlChange(event.target.value);
              }}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-3 animate-spin text-[var(--c-green)]" size={18} />
            )}
          </div>
        </label>

        {preview && (
          <div className="md:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
                <Package size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[14px] font-bold text-[var(--c-text)]">
                  {preview.name}
                </p>
                <p className="mt-1 text-sm text-[var(--c-text2)]">
                  {preview.brand || "Бренд не указан"} · {preview.category || "Категория не указана"} ·{" "}
                  {typeof preview.price === "number" ? formatRub(preview.price) : "цена н/д"} ·{" "}
                  {typeof preview.rating === "number" ? `${preview.rating}★` : "нет рейтинга"} ·{" "}
                  {typeof preview.reviewCount === "number"
                    ? `${preview.reviewCount.toLocaleString("ru-RU")} отзывов`
                    : "отзывы н/д"}
                </p>
                {typeof preview.commission === "number" && (
                  <p className="mt-1 text-sm text-[var(--c-text2)]">
                    Комиссия WB: <span className="font-semibold text-[var(--c-text)]">{Math.round(preview.commission * 100)}%</span>
                  </p>
                )}
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--c-green)]">
                  <CheckCircle2 size={16} />
                  Данные загружены с Wildberries
                </p>
              </div>
            </div>
          </div>
        )}

        <Field label="Название товара" error={errors.productName?.message}>
          <Input {...register("productName")} />
        </Field>
        <Field label="Категория / ниша">
          <Input {...register("category")} />
        </Field>
        <Field label="Себестоимость (₽)">
          <Input type="number" {...register("purchaseCost")} />
        </Field>
        <Field label="Планируемая цена продажи (₽)">
          <Input type="number" {...register("sellingPrice")} />
        </Field>
        <Field label="Стоимость упаковки (₽/шт)">
          <Input type="number" {...register("packagingCost")} />
        </Field>
        <Field label="Вес (кг)">
          <Input placeholder="0.4" {...register("weight")} />
        </Field>
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-[var(--c-text)]">
            Габариты (см)
          </span>
          <Input placeholder="30 x 20 x 8" {...register("dimensions")} />
        </label>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/result">
          <WandSparkles size={16} />
          Анализировать товар
        </LinkButton>
        <Button variant="secondary">
          <Upload size={16} />
          Загрузить CSV
        </Button>
        <Button variant="secondary">
          <Database size={16} />
          Подключить Wildberries API
        </Button>
        <LinkButton href="/result" variant="ghost">
          <LinkIcon size={16} />
          Использовать демо-товар
        </LinkButton>
      </div>
      <p className="mt-4 text-sm text-[var(--c-text3)]">
        Доступность данных зависит от подключённых источников.
      </p>
    </Card>
  );
}

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
