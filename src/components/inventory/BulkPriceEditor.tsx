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
  Undo2,
  Eye,
  Hash,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { cn, formatRub } from "@/lib/utils";

type SortField = "name" | "price" | "cost" | "margin";
type SortDir = "asc" | "desc";
type BulkOp = "set" | "increase_pct" | "decrease_pct" | "margin" | "round";
type RoundStep = 10 | 50 | 100 | 500;

// Snapshot of prices saved for undo
interface HistoryEntry {
  label: string;
  prices: Map<string, number>;
}

const PRICE_HISTORY: Record<string, number> = {
  "prod-001": 2690,
  "prod-002": 1390,
  "prod-007": 3490,
};

function calcMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function bulkOpLabel(op: BulkOp, val: string, roundStep: RoundStep): string {
  if (op === "increase_pct") return `+${val}%`;
  if (op === "decrease_pct") return `−${val}%`;
  if (op === "set") return `Цена → ${val} ₽`;
  if (op === "margin") return `Маржа ${val}%`;
  if (op === "round") return `Округление до ${roundStep} ₽`;
  return op;
}

export function BulkPriceEditor({ onClose }: { onClose?: () => void }) {
  const { products, actions } = useInventory();
  const activeProducts = products.filter((p) => p.status === "active");

  // pending price overrides (productId → new price)
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  // selected product ids
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [onlyChanged, setOnlyChanged] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Bulk op controls
  const [bulkOp, setBulkOp] = useState<BulkOp>("set");
  const [bulkVal, setBulkVal] = useState("");
  const [roundStep, setRoundStep] = useState<RoundStep>(100);

  // Preview mode: show diff table before applying
  const [showPreview, setShowPreview] = useState(false);

  // Applied indicator
  const [applied, setApplied] = useState(false);

  // Undo history (last applied state)
  const [history, setHistory] = useState<HistoryEntry | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    let list = activeProducts.map((p) => ({
      product: p,
      currentPrice: p.price,
      newPrice: prices.get(p.id) ?? p.price,
      historyPrice: PRICE_HISTORY[p.id],
    }));

    if (onlyChanged) {
      list = list.filter(
        (r) => prices.has(r.product.id) && prices.get(r.product.id) !== r.product.price
      );
    }

    list.sort((a, b) => {
      if (sortField === "name")
        return sortDir === "asc"
          ? a.product.name.localeCompare(b.product.name, "ru")
          : b.product.name.localeCompare(a.product.name, "ru");
      let av = 0,
        bv = 0;
      if (sortField === "price") {
        av = a.currentPrice;
        bv = b.currentPrice;
      }
      if (sortField === "cost") {
        av = a.product.costPrice;
        bv = b.product.costPrice;
      }
      if (sortField === "margin") {
        av = a.product.margin ?? 0;
        bv = b.product.margin ?? 0;
      }
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
    let sum = 0;
    let cnt = 0;
    activeProducts.forEach((p) => {
      const np = prices.get(p.id);
      if (np !== undefined && np !== p.price && p.price > 0) {
        sum += ((np - p.price) / p.price) * 100;
        cnt++;
      }
    });
    return cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : 0;
  }, [activeProducts, prices]);

  const totalGmvOld = useMemo(
    () => activeProducts.reduce((s, p) => s + p.price * p.totalPhysical, 0),
    [activeProducts]
  );
  const totalGmvNew = useMemo(
    () =>
      activeProducts.reduce(
        (s, p) => s + (prices.get(p.id) ?? p.price) * p.totalPhysical,
        0
      ),
    [activeProducts, prices]
  );

  // Items that will appear in the preview table (only those with pending changes)
  const previewRows = useMemo(() => {
    return activeProducts
      .filter((p) => {
        const np = prices.get(p.id);
        return np !== undefined && np !== p.price;
      })
      .map((p) => {
        const newPrice = prices.get(p.id)!;
        const delta = newPrice - p.price;
        const deltaPct =
          p.price > 0 ? Math.round((delta / p.price) * 1000) / 10 : 0;
        return { product: p, currentPrice: p.price, newPrice, delta, deltaPct };
      });
  }, [activeProducts, prices]);

  // ── Actions ───────────────────────────────────────────────────────────────
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
    if (bulkOp !== "round") {
      const val = parseFloat(bulkVal);
      if (isNaN(val)) return;
    }

    const targets =
      selected.size > 0
        ? [...selected]
        : activeProducts.map((p) => p.id);

    setPrices((prev) => {
      const next = new Map(prev);
      targets.forEach((id) => {
        const product = activeProducts.find((p) => p.id === id);
        if (!product) return;
        const base = prev.get(id) ?? product.price;
        let newP = base;
        const val = parseFloat(bulkVal) || 0;

        if (bulkOp === "set") newP = val;
        else if (bulkOp === "increase_pct")
          newP = Math.round(base * (1 + val / 100));
        else if (bulkOp === "decrease_pct")
          newP = Math.round(base * (1 - val / 100));
        else if (bulkOp === "margin")
          newP =
            product.costPrice > 0
              ? Math.round(product.costPrice / (1 - val / 100))
              : base;
        else if (bulkOp === "round") newP = roundTo(base, roundStep);

        next.set(id, Math.max(1, newP));
      });
      return next;
    });

    if (bulkOp !== "round") setBulkVal("");
  }

  function resetAll() {
    setPrices(new Map());
    setSelected(new Set());
    setShowPreview(false);
  }

  // Save snapshot then push to inventory
  function handleApply() {
    // Save current product prices as undo snapshot
    const snapshot = new Map<string, number>();
    prices.forEach((_, id) => {
      const p = activeProducts.find((pr) => pr.id === id);
      if (p) snapshot.set(id, p.price);
    });
    setHistory({
      label: bulkOpLabel(bulkOp, bulkVal, roundStep),
      prices: snapshot,
    });

    const updates: Record<string, { price?: number }> = {};
    prices.forEach((price, id) => {
      updates[id] = { price };
    });
    actions.updatePrices(updates);

    setPrices(new Map());
    setShowPreview(false);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }

  // Restore previous prices
  function handleUndo() {
    if (!history) return;
    const updates: Record<string, { price?: number }> = {};
    history.prices.forEach((price, id) => {
      updates[id] = { price };
    });
    actions.updatePrices(updates);
    setHistory(null);
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-[var(--c-green)]" />
    ) : (
      <ChevronDown size={12} className="text-[var(--c-green)]" />
    );
  };

  const allOnPage = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-6">
      {onClose && (
        <div className="flex items-center justify-between -mt-2 mb-2">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">
            Массовое изменение цен
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--c-bg3)] transition text-[var(--c-text2)]"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Товаров</p>
          <p className="text-xl font-bold text-[var(--c-text)]">
            {activeProducts.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Выбрано</p>
          <p
            className={cn(
              "text-xl font-bold tabular",
              someSelected ? "text-[var(--c-blue)]" : "text-[var(--c-text3)]"
            )}
          >
            {selected.size}
            <span className="text-sm font-normal text-[var(--c-text3)] ml-1">
              из {activeProducts.length}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Изменено</p>
          <p
            className={cn(
              "text-xl font-bold tabular",
              changedCount > 0 ? "text-[var(--c-amber)]" : "text-[var(--c-text)]"
            )}
          >
            {changedCount}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">GMV (новый)</p>
          <p className="text-xl font-bold tabular text-[var(--c-text)]">
            {(totalGmvNew / 1000).toFixed(0)} тыс ₽
          </p>
          {totalGmvNew !== totalGmvOld && (
            <p
              className={cn(
                "text-[10px] tabular mt-0.5",
                totalGmvNew > totalGmvOld
                  ? "text-[var(--c-green)]"
                  : "text-[var(--c-red)]"
              )}
            >
              {totalGmvNew > totalGmvOld ? "+" : ""}
              {formatRub(totalGmvNew - totalGmvOld)}
            </p>
          )}
        </div>
      </div>

      {/* ── Bulk operation panel (always visible) ── */}
      <div className="rounded-xl border border-[var(--c-border2)] bg-[var(--c-bg2)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--c-text2)]">
          Массовое изменение
          {someSelected
            ? ` — выбрано ${selected.size} из ${activeProducts.length} товаров`
            : " — применится ко всем товарам"}
        </p>

        <div className="flex flex-wrap items-end gap-3">
          {/* Op selector */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-1">
            {(
              [
                { val: "set", label: "Цена", Icon: DollarSign },
                { val: "increase_pct", label: "+%", Icon: TrendingUp },
                { val: "decrease_pct", label: "−%", Icon: TrendingDown },
                { val: "margin", label: "Маржа", Icon: Percent },
                { val: "round", label: "Округл.", Icon: Hash },
              ] as { val: BulkOp; label: string; Icon: React.ElementType }[]
            ).map(({ val, label, Icon }) => (
              <button
                key={val}
                onClick={() => setBulkOp(val)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  bulkOp === val
                    ? "bg-[var(--c-bg)] text-[var(--c-text)]"
                    : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                )}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Input / round step */}
          <div className="flex items-center gap-2">
            {bulkOp === "round" ? (
              <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-1">
                {([10, 50, 100, 500] as RoundStep[]).map((step) => (
                  <button
                    key={step}
                    onClick={() => setRoundStep(step)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                      roundStep === step
                        ? "bg-[var(--c-bg)] text-[var(--c-text)]"
                        : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                    )}
                  >
                    {step} ₽
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="number"
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyBulk()}
                placeholder={
                  bulkOp === "set"
                    ? "Новая цена, ₽"
                    : bulkOp === "increase_pct" || bulkOp === "decrease_pct"
                    ? "Процент, %"
                    : "Маржа, %"
                }
                className="h-9 w-36 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm tabular text-right text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
              />
            )}
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
            Сбросить
          </button>
        </div>
      </div>

      {/* ── Pending changes bar ── */}
      {changedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[rgba(31,209,131,0.2)] bg-[rgba(31,209,131,0.06)] px-5 py-3 gap-3 flex-wrap">
          <p className="text-sm text-[var(--c-text)]">
            <span className="font-semibold text-[var(--c-green)]">
              Изменено {changedCount} товаров
            </span>
            {avgChangePct !== 0 && (
              <span className="text-[var(--c-text2)] ml-2">
                · средний сдвиг {avgChangePct > 0 ? "+" : ""}
                {avgChangePct}%
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition",
                showPreview
                  ? "border-[var(--c-blue)] bg-[rgba(59,130,246,0.1)] text-[var(--c-blue)]"
                  : "border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)]"
              )}
            >
              <Eye size={13} />
              {showPreview ? "Скрыть" : "Предпросмотр"}
            </button>
            <button
              onClick={handleApply}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                applied
                  ? "bg-[var(--c-bg3)] text-[var(--c-green)]"
                  : "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
              )}
            >
              {applied ? (
                <>
                  <Check size={14} /> Применено
                </>
              ) : (
                "Применить изменения"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Preview table ── */}
      {showPreview && previewRows.length > 0 && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <div
            className="px-5 py-3 border-b border-[var(--c-border)] text-xs font-semibold"
            style={{ color: "var(--c-text2)" }}
          >
            Предпросмотр изменений — {previewRows.length} товаров
          </div>
          {/* Header */}
          <div
            className="grid px-5 py-2.5 border-b border-[var(--c-border)] text-xs font-medium text-[var(--c-text3)] bg-[var(--c-bg3)]"
            style={{ gridTemplateColumns: "1fr 120px 120px 110px 90px" }}
          >
            <span>Товар</span>
            <span className="text-right">Текущая цена</span>
            <span className="text-right">Новая цена</span>
            <span className="text-right">Изменение ₽</span>
            <span className="text-right">Изменение %</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-[var(--c-border)]">
            {previewRows.map(({ product, currentPrice, newPrice, delta, deltaPct }) => (
              <div
                key={product.id}
                className="grid items-center px-5 py-3"
                style={{ gridTemplateColumns: "1fr 120px 120px 110px 90px" }}
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                </div>
                <p className="text-sm tabular text-[var(--c-text2)] text-right">
                  {formatRub(currentPrice)}
                </p>
                <p className="text-sm tabular font-semibold text-[var(--c-text)] text-right">
                  {formatRub(newPrice)}
                </p>
                <p
                  className={cn(
                    "text-sm tabular font-medium text-right",
                    delta > 0
                      ? "text-[var(--c-green)]"
                      : delta < 0
                      ? "text-[var(--c-red)]"
                      : "text-[var(--c-text3)]"
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {formatRub(delta)}
                </p>
                <p
                  className={cn(
                    "text-sm tabular font-medium text-right",
                    deltaPct > 0
                      ? "text-[var(--c-green)]"
                      : deltaPct < 0
                      ? "text-[var(--c-red)]"
                      : "text-[var(--c-text3)]"
                  )}
                >
                  {deltaPct > 0 ? "+" : ""}
                  {deltaPct}%
                </p>
              </div>
            ))}
          </div>
          {/* Preview apply */}
          <div className="flex justify-end px-5 py-3 border-t border-[var(--c-border)] bg-[var(--c-bg3)]">
            <button
              onClick={handleApply}
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-6 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              <Check size={13} />
              Применить {previewRows.length} изменений
            </button>
          </div>
        </div>
      )}

      {/* ── Undo bar ── */}
      {history && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--c-border2)] bg-[var(--c-bg2)] px-5 py-3 gap-3">
          <p className="text-sm text-[var(--c-text2)]">
            Последнее действие:{" "}
            <span className="font-medium text-[var(--c-text)]">{history.label}</span>
            {" "}— {history.prices.size} товаров
          </p>
          <button
            onClick={handleUndo}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Undo2 size={13} />
            Отменить
          </button>
        </div>
      )}

      {/* ── Filter & sort bar ── */}
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
          {changedCount > 0 && (
            <span className="rounded-full bg-[var(--c-amber)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--c-bg)]">
              {changedCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 text-xs text-[var(--c-text3)]">
          <span>Сортировка:</span>
          {(
            [
              ["name", "Название"],
              ["price", "Цена"],
              ["cost", "С/С"],
              ["margin", "Маржа"],
            ] as [SortField, string][]
          ).map(([f, l]) => (
            <button
              key={f}
              onClick={() => handleSort(f)}
              className={cn(
                "flex items-center gap-1 hover:text-[var(--c-text2)] transition",
                sortField === f && "text-[var(--c-text2)]"
              )}
            >
              {l}
              <SortIcon field={f} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Product table ── */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        {/* Header */}
        <div
          className="border-b border-[var(--c-border)] px-5 py-3 grid gap-3 items-center"
          style={{ gridTemplateColumns: "28px 1fr 110px 140px 90px 90px 100px" }}
        >
          <input
            type="checkbox"
            checked={allOnPage}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allOnPage;
            }}
            onChange={toggleAll}
            className="h-4 w-4 rounded accent-[var(--c-green)]"
          />
          <span className="text-xs font-medium text-[var(--c-text2)]">
            Товар
            {someSelected && (
              <span className="ml-2 text-[var(--c-blue)]">
                Выбрано {selected.size} из {activeProducts.length}
              </span>
            )}
          </span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">
            Тек. цена
          </span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">
            Новая цена
          </span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">
            С/С
          </span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">
            Маржа
          </span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-right">
            Изменение
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[var(--c-border)]">
          {rows.map(({ product, currentPrice, newPrice, historyPrice }) => {
            const isChanged = newPrice !== currentPrice;
            const delta = newPrice - currentPrice;
            const deltaPct =
              currentPrice > 0
                ? Math.round((delta / currentPrice) * 1000) / 10
                : 0;
            const newMargin = calcMargin(newPrice, product.costPrice);
            const isSelected = selected.has(product.id);

            return (
              <div
                key={product.id}
                className={cn(
                  "grid gap-3 items-center px-5 py-3 transition",
                  isSelected
                    ? "bg-[rgba(31,209,131,0.04)]"
                    : "hover:bg-[var(--c-bg3)]",
                  isChanged && !isSelected && "bg-[rgba(245,166,35,0.03)]"
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
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm tabular text-[var(--c-text)]">
                    {formatRub(currentPrice)}
                  </p>
                  {historyPrice && historyPrice !== currentPrice && (
                    <p className="text-[10px] text-[var(--c-text3)]">
                      была {formatRub(historyPrice)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) =>
                      setPrice(product.id, parseInt(e.target.value) || 0)
                    }
                    className={cn(
                      "h-8 w-28 rounded-lg border px-3 text-sm tabular text-right focus:outline-none transition",
                      isChanged
                        ? "border-[var(--c-amber)] bg-[rgba(245,166,35,0.06)] text-[var(--c-text)] focus:border-[var(--c-amber)]"
                        : "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text)] focus:border-[var(--c-green)]"
                    )}
                  />
                </div>

                <div className="text-right">
                  <p className="text-sm tabular text-[var(--c-text2)]">
                    {formatRub(product.costPrice)}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-medium tabular",
                      newMargin >= 35
                        ? "text-[var(--c-green)]"
                        : newMargin >= 20
                        ? "text-[var(--c-amber)]"
                        : "text-[var(--c-red)]"
                    )}
                  >
                    {newMargin}%
                  </p>
                </div>

                <div className="text-right">
                  {isChanged ? (
                    <div
                      className={cn(
                        "flex flex-col items-end",
                        delta > 0
                          ? "text-[var(--c-green)]"
                          : "text-[var(--c-red)]"
                      )}
                    >
                      <span className="text-xs font-semibold tabular">
                        {delta > 0 ? "+" : ""}
                        {formatRub(delta)}
                      </span>
                      <span className="text-[10px] tabular">
                        {deltaPct > 0 ? "+" : ""}
                        {deltaPct}%
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
              <BarChart2
                size={32}
                className="mx-auto mb-3 text-[var(--c-text3)]"
              />
              <p className="text-sm text-[var(--c-text2)]">Нет изменённых товаров</p>
              <p className="text-xs text-[var(--c-text3)] mt-1">
                Измените цены в таблице, чтобы они отобразились здесь
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4">
        <p className="text-xs text-[var(--c-text3)]">
          Показано {rows.length} из {activeProducts.length} товаров · GMV до:{" "}
          {(totalGmvOld / 1000).toFixed(0)} тыс ₽ · после:{" "}
          {(totalGmvNew / 1000).toFixed(0)} тыс ₽
        </p>
        <div className="flex items-center gap-2">
          {history && (
            <button
              onClick={handleUndo}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <Undo2 size={13} />
              Отменить
            </button>
          )}
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
            onClick={changedCount > 0 ? handleApply : undefined}
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
            {applied ? (
              <>
                <Check size={14} /> Применено
              </>
            ) : (
              "Применить изменения"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
