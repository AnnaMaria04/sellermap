"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { CHANNEL_LABELS } from "@/mock/inventory";
import type { Product, ProductType, ProductStatus, ProductVariant, SalesChannel } from "@/mock/inventory";

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  sku: z.string().min(1, "Артикул обязателен"),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().min(1, "Выберите категорию"),
  productType: z.enum(["product", "ingredient", "bundle", "packaging"]),
  price: z.number({ error: "Укажите цену" }).min(0),
  costPrice: z.number({ error: "Укажите себестоимость" }).min(0),
  description: z.string().optional(),
  status: z.enum(["active", "draft"]),
});

type FormValues = z.infer<typeof schema>;

interface OptionRow {
  name: string;
  values: string;
}

function generateSku(name: string): string {
  const base = name.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "").slice(0, 4) || "SKU";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return base + "-" + suffix;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  product: "Товар",
  ingredient: "Ингредиент",
  bundle: "Комплект",
  packaging: "Упаковка",
};

// Честный Знак product groups (товарные группы) subject to mandatory marking.
const CHESTNY_ZNAK_GROUPS = [
  "Одежда", "Обувь", "Духи и туалетная вода", "Шины и покрышки",
  "Фотоаппараты и лампы-вспышки", "Молочная продукция", "Упакованная вода",
  "Табачная продукция", "Лекарства", "БАДы", "Антисептики",
  "Безалкогольное пиво", "Кресла-коляски", "Велосипеды",
  "Ветеринарные препараты", "Икра",
];

function parseValues(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildCombinations(options: OptionRow[]): string[] {
  const validOptions = options.filter(
    (o) => o.name.trim() && o.values.trim()
  );
  if (validOptions.length === 0) return [];

  const parsed = validOptions.map((o) => parseValues(o.values));
  if (parsed.length === 1) return parsed[0].map((v) => v);

  // Cross-product of first two option value arrays
  const combos: string[] = [];
  for (const v1 of parsed[0]) {
    for (const v2 of parsed[1]) {
      combos.push(`${v1} / ${v2}`);
    }
  }
  return combos;
}

export default function NewProductPage() {
  const router = useRouter();
  const { products, suppliers, locations, actions } = useInventory();

  // Derive unique categories from existing products
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const skuTouchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      imageUrl: "",
      category: "",
      productType: "product",
      price: 0,
      costPrice: 0,
      description: "",
      status: "active",
    },
  });

  const nameValue = watch("name");
  const imageUrlValue = watch("imageUrl");
  const skuValue = watch("sku");

  // Variant builder state
  const [variantEnabled, setVariantEnabled] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([
    { name: "", values: "" },
  ]);

  // Priority-3 field state
  const [stockByLocation, setStockByLocation] = useState<Record<string, number>>({});
  const [supplierId, setSupplierId] = useState("");
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [requiresLabeling, setRequiresLabeling] = useState(false);
  const [markingGroup, setMarkingGroup] = useState("");
  const [gtin, setGtin] = useState("");

  const toggleChannel = (ch: SalesChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, "").trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const setLocationStock = (locationId: string, value: number) => {
    setStockByLocation((prev) => ({ ...prev, [locationId]: value }));
  };

  // Prefill from sessionStorage if navigated from /result "Добавить в склад"
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("prefill_product");
      if (raw) {
        const data = JSON.parse(raw) as { name?: string; buyPrice?: number; sellPrice?: number };
        if (data.name) setValue("name", data.name, { shouldValidate: false });
        if (typeof data.sellPrice === "number") setValue("price", data.sellPrice, { shouldValidate: false });
        if (typeof data.buyPrice === "number") setValue("costPrice", data.buyPrice, { shouldValidate: false });
        // Auto-generate SKU from prefilled name
        if (data.name) {
          setValue("sku", generateSku(data.name), { shouldValidate: false });
        }
        sessionStorage.removeItem("prefill_product");
      }
    } catch {
      // ignore
    }
  }, [setValue]);

  // Auto-generate SKU from name when name changes and SKU hasn't been manually edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (!skuTouchedRef.current && newName) {
      setValue("sku", generateSku(newName), { shouldValidate: false });
    }
  };

  const combinations = buildCombinations(options);
  const tooManyCombos = combinations.length > 20;
  const displayedCombos = combinations.slice(0, 20);

  const onSubmit = async (data: FormValues) => {
    const now = new Date().toISOString().split("T")[0];
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const margin =
      data.price > 0
        ? Math.round(((data.price - data.costPrice) / data.price) * 1000) / 10
        : 0;

    let hasVariants = false;
    let variants: ProductVariant[] = [];

    if (variantEnabled && combinations.length > 0 && !tooManyCombos) {
      hasVariants = true;
      variants = displayedCombos.map((combo, i) => ({
        id: `${id}-var-${i}`,
        name: combo,
        sku: `${data.sku}-${combo.replace(/[^A-Za-z0-9]/g, "-").toUpperCase()}`,
        price: data.price,
        costPrice: data.costPrice,
        stock: {} as Record<string, number>,
      }));
    }

    // Initial stock by location — keep only positive quantities
    const initialStock: Record<string, number> = {};
    let totalPhysical = 0;
    for (const loc of locations) {
      const qty = stockByLocation[loc.id] ?? 0;
      if (qty > 0) {
        initialStock[loc.id] = qty;
        totalPhysical += qty;
      }
    }

    const newProduct: Product = {
      id,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || undefined,
      imageUrl: data.imageUrl || undefined,
      category: data.category,
      productType: data.productType as ProductType,
      status: data.status as ProductStatus,
      description: data.description || undefined,
      price: data.price,
      costPrice: data.costPrice,
      margin,
      hasVariants,
      variants,
      supplierId: supplierId || undefined,
      channels,
      tags: requiresLabeling && markingGroup ? [...tags, `ЧЗ: ${markingGroup}`] : tags,
      requiresLabeling,
      ...(requiresLabeling
        ? { labelingType: "chestny_znak" as const, gtin: gtin || undefined }
        : {}),
      stockByLocation: initialStock,
      reservedUnits: 0,
      damagedUnits: 0,
      inTransitUnits: 0,
      totalPhysical,
      createdAt: now,
      updatedAt: now,
    };

    actions.addProduct(newProduct);

    // Record initial stock as adjustment movements per location
    for (const loc of locations) {
      const qty = stockByLocation[loc.id] ?? 0;
      if (qty > 0) {
        actions.adjustStock(newProduct.id, loc.id, qty, "adjustment", "Начальный остаток");
      }
    }

    toast.success("Товар создан");
    router.push("/inventory/products/" + newProduct.id);
  };

  return (
    <InventoryShell title="Новый товар" subtitle="Заполните данные о товаре">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-2xl space-y-6">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Название <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              onChange={(e) => {
                register("name").onChange(e);
                handleNameChange(e);
              }}
              placeholder="Например: Футболка оверсайз"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.name ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.name.message}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Артикул (SKU) <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              {...register("sku")}
              onFocus={() => { skuTouchedRef.current = true; }}
              placeholder="Например: TSH-OV-001"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.sku ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            {errors.sku && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.sku.message}</p>
            )}
          </div>

          {/* Barcode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Штрихкод
            </label>
            <input
              type="text"
              {...register("barcode")}
              placeholder="EAN-13 или другой"
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Изображение (URL)
            </label>
            <input
              type="text"
              {...register("imageUrl")}
              placeholder="https://example.com/image.jpg"
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
            {imageUrlValue && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrlValue}
                  alt="Превью"
                  className="max-h-20 w-20 rounded-lg border border-[var(--c-border)] object-cover"
                />
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Категория <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              list="categories-list"
              {...register("category")}
              placeholder="Выберите или введите категорию"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.category ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            <datalist id="categories-list">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            {errors.category && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.category.message}</p>
            )}
          </div>

          {/* Product Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Тип товара <span className="text-[var(--c-red)]">*</span>
            </label>
            <select
              {...register("productType")}
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)] ${
                errors.productType ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            >
              {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.productType && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.productType.message}</p>
            )}
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                Цена продажи, ₽ <span className="text-[var(--c-red)]">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)] ${
                  errors.price ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-[var(--c-red)]">{errors.price.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                Себестоимость, ₽ <span className="text-[var(--c-red)]">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("costPrice", { valueAsNumber: true })}
                className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)] ${
                  errors.costPrice ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
                }`}
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-[var(--c-red)]">{errors.costPrice.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Описание
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Опишите товар..."
              className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </div>

          {/* Variant Builder */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <button
              type="button"
              onClick={() => setVariantEnabled((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-[var(--c-text)]">
                Добавить варианты (размер, цвет, и т.д.)
              </span>
              {variantEnabled ? (
                <ChevronUp size={16} className="text-[var(--c-text2)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--c-text2)]" />
              )}
            </button>

            {variantEnabled && (
              <div className="mt-4 space-y-4">
                <p className="text-xs font-medium text-[var(--c-text2)]">Опции товара</p>

                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={idx === 0 ? "Размер" : "Цвет"}
                      className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
                    />
                    <input
                      type="text"
                      value={opt.values}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = { ...next[idx], values: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={idx === 0 ? "S, M, L, XL" : "Красный, Синий"}
                      className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
                    />
                  </div>
                ))}

                {options.length < 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, { name: "", values: "" }])}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 text-xs font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
                  >
                    <Plus size={12} />
                    Добавить опцию
                  </button>
                )}

                {/* Combination preview */}
                {combinations.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-2 text-xs font-medium text-[var(--c-text2)]">
                      Варианты товара ({combinations.length})
                    </p>

                    {tooManyCombos && (
                      <p className="mb-2 text-xs text-[var(--c-red)]">
                        Слишком много комбинаций. Максимум 20.
                      </p>
                    )}

                    {!tooManyCombos && (
                      <div className="overflow-hidden rounded-lg border border-[var(--c-border)]">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                              <th className="px-3 py-2 text-left font-medium text-[var(--c-text2)]">
                                Название
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-[var(--c-text2)]">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-[var(--c-text2)]">
                                Примечание
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedCombos.map((combo, i) => {
                              const varSku = skuValue
                                ? `${skuValue}-${combo.replace(/[^A-Za-z0-9]/g, "-").toUpperCase()}`
                                : "—";
                              return (
                                <tr
                                  key={i}
                                  className="border-b border-[var(--c-border)] last:border-0"
                                >
                                  <td className="px-3 py-2 text-[var(--c-text)]">{combo}</td>
                                  <td className="px-3 py-2 font-mono text-[var(--c-text2)]">
                                    {varSku}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--c-text3)]">
                                    SKU и цену можно отредактировать после сохранения
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Initial stock by location */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <p className="mb-4 text-sm font-medium text-[var(--c-text)]">
              Начальный остаток по локациям
            </p>
            <div className="space-y-3">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-[var(--c-text)]">{loc.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={stockByLocation[loc.id] ?? 0}
                    onChange={(e) =>
                      setLocationStock(loc.id, Math.max(0, Number(e.target.value) || 0))
                    }
                    className="h-10 w-28 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Supplier */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Поставщик
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)]"
            >
              <option value="">Нет поставщика</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channels */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <p className="mb-3 text-xs font-medium text-[var(--c-text2)]">
              Каналы продаж
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHANNEL_LABELS) as SalesChannel[]).map((ch) => {
                const active = channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                        : "border border-[var(--c-border2)] text-[var(--c-text2)] hover:border-white/25 hover:text-[var(--c-text)]"
                    }`}
                  >
                    {CHANNEL_LABELS[ch]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Теги
            </label>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-[var(--c-green-dim)] px-3 py-1 text-xs font-medium text-[var(--c-green)]"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="transition hover:opacity-70"
                      aria-label={`Удалить тег ${t}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="Введите тег и нажмите Enter"
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </div>

          {/* Честный Знак */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <button
              type="button"
              onClick={() => setRequiresLabeling((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-[var(--c-text)]">
                Требует маркировки (Честный Знак)
              </span>
              <span
                className={`flex h-5 w-9 items-center rounded-full px-0.5 transition ${
                  requiresLabeling ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition ${
                    requiresLabeling ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
            {requiresLabeling && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                    Товарная группа
                  </label>
                  <select
                    value={markingGroup}
                    onChange={(e) => setMarkingGroup(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)]"
                  >
                    <option value="">— выберите товарную группу —</option>
                    {CHESTNY_ZNAK_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                    GTIN
                  </label>
                  <input
                    type="text"
                    value={gtin}
                    onChange={(e) => setGtin(e.target.value)}
                    placeholder="Например: 04606007384825"
                    className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Статус
            </label>
            <select
              {...register("status")}
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)]"
            >
              <option value="active">Активный</option>
              <option value="draft">Черновик</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 items-center rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] shadow-sm transition hover:bg-[#25e890] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Создание..." : "Создать товар"}
            </button>
          </div>
        </div>
      </form>
    </InventoryShell>
  );
}
