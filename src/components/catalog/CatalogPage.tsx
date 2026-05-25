"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  X,
  ChevronLeft,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCTS,
  LOCATIONS,
  type Product,
  CHANNEL_LABELS,
} from "@/mock/inventory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvailableStock(p: Product): number {
  return Math.max(
    0,
    p.totalPhysical - p.reservedUnits - p.damagedUnits - p.inTransitUnits,
  );
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

const CHANNEL_COLORS: Record<string, string> = {
  wildberries: "text-purple-400 bg-purple-400/10",
  ozon: "text-sky-400 bg-sky-400/10",
  yandex_market: "text-yellow-500 bg-yellow-500/10",
  website: "text-[var(--c-green)] bg-[var(--c-green-dim)]",
  pos: "text-[var(--c-amber)] bg-[var(--c-amber-dim)]",
  telegram: "text-sky-300 bg-sky-300/10",
  delivery: "text-[var(--c-blue)] bg-[var(--c-blue-dim)]",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Аксессуары: "🎒",
  Одежда: "👕",
  Кофе: "☕",
  Упаковка: "📦",
  Канцтовары: "📓",
  Электроника: "🎧",
  "Спортивное питание": "💪",
  Косметика: "✨",
  "Посуда и кухня": "🍶",
  Спорт: "🏃",
  Игрушки: "🧸",
};

type SortMode =
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "stock_desc";

const SORT_LABELS: Record<SortMode, string> = {
  price_asc: "По цене ↑",
  price_desc: "По цене ↓",
  name_asc: "По названию",
  stock_desc: "По наличию",
};

// ─── Active products only ────────────────────────────────────────────────────
const ACTIVE_PRODUCTS = PRODUCTS.filter((p) => p.status === "active");

const ALL_CATEGORIES = Array.from(
  new Set(ACTIVE_PRODUCTS.map((p) => p.category)),
).sort();

// ─── Stock badge ─────────────────────────────────────────────────────────────

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return (
      <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--c-red-dim)] text-[var(--c-red)] border border-[var(--c-red)]/20">
        Нет в наличии
      </span>
    );
  }
  if (available <= 5) {
    return (
      <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--c-amber-dim)] text-[var(--c-amber)] border border-[var(--c-amber)]/20">
        Мало
      </span>
    );
  }
  return (
    <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--c-green-dim)] text-[var(--c-green)] border border-[var(--c-green)]/20">
      В наличии
    </span>
  );
}

// ─── Product image area ───────────────────────────────────────────────────────

function ProductImage({ product }: { product: Product }) {
  const emoji = CATEGORY_EMOJIS[product.category] ?? "📦";

  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.setAttribute("data-fallback", "true");
            parent.innerHTML = `<span class="text-4xl select-none" aria-hidden="true">${emoji}</span>`;
          }
        }}
      />
    );
  }

  return (
    <span className="text-4xl select-none" aria-hidden="true">
      {emoji}
    </span>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (p: Product) => void;
}) {
  const available = getAvailableStock(product);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-[var(--c-bg2)] transition-all duration-200",
        "border-[var(--c-border)] hover:border-[var(--c-border2)] hover:scale-[1.015] hover:shadow-lg hover:shadow-black/30",
      )}
    >
      {/* Image */}
      <div className="relative h-[120px] w-full overflow-hidden rounded-t-xl bg-[var(--c-bg3)] flex items-center justify-center">
        <ProductImage product={product} />
        <StockBadge available={available} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Category */}
        <span className="inline-flex self-start rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-text3)]">
          {product.category}
        </span>

        {/* Name */}
        <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--c-text)]">
          {product.name}
        </p>

        {/* Price */}
        <p className="text-lg font-bold text-[var(--c-text)] tabular">
          {formatPrice(product.price)}
        </p>

        {/* Stock */}
        <p className="text-xs text-[var(--c-text3)]">
          Доступно:{" "}
          <span
            className={cn(
              "font-medium",
              available === 0
                ? "text-[var(--c-red)]"
                : available <= 5
                  ? "text-[var(--c-amber)]"
                  : "text-[var(--c-green)]",
            )}
          >
            {available} шт
          </span>
        </p>

        {/* Channels */}
        {product.channels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.channels.slice(0, 3).map((ch) => (
              <span
                key={ch}
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  CHANNEL_COLORS[ch] ?? "text-[var(--c-text3)] bg-[var(--c-bg3)]",
                )}
              >
                {ch === "yandex_market"
                  ? "Я.М"
                  : ch === "wildberries"
                    ? "WB"
                    : ch === "website"
                      ? "Сайт"
                      : ch === "telegram"
                        ? "TG"
                        : ch === "delivery"
                          ? "Дост."
                          : ch.toUpperCase()}
              </span>
            ))}
            {product.channels.length > 3 && (
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-[var(--c-text3)] bg-[var(--c-bg3)]">
                +{product.channels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Button */}
        <button
          onClick={() => onOpen(product)}
          className={cn(
            "mt-auto w-full rounded-lg border border-[var(--c-border2)] py-2 text-xs font-medium",
            "text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
          )}
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const available = getAvailableStock(product);
  const emoji = CATEGORY_EMOJIS[product.category] ?? "📦";

  const locationEntries = Object.entries(product.stockByLocation).filter(
    ([, qty]) => qty > 0,
  );

  const locationName = (id: string) =>
    LOCATIONS.find((l) => l.id === id)?.name ?? id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto",
          "rounded-t-2xl sm:rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          aria-label="Закрыть"
        >
          <X size={15} />
        </button>

        <div className="p-5 pb-8 sm:p-6">
          {/* Image */}
          <div className="mb-5 h-48 w-full overflow-hidden rounded-xl bg-[var(--c-bg3)] flex items-center justify-center">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                }}
              />
            ) : (
              <span className="text-7xl select-none">{emoji}</span>
            )}
          </div>

          {/* Header */}
          <div className="mb-4 flex flex-wrap items-start gap-2">
            <span className="rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] px-2.5 py-0.5 text-xs text-[var(--c-text3)]">
              {product.category}
            </span>
            {available === 0 ? (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--c-red-dim)] text-[var(--c-red)]">
                Нет в наличии
              </span>
            ) : available <= 5 ? (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--c-amber-dim)] text-[var(--c-amber)]">
                Мало
              </span>
            ) : (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--c-green-dim)] text-[var(--c-green)]">
                В наличии
              </span>
            )}
          </div>

          <h2 className="mb-1 text-xl font-semibold text-[var(--c-text)]">
            {product.name}
          </h2>

          {/* Price */}
          <p className="mb-4 text-3xl font-bold text-[var(--c-text)] tabular">
            {formatPrice(product.price)}
          </p>

          {/* Description */}
          {product.description && (
            <p className="mb-5 text-sm leading-relaxed text-[var(--c-text2)]">
              {product.description}
            </p>
          )}

          {/* Divider */}
          <div className="mb-5 h-px bg-[var(--c-border)]" />

          {/* Stock by location */}
          {locationEntries.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                Наличие по складам
              </h3>
              <div className="space-y-1.5">
                {locationEntries.map(([locId, qty]) => (
                  <div
                    key={locId}
                    className="flex items-center justify-between rounded-lg bg-[var(--c-bg3)] px-3 py-2 text-sm"
                  >
                    <span className="text-[var(--c-text2)]">
                      {locationName(locId)}
                    </span>
                    <span className="font-semibold text-[var(--c-text)]">
                      {qty} шт
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weight & dimensions */}
          {(product.weight || product.dimensions) && (
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                Характеристики
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.weight && (
                  <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm">
                    <span className="text-[var(--c-text3)]">Вес: </span>
                    <span className="font-medium text-[var(--c-text)]">
                      {product.weight < 1
                        ? `${Math.round(product.weight * 1000)} г`
                        : `${product.weight} кг`}
                    </span>
                  </div>
                )}
                {product.dimensions && (
                  <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm">
                    <span className="text-[var(--c-text3)]">Габариты: </span>
                    <span className="font-medium text-[var(--c-text)]">
                      {product.dimensions.length}×{product.dimensions.width}×
                      {product.dimensions.height} см
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Channels */}
          {product.channels.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                Каналы продаж
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.channels.map((ch) => (
                  <span
                    key={ch}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      CHANNEL_COLORS[ch] ?? "text-[var(--c-text2)] bg-[var(--c-bg3)]",
                    )}
                  >
                    {CHANNEL_LABELS[ch]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {product.hasVariants && product.variants.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                Варианты товара
              </h3>
              <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--c-text3)]">
                        Вариант
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--c-text3)]">
                        Цена
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--c-text3)]">
                        На складе
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v, i) => {
                      const varStock = Object.values(v.stock).reduce(
                        (a, b) => a + b,
                        0,
                      );
                      return (
                        <tr
                          key={v.id}
                          className={cn(
                            "border-b border-[var(--c-border)] last:border-0",
                            i % 2 === 1 ? "bg-[var(--c-bg3)]/40" : "",
                          )}
                        >
                          <td className="px-3 py-2 text-[var(--c-text)]">
                            {v.name}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-[var(--c-text)] tabular">
                            {formatPrice(v.price)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right font-medium tabular",
                              varStock === 0
                                ? "text-[var(--c-red)]"
                                : varStock <= 3
                                  ? "text-[var(--c-amber)]"
                                  : "text-[var(--c-green)]",
                            )}
                          >
                            {varStock} шт
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sort button ─────────────────────────────────────────────────────────────

function SortButton({
  mode,
  current,
  onSelect,
}: {
  mode: SortMode;
  current: SortMode;
  onSelect: (m: SortMode) => void;
}) {
  const active = mode === current;
  return (
    <button
      onClick={() => onSelect(mode)}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
        active
          ? "border-[var(--c-green)]/40 bg-[var(--c-green-dim)] text-[var(--c-green)]"
          : "border-[var(--c-border)] bg-[var(--c-bg2)] text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
      )}
    >
      {SORT_LABELS[mode]}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Все");
  const [sort, setSort] = useState<SortMode>("stock_desc");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const openModal = useCallback((p: Product) => setSelected(p), []);
  const closeModal = useCallback(() => setSelected(null), []);

  const filtered = useMemo(() => {
    let list = ACTIVE_PRODUCTS;

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }

    // Category
    if (category !== "Все") {
      list = list.filter((p) => p.category === category);
    }

    // Price
    const min = parseFloat(priceMin);
    const max = parseFloat(priceMax);
    if (!isNaN(min)) list = list.filter((p) => p.price >= min);
    if (!isNaN(max)) list = list.filter((p) => p.price <= max);

    // Sort
    const sorted = [...list];
    if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name_asc")
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    else if (sort === "stock_desc")
      sorted.sort((a, b) => getAvailableStock(b) - getAvailableStock(a));

    return sorted;
  }, [search, category, sort, priceMin, priceMax]);

  const totalActive = ACTIVE_PRODUCTS.length;

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* Breadcrumb */}
      <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <ChevronLeft size={15} />
            Вернуться на склад
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[var(--c-text)]">
              Каталог товаров
            </h1>
            <span className="rounded-full border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-1 text-sm font-semibold text-[var(--c-text2)]">
              {totalActive} товаров
            </span>
          </div>
          <p className="text-sm text-[var(--c-text3)]">
            Актуальный ассортимент с ценами и наличием на складах
          </p>
        </div>

        {/* Search + Filter toggle */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-[40%]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
            />
            <input
              type="text"
              placeholder="Поиск по названию, артикулу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-2.5 pl-9 pr-4 text-sm",
                "text-[var(--c-text)] placeholder:text-[var(--c-text3)]",
                "focus:border-[var(--c-border2)] focus:outline-none focus:ring-1 focus:ring-[var(--c-green)]/20",
                "transition",
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:ml-auto",
              filtersOpen
                ? "border-[var(--c-green)]/40 bg-[var(--c-green-dim)] text-[var(--c-green)]"
                : "border-[var(--c-border)] bg-[var(--c-bg2)] text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
            )}
          >
            <SlidersHorizontal size={15} />
            Фильтры
            {(priceMin || priceMax) && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--c-green)] text-[9px] font-bold text-[var(--c-bg)]">
                !
              </span>
            )}
          </button>
        </div>

        {/* Expandable filters (price range) */}
        {filtersOpen && (
          <div className="mb-5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--c-text3)]">
                  Цена от (₽)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className={cn(
                    "w-32 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm",
                    "text-[var(--c-text)] placeholder:text-[var(--c-text3)]",
                    "focus:border-[var(--c-border2)] focus:outline-none",
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--c-text3)]">
                  Цена до (₽)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="∞"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className={cn(
                    "w-32 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm",
                    "text-[var(--c-text)] placeholder:text-[var(--c-text3)]",
                    "focus:border-[var(--c-border2)] focus:outline-none",
                  )}
                />
              </div>
              {(priceMin || priceMax) && (
                <button
                  onClick={() => {
                    setPriceMin("");
                    setPriceMax("");
                  }}
                  className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category chips */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["Все", ...ALL_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition",
                category === cat
                  ? "border-[var(--c-green)]/40 bg-[var(--c-green-dim)] text-[var(--c-green)]"
                  : "border-[var(--c-border)] bg-[var(--c-bg2)] text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
              )}
            >
              {cat === "Все" ? "Все" : (CATEGORY_EMOJIS[cat] ? `${CATEGORY_EMOJIS[cat]} ` : "") + cat}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-[var(--c-text3)]">
            <ArrowUpDown size={13} />
            Сортировка:
          </span>
          {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
            <SortButton key={m} mode={m} current={sort} onSelect={setSort} />
          ))}
        </div>

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[var(--c-text3)]">
            Найдено:{" "}
            <span className="font-semibold text-[var(--c-text2)]">
              {filtered.length}
            </span>{" "}
            товаров
          </p>
          {(search || category !== "Все" || priceMin || priceMax) && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("Все");
                setPriceMin("");
                setPriceMax("");
              }}
              className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition underline underline-offset-2"
            >
              Сбросить все фильтры
            </button>
          )}
        </div>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package
              size={48}
              className="mx-auto mb-4 text-[var(--c-text3)]"
            />
            <p className="text-[var(--c-text2)]">
              Нет товаров по вашему запросу
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("Все");
                setPriceMin("");
                setPriceMax("");
              }}
              className="mt-4 text-sm text-[var(--c-green)] hover:underline underline-offset-2 transition"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={openModal} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && <DetailModal product={selected} onClose={closeModal} />}
    </div>
  );
}
