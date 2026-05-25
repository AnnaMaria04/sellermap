"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Barcode,
  Camera,
  Tag,
  Package,
  DollarSign,
  Store,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Check,
  Upload,
  Trash2,
  Info,
} from "lucide-react";
import { SUPPLIERS, LOCATIONS, CHANNEL_LABELS, PRODUCT_TYPE_LABELS, type SalesChannel, type ProductType } from "@/mock/inventory";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onSave?: (data: unknown) => void;
}

type Tab = "basic" | "pricing" | "inventory" | "variants" | "shipping" | "labeling";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "Основное" },
  { id: "pricing", label: "Цена и маржа" },
  { id: "inventory", label: "Остатки" },
  { id: "variants", label: "Варианты" },
  { id: "shipping", label: "Доставка" },
  { id: "labeling", label: "Маркировка" },
];

type VariantOption = { name: string; values: string[] };

export function AddProductForm({ onClose, onSave }: Props) {
  const [tab, setTab] = useState<Tab>("basic");
  const [saved, setSaved] = useState(false);

  // Basic
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState<ProductType>("product");
  const [status, setStatus] = useState<"active" | "draft">("draft");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Pricing
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [channelCommission, setChannelCommission] = useState("");

  // Inventory
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({});
  const [supplierId, setSupplierId] = useState("");
  const [channels, setChannels] = useState<SalesChannel[]>([]);

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState("");

  // Shipping
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  // Labeling
  const [requiresLabeling, setRequiresLabeling] = useState(false);
  const [labelingType, setLabelingType] = useState<"chestny_znak" | "egais" | "mercury">("chestny_znak");
  const [gtin, setGtin] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const packagingNum = parseFloat(packagingCost) || 0;
  const deliveryNum = parseFloat(deliveryCost) || 0;
  const commissionNum = parseFloat(channelCommission) || 0;

  const totalCost = costNum + packagingNum + deliveryNum + priceNum * (commissionNum / 100);
  const grossMargin = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;
  const netProfit = priceNum - totalCost;

  function addTag() {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
    }
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function toggleChannel(ch: SalesChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function addOption() {
    if (!newOptionName.trim()) return;
    const values = newOptionValues.split(",").map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    setOptions([...options, { name: newOptionName.trim(), values }]);
    setNewOptionName("");
    setNewOptionValues("");
    setAddingOption(false);
  }

  function removeOption(idx: number) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      onSave?.({
        name, description, category, productType, status,
        price: priceNum, costPrice: costNum,
        sku, barcode, trackInventory, supplierId,
        channels, hasVariants, options,
        requiresLabeling, labelingType, gtin,
        tags,
      });
      setSaved(false);
      onClose();
    }, 800);
  }

  const isValid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Добавить товар</h2>
            <p className="text-xs text-[var(--c-text2)]">Заполните основные данные о товаре</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
          <nav className="flex overflow-x-auto px-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition",
                  tab === t.id
                    ? "border-[var(--c-green)] text-[var(--c-text)]"
                    : "border-transparent text-[var(--c-text2)] hover:text-[var(--c-text)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* ── BASIC ─────────────────────────────────────── */}
            {tab === "basic" && (
              <>
                <FormSection title="Название и описание">
                  <FormField label="Название товара" required>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Например: Органайзер для путешествий"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Описание">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Краткое описание товара..."
                      rows={3}
                      className={cn(inputCls, "resize-none")}
                    />
                  </FormField>
                </FormSection>

                <FormSection title="Медиа">
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] py-10 transition hover:border-[var(--c-green)] hover:bg-[var(--c-green-dim)] cursor-pointer">
                    <div className="text-center">
                      <Upload size={24} className="mx-auto mb-2 text-[var(--c-text3)]" />
                      <p className="text-sm text-[var(--c-text2)]">Перетащите фото или <span className="text-[var(--c-green)]">выберите файл</span></p>
                      <p className="mt-1 text-xs text-[var(--c-text3)]">PNG, JPG, WEBP до 10 МБ</p>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Категоризация">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Категория">
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Аксессуары, Одежда..."
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="Тип товара">
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value as ProductType)}
                        className={selectCls}
                      >
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <FormField label="Теги">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-[var(--c-bg3)] border border-[var(--c-border2)] px-2.5 py-1 text-xs text-[var(--c-text2)]">
                          {t}
                          <button onClick={() => removeTag(t)} className="text-[var(--c-text3)] hover:text-[var(--c-red)]">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTag()}
                        placeholder="Добавить тег..."
                        className={cn(inputCls, "flex-1")}
                      />
                      <button onClick={addTag} className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                        <Plus size={14} /> Добавить
                      </button>
                    </div>
                  </FormField>
                </FormSection>

                <FormSection title="Статус">
                  <div className="flex gap-3">
                    {(["active", "draft"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                          "flex-1 rounded-xl border py-3 text-sm font-medium transition",
                          status === s
                            ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                            : "border-[var(--c-border2)] text-[var(--c-text2)] hover:border-white/25",
                        )}
                      >
                        {s === "active" ? "Активный" : "Черновик"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--c-text3)]">
                    {status === "active"
                      ? "Товар сразу будет доступен в выбранных каналах продаж"
                      : "Товар будет сохранён как черновик и не будет виден покупателям"}
                  </p>
                </FormSection>

                <FormSection title="Каналы продаж">
                  <p className="text-xs text-[var(--c-text2)] mb-3">Выберите, где продаётся этот товар</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(CHANNEL_LABELS) as [SalesChannel, string][]).map(([ch, label]) => (
                      <button
                        key={ch}
                        onClick={() => toggleChannel(ch)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition text-left",
                          channels.includes(ch)
                            ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                            : "border-[var(--c-border2)] text-[var(--c-text2)] hover:border-white/25",
                        )}
                      >
                        <div className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          channels.includes(ch)
                            ? "border-[var(--c-green)] bg-[var(--c-green)]"
                            : "border-[var(--c-border2)]",
                        )}>
                          {channels.includes(ch) && <Check size={10} className="text-[var(--c-bg)]" />}
                        </div>
                        {label}
                      </button>
                    ))}
                  </div>
                </FormSection>
              </>
            )}

            {/* ── PRICING ──────────────────────────────────── */}
            {tab === "pricing" && (
              <>
                <FormSection title="Цены">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Цена продажи (₽)" required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                          className={cn(inputCls, "pl-7")}
                        />
                      </div>
                    </FormField>
                    <FormField label="Закупочная цена (₽)" required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
                        <input
                          type="number"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          placeholder="0"
                          className={cn(inputCls, "pl-7")}
                        />
                      </div>
                    </FormField>
                    <FormField label="Стоимость упаковки (₽)">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
                        <input
                          type="number"
                          value={packagingCost}
                          onChange={(e) => setPackagingCost(e.target.value)}
                          placeholder="0"
                          className={cn(inputCls, "pl-7")}
                        />
                      </div>
                    </FormField>
                    <FormField label="Доставка (₽)">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
                        <input
                          type="number"
                          value={deliveryCost}
                          onChange={(e) => setDeliveryCost(e.target.value)}
                          placeholder="0"
                          className={cn(inputCls, "pl-7")}
                        />
                      </div>
                    </FormField>
                    <FormField label="Комиссия канала (%)">
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">%</span>
                        <input
                          type="number"
                          value={channelCommission}
                          onChange={(e) => setChannelCommission(e.target.value)}
                          placeholder="0"
                          className={cn(inputCls, "pr-7")}
                        />
                      </div>
                    </FormField>
                  </div>
                </FormSection>

                {/* Margin calculator */}
                {priceNum > 0 && costNum > 0 && (
                  <FormSection title="Расчёт маржи">
                    <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4 space-y-3">
                      <MarginRow label="Цена продажи" value={`${priceNum.toLocaleString("ru-RU")} ₽`} />
                      <MarginRow label="Закупочная цена" value={`−${costNum.toLocaleString("ru-RU")} ₽`} subtle />
                      {packagingNum > 0 && <MarginRow label="Упаковка" value={`−${packagingNum.toLocaleString("ru-RU")} ₽`} subtle />}
                      {deliveryNum > 0 && <MarginRow label="Доставка" value={`−${deliveryNum.toLocaleString("ru-RU")} ₽`} subtle />}
                      {commissionNum > 0 && <MarginRow label={`Комиссия ${commissionNum}%`} value={`−${(priceNum * commissionNum / 100).toFixed(0)} ₽`} subtle />}
                      <div className="border-t border-[var(--c-border)] pt-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--c-text)]">Чистая прибыль</span>
                        <span className={cn("text-base font-semibold tabular", netProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                          {netProfit.toFixed(0)} ₽
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--c-text)]">Маржа</span>
                        <span className={cn("text-2xl font-bold tabular", grossMargin >= 30 ? "text-[var(--c-green)]" : grossMargin >= 15 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]")}>
                          {grossMargin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--c-bg2)] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", grossMargin >= 30 ? "bg-[var(--c-green)]" : grossMargin >= 15 ? "bg-[var(--c-amber)]" : "bg-[var(--c-red)]")}
                          style={{ width: `${Math.min(100, Math.max(0, grossMargin))}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--c-text3)]">
                        {grossMargin >= 30 ? "Сильная маржа — товар выгодный" : grossMargin >= 15 ? "Рабочая маржа — следите за затратами" : "Слабая маржа — пересмотрите цену или закупку"}
                      </p>
                    </div>
                  </FormSection>
                )}
              </>
            )}

            {/* ── INVENTORY ────────────────────────────────── */}
            {tab === "inventory" && (
              <>
                <FormSection title="Артикул и штрихкод">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="SKU / Артикул">
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="ORG-001"
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="Штрихкод (EAN/GTIN)">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder="4680001234567"
                          className={cn(inputCls, "flex-1")}
                        />
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                          <Camera size={15} />
                        </button>
                        <button className="flex h-9 px-2 items-center justify-center rounded-lg border border-[var(--c-border2)] text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                          Авто
                        </button>
                      </div>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Отслеживание остатков">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setTrackInventory(!trackInventory)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition",
                        trackInventory ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all",
                        trackInventory ? "left-6" : "left-1",
                      )} />
                    </div>
                    <span className="text-sm text-[var(--c-text)]">Отслеживать остатки</span>
                  </label>
                  {!trackInventory && (
                    <div className="flex items-start gap-2 rounded-lg bg-[var(--c-amber-dim)] border border-[rgba(245,166,35,0.2)] p-3">
                      <Info size={15} className="shrink-0 mt-0.5 text-[var(--c-amber)]" />
                      <p className="text-xs text-[var(--c-amber)]">При отключённом отслеживании система не будет учитывать остатки. Подходит для услуг и цифровых товаров.</p>
                    </div>
                  )}
                </FormSection>

                {trackInventory && (
                  <FormSection title="Количество по локациям">
                    <div className="space-y-2">
                      {LOCATIONS.filter((l) => !["damaged", "returns", "in_transit"].includes(l.type)).map((loc) => (
                        <div key={loc.id} className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--c-text)]">{loc.name}</p>
                            <p className="text-xs text-[var(--c-text3)]">{loc.type === "warehouse" ? "Склад" : loc.type === "store" ? "Магазин" : loc.type === "showroom" ? "Шоурум" : "Онлайн"}</p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={selectedLocations[loc.id] ?? ""}
                            onChange={(e) => setSelectedLocations((prev) => ({ ...prev, [loc.id]: e.target.value }))}
                            className="w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular"
                          />
                        </div>
                      ))}
                    </div>
                  </FormSection>
                )}

                <FormSection title="Поставщик">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Выберите поставщика</option>
                    {SUPPLIERS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                    ))}
                  </select>
                  <button className="flex items-center gap-2 text-xs text-[var(--c-green)] hover:opacity-80 transition">
                    <Plus size={12} />
                    Создать нового поставщика
                  </button>
                </FormSection>
              </>
            )}

            {/* ── VARIANTS ─────────────────────────────────── */}
            {tab === "variants" && (
              <>
                <FormSection title="Варианты товара">
                  <p className="text-sm text-[var(--c-text2)]">
                    Добавьте варианты, если товар продаётся в разных размерах, цветах или других параметрах.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <div
                      onClick={() => setHasVariants(!hasVariants)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition",
                        hasVariants ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all",
                        hasVariants ? "left-6" : "left-1",
                      )} />
                    </div>
                    <span className="text-sm text-[var(--c-text)]">Товар имеет варианты</span>
                  </label>
                </FormSection>

                {hasVariants && (
                  <>
                    <FormSection title="Параметры вариантов">
                      {options.map((opt, idx) => (
                        <div key={idx} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-[var(--c-text)]">{opt.name}</p>
                            <button onClick={() => removeOption(idx)} className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {opt.values.map((v) => (
                              <span key={v} className="rounded-full bg-[var(--c-bg2)] border border-[var(--c-border2)] px-2.5 py-1 text-xs text-[var(--c-text2)]">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {!addingOption ? (
                        <button
                          onClick={() => setAddingOption(true)}
                          className="flex items-center gap-2 text-sm text-[var(--c-green)] hover:opacity-80 transition"
                        >
                          <Plus size={14} />
                          Добавить параметр (цвет, размер...)
                        </button>
                      ) : (
                        <div className="rounded-xl border border-[var(--c-green)] bg-[var(--c-green-dim)] p-4 space-y-3">
                          <FormField label="Название параметра">
                            <input
                              type="text"
                              value={newOptionName}
                              onChange={(e) => setNewOptionName(e.target.value)}
                              placeholder="Размер, Цвет, Объём..."
                              className={inputCls}
                            />
                          </FormField>
                          <FormField label="Значения (через запятую)">
                            <input
                              type="text"
                              value={newOptionValues}
                              onChange={(e) => setNewOptionValues(e.target.value)}
                              placeholder="S, M, L, XL или Красный, Синий, Чёрный"
                              className={inputCls}
                            />
                          </FormField>
                          <div className="flex gap-2">
                            <button onClick={addOption} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-medium text-[var(--c-bg)] transition hover:bg-[#25e890]">
                              <Check size={14} /> Добавить
                            </button>
                            <button onClick={() => setAddingOption(false)} className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] transition hover:text-[var(--c-text)]">
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                    </FormSection>

                    {options.length > 0 && (
                      <FormSection title="Таблица вариантов">
                        <p className="text-xs text-[var(--c-text2)] mb-3">
                          Система создаст {options.reduce((acc, o) => acc * o.values.length, 1)} вариантов
                        </p>
                        <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">Вариант</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">SKU</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">Цена</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">Остаток</th>
                              </tr>
                            </thead>
                            <tbody>
                              {generateVariants(options).slice(0, 10).map((combo, i) => (
                                <tr key={i} className="border-b border-[var(--c-border)] last:border-0">
                                  <td className="px-4 py-2 text-[var(--c-text)]">{combo}</td>
                                  <td className="px-4 py-2 text-[var(--c-text3)]">{(sku || "SKU") + "-" + combo.replace(/\s*\/\s*/g, "-").replace(/\s+/g, "").toUpperCase()}</td>
                                  <td className="px-4 py-2 text-right text-[var(--c-text)]">
                                    <input type="number" defaultValue={priceNum || ""} className="w-20 rounded border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 py-1 text-right text-xs focus:outline-none" />
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <input type="number" defaultValue={0} className="w-16 rounded border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 py-1 text-right text-xs focus:outline-none" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </FormSection>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── SHIPPING ─────────────────────────────────── */}
            {tab === "shipping" && (
              <FormSection title="Габариты и вес">
                <p className="text-sm text-[var(--c-text2)] mb-4">Используется для расчёта стоимости логистики и маркировки упаковки</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Вес (кг)">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.5"
                      className={inputCls}
                    />
                  </FormField>
                  <div />
                  <FormField label="Длина (см)">
                    <input type="number" value={length} onChange={(e) => setLength(e.target.value)} placeholder="30" className={inputCls} />
                  </FormField>
                  <FormField label="Ширина (см)">
                    <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="20" className={inputCls} />
                  </FormField>
                  <FormField label="Высота (см)">
                    <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="10" className={inputCls} />
                  </FormField>
                </div>
                {weight && length && width && height && (
                  <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4 space-y-2">
                    <p className="text-xs font-medium text-[var(--c-text2)] uppercase tracking-wide">Расчёт логистики WB</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--c-text2)]">Объём (дм³)</span>
                      <span className="text-[var(--c-text)] tabular">{(parseFloat(length) * parseFloat(width) * parseFloat(height) / 1000).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--c-text2)]">Ориентир. тариф WB</span>
                      <span className="text-[var(--c-text)] tabular">≈ {Math.round(parseFloat(weight) * 45 + parseFloat(length) * parseFloat(width) * parseFloat(height) / 1000 * 120)} ₽</span>
                    </div>
                  </div>
                )}
              </FormSection>
            )}

            {/* ── LABELING ─────────────────────────────────── */}
            {tab === "labeling" && (
              <>
                <FormSection title="Маркировка">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setRequiresLabeling(!requiresLabeling)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition",
                        requiresLabeling ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all",
                        requiresLabeling ? "left-6" : "left-1",
                      )} />
                    </div>
                    <span className="text-sm text-[var(--c-text)]">Товар подлежит маркировке</span>
                  </label>
                </FormSection>

                {requiresLabeling && (
                  <>
                    <FormSection title="Тип маркировки">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "chestny_znak", label: "Честный Знак", emoji: "🏷️" },
                          { value: "egais", label: "ЕГАИС", emoji: "🍷" },
                          { value: "mercury", label: "Меркурий", emoji: "🥩" },
                        ].map((lt) => (
                          <button
                            key={lt.value}
                            onClick={() => setLabelingType(lt.value as typeof labelingType)}
                            className={cn(
                              "rounded-xl border p-3 text-center transition",
                              labelingType === lt.value
                                ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                                : "border-[var(--c-border2)] hover:border-white/25",
                            )}
                          >
                            <div className="text-2xl mb-1">{lt.emoji}</div>
                            <p className={cn("text-xs font-medium", labelingType === lt.value ? "text-[var(--c-green)]" : "text-[var(--c-text2)]")}>{lt.label}</p>
                          </button>
                        ))}
                      </div>
                    </FormSection>

                    <FormSection title="Данные маркировки">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="GTIN / EAN-13">
                          <input
                            type="text"
                            value={gtin}
                            onChange={(e) => setGtin(e.target.value)}
                            placeholder="04600000000000"
                            className={inputCls}
                          />
                        </FormField>
                        <FormField label="Номер партии">
                          <input
                            type="text"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            placeholder="BATCH-2026-001"
                            className={inputCls}
                          />
                        </FormField>
                        <FormField label="Срок годности">
                          <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className={inputCls}
                          />
                        </FormField>
                      </div>
                    </FormSection>

                    <FormSection title="Data Matrix">
                      <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] py-10">
                        <div className="text-center">
                          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--c-bg2)] border border-[var(--c-border)]">
                            <span className="text-2xl">▦</span>
                          </div>
                          <p className="text-sm text-[var(--c-text2)]">Data Matrix код</p>
                          <p className="text-xs text-[var(--c-text3)] mt-1">Будет сгенерирован после сохранения товара</p>
                          <button className="mt-3 flex mx-auto items-center gap-2 rounded-lg bg-[var(--c-bg2)] border border-[var(--c-border2)] px-3 py-2 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                            <Barcode size={13} />
                            Запросить коды в Честный Знак
                          </button>
                        </div>
                      </div>
                    </FormSection>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button
            onClick={onClose}
            className="flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            Отмена
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStatus("draft"); handleSave(); }}
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
            >
              Сохранить как черновик
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saved}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                isValid && !saved
                  ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]"
                  : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
              )}
            >
              {saved ? (
                <><Check size={15} /> Сохранено</>
              ) : (
                "Сохранить товар"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
        {label}
        {required && <span className="ml-1 text-[var(--c-red)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function MarginRow({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", subtle ? "text-[var(--c-text3)]" : "text-[var(--c-text2)]")}>{label}</span>
      <span className={cn("text-sm tabular", subtle ? "text-[var(--c-text3)]" : "text-[var(--c-text)]")}>{value}</span>
    </div>
  );
}

function generateVariants(options: VariantOption[]): string[] {
  if (options.length === 0) return [];
  let result = [""];
  for (const opt of options) {
    const newResult: string[] = [];
    for (const existing of result) {
      for (const val of opt.values) {
        newResult.push(existing ? `${existing} / ${val}` : val);
      }
    }
    result = newResult;
  }
  return result;
}

const inputCls =
  "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition";

const selectCls =
  "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition";
