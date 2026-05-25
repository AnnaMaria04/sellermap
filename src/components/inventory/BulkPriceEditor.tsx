"use client";

import { useState, useMemo } from "react";
import {
  Check,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Filter,
  BarChart2,
  DollarSign,
  Percent,
} from "lucide-react";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

type SortField = "name" | "price" | "cost" | "margin";
type SortDir = "asc" | "desc";

const PRICE_HISTORY: Record<string, number> = {
  "prod-001": 2690,
  "prod-002": 1390,
  "prod-007": 3490,
};

function formatRub(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

function calcMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

export function BulkPriceEditor({ onClose }: { onClose?: () => void }) {
  const { products, actions } = useInventory();
  const activeProducts = products.filter((p) => p.status === "active");
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [applied, setApplied] = useState(false);

  const [bulkOp, setBulkOp] = useState<"set" | "increase_pct" | "decrease_pct" | "margin">("set");
  const [bulkVal, setBulkVal] = useState("");

  const rows = useMemo(() => {
    let list = activeProducts.map((p) => ({
      product: p,
      currentPrice: p.price,
      newPrice: prices.get(p.id) ?? p.price,
      historyPrice: PRICE_HISTORY[p.id],
    }));

    if (onlyChanged) {
      list = list.filter((r) => prices.has(r.product.id) && prices.get(r.product.id) !== r.product.price);
    }

    list.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortField === "name") return sortDir === "asc" ? a.product.name.localeCompare(b.product.name, "ru") : b.product.name.localeCompare(a.product.name, "ru");
      if (sortField === "price") { av = a.currentPrice; bv = b.currentPrice; }
      if (sortField === "cost") { av = a.product.costPrice; bv = b.product.costPrice; }
      if (sortField === "margin") { av = a.product.margin ?? 0; bv = b.product.margin ?? 0; }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [activeProducts, prices, onlyChanged, sortField, sortDir]);

  const changedCount = useMemo(() => {
    let count = 0;
    activeProducts.forEach((p) => {
      const np = prices.get(p.id);
      if (np !== undefined && np !== p.price) count++;
    });
    return count;
  }, [activeProducts, prices]);

  const avgChangePct = useMemo(() => {
    let sum = 0; let cnt = 0;
    activeProducts.forEach((p) => {
      const np = prices.get(p.id);
      if (np !== undefined && np !== p.price && p.price > 0) {
        sum += ((np - p.price) / p.price) * 100;
        cnt++;
      }
    });
    return cnt > 0 ? Math.round(sum / cnt * 10) / 10 : 0;
  }, [activeProducts, prices]);

  const totalGmvOld = useMemo(
    () => activeProducts.reduce((s, p) => s + p.price * p.totalPhysical, 0),
    [activeProducts]
  );
  const totalGmvNew = useMemo(
    () => activeProducts.reduce((s, p) => s + (prices.get(p.id) ?? p.price) * p.totalPhysical, 0),
    [activeProducts, prices]
  );

  function setPrice(id: string, val: number) {
    setPrices((prev) => new Map(prev).set(id, Math.max(0, val)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.product.id)));
    }
  }

  function applyBulk() {
    const val = parseFloat(bulkVal);
    if (isNaN(val)) return;
    const targets = selected.size > 0 ? [...selected] : activeProducts.map((p) => p.id);
    setPrices((prev) => {
      const next = new Map(prev);
      targets.forEach((id) => {
        const product = activeProducts.find((p) => p.id === id);
        if (!product) return;
        const base = prev.get(id) ?? product.price;
        let newP = base;
        if (bulkOp === "set") newP = val;
        else if (bulkOp === "increase_pct") newP = Math.round(base * (1 + val / 100));
        else if (bulkOp === "decrease_pct") newP = Math.round(base * (1 - val / 100));
        else if (bulkOp === "margin") newP = product.costPrice > 0 ? Math.round(product.costPrice / (1 - val / 100)) : base;
        next.set(id, Math.max(1, newP));
      });
      return next;
    });
    setBulkVal("");
  }

  function resetAll() {
    setPrices(new Map());
    setSelected(new Set());
  }

  function handleApply() {
    const updates: Record<string, { price?: number; costPrice?: number }> = {};
    prices.forEach((price, id) => { updates[id] = { price }; });
    actions.updatePrices(updates);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-[var(--c-green)]" /> : <ChevronDown size={12} className="text-[var(--c-green)]" />;
  };

  return (
    <div className="space-y-5 p-6">
      {onClose && (
        <div className="flex items-center justify-between -mt-2 mb-2">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Массовое изменение цен</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--c-bg3)] transition text-[var(--c-text2)]">✕</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Товаров</p>
          <p className="text-xl font-bold text-[var(--c-text)]">{activeProducts.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Изменено</p>
          <p className={cn("text-xl font-bold tabular", changedCount > 0 ? "text-[var(--c-amber)]" : "text-[var(--c-text)]")}>{changedCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Средн. изменение</p>
          <p className={cn("text-xl font-bold tabular", avgChangePct > 0 ? "text-[var(--c-green)]" : avgChangePct < 0 ? "text-[var(--c-red)]" : "text-[var(--c-text)]")}>
            {avgChangePct > 0 ? "+" : ""}{avgChangePct}%
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">GMV (новый)</p>
          <p className="text-xl font-bold tabular text-[var(--c-text)]">{(totalGmvNew / 1000).toFixed(0)} тыс ₽</p>
          {totalGmvNew !== totalGmvOld && (
            <p className={cn("text-[10px] tabular mt-0.5", totalGmvNew > totalGmvOld ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
              {totalGmvNew > totalGmvOld ? "+" : ""}{formatRub(totalGmvNew - totalGmvOld)}
            </p>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="rounded-xl border border-[var(--c-border2)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs font-semibold text-[var(--c-text2)] mb-3">
            Массовое изменение — выбрано {selected.size} товаров
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-1">
              {(
                [
                  { val: "set", label: "Цена", Icon: DollarSign },
                  { val: "increase_pct", label: "+%", Icon: TrendingUp },
                  { val: "decrease_pct", label: "−%", Icon: TrendingDown },
                  { val: "margin", label: "Маржа %", Icon: Percent },
                ] as const
              ).map(({ val, label, Icon }) => (
                <button
                  key={val}
                  onClick={() => setBulkOp(val)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    bulkOp === val ? "bg-[var(--c-bg)] text-[var(--c-text)]" : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                  )}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                placeholder={bulkOp === "set" ? "Новая цена" : "Значение"}
                className="h-9 w-32 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm tabular text-right text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
              />
              <button
                onClick={applyBulk}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--c-blue)] px-4 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                <Check size={13} />
                Применить
              </button>
            </div>

            <button
              onClick={resetAll}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <RotateCcw size={13} />
              Сбросить всё
            </button>
          </div>
        </div>
      )}

      {changedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[rgba(31,209,131,0.2)] bg-[rgba(31,209,131,0.06)] px-5 py-3">
          <p className="text-sm text-[var(--c-text)]">
            <span className="font-semibold text-[var(--c-green)]">Изменено {changedCount} товаров</span>
            {avgChangePct !== 0 && (
              <span className="text-[var(--c-text2)] ml-2">
                · средний рост цены {avgChangePct > 0 ? "+" : ""}{avgChangePct}%
              </span>
            )}
          </p>
          <button
            onClick={handleApply}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              applied
                ? "bg-[var(--c-bg3)] text-[var(--c-green)]"
                : "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
            )}
          >
            {applied ? <><Check size={14} /> Применено</> : "Применить изменения"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOnlyChanged((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition",
            onlyChanged
              ? "border-[var(--c-amber)] bg-[rgba(245,166,35,0.08)] text-[var(--c-amber)]"
              : "border-[var(--c-border)] text-[var(--c-text2)] hover:text-[var(--c-text)]"
          )}
        >
          <Filter size={13} />
          Только изменённые
          {changedCount > 0 && <span className="rounded-full bg-[var(--c-amber)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--c-bg)]">{changedCount}</span>}
        </button>

        <div className="flex items-center gap-3 text-xs text-[var(--c-text3)]">
          <span>Сортировка:</span>
          {([["name", "Название"], ["price", "Цена"], ["cost", "С/С"], ["margin", "Маржа"]] as [SortField, string][]).map(([f, l]) => (
            <button
              key={f}
              onClick={() => handleSort(f)}
              className={cn("flex items-center gap-1 hover:text-[var(--c-text2)] transition", sortField === f && "text-[var(--c-text2)]")}
            >
              {l}
              <SortIcon field={f} />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <div className="border-b border-[var(--c-border)] px-5 py-3 grid gap-3 items-center" style={{ gridTemplateColumns: "28px 1fr 110px 140px 90px 90px 100px" }}>
          <input
            type="checkbox"
            checked={selected.size === rows.length && rows.length > 0}
            onChange={toggleAll}
            className="h-4 w-4 rounded accent-[var(--c-green)]"
          />
          <span className="text-xs font-medium text-[var(--c-text2)]">Товар</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">Тек. цена</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">Новая цена</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">С/С</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">Маржа</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">Изменение</span>
        </div>

        <div className="divide-y divide-[var(--c-border)]">
          {rows.map(({ product, currentPrice, newPrice, historyPrice }) => {
            const isChanged = newPrice !== currentPrice;
            const delta = newPrice - currentPrice;
            const deltaPct = currentPrice > 0 ? Math.round((delta / currentPrice) * 1000) / 10 : 0;
            const newMargin = calcMargin(newPrice, product.costPrice);
            const isSelected = selected.has(product.id);

            return (
              <div
                key={product.id}
                className={cn(
                  "grid gap-3 items-center px-5 py-3 transition",
                  isSelected ? "bg-[rgba(31,209,131,0.04)]" : "hover:bg-[var(--c-bg3)]",
                  isChanged && "bg-[rgba(245,166,35,0.03)]"
                )}
                style={{ gridTemplateColumns: "28px 1fr 110px 140px 90px 90px 100px" }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(product.id)}
                  className="h-4 w-4 rounded accent-[var(--c-green)]"
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{product.name}</p>
                  <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm tabular text-[var(--c-text)]">{formatRub(currentPrice)}</p>
                  {historyPrice && historyPrice !== currentPrice && (
                    <p className="text-[10px] text-[var(--c-text3)]">была {formatRub(historyPrice)}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setPrice(product.id, parseInt(e.target.value) || 0)}
                    className={cn(
                      "h-8 w-28 rounded-lg border px-3 text-sm tabular text-right focus:outline-none transition",
                      isChanged
                        ? "border-[var(--c-amber)] bg-[rgba(245,166,35,0.06)] text-[var(--c-text)] focus:border-[var(--c-amber)]"
                        : "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text)] focus:border-[var(--c-green)]"
                    )}
                  />
                </div>

                <div className="text-right">
                  <p className="text-sm tabular text-[var(--c-text2)]">{formatRub(product.costPrice)}</p>
                </div>

                <div className="text-right">
                  <p className={cn(
                    "text-sm font-medium tabular",
                    newMargin >= 30 ? "text-[var(--c-green)]" : newMargin >= 15 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]"
                  )}>
                    {newMargin}%
                  </p>
                </div>

                <div className="text-right">
                  {isChanged ? (
                    <div className={cn("flex flex-col items-end", delta > 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      <span className="text-xs font-semibold tabular">
                        {delta > 0 ? "+" : ""}{formatRub(delta)}
                      </span>
                      <span className="text-[10px] tabular">
                        {deltaPct > 0 ? "+" : ""}{deltaPct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--c-text3)]">—</span>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="py-16 text-center">
              <BarChart2 size={32} className="mx-auto mb-3 text-[var(--c-text3)]" />
              <p className="text-sm text-[var(--c-text2)]">Нет изменённых товаров</p>
              <p className="text-xs text-[var(--c-text3)] mt-1">Измените цены в таблице, чтобы они отобразились здесь</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4">
        <p className="text-xs text-[var(--c-text3)]">
          Показано {rows.length} из {activeProducts.length} товаров
          · GMV до: {(totalGmvOld / 1000).toFixed(0)} тыс ₽
          · после: {(totalGmvNew / 1000).toFixed(0)} тыс ₽
        </p>
        <div className="flex items-center gap-2">
          {changedCount > 0 && (
            <button
              onClick={resetAll}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <RotateCcw size={13} />
              Сбросить всё
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={changedCount === 0}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              changedCount > 0
                ? applied
                  ? "bg-[var(--c-bg3)] text-[var(--c-green)]"
                  : "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed"
            )}
          >
            {applied ? <><Check size={14} /> Применено</> : "Применить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}
