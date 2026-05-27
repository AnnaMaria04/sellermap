"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Download,
  Upload,
  ChevronDown,
  MoreHorizontal,
  Barcode,
  Copy,
  Archive,
  Trash2,
  Eye,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Package,
} from "lucide-react";
import {
  getAvailableStock,
  getStockStatus,
  getSupplierName,
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductStatus,
  type ProductType,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { StockStatusBadge, ProductStatusBadge } from "./StockStatusBadge";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { StockStat } from "@/components/inventory/ui/StockTerms";
import { cn } from "@/lib/utils";
import { computeProductMetrics, type ABCClass } from "@/lib/inventory/analytics";

type SortKey = "name" | "stock" | "price" | "costPrice" | "margin" | "updatedAt";
type SortDir = "asc" | "desc";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/** Open a dedicated print window with one label per product (name + SKU +
 *  barcode) instead of printing the whole app chrome. */
function printLabels(items: { name: string; sku: string; barcode?: string }[]) {
  if (typeof window === "undefined" || items.length === 0) return;
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  const labels = items
    .map(
      (p) => `<div class="label"><div class="name">${escapeHtml(p.name)}</div>` +
        `<div class="sku">SKU: ${escapeHtml(p.sku)}</div>` +
        `<div class="bc">${escapeHtml(p.barcode ?? "—")}</div></div>`,
    )
    .join("");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Этикетки</title><style>` +
      `@page{margin:8mm}body{font-family:system-ui,sans-serif;margin:0}` +
      `.label{width:58mm;padding:4mm;border:1px solid #ccc;border-radius:4px;margin:0 0 4mm;page-break-inside:avoid}` +
      `.name{font-size:12px;font-weight:600;line-height:1.2}.sku{font-size:10px;color:#555;margin-top:2px}` +
      `.bc{font-family:monospace;font-size:15px;letter-spacing:2px;margin-top:6px}` +
      `</style></head><body>${labels}` +
      `<script>window.onload=function(){window.print();}<\/script></body></html>`,
  );
  w.document.close();
}

function SortButton({
  col, label, sortKey, onSort,
}: { col: SortKey; label: string; sortKey: SortKey; onSort: (col: SortKey) => void }) {
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
      onClick={() => onSort(col)}
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === col ? "text-[var(--c-green)]" : ""} />
    </button>
  );
}

function AbcBadge({ cls }: { cls: ABCClass }) {
  return (
    <span className={cn(
      "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
      cls === "A" ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" :
      cls === "B" ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]" :
      "bg-[var(--c-bg3)] text-[var(--c-text3)]",
    )}>
      {cls}
    </span>
  );
}

export function ProductsTable({ onAddProduct, onImport, initialStockFilter }: { onAddProduct?: () => void; onImport?: () => void; initialStockFilter?: "all" | "low" | "out" | "in" }) {
  const { products, locations, movements } = useInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ProductType | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "in">(initialStockFilter ?? "all");
  const [abcFilter, setAbcFilter] = useState<ABCClass | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const metricsMap = useMemo(() => {
    const metrics = computeProductMetrics(products, movements);
    return new Map(metrics.map((m) => [m.product.id, m]));
  }, [products, movements]);

  const filtered = useMemo(() => {
    let list = [...products];

    // Hide archived by default unless showArchived toggle is on
    if (!showArchived && statusFilter === "all") {
      list = list.filter((p) => p.status !== "archived");
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.includes(q),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (typeFilter !== "all") {
      list = list.filter((p) => p.productType === typeFilter);
    }

    if (locationFilter !== "all") {
      list = list.filter((p) => Object.keys(p.stockByLocation).includes(locationFilter));
    }

    if (stockFilter === "low") {
      list = list.filter((p) => getStockStatus(p) === "low_stock");
    } else if (stockFilter === "out") {
      list = list.filter((p) => getStockStatus(p) === "out_of_stock");
    } else if (stockFilter === "in") {
      list = list.filter((p) => getStockStatus(p) === "in_stock");
    }

    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (sortKey) {
        case "stock":     va = getAvailableStock(a); vb = getAvailableStock(b); break;
        case "price":     va = a.price; vb = b.price; break;
        case "costPrice": va = a.costPrice; vb = b.costPrice; break;
        case "margin":    va = a.margin ?? 0; vb = b.margin ?? 0; break;
        case "updatedAt": va = a.updatedAt; vb = b.updatedAt; break;
        default:          va = a.name; vb = b.name;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    if (abcFilter !== "all") {
      list = list.filter((p) => metricsMap.get(p.id)?.abcClass === abcFilter);
    }

    return list;
  }, [search, statusFilter, typeFilter, locationFilter, stockFilter, abcFilter, showArchived, sortKey, sortDir, products, locations, metricsMap]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const activeFilterCount = [
    statusFilter !== "all",
    typeFilter !== "all",
    locationFilter !== "all",
    stockFilter !== "all",
    abcFilter !== "all",
    showArchived,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по названию, SKU, штрихкоду..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text)]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex h-9 min-w-[44px] items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
            showFilters || activeFilterCount > 0
              ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
              : "border-[var(--c-border2)] bg-transparent text-[var(--c-text2)] hover:border-white/25 hover:text-[var(--c-text)]",
          )}
        >
          <SlidersHorizontal size={14} />
          Фильтры
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--c-green)] text-[10px] font-bold text-[var(--c-bg)]">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {someSelected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--c-text2)]">{selected.size} выбрано</span>
              <BulkActionsMenu
                selectedIds={Array.from(selected)}
                products={filtered}
                onClear={() => setSelected(new Set())}
              />
            </div>
          )}
          <button
            onClick={onImport}
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-transparent px-3 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
          >
            <Upload size={14} />
            Импорт
          </button>
          <button
            onClick={() => {
              const rows = [
                ["Название", "Артикул", "Категория", "Тип", "Цена", "Себестоимость", "В наличии", "Статус"],
                ...filtered.map((p) => [
                  p.name,
                  p.sku,
                  p.category,
                  p.productType,
                  p.price,
                  p.costPrice,
                  p.totalPhysical - p.reservedUnits - p.damagedUnits,
                  p.status,
                ]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
              a.download = `товары_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-transparent px-3 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
          >
            <Download size={14} />
            Экспорт
          </button>
          <button
            onClick={onAddProduct}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] shadow-sm transition hover:bg-[#25e890]"
          >
            <Plus size={15} />
            Добавить товар
          </button>
        </div>
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <FilterSelect
            label="Статус"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ProductStatus | "all")}
            options={[
              { value: "all", label: "Все статусы" },
              { value: "active", label: "Активные" },
              { value: "draft", label: "Черновики" },
              { value: "archived", label: "Архив" },
            ]}
          />
          <FilterSelect
            label="Тип"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as ProductType | "all")}
            options={[
              { value: "all", label: "Все типы" },
              { value: "product", label: "Товар" },
              { value: "ingredient", label: "Ингредиент" },
              { value: "bundle", label: "Комплект" },
              { value: "recipe", label: "Рецепт" },
              { value: "consumable", label: "Расходник" },
              { value: "packaging", label: "Упаковка" },
            ]}
          />
          <FilterSelect
            label="Склад"
            value={locationFilter}
            onChange={setLocationFilter}
            options={[
              { value: "all", label: "Все локации" },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
          <FilterSelect
            label="Остатки"
            value={stockFilter}
            onChange={(v) => setStockFilter(v as "all" | "low" | "out" | "in")}
            options={[
              { value: "all", label: "Все остатки" },
              { value: "in", label: "В наличии" },
              { value: "low", label: "Мало" },
              { value: "out", label: "Нет" },
            ]}
          />
          <FilterSelect
            label="ABC-класс"
            value={abcFilter}
            onChange={(v) => setAbcFilter(v as ABCClass | "all")}
            options={[
              { value: "all", label: "Все классы" },
              { value: "A", label: "A — ключевые (80% ценности)" },
              { value: "B", label: "B — важные (15%)" },
              { value: "C", label: "C — остальные (5%)" },
            ]}
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--c-border2)] bg-[var(--c-bg3)] accent-[var(--c-green)]"
            />
            <span className="text-xs text-[var(--c-text2)]">Показать архивные</span>
          </label>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setLocationFilter("all"); setStockFilter("all"); setAbcFilter("all"); setShowArchived(false); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--c-text2)] hover:text-[var(--c-red)] transition"
            >
              <X size={12} />
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--c-text2)]">
          {filtered.length} {filtered.length === 1 ? "товар" : filtered.length < 5 ? "товара" : "товаров"}
        </p>
      </div>

      {/* Mobile card list — shown only at <768px */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="Товары не найдены"
          description="Попробуйте изменить фильтры или поиск, либо добавьте новый товар."
          action={
            <button
              onClick={onAddProduct}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] shadow-sm transition hover:bg-[#25e890]"
            >
              <Plus size={15} />
              Добавить товар
            </button>
          }
          className="m-4"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <Link
                  href={`/inventory/products/${product.id}`}
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 active:bg-[var(--c-bg3)] transition"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text)] truncate">{product.name}</p>
                    <p className="text-xs text-[var(--c-text3)] font-mono">{product.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[var(--c-text)]">{product.price.toLocaleString("ru-RU")} ₽</p>
                    <StockStatusBadge status={stockStatus} size="sm" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)]">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-[var(--c-border2)] bg-[var(--c-bg3)] accent-[var(--c-green)]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortButton col="name" label="Товар" sortKey={sortKey} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-[var(--c-text2)]">Статус</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-[var(--c-text2)]">Наличие</span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortButton col="stock" label="Остаток" sortKey={sortKey} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortButton col="price" label="Цена" sortKey={sortKey} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortButton col="costPrice" label="Себест." sortKey={sortKey} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortButton col="margin" label="Маржа" sortKey={sortKey} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-[var(--c-text2)]">Тип</span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="text-xs font-medium text-[var(--c-text2)]">ABC</span>
                    </th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const available = getAvailableStock(product);
                    const stockStatus = getStockStatus(product);
                    const isSelected = selected.has(product.id);
                    const productMetrics = metricsMap.get(product.id);

                    return (
                      <tr
                        key={product.id}
                        className={cn(
                          "group border-b border-[var(--c-border)] transition last:border-0 hover:bg-[var(--c-bg3)]",
                          isSelected && "bg-[var(--c-green-dim)]",
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(product.id)}
                            className="h-4 w-4 rounded border-[var(--c-border2)] bg-[var(--c-bg3)] accent-[var(--c-green)]"
                          />
                        </td>

                        {/* Product info */}
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${product.id}`} className="flex items-center gap-3 hover:opacity-80">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)]">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-xl">📦</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--c-text)] leading-tight truncate">{product.name}</p>
                              <p className="text-xs text-[var(--c-text3)] font-mono">{product.sku}</p>
                            </div>
                          </Link>
                        </td>

                        {/* Lifecycle status */}
                        <td className="px-4 py-3">
                          <ProductStatusBadge status={product.status} />
                        </td>

                        {/* Stock availability status */}
                        <td className="px-4 py-3">
                          <StockStatusBadge status={stockStatus} size="sm" />
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3 text-right tabular">
                          <div>
                            <span className={cn(
                              "text-sm font-semibold",
                              stockStatus === "out_of_stock" ? "text-[var(--c-red)]" :
                              stockStatus === "low_stock" ? "text-[var(--c-amber)]" :
                              "text-[var(--c-text)]",
                            )}>
                              {available}
                            </span>
                            <StockStat term="incoming" value={product.inTransitUnits} className="flex justify-end" />
                            <StockStat term="committed" value={product.reservedUnits} className="flex justify-end" />
                            {productMetrics && isFinite(productMetrics.daysOfInventory) && (
                              <p className={cn(
                                "text-[10px] tabular",
                                productMetrics.daysOfInventory < 14 ? "text-[var(--c-amber)]" : "text-[var(--c-text3)]",
                              )}>
                                {Math.round(productMetrics.daysOfInventory)} дн.
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right tabular">
                          <span className="text-sm text-[var(--c-text)]">
                            {product.price.toLocaleString("ru-RU")} ₽
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="px-4 py-3 text-right tabular">
                          <span className="text-sm text-[var(--c-text2)]">
                            {product.costPrice.toLocaleString("ru-RU")} ₽
                          </span>
                        </td>

                        {/* Margin */}
                        <td className="px-4 py-3 text-right tabular">
                          <span className={cn(
                            "text-sm font-medium",
                            (product.margin ?? 0) >= 30 ? "text-[var(--c-green)]" :
                            (product.margin ?? 0) >= 15 ? "text-[var(--c-amber)]" :
                            "text-[var(--c-red)]",
                          )}>
                            {product.margin?.toFixed(1) ?? "—"}%
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--c-text2)]">
                            {PRODUCT_TYPE_LABELS[product.productType]}
                          </span>
                        </td>

                        {/* ABC class */}
                        <td className="px-4 py-3 text-center">
                          {productMetrics && <AbcBadge cls={productMetrics.abcClass} />}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(openActionMenu === product.id ? null : product.id);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {openActionMenu === product.id && (
                              <ProductActionMenu
                                product={product}
                                onClose={() => setOpenActionMenu(null)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--c-text2)]">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function BulkActionsMenu({ selectedIds, products, onClear }: { selectedIds: string[]; products: Product[]; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const { actions } = useInventory();
  const router = useRouter();
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  function exportSelected() {
    const rows = [
      ["Название", "Артикул", "Категория", "Цена", "Себестоимость", "В наличии", "Статус"],
      ...selectedProducts.map((p) => [p.name, p.sku, p.category, p.price, p.costPrice, p.totalPhysical, p.status]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `товары_выбрано_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-transparent px-3 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
      >
        Действия
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
            <div className="p-1">
              <MenuItem icon={Archive} label="Архивировать" onClick={() => { selectedIds.forEach((id) => actions.archiveProduct(id)); onClear(); setOpen(false); }} />
              <MenuItem icon={Download} label="Экспортировать" onClick={exportSelected} />
              <MenuItem icon={Barcode} label="Печать этикеток" onClick={() => { setOpen(false); printLabels(products.filter((p) => selectedIds.includes(p.id))); }} />
              <MenuItem icon={ShoppingCart} label="Создать заказ" onClick={() => router.push("/inventory/purchase-orders")} />
              <MenuItem icon={X} label="Снять выделение" onClick={onClear} danger />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProductActionMenu({ product, onClose }: { product: Product; onClose: () => void }) {
  const { actions } = useInventory();
  const router = useRouter();

  function duplicate() {
    const newId = `prod-copy-${Date.now()}`;
    actions.addProduct({
      ...product,
      id: newId,
      name: `Копия — ${product.name}`,
      sku: `${product.sku}-2`,
      status: "draft",
      stockByLocation: {},
      totalPhysical: 0,
      reservedUnits: 0,
      damagedUnits: 0,
      inTransitUnits: 0,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    });
    onClose();
    router.push(`/inventory/products/${newId}`);
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl"
      onMouseLeave={onClose}
    >
      <div className="p-1">
        <Link href={`/inventory/products/${product.id}`}>
          <MenuItem icon={Eye} label="Открыть" />
        </Link>
        <MenuItem icon={Barcode} label="Штрихкод" onClick={() => { onClose(); printLabels([product]); }} />
        <MenuItem icon={Copy} label="Дублировать" onClick={duplicate} />
        <MenuItem icon={ShoppingCart} label="Создать заказ" onClick={() => { onClose(); router.push("/inventory/purchase-orders"); }} />
        <div className="my-1 border-t border-[var(--c-border)]" />
        <MenuItem icon={Archive} label="Архивировать" onClick={() => { actions.archiveProduct(product.id); onClose(); }} />
        <MenuItem icon={Trash2} label="Удалить" danger onClick={() => { actions.deleteProduct(product.id); onClose(); }} />
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
        danger
          ? "text-[var(--c-red)] hover:bg-[var(--c-red-dim)]"
          : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// needed for bundle icon
function ShoppingCart(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  );
}
