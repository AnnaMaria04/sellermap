"use client";

import { useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Receipt,
  RotateCcw,
  Download,
  FileText,
  Layers,
  Calculator,
  PieChart,
  ArrowDownRight,
  Tag,
  Truck,
  Landmark,
  Megaphone,
  Box,
  Scale,
  Target,
} from "lucide-react";
import {
  computePnL,
  computeChannelPnL,
  computeProductProfit,
  computeUnitEconomics,
  buildProductFromContext,
  type PnL,
  type ChannelPnL,
  type ProductProfit,
  type UnitEconomicsInput,
  type UnitEconomicsResult,
} from "@/lib/inventory/finance";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { exportData, type ExportColumn } from "@/lib/export";
import { cn, formatRub, formatPct } from "@/lib/utils";

// ── Formatting helpers ────────────────────────────────────────────────────────
function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return formatRub(n);
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return formatPct(n);
}

function profitColor(n: number): string {
  if (n > 0) return "text-[var(--c-green)]";
  if (n < 0) return "text-[var(--c-red)]";
  return "text-[var(--c-text2)]";
}

type FinanceTab = "pnl" | "channels" | "unit";

const TABS: { id: FinanceTab; label: string; icon: React.ReactNode }[] = [
  { id: "pnl", label: "Отчёт P&L", icon: <FileText size={15} /> },
  { id: "channels", label: "По каналам", icon: <Layers size={15} /> },
  { id: "unit", label: "Юнит-экономика", icon: <Calculator size={15} /> },
];

// ──────────────────────────────────────────────────────────────────────────────
export function FinancePanel() {
  const { products } = useInventory();
  const [tab, setTab] = useState<FinanceTab>("pnl");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-[var(--c-bg3)] text-[var(--c-text)] shadow-sm"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            <span className={tab === t.id ? "text-[var(--c-green)]" : ""}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pnl" && <PnLTab />}
      {tab === "channels" && <ChannelsTab />}
      {tab === "unit" && <UnitEconomicsTab products={products} />}
    </div>
  );
}

// ── Tab 1: P&L ─────────────────────────────────────────────────────────────────
function PnLTab() {
  const { orders } = useInventory();
  const pnl: PnL = useMemo(() => computePnL(orders), [orders]);

  const waterfall = useMemo(() => {
    return [
      { label: "Выручка", value: pnl.revenue, sign: "plus" as const, icon: <Wallet size={14} />, tone: "text-[var(--c-blue)]", bar: "bg-[var(--c-blue)]" },
      { label: "Себестоимость", value: -pnl.cogs, sign: "minus" as const, icon: <Box size={14} />, tone: "text-[var(--c-red)]", bar: "bg-[var(--c-red)]" },
      { label: "Валовая прибыль", value: pnl.grossProfit, sign: "sub" as const, icon: <TrendingUp size={14} />, tone: "text-[var(--c-text)]", bar: "bg-[var(--c-amber)]" },
      { label: "Комиссия МП", value: -pnl.commission, sign: "minus" as const, icon: <Landmark size={14} />, tone: "text-[var(--c-red)]", bar: "bg-[var(--c-red)]" },
      { label: "Логистика", value: -pnl.logistics, sign: "minus" as const, icon: <Truck size={14} />, tone: "text-[var(--c-red)]", bar: "bg-[var(--c-red)]" },
      { label: "Чистая прибыль", value: pnl.netProfit, sign: "total" as const, icon: <TrendingUp size={14} />, tone: profitColor(pnl.netProfit), bar: pnl.netProfit >= 0 ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]" },
    ];
  }, [pnl]);

  const maxBar = Math.max(pnl.revenue, 1);

  const handleExport = () => {
    type Line = { показатель: string; сумма: string };
    const rows: Line[] = [
      { показатель: "Выручка", сумма: money(pnl.revenue) },
      { показатель: "Себестоимость", сумма: money(pnl.cogs) },
      { показатель: "Валовая прибыль", сумма: money(pnl.grossProfit) },
      { показатель: "Комиссия маркетплейсов", сумма: money(pnl.commission) },
      { показатель: "Логистика", сумма: money(pnl.logistics) },
      { показатель: "Чистая прибыль", сумма: money(pnl.netProfit) },
      { показатель: "Рентабельность по чистой прибыли", сумма: pct(pnl.netMarginPct) },
      { показатель: "Заказов реализовано", сумма: String(pnl.orderCount) },
      { показатель: "Единиц продано", сумма: String(pnl.unitsSold) },
      { показатель: "Средний чек", сумма: money(pnl.avgOrderValue) },
      { показатель: "Доля возвратов", сумма: pct(pnl.returnRate * 100) },
    ];
    const columns: ExportColumn<Line>[] = [
      { key: "показатель", label: "Показатель", align: "left" },
      { key: "сумма", label: "Сумма", align: "right" },
    ];
    exportData<Line>({
      filename: "pnl-otchet",
      title: "Отчёт о прибылях и убытках (P&L)",
      subtitle: "Расчёт по текущим заказам",
      columns,
      rows,
      format: "pdf",
      meta: [
        { label: "Выручка", value: money(pnl.revenue) },
        { label: "Чистая прибыль", value: money(pnl.netProfit) },
        { label: "Рентабельность", value: pct(pnl.netMarginPct) },
      ],
    });
  };

  if (pnl.orderCount === 0 && pnl.revenue === 0) {
    return (
      <div className="space-y-6">
        <KPIGrid pnl={pnl} />
        <EmptyState message="Нет реализованных заказов для отчёта P&L" icon={<FileText size={24} />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPIGrid pnl={pnl} />

      {/* Waterfall / breakdown */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-[var(--c-green)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Структура прибыли</h2>
          </div>
          <button
            onClick={handleExport}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            <Download size={14} />
            Экспорт P&L
          </button>
        </div>

        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <div className="space-y-3">
            {waterfall.map((line) => {
              const abs = Math.abs(line.value);
              const width = Math.min(100, (abs / maxBar) * 100);
              const isSummary = line.sign === "sub" || line.sign === "total";
              return (
                <div
                  key={line.label}
                  className={cn(
                    "rounded-lg px-3 py-2.5",
                    isSummary ? "bg-[var(--c-bg3)]" : "",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={line.tone}>{line.icon}</span>
                      <span
                        className={cn(
                          "truncate text-sm",
                          isSummary ? "font-semibold text-[var(--c-text)]" : "text-[var(--c-text2)]",
                        )}
                      >
                        {line.label}
                      </span>
                    </div>
                    <span className={cn("shrink-0 text-sm font-semibold tabular", line.tone)}>
                      {line.sign === "minus" ? `− ${money(abs)}` : money(abs)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                    <div className={cn("h-full rounded-full transition-all", line.bar)} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-[var(--c-border)] pt-4 text-xs text-[var(--c-text3)]">
            <Receipt size={13} />
            Расчёт основан на текущих заказах (реализованные: отправленные и доставленные). Возвраты учтены как потеря комиссии и логистики.
          </div>
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Заказов" value={pnl.orderCount.toLocaleString("ru-RU")} icon={<Receipt size={14} />} />
        <MiniStat label="Единиц продано" value={pnl.unitsSold.toLocaleString("ru-RU")} icon={<Box size={14} />} />
        <MiniStat label="Валовая прибыль" value={money(pnl.grossProfit)} icon={<TrendingUp size={14} />} tone="text-[var(--c-green)]" />
        <MiniStat label="Валовая маржа" value={pct(pnl.revenue > 0 ? (pnl.grossProfit / pnl.revenue) * 100 : 0)} icon={<Percent size={14} />} />
      </div>
    </div>
  );
}

function KPIGrid({ pnl }: { pnl: PnL }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KPICard
        label="Выручка"
        value={money(pnl.revenue)}
        icon={<Wallet size={16} />}
        color="text-[var(--c-blue)]"
      />
      <KPICard
        label="Чистая прибыль"
        value={money(pnl.netProfit)}
        icon={pnl.netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        color={profitColor(pnl.netProfit)}
      />
      <KPICard
        label="Рентабельность"
        value={pct(pnl.netMarginPct)}
        icon={<Percent size={16} />}
        color={
          pnl.netMarginPct >= 20
            ? "text-[var(--c-green)]"
            : pnl.netMarginPct >= 8
              ? "text-[var(--c-amber)]"
              : "text-[var(--c-red)]"
        }
      />
      <KPICard
        label="Средний чек"
        value={money(pnl.avgOrderValue)}
        icon={<Receipt size={16} />}
        color="text-[var(--c-text)]"
      />
      <KPICard
        label="Возвраты"
        value={pct(pnl.returnRate * 100)}
        icon={<RotateCcw size={16} />}
        color={
          pnl.returnRate * 100 <= 5
            ? "text-[var(--c-green)]"
            : pnl.returnRate * 100 <= 12
              ? "text-[var(--c-amber)]"
              : "text-[var(--c-red)]"
        }
      />
    </div>
  );
}

// ── Tab 2: Channels ──────────────────────────────────────────────────────────
function ChannelsTab() {
  const { orders } = useInventory();
  const channels: ChannelPnL[] = useMemo(() => computeChannelPnL(orders), [orders]);

  const maxRevenue = useMemo(
    () => Math.max(1, ...channels.map((c) => c.revenue)),
    [channels],
  );
  const maxProfit = useMemo(
    () => Math.max(1, ...channels.map((c) => Math.abs(c.netProfit))),
    [channels],
  );

  const totals = useMemo(() => {
    return channels.reduce(
      (acc, c) => {
        acc.revenue += c.revenue;
        acc.netProfit += c.netProfit;
        acc.orderCount += c.orderCount;
        return acc;
      },
      { revenue: 0, netProfit: 0, orderCount: 0 },
    );
  }, [channels]);

  const handleExport = () => {
    const columns: ExportColumn<ChannelPnL>[] = [
      { key: "label", label: "Канал", align: "left" },
      { key: "revenue", label: "Выручка", align: "right", format: (r) => money(r.revenue) },
      { key: "netProfit", label: "Чистая прибыль", align: "right", format: (r) => money(r.netProfit) },
      { key: "netMarginPct", label: "Маржа %", align: "right", format: (r) => pct(r.netMarginPct) },
      { key: "orderCount", label: "Заказов", align: "right", format: (r) => String(r.orderCount) },
      { key: "returnRate", label: "Возвраты %", align: "right", format: (r) => pct(r.returnRate * 100) },
    ];
    exportData<ChannelPnL>({
      filename: "pnl-po-kanalam",
      title: "P&L по каналам продаж",
      subtitle: "Расчёт по текущим заказам",
      columns,
      rows: channels,
      format: "excel",
      meta: [
        { label: "Выручка всего", value: money(totals.revenue) },
        { label: "Чистая прибыль всего", value: money(totals.netProfit) },
      ],
    });
  };

  if (channels.length === 0) {
    return <EmptyState message="Нет данных по каналам продаж" icon={<Layers size={24} />} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wallet size={15} className="text-[var(--c-blue)]" />
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Выручка по каналам</h3>
          </div>
          <div className="space-y-3">
            {channels.map((c) => (
              <div key={`rev-${c.channel}`}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--c-text2)]">{c.label}</span>
                  <span className="font-medium text-[var(--c-text)] tabular">{money(c.revenue)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                  <div
                    className="h-full rounded-full bg-[var(--c-blue)] transition-all"
                    style={{ width: `${Math.min(100, (c.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Net profit chart */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--c-green)]" />
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Чистая прибыль по каналам</h3>
          </div>
          <div className="space-y-3">
            {channels.map((c) => (
              <div key={`prof-${c.channel}`}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--c-text2)]">{c.label}</span>
                  <span className={cn("font-medium tabular", profitColor(c.netProfit))}>{money(c.netProfit)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      c.netProfit >= 0 ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]",
                    )}
                    style={{ width: `${Math.min(100, (Math.abs(c.netProfit) / maxProfit) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--c-green)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Сводка по каналам</h2>
          </div>
          <button
            onClick={handleExport}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            <Download size={14} />
            Экспорт
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--c-border)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Канал</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Выручка</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Чистая прибыль</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Маржа %</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Заказов</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Возвраты %</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr
                    key={c.channel}
                    className="border-b border-[var(--c-border)] transition last:border-0 hover:bg-[var(--c-bg3)]"
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-[var(--c-text)]">{c.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm text-[var(--c-text)]">{money(c.revenue)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className={cn("text-sm font-semibold", profitColor(c.netProfit))}>{money(c.netProfit)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          c.netMarginPct >= 20
                            ? "text-[var(--c-green)]"
                            : c.netMarginPct >= 8
                              ? "text-[var(--c-amber)]"
                              : "text-[var(--c-red)]",
                        )}
                      >
                        {pct(c.netMarginPct)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm text-[var(--c-text2)]">{c.orderCount}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm text-[var(--c-text2)]">{pct(c.returnRate * 100)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--c-border2)] bg-[var(--c-bg3)]">
                  <td className="px-5 py-3 text-sm font-semibold text-[var(--c-text)]">Итого</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--c-text)] tabular">{money(totals.revenue)}</td>
                  <td className={cn("px-5 py-3 text-right text-sm font-semibold tabular", profitColor(totals.netProfit))}>{money(totals.netProfit)}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--c-text)] tabular">
                    {pct(totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--c-text)] tabular">{totals.orderCount}</td>
                  <td className="px-5 py-3 text-right text-sm text-[var(--c-text3)] tabular">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Unit economics ────────────────────────────────────────────────────
function UnitEconomicsTab({ products }: { products: Product[] }) {
  const { orders } = useInventory();

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "active"),
    [products],
  );

  const [selectedId, setSelectedId] = useState<string>(() => activeProducts[0]?.id ?? "");
  const [input, setInput] = useState<UnitEconomicsInput>(() => {
    const first = activeProducts[0];
    return first
      ? buildProductFromContext(first)
      : {
          sellingPrice: 0,
          costPrice: 0,
          packagingCost: 0,
          logisticsCost: 0,
          commissionRate: 0,
          adsCostPerUnit: 0,
          taxRate: 0,
        };
  });

  const selectedProduct = activeProducts.find((p) => p.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const product = activeProducts.find((p) => p.id === id);
    if (product) setInput(buildProductFromContext(product));
  };

  const result: UnitEconomicsResult = useMemo(() => computeUnitEconomics(input), [input]);

  // What-if at -10% / current / +10% selling price.
  const scenarios = useMemo(() => {
    const make = (factor: number) =>
      computeUnitEconomics({ ...input, sellingPrice: input.sellingPrice * factor });
    return [
      { label: "Цена −10%", price: input.sellingPrice * 0.9, res: make(0.9) },
      { label: "Текущая цена", price: input.sellingPrice, res: result },
      { label: "Цена +10%", price: input.sellingPrice * 1.1, res: make(1.1) },
    ];
  }, [input, result]);

  const productProfit: ProductProfit[] = useMemo(() => computeProductProfit(orders), [orders]);

  const handleExportProfit = () => {
    const columns: ExportColumn<ProductProfit>[] = [
      { key: "name", label: "Товар", align: "left" },
      { key: "sku", label: "SKU", align: "left" },
      { key: "unitsSold", label: "Продано шт", align: "right", format: (r) => String(r.unitsSold) },
      { key: "revenue", label: "Выручка", align: "right", format: (r) => money(r.revenue) },
      { key: "netProfit", label: "Чистая прибыль", align: "right", format: (r) => money(r.netProfit) },
      { key: "marginPct", label: "Маржа %", align: "right", format: (r) => pct(r.marginPct) },
    ];
    exportData<ProductProfit>({
      filename: "pribylnost-tovarov",
      title: "Прибыльность товаров",
      subtitle: "Расчёт по реализованным заказам",
      columns,
      rows: productProfit,
      format: "excel",
    });
  };

  return (
    <div className="space-y-6">
      {/* Calculator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calculator size={16} className="text-[var(--c-green)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Калькулятор юнит-экономики</h2>
          </div>

          <label className="mb-1.5 block text-xs text-[var(--c-text2)]">Товар</label>
          <select
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)]"
          >
            {activeProducts.length === 0 && <option value="">Нет активных товаров</option>}
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Цена продажи, ₽"
              value={input.sellingPrice}
              onChange={(v) => setInput((s) => ({ ...s, sellingPrice: v }))}
            />
            <NumberField
              label="Себестоимость, ₽"
              value={input.costPrice}
              onChange={(v) => setInput((s) => ({ ...s, costPrice: v }))}
            />
            <NumberField
              label="Упаковка, ₽"
              value={input.packagingCost}
              onChange={(v) => setInput((s) => ({ ...s, packagingCost: v }))}
            />
            <NumberField
              label="Логистика, ₽"
              value={input.logisticsCost}
              onChange={(v) => setInput((s) => ({ ...s, logisticsCost: v }))}
            />
            <NumberField
              label="Реклама на шт, ₽"
              value={input.adsCostPerUnit}
              onChange={(v) => setInput((s) => ({ ...s, adsCostPerUnit: v }))}
            />
            <NumberField
              label="Комиссия МП, %"
              value={input.commissionRate * 100}
              step={0.5}
              onChange={(v) => setInput((s) => ({ ...s, commissionRate: v / 100 }))}
            />
            <NumberField
              label="Налог, %"
              value={input.taxRate * 100}
              step={0.5}
              onChange={(v) => setInput((s) => ({ ...s, taxRate: v / 100 }))}
            />
          </div>

          {selectedProduct && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--c-text3)]">
              <Tag size={12} />
              Значения предзаполнены из карточки «{selectedProduct.name}». Меняйте поля для расчёта «что-если».
            </p>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Выручка" value={money(result.revenue)} icon={<Wallet size={14} />} tone="text-[var(--c-blue)]" />
            <ResultCard label="Все затраты" value={money(result.totalCost)} icon={<ArrowDownRight size={14} />} tone="text-[var(--c-red)]" />
            <ResultCard label="Комиссия" value={money(result.commission)} icon={<Landmark size={14} />} tone="text-[var(--c-text2)]" />
            <ResultCard label="Налог" value={money(result.tax)} icon={<Receipt size={14} />} tone="text-[var(--c-text2)]" />
            <ResultCard
              label="Чистая прибыль"
              value={money(result.netProfit)}
              icon={result.netProfit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              tone={profitColor(result.netProfit)}
            />
            <ResultCard
              label="Маржа %"
              value={pct(result.marginPct)}
              icon={<Percent size={14} />}
              tone={
                result.marginPct >= 20
                  ? "text-[var(--c-green)]"
                  : result.marginPct >= 8
                    ? "text-[var(--c-amber)]"
                    : "text-[var(--c-red)]"
              }
            />
            <ResultCard
              label="Цена безубыточности"
              value={money(result.breakEvenPrice)}
              icon={<Scale size={14} />}
              tone="text-[var(--c-amber)]"
            />
            <ResultCard
              label="ROI %"
              value={pct(result.roi)}
              icon={<Target size={14} />}
              tone={profitColor(result.roi)}
            />
          </div>
        </div>
      </div>

      {/* What-if sensitivity */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Megaphone size={16} className="text-[var(--c-amber)]" />
          <h2 className="text-base font-semibold text-[var(--c-text)]">Анализ «что-если»: чистая прибыль при изменении цены</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {scenarios.map((sc, i) => (
            <div
              key={sc.label}
              className={cn(
                "rounded-xl border bg-[var(--c-bg2)] p-4",
                i === 1 ? "border-[var(--c-green)]" : "border-[var(--c-border)]",
              )}
            >
              <p className="text-xs text-[var(--c-text2)]">{sc.label}</p>
              <p className="mt-0.5 text-sm text-[var(--c-text3)] tabular">{money(sc.price)}</p>
              <p className={cn("mt-2 text-xl font-bold tabular", profitColor(sc.res.netProfit))}>
                {money(sc.res.netProfit)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-text3)] tabular">маржа {pct(sc.res.marginPct)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Product profitability table */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--c-green)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Прибыльность товаров</h2>
          </div>
          <button
            onClick={handleExportProfit}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            <Download size={14} />
            Экспорт
          </button>
        </div>

        {productProfit.length === 0 ? (
          <EmptyState message="Нет реализованных продаж по товарам" icon={<Box size={24} />} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Продано шт</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Выручка</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Чистая прибыль</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Маржа %</th>
                  </tr>
                </thead>
                <tbody>
                  {productProfit.map((p) => (
                    <tr
                      key={p.productId}
                      className="border-b border-[var(--c-border)] transition last:border-0 hover:bg-[var(--c-bg3)]"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-[var(--c-text)]">{p.name}</p>
                        <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        <span className="text-sm text-[var(--c-text)]">{p.unitsSold}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        <span className="text-sm text-[var(--c-text2)]">{money(p.revenue)}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular">
                        <span className={cn("text-sm font-semibold", profitColor(p.netProfit))}>{money(p.netProfit)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div>
                          <span
                            className={cn(
                              "text-sm font-medium tabular",
                              p.marginPct >= 20
                                ? "text-[var(--c-green)]"
                                : p.marginPct >= 8
                                  ? "text-[var(--c-amber)]"
                                  : "text-[var(--c-red)]",
                            )}
                          >
                            {pct(p.marginPct)}
                          </span>
                          <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-[var(--c-bg3)]">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                p.netProfit >= 0 ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]",
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, p.marginPct) * 2)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared subcomponents ──────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", color)}>{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = "text-[var(--c-text)]",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[var(--c-text3)]">{icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular", tone)}>{value}</p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-1.5 flex items-center gap-1.5", tone)}>
        {icon}
        <span className="text-xs text-[var(--c-text2)]">{label}</span>
      </div>
      <p className={cn("text-lg font-bold tabular", tone)}>{value}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--c-text2)]">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)]"
      />
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-10 text-center">
      <span className="mb-3 text-[var(--c-text3)]">{icon}</span>
      <p className="text-sm text-[var(--c-text2)]">{message}</p>
    </div>
  );
}
