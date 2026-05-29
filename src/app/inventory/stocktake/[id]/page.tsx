"use client";

import { use, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  Barcode,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";
import type { StocktakeItem } from "@/mock/inventory";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtRub(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("ru-RU")} ₽`;
}

// ── Main page component ───────────────────────────────────────────────────────

export default function StocktakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { stocktakes, locations, products, actions } = useInventory();

  const stocktake = stocktakes.find((s) => s.id === id);
  const location = locations.find((l) => l.id === stocktake?.locationId);

  if (!stocktake) {
    return (
      <InventoryShell title="Инвентаризация">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-[var(--c-text2)]">Инвентаризация не найдена</p>
          <Link
            href="/inventory/stocktake"
            className="flex items-center gap-1.5 text-sm text-[var(--c-green)] hover:underline"
          >
            <ArrowLeft size={14} />
            Назад к инвентаризациям
          </Link>
        </div>
      </InventoryShell>
    );
  }

  const title = `Инвентаризация ${location?.name ?? stocktake.locationId} — ${formatDate(stocktake.createdAt)}`;

  return (
    <InventoryShell title={title}>
      {stocktake.status === "in_progress" && (
        <InProgressView
          stocktake={stocktake}
          products={products}
          actions={actions}
        />
      )}
      {(stocktake.status === "completed" ||
        stocktake.status === "cancelled") && (
        <ReadOnlyView stocktake={stocktake} products={products} />
      )}
      {/* No pending_approval status in the type — completed maps to approval flow */}
      {stocktake.status === "draft" && (
        <ReadOnlyView stocktake={stocktake} products={products} />
      )}
    </InventoryShell>
  );
}

// ── In-progress counting view ─────────────────────────────────────────────────

function InProgressView({
  stocktake,
  products,
  actions,
}: {
  stocktake: ReturnType<typeof useInventory>["stocktakes"][0];
  products: ReturnType<typeof useInventory>["products"];
  actions: ReturnType<typeof useInventory>["actions"];
}) {
  const router = useRouter();
  // Local items mirror to keep UI reactive before context re-render
  const [localItems, setLocalItems] = useState<StocktakeItem[]>(
    stocktake.items,
  );
  const [scanFlash, setScanFlash] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const counted = localItems.filter((i) => i.countedQty !== null).length;
  const total = localItems.length;
  const pct = total > 0 ? Math.round((counted / total) * 100) : 0;
  const allCounted = counted === total;

  // Sort: discrepancies first, then uncounted, then matches
  const sortedItems = [...localItems].sort((a, b) => {
    const scoreA =
      a.countedQty !== null && a.variance !== 0
        ? 0
        : a.countedQty === null
          ? 1
          : 2;
    const scoreB =
      b.countedQty !== null && b.variance !== 0
        ? 0
        : b.countedQty === null
          ? 1
          : 2;
    return scoreA - scoreB;
  });

  const handleScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const code = (e.currentTarget.value ?? "").trim();
      if (!code) return;

      const item = localItems.find((i) => {
        const p = products.find((pr) => pr.id === i.productId);
        return (
          p?.barcode === code || p?.sku === code || p?.internalBarcode === code
        );
      });

      if (item) {
        const newQty = (item.countedQty ?? 0) + 1;
        actions.updateStocktakeCount(stocktake.id, item.productId, newQty);
        setLocalItems((prev) =>
          prev.map((it) =>
            it.productId === item.productId
              ? { ...it, countedQty: newQty, variance: newQty - it.systemQty }
              : it,
          ),
        );
        setScanFlash({ type: "ok", msg: `Добавлено: ${item.productName}` });
        setTimeout(() => setScanFlash(null), 2000);
      } else {
        setScanFlash({ type: "err", msg: `Товар не найден: ${code}` });
        setTimeout(() => setScanFlash(null), 2000);
      }
      e.currentTarget.value = "";
    },
    [localItems, products, actions, stocktake.id],
  );

  function handleUpdateQty(productId: string, qty: number) {
    actions.updateStocktakeCount(stocktake.id, productId, qty);
    setLocalItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? { ...it, countedQty: qty, variance: qty - it.systemQty }
          : it,
      ),
    );
  }

  function handleComplete() {
    actions.completeStocktake(stocktake.id);
    toast.success("Инвентаризация завершена. Остатки обновлены.");
    router.push("/inventory/stocktake");
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Link
          href="/inventory/stocktake"
          className="flex items-center gap-1.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
        >
          <ArrowLeft size={14} />
          Назад
        </Link>
      </div>

      {/* Barcode input — prominent scan area */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-4 space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-text2)]">
          <Barcode size={13} />
          Сканировать штрихкод
        </label>
        <div className="relative">
          <input
            ref={scanRef}
            type="text"
            autoFocus
            autoComplete="off"
            placeholder="Сканировать штрихкод или введите артикул..."
            onKeyDown={handleScan}
            className={cn(
              "h-12 w-full rounded-lg border px-3 text-base transition focus:outline-none",
              scanFlash?.type === "err"
                ? "border-[var(--c-red)] bg-[var(--c-red-dim)] text-[var(--c-text)]"
                : scanFlash?.type === "ok"
                  ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-text)]"
                  : "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)]",
            )}
          />
          {scanFlash && (
            <div
              className={cn(
                "absolute inset-x-0 top-full mt-1 z-10 rounded-lg border px-3 py-2 text-xs font-medium",
                scanFlash.type === "err"
                  ? "border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] text-[var(--c-red)]"
                  : "border-[rgba(31,209,131,0.3)] bg-[var(--c-green-dim)] text-[var(--c-green)]",
              )}
            >
              {scanFlash.msg}
            </div>
          )}
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {sortedItems.map((item) => (
          <ItemCard
            key={item.productId}
            item={item}
            onUpdateQty={handleUpdateQty}
            isInProgress
          />
        ))}
      </div>

      {/* Sticky bottom bar — fixed to viewport bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-3">
        {/* Progress bar */}
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--c-text2)]">
              {counted} из {total} товаров пересчитано
            </p>
            <p className="text-xs font-semibold tabular text-[var(--c-text)]">
              {pct}%
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 100
                  ? "bg-[var(--c-green)]"
                  : pct > 50
                    ? "bg-[var(--c-amber)]"
                    : "bg-[var(--c-text3)]",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {/* Action button */}
        {allCounted && (
          <button
            onClick={() => setShowCompleteConfirm(true)}
            className="h-12 w-full rounded-xl bg-[var(--c-green)] text-base font-semibold text-[var(--c-bg)] flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <CheckCircle size={18} />
            Завершить инвентаризацию
          </button>
        )}
      </div>

      {/* Complete confirmation */}
      {showCompleteConfirm && (
        <ConfirmModal
          title="Завершить инвентаризацию?"
          description={`Утверждение создаст ${localItems.filter((i) => i.variance !== null && i.variance !== 0).length} записей о корректировке склада. Продолжить?`}
          confirmLabel="Завершить инвентаризацию"
          onConfirm={handleComplete}
          onCancel={() => setShowCompleteConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Read-only / completed view ────────────────────────────────────────────────

function ReadOnlyView({
  stocktake,
  products,
}: {
  stocktake: ReturnType<typeof useInventory>["stocktakes"][0];
  products: ReturnType<typeof useInventory>["products"];
}) {
  const [showMatches, setShowMatches] = useState(false);

  const discrepancies = stocktake.items.filter(
    (i) => i.countedQty !== null && i.variance !== 0,
  );
  const matches = stocktake.items.filter(
    (i) => i.countedQty !== null && i.variance === 0,
  );
  const uncounted = stocktake.items.filter((i) => i.countedQty === null);

  const totalVarianceUnits = discrepancies.reduce(
    (s, i) => s + (i.variance ?? 0),
    0,
  );
  const totalVarianceRub = discrepancies.reduce((s, i) => {
    const p = products.find((pr) => pr.id === i.productId);
    return s + (i.variance ?? 0) * (p?.costPrice ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      <Link
        href="/inventory/stocktake"
        className="flex items-center gap-1.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
      >
        <ArrowLeft size={14} />
        Назад к инвентаризациям
      </Link>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1">Всего товаров</p>
          <p className="text-2xl font-bold text-[var(--c-text)]">
            {stocktake.items.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1">Расхождений</p>
          <p className="text-2xl font-bold text-[var(--c-amber)]">
            {discrepancies.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1">
            Итого расхождение, шт
          </p>
          <p
            className={cn(
              "text-2xl font-bold tabular",
              totalVarianceUnits < 0
                ? "text-[var(--c-red)]"
                : totalVarianceUnits > 0
                  ? "text-[var(--c-amber)]"
                  : "text-[var(--c-green)]",
            )}
          >
            {totalVarianceUnits > 0 ? "+" : ""}
            {totalVarianceUnits}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1">
            Итого расхождение, ₽
          </p>
          <p
            className={cn(
              "text-2xl font-bold tabular",
              totalVarianceRub < 0
                ? "text-[var(--c-red)]"
                : totalVarianceRub > 0
                  ? "text-[var(--c-amber)]"
                  : "text-[var(--c-green)]",
            )}
          >
            {fmtRub(totalVarianceRub)}
          </p>
        </div>
      </div>

      {/* Discrepancy table */}
      {discrepancies.length > 0 && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--c-border)]">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">
              Расхождения ({discrepancies.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-[var(--c-text3)]">
                    Товар
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--c-text3)] text-right">
                    Ожидалось
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--c-text3)] text-right">
                    Подсчитано
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--c-text3)] text-right">
                    Разница
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--c-text3)] text-right">
                    Оценка (₽)
                  </th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((item) => {
                  const p = products.find((pr) => pr.id === item.productId);
                  const costImpact =
                    (item.variance ?? 0) * (p?.costPrice ?? 0);
                  const isShortage = (item.variance ?? 0) < 0;
                  return (
                    <tr
                      key={item.productId}
                      className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-[var(--c-text)]">
                          {item.productName}
                        </p>
                        <p className="text-xs text-[var(--c-text3)]">
                          {item.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-[var(--c-text)]">
                        {item.systemQty}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-[var(--c-text)]">
                        {item.countedQty}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span
                          className={cn(
                            "font-semibold",
                            isShortage
                              ? "text-[var(--c-red)]"
                              : "text-[var(--c-amber)]",
                          )}
                        >
                          {(item.variance ?? 0) > 0 ? "+" : ""}
                          {item.variance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span
                          className={cn(
                            "font-medium",
                            costImpact < 0
                              ? "text-[var(--c-red)]"
                              : costImpact > 0
                                ? "text-[var(--c-amber)]"
                                : "text-[var(--c-text)]",
                          )}
                        >
                          {fmtRub(costImpact)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uncounted items */}
      {uncounted.length > 0 && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <div className="px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">
              Не подсчитано ({uncounted.length})
            </h3>
          </div>
          <div className="space-y-0 divide-y divide-[var(--c-border)]">
            {uncounted.map((item) => (
              <div
                key={item.productId}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-[var(--c-text)]">
                    {item.productName}
                  </p>
                  <p className="text-xs text-[var(--c-text3)]">{item.sku}</p>
                </div>
                <p className="text-sm tabular text-[var(--c-text2)]">
                  по системе: {item.systemQty}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches (collapsed by default) */}
      {matches.length > 0 && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <button
            onClick={() => setShowMatches((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 hover:bg-[var(--c-bg3)] transition"
          >
            <h3 className="text-sm font-semibold text-[var(--c-text)]">
              Совпадения ({matches.length})
            </h3>
            {showMatches ? (
              <ChevronDown size={14} className="text-[var(--c-text3)]" />
            ) : (
              <ChevronRight size={14} className="text-[var(--c-text3)]" />
            )}
          </button>
          {showMatches && (
            <div className="divide-y divide-[var(--c-border)] border-t border-[var(--c-border)]">
              {matches.map((item) => (
                <div
                  key={item.productId}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-[var(--c-text)]">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[var(--c-text3)]">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[var(--c-green)]" />
                    <span className="text-sm font-semibold tabular text-[var(--c-green)]">
                      {item.countedQty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note */}
      {stocktake.note && (
        <p className="text-sm text-[var(--c-text2)]">
          Примечание: {stocktake.note}
        </p>
      )}
      {stocktake.approvedBy && (
        <p className="text-sm text-[var(--c-text2)]">
          Утверждено: {stocktake.approvedBy}
        </p>
      )}
    </div>
  );
}

// ── Item card (in-progress) ───────────────────────────────────────────────────

function ItemCard({
  item,
  onUpdateQty,
  isInProgress,
}: {
  item: StocktakeItem;
  onUpdateQty: (productId: string, qty: number) => void;
  isInProgress: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  const isCounted = item.countedQty !== null;
  const hasVariance = item.variance !== null && item.variance !== 0;
  const isShortage = (item.variance ?? 0) < 0;
  const isSurplus = (item.variance ?? 0) > 0;
  const isMatch = isCounted && !hasVariance;

  const rowCls = isShortage
    ? "border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)]"
    : isSurplus
      ? "border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)]"
      : isMatch
        ? "border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)]"
        : "border-[var(--c-border)] bg-[var(--c-bg3)]";

  function submit() {
    const qty = parseInt(val);
    if (isNaN(qty) || qty < 0) return;
    onUpdateQty(item.productId, qty);
    setEditing(false);
    setVal("");
  }

  return (
    <div className={cn("rounded-xl border p-4 transition min-h-[72px]", rowCls)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isMatch && (
              <CheckCircle
                size={14}
                className="shrink-0 text-[var(--c-green)]"
              />
            )}
            {isShortage && (
              <TrendingDown
                size={14}
                className="shrink-0 text-[var(--c-red)]"
              />
            )}
            {isSurplus && (
              <TrendingUp
                size={14}
                className="shrink-0 text-[var(--c-amber)]"
              />
            )}
            {!isCounted && (
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--c-border2)]" />
            )}
            <p className="text-sm font-medium text-[var(--c-text)] truncate">
              {item.productName}
            </p>
          </div>
          <p className="text-xs text-[var(--c-text3)] mt-0.5 ml-5">
            {item.sku}
          </p>
          {isCounted && (
            <p className="text-xs text-[var(--c-text3)] mt-0.5 ml-5">
              Ожидалось: {item.systemQty} шт
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 shrink-0">
          {!isCounted && (
            <div className="text-right">
              <p className="text-xs text-[var(--c-text3)]">в системе</p>
              <p className="text-sm font-medium tabular text-[var(--c-text)]">
                {item.systemQty}
              </p>
            </div>
          )}

          {/* Variance badge */}
          {hasVariance && item.variance !== null && (
            <div
              className={cn(
                "flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-bold tabular",
                isShortage
                  ? "bg-[var(--c-red-dim)] text-[var(--c-red)]"
                  : "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
              )}
            >
              {isShortage ? (
                <>
                  <Minus size={12} />
                  {Math.abs(item.variance)}
                </>
              ) : (
                <>+{item.variance}</>
              )}
            </div>
          )}
          {isMatch && (
            <div className="flex items-center rounded-lg px-2 py-1 text-sm font-bold tabular bg-[var(--c-green-dim)] text-[var(--c-green)]">
              =
            </div>
          )}
        </div>
      </div>

      {/* Editable qty input */}
      {isInProgress && (
        <div className="mt-3">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                autoFocus
                min={0}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={String(item.systemQty)}
                className="h-12 w-20 rounded-lg border border-[var(--c-green)] bg-[var(--c-bg2)] px-3 text-center text-lg text-[var(--c-text)] focus:outline-none tabular"
              />
              <button
                onClick={submit}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--c-green)] text-[var(--c-bg)]"
              >
                <CheckCircle size={18} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setVal("");
                }}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditing(true);
                setVal(item.countedQty !== null ? String(item.countedQty) : "");
              }}
              className={cn(
                "flex w-full min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
                isCounted
                  ? "border-[rgba(31,209,131,0.2)] bg-[var(--c-bg2)] hover:border-[var(--c-green)]"
                  : "border-[var(--c-border2)] bg-[var(--c-bg2)] hover:border-[var(--c-green)]",
              )}
            >
              <span className="text-[var(--c-text2)] text-xs">
                {isCounted ? "Подсчитано:" : "Ввести количество..."}
              </span>
              {isCounted && (
                <span
                  className={cn(
                    "font-semibold tabular text-lg",
                    isShortage
                      ? "text-[var(--c-red)]"
                      : isSurplus
                        ? "text-[var(--c-amber)]"
                        : "text-[var(--c-green)]",
                  )}
                >
                  {item.countedQty}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
        <div className="border-b border-[var(--c-border)] px-6 py-4">
          <h3 className="text-base font-semibold text-[var(--c-text)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--c-text2)] mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <CheckCircle size={15} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
