"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, X, ImagePlus, ChevronDown, AlertTriangle } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { CHANNEL_LABELS } from "@/mock/inventory";
import type { Product, ProductType, ProductStatus, ProductVariant, SalesChannel } from "@/mock/inventory";

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  sku: z.string().optional(),
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
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

/** Margin quality label + color (SellerMap addition: instant pricing feedback). */
function marginQuality(m: number): { label: string; cls: string } {
  if (m < 20) return { label: "Низкая маржа", cls: "text-[var(--c-red)]" };
  if (m < 40) return { label: "Средняя маржа", cls: "text-[var(--c-amber)]" };
  if (m < 60) return { label: "Хорошая маржа", cls: "text-[var(--c-green)]" };
  return { label: "Отличная маржа", cls: "text-[var(--c-green)]" };
}

function buildCombinations(options: OptionRow[]): string[] {
  const validOptions = options.filter((o) => o.name.trim() && o.values.trim());
  if (validOptions.length === 0) return [];
  const parsed = validOptions.map((o) => parseValues(o.values));
  if (parsed.length === 1) return parsed[0].map((v) => v);
  const combos: string[] = [];
  for (const v1 of parsed[0]) for (const v2 of parsed[1]) combos.push(`${v1} / ${v2}`);
  return combos;
}

// ── Presentational helpers ──────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      {title && <h2 className="mb-4 text-sm font-semibold text-[var(--c-text)]">{title}</h2>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
      {children} {required && <span className="text-[var(--c-red)]">*</span>}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${value ? "left-6" : "left-1"}`} />
    </button>
  );
}

/** Collapsible "Подробнее" row: shows hint chips when closed, content when open. */
function Collapsible({ open, onToggle, chips, children }: {
  open: boolean; onToggle: () => void; chips: string[]; children: React.ReactNode;
}) {
  return (
    <div className="-mx-5 mt-1 border-t border-[var(--c-border)] px-5 pt-3">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3">
        {open ? (
          <span className="text-sm font-medium text-[var(--c-text)]">Подробнее</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="rounded-md bg-[var(--c-bg3)] px-2 py-1 text-xs font-medium text-[var(--c-text2)]">{c}</span>
            ))}
          </div>
        )}
        <ChevronDown size={16} className={`shrink-0 text-[var(--c-text3)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const { products, suppliers, locations, actions } = useInventory();

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const skuTouchedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", sku: "", barcode: "", imageUrl: "", category: "",
      productType: "product", price: 0, costPrice: 0, description: "", status: "active",
    },
  });

  const imageUrlValue = watch("imageUrl");
  const skuValue = watch("sku");
  const priceValue = watch("price");
  const costValue = watch("costPrice");

  // Variant builder
  const [variantEnabled, setVariantEnabled] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([{ name: "", values: "" }]);

  // Extra field state
  const [stockByLocation, setStockByLocation] = useState<Record<string, number>>({});
  const [supplierId, setSupplierId] = useState("");
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [requiresLabeling, setRequiresLabeling] = useState(false);
  const [markingGroup, setMarkingGroup] = useState("");
  const [gtin, setGtin] = useState("");
  const [physical, setPhysical] = useState(true);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"кг" | "г">("кг");
  const [country, setCountry] = useState("");
  const [hsCode, setHsCode] = useState("");

  // Collapsible "Подробнее" sections (Shopify pattern)
  const [priceMore, setPriceMore] = useState(false);
  const [invMore, setInvMore] = useState(false);
  const [shipMore, setShipMore] = useState(false);

  const toggleChannel = (ch: SalesChannel) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));

  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, "").trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));
  const setLocationStock = (locationId: string, value: number) =>
    setStockByLocation((prev) => ({ ...prev, [locationId]: value }));

  // Prefill from sessionStorage (navigated from /result "Добавить в склад")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("prefill_product");
      if (raw) {
        const data = JSON.parse(raw) as { name?: string; buyPrice?: number; sellPrice?: number };
        if (data.name) setValue("name", data.name, { shouldValidate: false });
        if (typeof data.sellPrice === "number") setValue("price", data.sellPrice, { shouldValidate: false });
        if (typeof data.buyPrice === "number") setValue("costPrice", data.buyPrice, { shouldValidate: false });
        if (data.name) setValue("sku", generateSku(data.name), { shouldValidate: false });
        sessionStorage.removeItem("prefill_product");
      }
    } catch { /* ignore */ }
  }, [setValue]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (!skuTouchedRef.current && newName) setValue("sku", generateSku(newName), { shouldValidate: false });
  };

  // Unsaved-changes guard (RHF fields + the extra non-RHF state).
  const dirty = isDirty || channels.length > 0 || tags.length > 0 || requiresLabeling ||
    variantEnabled || !!weight || !!supplierId || Object.values(stockByLocation).some((v) => v > 0);

  const handleDiscard = () => {
    if (dirty && !window.confirm("Несохранённые изменения будут потеряны. Закрыть страницу?")) return;
    router.back();
  };

  // Cmd/Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const combinations = buildCombinations(options);
  const tooManyCombos = combinations.length > 20;
  const displayedCombos = combinations.slice(0, 20);

  // Live margin (Shopify shows margin/profit once cost is entered).
  const margin = priceValue > 0 && costValue >= 0 ? Math.round(((priceValue - costValue) / priceValue) * 1000) / 10 : null;
  const profit = priceValue > 0 ? priceValue - (costValue || 0) : null;

  const onSubmit = async (data: FormValues) => {
    const now = new Date().toISOString().split("T")[0];
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sku = data.sku?.trim() || generateSku(data.name); // SKU optional — auto-generate
    const marginVal = data.price > 0 ? Math.round(((data.price - data.costPrice) / data.price) * 1000) / 10 : 0;
    const weightKg = weight ? parseFloat(weight) / (weightUnit === "г" ? 1000 : 1) : undefined;

    let hasVariants = false;
    let variants: ProductVariant[] = [];
    if (variantEnabled && combinations.length > 0 && !tooManyCombos) {
      hasVariants = true;
      variants = displayedCombos.map((combo, i) => ({
        id: `${id}-var-${i}`,
        name: combo,
        sku: `${sku}-${combo.replace(/[^A-Za-z0-9]/g, "-").toUpperCase()}`,
        price: data.price,
        costPrice: data.costPrice,
        stock: {} as Record<string, number>,
      }));
    }

    const initialStock: Record<string, number> = {};
    let totalPhysical = 0;
    for (const loc of locations) {
      const qty = stockByLocation[loc.id] ?? 0;
      if (qty > 0) { initialStock[loc.id] = qty; totalPhysical += qty; }
    }

    const newProduct: Product = {
      id,
      name: data.name,
      sku,
      barcode: data.barcode || undefined,
      imageUrl: data.imageUrl || undefined,
      category: data.category,
      productType: data.productType as ProductType,
      status: data.status as ProductStatus,
      description: data.description || undefined,
      price: data.price,
      costPrice: data.costPrice,
      margin: marginVal,
      hasVariants,
      variants,
      supplierId: supplierId || undefined,
      channels,
      tags: requiresLabeling && markingGroup ? [...tags, `ЧЗ: ${markingGroup}`] : tags,
      requiresLabeling,
      weight: weightKg,
      countryOfOrigin: country.trim() || undefined,
      hsCode: hsCode.trim() || undefined,
      ...(requiresLabeling ? { labelingType: "chestny_znak" as const, gtin: gtin || undefined } : {}),
      stockByLocation: initialStock,
      reservedUnits: 0,
      damagedUnits: 0,
      inTransitUnits: 0,
      totalPhysical,
      createdAt: now,
      updatedAt: now,
    };

    actions.addProduct(newProduct);
    for (const loc of locations) {
      const qty = stockByLocation[loc.id] ?? 0;
      if (qty > 0) actions.adjustStock(newProduct.id, loc.id, qty, "adjustment", "Начальный остаток");
    }
    toast.success("Товар создан");
    router.push("/inventory/products/" + newProduct.id);
  };

  return (
    <InventoryShell title="Новый товар">
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-5xl pb-24">
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--c-red)]">
              <AlertTriangle size={15} /> Найдены ошибки ({Object.keys(errors).length}):
            </p>
            <ul className="mt-1 list-disc pl-8 text-sm text-[var(--c-text2)]">
              {errors.name && <li>{errors.name.message}</li>}
              {errors.category && <li>{errors.category.message}</li>}
              {errors.price && <li>{errors.price.message}</li>}
              {errors.costPrice && <li>{errors.costPrice.message}</li>}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* ── Main column ─────────────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2">

            <Card>
              <div>
                <Lbl required>Название</Lbl>
                <input
                  type="text"
                  {...register("name")}
                  onChange={(e) => { register("name").onChange(e); handleNameChange(e); }}
                  placeholder="Например: Футболка оверсайз"
                  className={`${inputCls} ${errors.name ? "border-[var(--c-red)]" : ""}`}
                />
                {errors.name && <p className="mt-1 text-xs text-[var(--c-red)]">{errors.name.message}</p>}
              </div>
              <div>
                <Lbl>Описание</Lbl>
                <textarea
                  {...register("description")}
                  rows={5}
                  placeholder="Опишите товар…"
                  className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
                />
              </div>
              <div>
                <Lbl>Изображение (URL)</Lbl>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)]">
                    {imageUrlValue ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrlValue} alt="Превью" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus size={18} className="text-[var(--c-text3)]" />
                    )}
                  </div>
                  <input
                    type="text"
                    {...register("imageUrl")}
                    placeholder="https://example.com/image.jpg"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <Lbl required>Категория</Lbl>
                <input
                  type="text"
                  list="categories-list"
                  {...register("category")}
                  placeholder="Выберите или введите категорию"
                  className={`${inputCls} ${errors.category ? "border-[var(--c-red)]" : ""}`}
                />
                <datalist id="categories-list">
                  {categories.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
                {errors.category && <p className="mt-1 text-xs text-[var(--c-red)]">{errors.category.message}</p>}
              </div>
            </Card>

            {/* Price */}
            <Card title="Цена">
              <div className="w-1/2">
                <Lbl required>Цена продажи, ₽</Lbl>
                <input type="number" min={0} step="0.01" {...register("price", { valueAsNumber: true })}
                  className={`${inputCls} tabular ${errors.price ? "border-[var(--c-red)]" : ""}`} />
                {errors.price && <p className="mt-1 text-xs text-[var(--c-red)]">{errors.price.message}</p>}
              </div>

              <Collapsible open={priceMore} onToggle={() => setPriceMore((v) => !v)} chips={["Себестоимость"]}>
                <div className="w-1/2">
                  <Lbl>Себестоимость, ₽</Lbl>
                  <input type="number" min={0} step="0.01" {...register("costPrice", { valueAsNumber: true })}
                    title="Покупатели этого не видят" className={`${inputCls} tabular`} />
                  <p className="mt-1 text-xs text-[var(--c-text3)]">Покупатели этого не видят — нужно для расчёта прибыли и P&amp;L.</p>
                </div>
              </Collapsible>

              {/* Cost / Profit / Margin chips (always visible, Shopify style) */}
              <div className="-mx-5 flex flex-wrap gap-2 border-t border-[var(--c-border)] px-5 pt-3 text-sm">
                <span className="flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2.5 py-1">
                  <span className="text-[var(--c-text3)]">Себест.</span>
                  <span className="tabular text-[var(--c-text)]">{costValue > 0 ? `${costValue.toLocaleString("ru-RU")} ₽` : "—"}</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2.5 py-1">
                  <span className="text-[var(--c-text3)]">Прибыль</span>
                  <span className="tabular text-[var(--c-text)]">{profit !== null ? `${profit.toLocaleString("ru-RU")} ₽` : "—"}</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2.5 py-1">
                  <span className="text-[var(--c-text3)]">Маржа</span>
                  <span className={`tabular ${margin === null ? "text-[var(--c-text)]" : marginQuality(margin).cls}`}>{margin !== null ? `${margin}%` : "—"}</span>
                </span>
                {margin !== null && margin >= 0 && (
                  <span className={`flex items-center px-1 text-xs font-medium ${marginQuality(margin).cls}`}>{marginQuality(margin).label}</span>
                )}
              </div>
            </Card>

            {/* Inventory */}
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Запасы</h2>
                <span className="text-xs text-[var(--c-text2)]">Учёт остатков включён</span>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--c-text2)]">Начальный остаток по локациям</p>
                <div className="space-y-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] px-3 py-2">
                      <span className="text-sm text-[var(--c-text)]">{loc.name}</span>
                      <input type="number" min={0} value={stockByLocation[loc.id] ?? 0}
                        onChange={(e) => setLocationStock(loc.id, Math.max(0, Number(e.target.value) || 0))}
                        className="h-9 w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-right text-sm tabular text-[var(--c-text)] outline-none focus:border-[var(--c-green)]" />
                    </div>
                  ))}
                </div>
              </div>
              <Collapsible open={invMore} onToggle={() => setInvMore((v) => !v)} chips={["SKU", "Штрихкод"]}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Lbl>Артикул (SKU)</Lbl>
                    <input type="text" {...register("sku")} onFocus={() => { skuTouchedRef.current = true; }}
                      placeholder="Сгенерируется автоматически" className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <Lbl>Штрихкод (EAN, UPC, GTIN)</Lbl>
                    <input type="text" {...register("barcode")} placeholder="необязательно" className={`${inputCls} font-mono`} />
                  </div>
                </div>
              </Collapsible>
            </Card>

            {/* Shipping */}
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Доставка</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--c-text2)]">Физический товар</span>
                  <Toggle value={physical} onChange={setPhysical} />
                </div>
              </div>
              {physical && (
                <>
                  <div>
                    <Lbl>Вес товара</Lbl>
                    <div className="flex gap-2">
                      <input type="number" min={0} step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)}
                        placeholder="0.0" className={`${inputCls} tabular w-40`} />
                      <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as "кг" | "г")}
                        className="h-10 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]">
                        <option value="кг">кг</option>
                        <option value="г">г</option>
                      </select>
                    </div>
                  </div>
                  <Collapsible open={shipMore} onToggle={() => setShipMore((v) => !v)} chips={["Страна происхождения", "ТН ВЭД / HS"]}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Lbl>Страна происхождения</Lbl>
                        <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                          placeholder="Например: Россия" className={inputCls} />
                      </div>
                      <div>
                        <Lbl>Код ТН ВЭД / HS</Lbl>
                        <input type="text" value={hsCode} onChange={(e) => setHsCode(e.target.value)}
                          placeholder="Например: 6109100000" className={`${inputCls} font-mono`} />
                      </div>
                    </div>
                  </Collapsible>
                </>
              )}
            </Card>

            {/* Variants */}
            <Card title="Варианты">
              {!variantEnabled ? (
                <button type="button" onClick={() => setVariantEnabled(true)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--c-green)] hover:opacity-80">
                  <Plus size={15} /> Добавить опции: размер, цвет и т.п.
                </button>
              ) : (
                <div className="space-y-4">
                  {options.map((opt, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input type="text" value={opt.name}
                        onChange={(e) => { const n = [...options]; n[idx] = { ...n[idx], name: e.target.value }; setOptions(n); }}
                        placeholder={idx === 0 ? "Размер" : "Цвет"} className={inputCls} />
                      <input type="text" value={opt.values}
                        onChange={(e) => { const n = [...options]; n[idx] = { ...n[idx], values: e.target.value }; setOptions(n); }}
                        placeholder={idx === 0 ? "S, M, L, XL" : "Красный, Синий"} className={inputCls} />
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    {options.length < 2 && (
                      <button type="button" onClick={() => setOptions([...options, { name: "", values: "" }])}
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)]">
                        <Plus size={12} /> Добавить опцию
                      </button>
                    )}
                    <button type="button" onClick={() => { setVariantEnabled(false); setOptions([{ name: "", values: "" }]); }}
                      className="text-xs font-medium text-[var(--c-red)] hover:opacity-80">Убрать варианты</button>
                  </div>
                  {combinations.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-[var(--c-text2)]">Варианты ({combinations.length})</p>
                      {tooManyCombos && <p className="mb-2 text-xs text-[var(--c-red)]">Слишком много комбинаций. Максимум 20.</p>}
                      {!tooManyCombos && (
                        <div className="flex flex-wrap gap-1.5">
                          {displayedCombos.map((c, i) => (
                            <span key={i} className="rounded-md bg-[var(--c-bg3)] px-2 py-1 text-xs text-[var(--c-text2)]">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Честный Знак */}
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Маркировка (Честный Знак)</h2>
                <Toggle value={requiresLabeling} onChange={setRequiresLabeling} />
              </div>
              {requiresLabeling && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Lbl>Товарная группа</Lbl>
                    <select value={markingGroup} onChange={(e) => setMarkingGroup(e.target.value)} className={inputCls}>
                      <option value="">— выберите группу —</option>
                      {CHESTNY_ZNAK_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl>GTIN</Lbl>
                    <input type="text" value={gtin} onChange={(e) => setGtin(e.target.value)}
                      placeholder="04606007384825" className={`${inputCls} font-mono`} />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── Sidebar column ──────────────────────────────────────────── */}
          <div className="space-y-5">
            <Card title="Статус">
              <select {...register("status")} className={inputCls}>
                <option value="active">Активный</option>
                <option value="draft">Черновик</option>
              </select>
            </Card>

            <Card title="Публикация">
              <p className="text-xs text-[var(--c-text2)]">
                {channels.length === 0
                  ? "Каналы не выбраны"
                  : `Выбрано каналов: ${channels.length} — ${channels.map((c) => CHANNEL_LABELS[c]).join(", ")}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_LABELS) as SalesChannel[]).map((ch) => {
                  const active = channels.includes(ch);
                  return (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        active ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                          : "border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)]"
                      }`}>
                      {CHANNEL_LABELS[ch]}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title="Организация">
              <div>
                <Lbl>Тип товара</Lbl>
                <select {...register("productType")} className={inputCls}>
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl>Поставщик</Lbl>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                  <option value="">Нет поставщика</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {(() => {
                  const s = suppliers.find((x) => x.id === supplierId);
                  if (!s) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 rounded-lg bg-[var(--c-bg3)] px-3 py-2 text-xs text-[var(--c-text2)]">
                      <span>Срок поставки: <span className="text-[var(--c-text)]">{s.leadTimeDays} дн.</span></span>
                      {s.minOrderQty != null && <span>Мин. заказ: <span className="text-[var(--c-text)]">{s.minOrderQty} шт.</span></span>}
                    </div>
                  );
                })()}
              </div>
              <div>
                <Lbl>Теги</Lbl>
                {tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 rounded-full bg-[var(--c-green-dim)] px-3 py-1 text-xs font-medium text-[var(--c-green)]">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} aria-label={`Удалить тег ${t}`} className="transition hover:opacity-70">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown} onBlur={addTag}
                  placeholder="Введите тег и нажмите Enter" className={inputCls} />
              </div>
            </Card>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 lg:pl-56">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
            <button type="button" onClick={handleDiscard}
              className="flex h-10 items-center rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]">
              Отмена
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] shadow-sm transition hover:bg-[#25e890] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Создание…" : "Создать товар"}
            </button>
          </div>
        </div>
      </form>
    </InventoryShell>
  );
}
