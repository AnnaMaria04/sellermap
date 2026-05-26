"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Layers,
  BarChart2,
  Clock,
  Package,
} from "lucide-react";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn, formatRub } from "@/lib/utils";

type Tab = "cost" | "margin" | "history" | "fifo";
type SortKey = "name" | "unitCost" | "packagingCost" | "deliveryCost" | "commission" | "landed" | "price" | "marginRub" | "marginPct";
type SortDir = "asc" | "desc";

interface CostRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitCost: number;
  packagingCost: number;
  deliveryCost: number;
  commission: number;
  landed: number;
  price: number;
  marginRub: number;
  marginPct: number;
}

interface PriceHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  date: string;
  oldCost: number;
  newCost: number;
  changedBy: string;
}

const MOCK_PRICE_HISTORY: PriceHistoryEntry[] = [
  { id: "ph-1", productId: "prod-001", productName: "Органайзер для путешествий", date: "2026-04-10", oldCost: 790, newCost: 820, changedBy: "Мария Иванова" },
  { id: "ph-2", productId: "prod-002", productName: "Футболка оверсайз хлопок", date: "2026-03-15", oldCost: 320, newCost: 350, changedBy: "Пётр Сидоров" },
  { id: "ph-3", productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe", date: "2026-05-01", oldCost: 580, newCost: 620, changedBy: "Мария Иванова" },
  { id: "ph-4", productId: "prod-004", productName: "Крафт-пакет с ручками 30x40", date: "2026-02-20", oldCost: 14, newCost: 12, changedBy: "Мария Иванова" },
  { id: "ph-5", productId: "prod-006", productName: "Кепка с логотипом", date: "2026-05-05", oldCost: 260, newCost: 280, changedBy: "Пётр Сидоров" },
  { id: "ph-6", productId: "prod-007", productName: "Ежедневник A5 кожаный", date: "2026-04-01", oldCost: 900, newCost: 950, changedBy: "Мария Иванова" },
];


function buildCostRows(products: Product[]): CostRow[] {
  return products.filter((p) => p.status !== "archived").map((p) => {
    const unit = p.costPrice;
    const pkg = p.packagingCost ?? 0;
    const del = p.deliveryCost ?? 0;
    const comm = p.channelCommission ? Math.round((p.price * p.channelCommission) / 100) : 0;
    const landed = unit + pkg + del + comm;
    const marginRub = p.price - landed;
    const marginPct = p.price > 0 ? (marginRub / p.price) * 100 : 0;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitCost: unit,
      packagingCost: pkg,
      deliveryCost: del,
      commission: comm,
      landed,
      price: p.price,
      marginRub,
      marginPct,
    };
  });
}

function MarginBadge({ pct }: { pct: number }) {
  if (pct >= 50) {
    return (
      <span className="inline-flex items-center rounded-full border border-[rgba(29,209,113,0.2)] bg-[var(--c-green-dim)] px-2 py-0.5 text-xs font-medium text-[var(--c-green)]">
        Высокая
      </span>
    );
  }
  if (pct >= 30) {
    return (
      <span className="inline-flex items-center rounded-full border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] px-2 py-0.5 text-xs font-medium text-[var(--c-amber)]">
        Средняя
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] px-2 py-0.5 text-xs font-medium text-[var(--c-red)]">
      Низкая
    </span>
  );
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <ChevronDown size={11} className="opacity-30" />
        )}
      </span>
    </th>
  );
}

export function CostAnalysisPanel() {
  const { products, batches, movements } = useInventory();
  const [tab, setTab] = useState<Tab>("cost");
  const [sortKey, setSortKey] = useState<SortKey>("marginPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [historyFilter, setHistoryFilter] = useState("");
  const [fifoProduct, setFifoProduct] = useState("prod-001");
  const [recalcKey, setRecalcKey] = useState(0);

  const rows = useMemo(() => buildCostRows(products), [recalcKey, products]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv, "ru") : bv.localeCompare(av, "ru");
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const totals = useMemo(() => {
    const totalLanded = rows.reduce((s, r) => s + r.landed, 0);
    const totalPrice = rows.reduce((s, r) => s + r.price, 0);
    const totalMarginRub = rows.reduce((s, r) => s + r.marginRub, 0);
    const avgMarginPct = totalPrice > 0 ? (totalMarginRub / totalPrice) * 100 : 0;
    const totalInventoryAtCost = products.filter((p) => p.status !== "archived").reduce((s, p) => s + p.totalPhysical * p.costPrice, 0);
    const totalInventoryAtRetail = products.filter((p) => p.status !== "archived").reduce((s, p) => s + p.totalPhysical * p.price, 0);
    return { totalLanded, totalPrice, totalMarginRub, avgMarginPct, totalInventoryAtCost, totalInventoryAtRetail };
  }, [rows, products]);

  const abcRows = useMemo(() => {
    const sorted2 = [...rows].sort((a, b) => b.marginRub - a.marginRub);
    const n = sorted2.length;
    return sorted2.map((r, i) => {
      let abc: "A" | "B" | "C";
      if (i < Math.ceil(n * 0.2)) abc = "A";
      else if (i < Math.ceil(n * 0.5)) abc = "B";
      else abc = "C";
      return { ...r, abc };
    });
  }, [rows]);

  const maxMarginRub = useMemo(() => Math.max(...rows.map((r) => r.marginRub), 1), [rows]);

  const priceHistory = useMemo<PriceHistoryEntry[]>(() => {
    const fromMovements: PriceHistoryEntry[] = movements
      .filter((m) => m.type === "cost_change")
      .map((m) => ({
        id: m.id,
        productId: m.productId,
        productName: m.productName,
        date: m.createdAt.split("T")[0],
        oldCost: m.qtyBefore,
        newCost: m.qtyAfter,
        changedBy: m.userName,
      }));
    return fromMovements.length > 0 ? fromMovements : MOCK_PRICE_HISTORY;
  }, [movements]);

  const filteredHistory = useMemo(() => {
    if (!historyFilter) return priceHistory;
    return priceHistory.filter((h) =>
      h.productName.toLowerCase().includes(historyFilter.toLowerCase()),
    );
  }, [historyFilter, priceHistory]);

  const fifoProduct30Days = priceHistory.filter((h) => {
    const d = new Date(h.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 <= 30;
  }).length;

  const fifoBatches = useMemo(
    () =>
      batches
        .filter((b) => b.productId === fifoProduct)
        .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
        .map((b) => ({
          date: b.receivedAt,
          qtyReceived: b.qty,
          qtyRemaining: b.remainingQty,
          unitCost: b.costPrice,
          depleted: b.remainingQty === 0,
        })),
    [batches, fifoProduct],
  );
  const fifoProductData = products.find((p) => p.id === fifoProduct);
  const weightedAvg = useMemo(() => {
    const active = fifoBatches.filter((b) => !b.depleted);
    const totalQty = active.reduce((s, b) => s + b.qtyRemaining, 0);
    const totalVal = active.reduce((s, b) => s + b.qtyRemaining * b.unitCost, 0);
    return totalQty > 0 ? totalVal / totalQty : 0;
  }, [fifoBatches]);

  const lastPurchasePrice = fifoBatches.length > 0 ? fifoBatches[fifoBatches.length - 1].unitCost : 0;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "cost", label: "Себестоимость", icon: <Package size={13} /> },
    { key: "margin", label: "Маржа по товарам", icon: <BarChart2 size={13} /> },
    { key: "history", label: "Динамика", icon: <Clock size={13} /> },
    { key: "fifo", label: "FIFO-слои", icon: <Layers size={13} /> },
  ];

  const categoryRows = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    rows.forEach((r) => {
      if (!map[r.category]) map[r.category] = { sum: 0, count: 0 };
      map[r.category].sum += r.marginPct;
      map[r.category].count += 1;
    });
    return Object.entries(map).map(([cat, v]) => ({ cat, avg: v.count > 0 ? v.sum / v.count : 0 })).sort((a, b) => b.avg - a.avg);
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--c-text)]">Анализ себестоимости</h1>
          <p className="text-sm text-[var(--c-text2)] mt-0.5">Маржа, структура затрат и ценовая динамика</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-2 text-right">
            <p className="text-xs text-[var(--c-text3)]">По себестоимости</p>
            <p className="text-base font-bold text-[var(--c-text)] tabular">{formatRub(totals.totalInventoryAtCost)}</p>
          </div>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-2 text-right">
            <p className="text-xs text-[var(--c-text3)]">По розничной цене</p>
            <p className="text-base font-bold text-[var(--c-green)] tabular">{formatRub(totals.totalInventoryAtRetail)}</p>
          </div>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-2 text-right">
            <p className="text-xs text-[var(--c-text3)]">Нереализованная маржа</p>
            <p className="text-base font-bold text-[var(--c-blue)] tabular">{formatRub(totals.totalInventoryAtRetail - totals.totalInventoryAtCost)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-full sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === t.key
                ? "bg-[var(--c-bg3)] text-[var(--c-text)] shadow-sm"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cost" && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-3">
            <p className="text-sm font-semibold text-[var(--c-text)]">Структура затрат по товарам</p>
            <button
              onClick={() => setRecalcKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-1.5 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <RefreshCw size={12} />
              Пересчитать
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                  <SortTh label="Закупка" sortKey="unitCost" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Упаковка" sortKey="packagingCost" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Доставка" sortKey="deliveryCost" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Комиссия" sortKey="commission" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Итого затрат" sortKey="landed" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Цена прод." sortKey="price" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Маржа ₽" sortKey="marginRub" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Маржа %" sortKey="marginPct" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-xs font-medium text-[var(--c-text2)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--c-bg3)] transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--c-text)] text-sm">{r.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{r.sku}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular text-[var(--c-text)]">{r.unitCost.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-3 py-3 text-right tabular text-[var(--c-text2)]">{r.packagingCost > 0 ? `${r.packagingCost} ₽` : "—"}</td>
                    <td className="px-3 py-3 text-right tabular text-[var(--c-text2)]">{r.deliveryCost > 0 ? `${r.deliveryCost} ₽` : "—"}</td>
                    <td className="px-3 py-3 text-right tabular text-[var(--c-text2)]">{r.commission > 0 ? `${r.commission} ₽` : "—"}</td>
                    <td className="px-3 py-3 text-right tabular font-semibold text-[var(--c-text)]">{r.landed.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-3 py-3 text-right tabular text-[var(--c-text)]">{r.price.toLocaleString("ru-RU")} ₽</td>
                    <td className={cn("px-3 py-3 text-right tabular font-semibold", r.marginRub >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      {r.marginRub >= 0 ? "+" : ""}{r.marginRub.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className={cn("px-3 py-3 text-right tabular font-bold", r.marginPct >= 50 ? "text-[var(--c-green)]" : r.marginPct >= 30 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]")}>
                      {r.marginPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3">
                      <MarginBadge pct={r.marginPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[var(--c-border)] bg-[var(--c-bg3)]">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-[var(--c-text)]">Итого</td>
                  <td className="px-3 py-3 text-right tabular text-xs text-[var(--c-text3)]" colSpan={4}>—</td>
                  <td className="px-3 py-3 text-right tabular font-bold text-[var(--c-text)]">{totals.totalLanded.toLocaleString("ru-RU")} ₽</td>
                  <td className="px-3 py-3 text-right tabular font-bold text-[var(--c-text)]">{totals.totalPrice.toLocaleString("ru-RU")} ₽</td>
                  <td className="px-3 py-3 text-right tabular font-bold text-[var(--c-green)]">+{totals.totalMarginRub.toLocaleString("ru-RU")} ₽</td>
                  <td className="px-3 py-3 text-right tabular font-bold text-[var(--c-green)]">{totals.avgMarginPct.toFixed(1)}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {tab === "margin" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
            <div className="border-b border-[var(--c-border)] px-5 py-3">
              <p className="text-sm font-semibold text-[var(--c-text)]">Маржа по товарам — ABC-анализ</p>
              <p className="text-xs text-[var(--c-text3)] mt-0.5">A — топ 20% по сумме маржи, B — следующие 30%, C — оставшиеся 50%</p>
            </div>
            <div className="p-5 space-y-3">
              {abcRows.map((r) => (
                <div key={r.id} className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      r.abc === "A" ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" :
                      r.abc === "B" ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]" :
                      "bg-[var(--c-bg3)] text-[var(--c-text3)]",
                    )}
                  >
                    {r.abc}
                  </span>
                  <div className="w-36 shrink-0">
                    <p className="text-sm text-[var(--c-text)] truncate">{r.name}</p>
                    <p className="text-xs text-[var(--c-text3)]">{r.sku}</p>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-[var(--c-bg3)] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          r.marginPct >= 50 ? "bg-[var(--c-green)]" :
                          r.marginPct >= 30 ? "bg-[var(--c-amber)]" :
                          "bg-[var(--c-red)]",
                        )}
                        style={{ width: `${Math.max(4, (r.marginRub / maxMarginRub) * 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "w-14 text-right tabular text-sm font-bold shrink-0",
                      r.marginPct >= 50 ? "text-[var(--c-green)]" :
                      r.marginPct >= 30 ? "text-[var(--c-amber)]" :
                      "text-[var(--c-red)]",
                    )}>
                      {r.marginPct.toFixed(1)}%
                    </span>
                    <span className="w-28 text-right tabular text-xs text-[var(--c-text3)] shrink-0">
                      {formatRub(r.marginRub)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
            <div className="border-b border-[var(--c-border)] px-5 py-3">
              <p className="text-sm font-semibold text-[var(--c-text)]">Средняя маржа по категориям</p>
            </div>
            <div className="p-5 space-y-2">
              {categoryRows.map((c) => (
                <div key={c.cat} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm text-[var(--c-text)]">{c.cat}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        c.avg >= 50 ? "bg-[var(--c-green)]" : c.avg >= 30 ? "bg-[var(--c-amber)]" : "bg-[var(--c-red)]",
                      )}
                      style={{ width: `${Math.min(100, c.avg)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-semibold tabular text-[var(--c-text)]">{c.avg.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[var(--c-text)]">История изменения себестоимости</p>
              <span className="flex items-center gap-1 rounded-full bg-[var(--c-blue-dim)] border border-[rgba(100,160,255,0.2)] px-2.5 py-0.5 text-xs font-medium text-[var(--c-blue)]">
                {fifoProduct30Days} за 30 дней
              </span>
            </div>
            <input
              type="text"
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="Фильтр по товару..."
              className="h-8 w-52 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Дата</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Было</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Стало</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Изм. ₽</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Изм. %</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Изменил</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {filteredHistory.map((h) => {
                  const delta = h.newCost - h.oldCost;
                  const deltaPct = h.oldCost > 0 ? (delta / h.oldCost) * 100 : 0;
                  const up = delta > 0;
                  return (
                    <tr key={h.id} className="hover:bg-[var(--c-bg3)] transition">
                      <td className="px-4 py-3 font-medium text-[var(--c-text)]">{h.productName}</td>
                      <td className="px-3 py-3 text-[var(--c-text3)] tabular">{new Date(h.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 text-right tabular text-[var(--c-text2)]">{h.oldCost.toLocaleString("ru-RU")} ₽</td>
                      <td className="px-3 py-3 text-right tabular font-semibold text-[var(--c-text)]">{h.newCost.toLocaleString("ru-RU")} ₽</td>
                      <td className={cn("px-3 py-3 text-right tabular font-semibold", up ? "text-[var(--c-red)]" : "text-[var(--c-green)]")}>
                        {up ? "+" : ""}{delta.toLocaleString("ru-RU")} ₽
                      </td>
                      <td className={cn("px-3 py-3 text-right tabular font-semibold", up ? "text-[var(--c-red)]" : "text-[var(--c-green)]")}>
                        <span className="inline-flex items-center gap-0.5">
                          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {up ? "+" : ""}{deltaPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--c-text3)]">{h.changedBy}</td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--c-text3)]">
                      Нет записей, соответствующих фильтру
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "fifo" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--c-text2)]">Товар:</label>
            <div className="relative">
              <select
                value={fifoProduct}
                onChange={(e) => setFifoProduct(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-3 pr-8 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
              >
                {products.filter((p) => batches.some((b) => b.productId === p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
            </div>
          </div>

          {fifoProductData && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <p className="text-xs text-[var(--c-text3)]">Средневзвешенная себестоимость</p>
                <p className="text-xl font-bold text-[var(--c-text)] mt-1 tabular">{weightedAvg.toFixed(2)} ₽</p>
              </div>
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <p className="text-xs text-[var(--c-text3)]">Последняя закупочная цена</p>
                <p className="text-xl font-bold text-[var(--c-text)] mt-1 tabular">{lastPurchasePrice.toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <p className="text-xs text-[var(--c-text3)]">Отклонение</p>
                <p className={cn(
                  "text-xl font-bold mt-1 tabular",
                  Math.abs(weightedAvg - lastPurchasePrice) < 1 ? "text-[var(--c-text)]" :
                  weightedAvg > lastPurchasePrice ? "text-[var(--c-red)]" : "text-[var(--c-green)]",
                )}>
                  {weightedAvg > 0
                    ? `${weightedAvg > lastPurchasePrice ? "+" : ""}${(((weightedAvg - lastPurchasePrice) / lastPurchasePrice) * 100).toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
            <div className="border-b border-[var(--c-border)] px-5 py-3">
              <p className="text-sm font-semibold text-[var(--c-text)]">Партии (FIFO-слои)</p>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {fifoBatches.map((b, i) => (
                <div key={i} className={cn("flex items-center gap-4 px-5 py-4", b.depleted && "opacity-50")}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] text-xs font-bold text-[var(--c-text3)]">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text)]">
                      Поступление {new Date(b.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-[var(--c-text3)]">
                      Принято: {b.qtyReceived} шт · Остаток: {b.qtyRemaining} шт
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[var(--c-text)] tabular">{b.unitCost.toLocaleString("ru-RU")} ₽/шт</p>
                    <p className="text-xs text-[var(--c-text3)] tabular">{(b.qtyRemaining * b.unitCost).toLocaleString("ru-RU")} ₽ итого</p>
                  </div>
                  <div className="shrink-0">
                    {b.depleted ? (
                      <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] px-2.5 py-1 text-xs font-medium text-[var(--c-text3)]">
                        Слой исчерпан
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-[rgba(29,209,113,0.2)] bg-[var(--c-green-dim)] px-2.5 py-1 text-xs font-medium text-[var(--c-green)]">
                        Активный
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
