"use client";

import { useState, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  Check,
  Camera,
  AlertTriangle,
  Package,
  ChevronRight,
  Download,
  BarChart2,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn, formatRub } from "@/lib/utils";
import { exportData, type ExportFormat } from "@/lib/export";

type WriteOffReason =
  | "damaged"
  | "expired"
  | "theft"
  | "loss"
  | "defect"
  | "return_disposal"
  | "quality"
  | "other";

interface WriteOffLine {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  reason: WriteOffReason;
  note?: string;
  photo?: string;
}

interface CompletedWriteOff {
  id: string;
  locationId: string;
  lines: WriteOffLine[];
  totalQty: number;
  createdAt: string;
  createdBy: string;
}

const REASON_LABELS: Record<WriteOffReason, string> = {
  damaged:         "Повреждение",
  expired:         "Срок годности",
  theft:           "Кража/недостача",
  loss:            "Потеря",
  defect:          "Производственный брак",
  return_disposal: "Утилизация возврата",
  quality:         "Контроль качества",
  other:           "Прочее",
};

const COMPLETED_WRITEOFFS: CompletedWriteOff[] = [
  {
    id: "wo-001",
    locationId: "loc-warehouse",
    lines: [
      { productId: "prod-004", productName: "Крафт-пакет с ручками", sku: "PKG-KRAFT-001", qty: 52, reason: "damaged", note: "Намокли при доставке" },
    ],
    totalQty: 52,
    createdAt: "2026-05-15",
    createdBy: "Мария Иванова",
  },
  {
    id: "wo-002",
    locationId: "loc-store",
    lines: [
      { productId: "prod-002", productName: "Футболка оверсайз", sku: "TSH-002", qty: 2, reason: "damaged", note: "Порвались при примерке" },
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 1, reason: "theft" },
    ],
    totalQty: 3,
    createdAt: "2026-05-08",
    createdBy: "Пётр Сидоров",
  },
  {
    id: "wo-003",
    locationId: "loc-warehouse",
    lines: [
      { productId: "prod-009", productName: "Протеиновый батончик «Заряд»", sku: "BAR-ZAR-001", qty: 18, reason: "expired", note: "Истёк срок годности" },
      { productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe", sku: "COF-ETH-001", qty: 2, reason: "quality", note: "Нарушена герметичность" },
    ],
    totalQty: 20,
    createdAt: "2026-04-20",
    createdBy: "Мария Иванова",
  },
  {
    id: "wo-004",
    locationId: "loc-store",
    lines: [
      { productId: "prod-002", productName: "Футболка оверсайз", sku: "TSH-002", qty: 5, reason: "defect", note: "Брак пошива" },
    ],
    totalQty: 5,
    createdAt: "2026-04-05",
    createdBy: "Пётр Сидоров",
  },
  {
    id: "wo-005",
    locationId: "loc-warehouse",
    lines: [
      { productId: "prod-010", productName: "Шампунь с алоэ", sku: "SHP-ALO-300", qty: 9, reason: "damaged", note: "Разбились при хранении" },
      { productId: "prod-016", productName: "Крем для рук", sku: "HCR-75-NAT", qty: 12, reason: "expired" },
    ],
    totalQty: 21,
    createdAt: "2026-03-18",
    createdBy: "Мария Иванова",
  },
  {
    id: "wo-006",
    locationId: "loc-warehouse",
    lines: [
      { productId: "prod-004", productName: "Крафт-пакет с ручками", sku: "PKG-KRAFT-001", qty: 30, reason: "quality", note: "Контроль входящей партии" },
    ],
    totalQty: 30,
    createdAt: "2026-02-12",
    createdBy: "Мария Иванова",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function getMonthKey(isoDate: string): string {
  // Returns "YYYY-MM"
  return isoDate.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WriteOffPanel() {
  const { products, movements } = useInventory();
  const [showForm, setShowForm] = useState(false);
  const [history] = useState<CompletedWriteOff[]>(COMPLETED_WRITEOFFS);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Summary by reason category ────────────────────────────────────────────
  const summaryByType = useMemo(() => {
    const groups: Record<string, { count: number; qty: number; cost: number }> = {};
    history.forEach((wo) => {
      wo.lines.forEach((line) => {
        const label = REASON_LABELS[line.reason];
        if (!groups[label]) groups[label] = { count: 0, qty: 0, cost: 0 };
        const p = products.find((p) => p.id === line.productId);
        const cost = line.qty * (p?.costPrice ?? 0);
        groups[label].count += 1;
        groups[label].qty += line.qty;
        groups[label].cost += cost;
      });
    });
    return Object.entries(groups)
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.cost - a.cost);
  }, [history, products]);

  // ── Write-off chart data — last 6 months from movements ──────────────────
  const chartData = useMemo(() => {
    const today = new Date("2026-05-25");
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const byMonth: Record<string, { qty: number; cost: number }> = {};
    months.forEach((m) => { byMonth[m] = { qty: 0, cost: 0 }; });

    // From movements (write_off type)
    movements
      .filter((mv) => mv.type === "write_off")
      .forEach((mv) => {
        const key = getMonthKey(mv.createdAt);
        if (byMonth[key]) {
          const qty = Math.abs(mv.qtyDelta);
          const p = products.find((p) => p.id === mv.productId);
          byMonth[key].qty += qty;
          byMonth[key].cost += qty * (p?.costPrice ?? 0);
        }
      });

    // Also fold in completed write-offs from local history
    history.forEach((wo) => {
      const key = getMonthKey(wo.createdAt);
      if (byMonth[key]) {
        wo.lines.forEach((line) => {
          const p = products.find((p) => p.id === line.productId);
          byMonth[key].qty += line.qty;
          byMonth[key].cost += line.qty * (p?.costPrice ?? 0);
        });
      }
    });

    return months.map((key) => ({
      month: monthLabel(key),
      qty: byMonth[key].qty,
      cost: byMonth[key].cost,
    }));
  }, [movements, products, history]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalQty = history.reduce((s, wo) => s + wo.totalQty, 0);
  const totalCost = history.flatMap((wo) => wo.lines).reduce((s, l) => {
    const p = products.find((p) => p.id === l.productId);
    return s + l.qty * (p?.costPrice ?? 0);
  }, 0);

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport(format: ExportFormat) {
    setShowExportMenu(false);
    const rows = history.flatMap((wo) =>
      wo.lines.map((line) => {
        const p = products.find((p) => p.id === line.productId);
        return {
          id: wo.id,
          date: wo.createdAt,
          author: wo.createdBy,
          productName: line.productName,
          sku: line.sku,
          qty: line.qty,
          reason: REASON_LABELS[line.reason],
          note: line.note ?? "",
          cost: line.qty * (p?.costPrice ?? 0),
        };
      })
    );

    exportData({
      filename: "spisaniya",
      title: "Отчёт по списаниям",
      subtitle: `Сформировано: ${new Date().toLocaleDateString("ru-RU")} · Всего позиций: ${rows.length}`,
      format,
      columns: [
        { key: "id",          label: "Номер акта" },
        { key: "date",        label: "Дата" },
        { key: "author",      label: "Автор" },
        { key: "productName", label: "Товар" },
        { key: "sku",         label: "Артикул" },
        { key: "qty",         label: "Количество", align: "right" },
        { key: "reason",      label: "Причина" },
        { key: "note",        label: "Примечание" },
        { key: "cost",        label: "Стоимость, ₽", align: "right", format: (r) => r.cost.toLocaleString("ru-RU") },
      ],
      rows,
      meta: [
        { label: "Всего списаний", value: String(history.length) },
        { label: "Единиц", value: String(totalQty) },
        { label: "Сумма потерь", value: formatRub(totalCost) },
      ],
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Управление списаниями</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">История актов и аналитика потерь</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
            >
              <Download size={14} />
              Экспорт
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-36 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl overflow-hidden">
                {(["csv", "excel", "pdf"] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition text-left"
                  >
                    {fmt === "csv" ? "CSV" : fmt === "excel" ? "Excel (.xls)" : "PDF (печать)"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={15} />
            Создать списание
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Актов списания</p>
          <p className="text-2xl font-bold text-[var(--c-text)]">{history.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Единиц списано</p>
          <p className="text-2xl font-bold text-[var(--c-red)]">{totalQty}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Сумма потерь</p>
          <p className="text-2xl font-bold text-[var(--c-red)]">{formatRub(totalCost)}</p>
        </div>
      </div>

      {/* Сводка списаний */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--c-border)]">
          <TrendingDown size={16} className="text-[var(--c-red)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Сводка списаний по причинам</h3>
        </div>
        <div className="p-4 space-y-2">
          {summaryByType.map((row) => {
            const pct = totalCost > 0 ? (row.cost / totalCost) * 100 : 0;
            return (
              <div key={row.reason} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--c-text)]">{row.reason}</span>
                  <div className="flex items-center gap-4 text-xs text-[var(--c-text2)]">
                    <span className="tabular-nums">{row.qty} шт</span>
                    <span className="tabular-nums font-medium text-[var(--c-red)]">{formatRub(row.cost)}</span>
                    <span className="w-8 text-right text-[var(--c-text3)]">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--c-bg3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--c-red)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {summaryByType.length === 0 && (
            <p className="text-sm text-[var(--c-text3)] py-4 text-center">Нет данных</p>
          )}
        </div>
      </div>

      {/* Bar chart — списания по месяцам */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--c-border)]">
          <BarChart2 size={16} className="text-[var(--c-text3)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Динамика списаний за 6 месяцев</h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--c-text3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--c-text3)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "var(--c-bg2)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--c-text)",
                }}
                formatter={(value, name) =>
                  name === "qty"
                    ? [`${value} шт`, "Единиц"]
                    : [formatRub(Number(value)), "Сумма потерь"]
                }
                labelStyle={{ color: "var(--c-text2)", marginBottom: 4 }}
              />
              <Bar dataKey="qty" name="qty" fill="var(--c-red)" opacity={0.85} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-[var(--c-text3)] text-center mt-2">Количество единиц по месяцам</p>
        </div>
      </div>

      {/* History */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">История актов списания</h3>
        <span className="text-xs text-[var(--c-text3)]">{history.length} акта</span>
      </div>

      <div className="space-y-3">
        {history.map((wo) => (
          <WriteOffCard key={wo.id} writeOff={wo} products={products} />
        ))}
      </div>

      {showForm && <WriteOffForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ── WriteOffCard ──────────────────────────────────────────────────────────────

function WriteOffCard({ writeOff, products }: { writeOff: CompletedWriteOff; products: Product[] }) {
  const { locations } = useInventory();
  const [expanded, setExpanded] = useState(false);
  const locationName = locations.find((l) => l.id === writeOff.locationId)?.name ?? writeOff.locationId;
  const totalCost = writeOff.lines.reduce((s, l) => {
    const p = products.find((p) => p.id === l.productId);
    return s + l.qty * (p?.costPrice ?? 0);
  }, 0);

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--c-bg3)] transition"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--c-red-dim)] border border-[rgba(240,80,80,0.2)]">
          <Trash2 size={16} className="text-[var(--c-red)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--c-text)]">{writeOff.id.toUpperCase()}</p>
          <p className="text-xs text-[var(--c-text3)]">{locationName} · {formatDate(writeOff.createdAt)} · {writeOff.createdBy}</p>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-sm font-bold text-[var(--c-red)] tabular-nums">−{writeOff.totalQty} шт</p>
          <p className="text-xs text-[var(--c-text3)]">{formatRub(totalCost)}</p>
        </div>
        <ChevronRight size={16} className={cn("text-[var(--c-text3)] transition", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--c-border)] p-4 space-y-2">
          {writeOff.lines.map((line, i) => {
            const p = products.find((p) => p.id === line.productId);
            const cost = line.qty * (p?.costPrice ?? 0);
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                <Package size={14} className="text-[var(--c-text3)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{line.productName}</p>
                  <p className="text-xs text-[var(--c-text3)]">{line.sku}</p>
                  <p className="text-xs text-[var(--c-text2)] mt-0.5">{REASON_LABELS[line.reason]}</p>
                  {line.note && <p className="text-xs text-[var(--c-text3)] italic mt-0.5">{line.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--c-red)] tabular-nums">−{line.qty}</p>
                  {cost > 0 && <p className="text-xs text-[var(--c-text3)]">{formatRub(cost)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── WriteOffForm ──────────────────────────────────────────────────────────────

function WriteOffForm({ onClose }: { onClose: () => void }) {
  const { products, locations, actions } = useInventory();
  const [locationId, setLocationId] = useState(locations.find((l) => l.isDefault)?.id ?? "");
  const [lines, setLines] = useState<WriteOffLine[]>([]);
  const [note, setNote] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQ.toLowerCase();
    return products.filter((p) =>
      p.status === "active" &&
      (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQ, products]);

  function addLine(p: Product) {
    if (lines.find((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      qty: 1,
      reason: "damaged",
    }]);
    setShowSearch(false);
    setSearchQ("");
  }

  function updateLine(idx: number, updates: Partial<WriteOffLine>) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!isValid) return;
    lines.forEach((line) => {
      actions.adjustStock(line.productId, locationId, -line.qty, "write_off", REASON_LABELS[line.reason]);
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  const isValid = locationId && lines.length > 0;
  const totalLines = lines.reduce((s, l) => {
    const p = products.find((p) => p.id === l.productId);
    return s + l.qty * (p?.costPrice ?? 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Создать списание</h2>
            <p className="text-xs text-[var(--c-text2)]">Спишите бракованный, просроченный или утраченный товар</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] p-4">
            <AlertTriangle size={16} className="text-[var(--c-red)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--c-red)]">Необратимая операция</p>
              <p className="text-xs text-[var(--c-red)] opacity-80 mt-0.5">После подтверждения остатки будут скорректированы и движение будет записано в историю</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Локация списания</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            >
              {locations.filter((l) => !["in_transit"].includes(l.type)).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Lines */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Товары для списания</h3>

            <div className="relative mb-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] px-4 py-3 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] transition"
              >
                <Plus size={14} />
                Добавить товар
              </button>
              {showSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                  <div className="p-3 border-b border-[var(--c-border)]">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                      <input
                        autoFocus
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Поиск товара..."
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-8 pr-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredProducts.map((p) => (
                      <button key={p.id} onClick={() => addLine(p)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition">
                        <p className="flex-1 text-left">{p.name}</p>
                        <span className="text-xs text-[var(--c-text3)]">{p.sku}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="px-3 py-4 text-sm text-center text-[var(--c-text3)]">Товары не найдены</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {lines.map((line, i) => {
                const p = products.find((p) => p.id === line.productId);
                const lineCost = line.qty * (p?.costPrice ?? 0);
                return (
                  <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--c-text)]">{line.productName}</p>
                        <p className="text-xs text-[var(--c-text3)]">{line.sku}</p>
                      </div>
                      <button onClick={() => removeLine(i)} className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-[var(--c-text2)]">Количество</label>
                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) => updateLine(i, { qty: parseInt(e.target.value) || 1 })}
                          className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular-nums text-right"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-[var(--c-text2)]">Причина</label>
                        <select
                          value={line.reason}
                          onChange={(e) => updateLine(i, { reason: e.target.value as WriteOffReason })}
                          className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                        >
                          {Object.entries(REASON_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-[var(--c-text2)]">Примечание</label>
                      <input
                        type="text"
                        value={line.note ?? ""}
                        onChange={(e) => updateLine(i, { note: e.target.value })}
                        placeholder="Уточните причину..."
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button className="flex items-center gap-2 text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                        <Camera size={12} />
                        Прикрепить фото
                      </button>
                      {lineCost > 0 && (
                        <span className="text-xs text-[var(--c-text2)]">
                          Стоимость: <span className="font-medium text-[var(--c-red)]">{formatRub(lineCost)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Общее примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Обстоятельства, документы, ответственный..."
              className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <div>
            {lines.length > 0 && totalLines > 0 && (
              <p className="text-xs text-[var(--c-text2)]">
                Итого потерь: <span className="font-semibold text-[var(--c-red)]">{formatRub(totalLines)}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saved}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                isValid && !saved
                  ? "bg-[var(--c-red)] text-white hover:opacity-90"
                  : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
              )}
            >
              {saved ? <><Check size={14} /> Списано</> : <><Trash2 size={14} /> Подтвердить списание</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
