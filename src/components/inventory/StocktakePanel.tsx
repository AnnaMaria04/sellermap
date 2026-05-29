"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ClipboardList,
  Check,
  X,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Barcode,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
  ExternalLink,
  EyeOff,
} from "lucide-react";
import {
  type Stocktake,
  type StocktakeItem,
  type StocktakeStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { exportData, type ExportFormat } from "@/lib/export";
import { cn } from "@/lib/utils";

interface Props {
  onCreateStocktake?: () => void;
}

export function StocktakePanel({ onCreateStocktake }: Props) {
  const { stocktakes, locations, actions } = useInventory();
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("open") === "create") {
      setShowCreate(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const statusConfig: Record<StocktakeStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    draft: {
      label: "Черновик",
      icon: <Clock size={13} />,
      cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]",
    },
    in_progress: {
      label: "В процессе",
      icon: <RefreshCw size={13} />,
      cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]",
    },
    completed: {
      label: "Завершена",
      icon: <CheckCircle size={13} />,
      cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]",
    },
    cancelled: {
      label: "Отменена",
      icon: <X size={13} />,
      cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]",
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Всего" value={stocktakes.length} />
        <StatCard label="В процессе" value={stocktakes.filter((s) => s.status === "in_progress").length} color="amber" />
        <StatCard label="Завершено" value={stocktakes.filter((s) => s.status === "completed").length} color="green" />
        <StatCard
          label="Расхождений"
          value={stocktakes.flatMap((s) => s.items).filter((i) => i.variance !== null && i.variance !== 0).length}
          color="red"
        />
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--c-text)]">История инвентаризаций</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
        >
          <Plus size={15} />
          Начать инвентаризацию
        </button>
      </div>

      {/* Stocktake cards */}
      <div className="space-y-3">
        {stocktakes.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Нет инвентаризаций"
            description="Здесь будет история проверок остатков. Начните первую инвентаризацию, чтобы сверить фактические остатки с системными."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
              >
                <Plus size={15} />
                Начать инвентаризацию
              </button>
            }
          />
        )}
        {stocktakes.map((stk) => {
          const cfg = statusConfig[stk.status];
          const counted = stk.items.filter((i) => i.countedQty !== null).length;
          const variances = stk.items.filter((i) => i.variance !== null && i.variance !== 0);
          const locationName = locations.find(l => l.id === stk.locationId)?.name ?? stk.locationId;
          const pct = stk.items.length > 0 ? (counted / stk.items.length) * 100 : 0;

          return (
            <div
              key={stk.id}
              onClick={() => setSelectedStocktake(stk)}
              className="group flex items-center gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-5 py-4 cursor-pointer hover:bg-[var(--c-bg3)] transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)]">
                <ClipboardList size={18} className="text-[var(--c-text2)]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[var(--c-text)]">{locationName}</p>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.cls)}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--c-text3)] mt-0.5">{formatDate(stk.createdAt)}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <p className="text-xs text-[var(--c-text2)]">Товаров: {stk.items.length}</p>
                  <p className="text-xs text-[var(--c-text2)]">Подсчитано: {counted}/{stk.items.length}</p>
                  {variances.length > 0 && (
                    <p className="text-xs text-[var(--c-amber)]">Расхождений: {variances.length}</p>
                  )}
                </div>
              </div>

              {stk.status === "in_progress" && (
                <div className="hidden sm:block w-24">
                  <div className="h-1.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct === 100 ? "bg-[var(--c-green)]" : pct > 50 ? "bg-[var(--c-amber)]" : "bg-[var(--c-text3)]",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--c-text3)] mt-1 text-right tabular">{counted}/{stk.items.length}</p>
                </div>
              )}

              {stk.approvedBy && (
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-[var(--c-text3)]">Утверждено</p>
                  <p className="text-xs text-[var(--c-text2)]">{stk.approvedBy}</p>
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/inventory/stocktake/${stk.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:flex items-center gap-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2.5 py-1 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg)] transition opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink size={11} />
                  Открыть
                </Link>
                <ChevronRight size={16} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedStocktake && (
        <StocktakeDetailPanel
          stocktake={selectedStocktake}
          onClose={() => setSelectedStocktake(null)}
        />
      )}

      {/* Create form */}
      {showCreate && (
        <CreateStocktakeForm onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function StocktakeDetailPanel({ stocktake, onClose }: { stocktake: Stocktake; onClose: () => void }) {
  const { actions, products, locations } = useInventory();
  const [items, setItems] = useState<StocktakeItem[]>(stocktake.items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [countValue, setCountValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [antiAnchor, setAntiAnchor] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const locationName = locations.find(l => l.id === stocktake.locationId)?.name ?? stocktake.locationId;
  const counted = items.filter((i) => i.countedQty !== null).length;
  const variances = items.filter((i) => i.variance !== null && i.variance !== 0);
  const totalVariance = variances.reduce((s, i) => s + (i.variance ?? 0), 0);
  const pct = items.length > 0 ? (counted / items.length) * 100 : 0;
  const isInProgress = stocktake.status === "in_progress";
  const isCompleted = stocktake.status === "completed";

  function submitCount(productId: string) {
    const qty = parseInt(countValue);
    if (isNaN(qty) || qty < 0) return;
    actions.updateStocktakeCount(stocktake.id, productId, qty);
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, countedQty: qty, variance: qty - item.systemQty }
          : item,
      ),
    );
    setEditingId(null);
    setCountValue("");
  }

  const handleScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const code = (e.currentTarget.value ?? "").trim();
      if (!code) return;

      const item = items.find((i) => {
        const product = products.find((p) => p.id === i.productId);
        return (
          product?.barcode === code ||
          product?.sku === code ||
          product?.internalBarcode === code
        );
      });

      if (item) {
        const currentQty = item.countedQty ?? 0;
        const newQty = currentQty + 1;
        actions.updateStocktakeCount(stocktake.id, item.productId, newQty);
        setItems((prev) =>
          prev.map((it) =>
            it.productId === item.productId
              ? { ...it, countedQty: newQty, variance: newQty - it.systemQty }
              : it,
          ),
        );
        setScanSuccess(item.productName);
        setScanError(null);
        setTimeout(() => setScanSuccess(null), 2000);
      } else {
        setScanError(`Товар не найден: ${code}`);
        setScanSuccess(null);
        setTimeout(() => setScanError(null), 2000);
      }

      e.currentTarget.value = "";
    },
    [items, products, actions, stocktake.id],
  );

  function handleExport(format: ExportFormat) {
    setShowExportMenu(false);
    const rows = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const costImpact =
        item.variance !== null ? item.variance * (product?.costPrice ?? 0) : 0;
      return {
        productName: item.productName,
        sku: item.sku,
        systemQty: item.systemQty,
        countedQty: item.countedQty ?? "",
        variance: item.variance !== null
          ? item.variance > 0
            ? `+${item.variance}`
            : String(item.variance)
          : "",
        costImpact,
        reason: item.reason ?? "",
      };
    });

    exportData({
      filename: `inventarizaciya-${stocktake.id}`,
      title: `Инвентаризация — ${locationName}`,
      subtitle: `Дата: ${formatDate(stocktake.createdAt)} · Товаров: ${items.length}`,
      format,
      columns: [
        { key: "productName", label: "Товар" },
        { key: "sku", label: "Артикул" },
        { key: "systemQty", label: "По системе", align: "right" },
        { key: "countedQty", label: "Подсчитано", align: "right" },
        { key: "variance", label: "Расхождение", align: "right" },
        {
          key: "costImpact",
          label: "Влияние на стоимость, ₽",
          align: "right",
          format: (r) => (r.costImpact !== 0 ? r.costImpact.toLocaleString("ru-RU") : ""),
        },
        { key: "reason", label: "Причина" },
      ],
      rows,
      meta: [
        { label: "Локация", value: locationName },
        { label: "Статус", value: stocktake.status === "completed" ? "Завершена" : "В процессе" },
        { label: "Подсчитано", value: `${counted} из ${items.length}` },
        { label: "Расхождений", value: String(variances.length) },
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Инвентаризация</h2>
            <p className="text-xs text-[var(--c-text2)]">{locationName} · {formatDate(stocktake.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <div className="relative">
                {isInProgress && (
                  <button
                    onClick={() => setAntiAnchor((v) => !v)}
                    title="Режим без якоря: скрывает количество по системе, чтобы не влиять на подсчёт"
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition",
                      antiAnchor
                        ? "border-[var(--c-amber)] bg-[var(--c-amber-dim)] text-[var(--c-amber)]"
                        : "border-[var(--c-border2)] bg-[var(--c-bg2)] text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    <EyeOff size={12} />
                    Без якоря
                  </button>
                )}
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
                >
                  <Download size={13} />
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
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress section */}
        <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--c-text2)]">
              {counted === items.length
                ? "Все товары пересчитаны"
                : `${counted} из ${items.length} товаров пересчитано`}
            </p>
            <p className="text-xs font-semibold tabular text-[var(--c-text)]">{Math.round(pct)}%</p>
          </div>
          <div className="h-2 rounded-full bg-[var(--c-bg3)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 100 ? "bg-[var(--c-green)]" : pct > 50 ? "bg-[var(--c-amber)]" : "bg-[var(--c-text3)]",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {variances.length > 0 && (
            <p className="text-xs text-[var(--c-amber)]">
              {variances.length} расхождений · итого: {totalVariance > 0 ? "+" : ""}{totalVariance} шт
            </p>
          )}
        </div>

        {/* Barcode scan input (in_progress only) */}
        {isInProgress && (
          <div className="border-b border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-3 space-y-1.5">
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
                placeholder="Наведите сканер или введите штрихкод / SKU..."
                onKeyDown={handleScan}
                className={cn(
                  "h-10 w-full rounded-lg border px-3 pr-10 text-sm transition focus:outline-none",
                  scanError
                    ? "border-[var(--c-red)] bg-[var(--c-red-dim)] text-[var(--c-text)] placeholder:text-[var(--c-text3)]"
                    : scanSuccess
                    ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-text)] placeholder:text-[var(--c-text3)]"
                    : "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)]",
                )}
              />
              {(scanError || scanSuccess) && (
                <div
                  className={cn(
                    "absolute inset-x-0 top-full mt-1 rounded-lg border px-3 py-2 text-xs font-medium z-10",
                    scanError
                      ? "border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] text-[var(--c-red)]"
                      : "border-[rgba(31,209,131,0.3)] bg-[var(--c-green-dim)] text-[var(--c-green)]",
                  )}
                >
                  {scanError ?? `Добавлено: ${scanSuccess}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {items.map((item) => {
              const isEditing = editingId === item.productId;
              const hasVariance = item.variance !== null && item.variance !== 0;
              const isCounted = item.countedQty !== null;
              const isShortage = (item.variance ?? 0) < 0;
              const isSurplus = (item.variance ?? 0) > 0;
              const isMatch = isCounted && !hasVariance;

              // Row coloring: red for shortage, green for match, amber for surplus, gray for uncounted
              const rowCls = isShortage
                ? "border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)]"
                : isSurplus
                ? "border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)]"
                : isMatch
                ? "border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)]"
                : "border-[var(--c-border)] bg-[var(--c-bg3)]";

              return (
                <div
                  key={item.productId}
                  className={cn("rounded-xl border p-4 transition", rowCls)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isMatch && <CheckCircle size={14} className="shrink-0 text-[var(--c-green)]" />}
                        {isShortage && <TrendingDown size={14} className="shrink-0 text-[var(--c-red)]" />}
                        {isSurplus && <TrendingUp size={14} className="shrink-0 text-[var(--c-amber)]" />}
                        {!isCounted && <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--c-border2)]" />}
                        <p className="text-sm font-medium text-[var(--c-text)] truncate">{item.productName}</p>
                      </div>
                      <p className="text-xs text-[var(--c-text3)] mt-0.5 ml-5">{item.sku}</p>
                    </div>

                    <div className="flex items-start gap-3 shrink-0">
                      {!antiAnchor && (
                        <div className="text-right">
                          <p className="text-xs text-[var(--c-text3)]">в системе</p>
                          <p className="text-sm font-medium text-[var(--c-text)] tabular">{item.systemQty}</p>
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

                  {/* Count input or result */}
                  {isInProgress && (
                    <div className="mt-3 flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            autoFocus
                            min={0}
                            value={countValue}
                            onChange={(e) => setCountValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitCount(item.productId)}
                            placeholder={String(item.systemQty)}
                            className="flex-1 h-9 rounded-lg border border-[var(--c-green)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] focus:outline-none tabular"
                          />
                          <button
                            onClick={() => submitCount(item.productId)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--c-green)] text-[var(--c-bg)]"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setCountValue(""); }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)]"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(item.productId);
                              setCountValue(item.countedQty !== null ? String(item.countedQty) : "");
                            }}
                            className={cn(
                              "flex flex-1 items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
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
                                  "font-semibold tabular",
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
                          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                            <Camera size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Completed view — show counted qty */}
                  {!isInProgress && isCounted && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-[var(--c-text3)]">Подсчитано:</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular",
                          isShortage
                            ? "text-[var(--c-red)]"
                            : isSurplus
                            ? "text-[var(--c-amber)]"
                            : "text-[var(--c-green)]",
                        )}
                      >
                        {item.countedQty}
                      </span>
                    </div>
                  )}

                  {item.reason && (
                    <p className="mt-2 text-xs text-[var(--c-text3)]">Причина: {item.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          {isInProgress && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              <CheckCircle size={16} />
              Завершить и подтвердить корректировки
            </button>
          )}
          {variances.length > 0 && (
            <p className="text-xs text-center text-[var(--c-amber)]">
              Найдено {variances.length} расхождений. После подтверждения остатки будут скорректированы.
            </p>
          )}
        </div>
      </div>

      {/* Complete confirmation modal */}
      {showCompleteModal && (
        <CompleteStocktakeModal
          stocktake={stocktake}
          items={items}
          products={products}
          onConfirm={() => {
            actions.completeStocktake(stocktake.id);
            setShowCompleteModal(false);
            onClose();
          }}
          onCancel={() => setShowCompleteModal(false)}
        />
      )}
    </div>
  );
}

// ── Complete confirmation modal ───────────────────────────────────────────────

function CompleteStocktakeModal({
  stocktake,
  items,
  products,
  onConfirm,
  onCancel,
}: {
  stocktake: Stocktake;
  items: StocktakeItem[];
  products: ReturnType<typeof useInventory>["products"];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const counted = items.filter((i) => i.countedQty !== null).length;
  const shortages = items.filter((i) => (i.variance ?? 0) < 0);
  const surpluses = items.filter((i) => (i.variance ?? 0) > 0);
  const totalVarianceItems = shortages.length + surpluses.length;

  const totalCostImpact = items.reduce((sum, item) => {
    if (item.variance === null || item.variance === 0) return sum;
    const product = products.find((p) => p.id === item.productId);
    return sum + item.variance * (product?.costPrice ?? 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--c-border)] px-6 py-4">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Завершить инвентаризацию?</h3>
          <p className="text-xs text-[var(--c-text2)] mt-0.5">
            Остатки будут скорректированы по результатам подсчёта
          </p>
        </div>

        {/* Summary */}
        <div className="px-6 py-5 space-y-3">
          <SummaryRow
            label="Товаров подсчитано"
            value={`${counted} из ${items.length}`}
            valueColor={counted === items.length ? "green" : "amber"}
          />
          {shortages.length > 0 && (
            <SummaryRow
              label="Недостач"
              value={`${shortages.length} поз.`}
              valueColor="red"
            />
          )}
          {surpluses.length > 0 && (
            <SummaryRow
              label="Излишков"
              value={`${surpluses.length} поз.`}
              valueColor="amber"
            />
          )}
          {totalVarianceItems === 0 && (
            <SummaryRow label="Расхождений" value="Нет" valueColor="green" />
          )}
          <div className="border-t border-[var(--c-border)] pt-3">
            <SummaryRow
              label="Стоимостное влияние"
              value={`${totalCostImpact >= 0 ? "+" : ""}${totalCostImpact.toLocaleString("ru-RU")} ₽`}
              valueColor={totalCostImpact < 0 ? "red" : totalCostImpact > 0 ? "amber" : "green"}
            />
          </div>

          {counted < items.length && (
            <div className="flex items-start gap-2 rounded-lg border border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)] px-3 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
              <p className="text-xs text-[var(--c-amber)]">
                {items.length - counted} товаров не подсчитано. Для них расхождения не будут зафиксированы.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
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
            Завершить инвентаризацию
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: "green" | "amber" | "red";
}) {
  const colorMap = {
    green: "text-[var(--c-green)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-[var(--c-text2)]">{label}</p>
      <p className={cn("text-sm font-semibold tabular", valueColor ? colorMap[valueColor] : "text-[var(--c-text)]")}>
        {value}
      </p>
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateStocktakeForm({ onClose }: { onClose: () => void }) {
  const { products, locations, actions } = useInventory();
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations.find((l) => l.isDefault)?.id ?? "");
  const [note, setNote] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const productList = allProducts
      ? products.filter((p) => p.status === "active")
      : products.filter((p) => selectedProducts.includes(p.id) && p.status === "active");
    const items = productList.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      systemQty: p.stockByLocation[locationId] ?? 0,
      countedQty: null,
      variance: null,
    }));
    const newId = actions.createStocktake(locationId, items, note || undefined);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      router.push(`/inventory/stocktake/${newId}`);
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Новая инвентаризация</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Локация</label>
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

          <div>
            <label className="mb-3 block text-xs font-medium text-[var(--c-text2)]">Товары</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={allProducts}
                  onChange={() => setAllProducts(true)}
                  className="accent-[var(--c-green)]"
                />
                <span className="text-sm text-[var(--c-text)]">Все товары на складе</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={!allProducts}
                  onChange={() => setAllProducts(false)}
                  className="accent-[var(--c-green)]"
                />
                <span className="text-sm text-[var(--c-text)]">Выбрать товары</span>
              </label>
            </div>

            {!allProducts && (
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {products.filter((p) => p.status === "active").map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--c-bg3)] cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() =>
                        setSelectedProducts((prev) =>
                          prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                        )
                      }
                      className="h-4 w-4 rounded accent-[var(--c-green)]"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-[var(--c-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Причина инвентаризации..."
              className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            {saved ? (
              <><Check size={14} /> Создано</>
            ) : (
              <><ClipboardList size={14} /> Начать инвентаризацию</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber" | "red" | "blue";
}) {
  const colorMap = {
    green: "text-[var(--c-green)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
    blue: "text-[var(--c-blue)]",
  };
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="text-xs text-[var(--c-text2)] mb-1.5">{label}</p>
      <p className={cn("text-2xl font-bold tabular", color ? colorMap[color] : "text-[var(--c-text)]")}>{value}</p>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
