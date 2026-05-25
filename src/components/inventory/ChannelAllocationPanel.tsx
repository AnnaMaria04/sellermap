"use client";

import { useState, useMemo } from "react";
import {
  Sliders,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Edit2,
  Zap,
  BarChart2,
  Link,
} from "lucide-react";
import { CHANNEL_LABELS, type SalesChannel, type Product, getAvailableStock } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

type AllocationMode = "percent" | "qty";

const CHANNELS: SalesChannel[] = ["wildberries", "ozon", "yandex_market", "website", "pos", "telegram"];

const CHANNEL_COLORS: Record<SalesChannel, { bg: string; text: string; border: string }> = {
  wildberries: { bg: "rgba(165,70,220,0.15)", text: "#b44fe8", border: "rgba(165,70,220,0.35)" },
  ozon:        { bg: "rgba(77,159,255,0.15)",  text: "#4d9fff", border: "rgba(77,159,255,0.35)" },
  yandex_market: { bg: "rgba(245,166,35,0.15)", text: "#f5a623", border: "rgba(245,166,35,0.35)" },
  website:     { bg: "rgba(31,209,131,0.15)",  text: "#1fd183", border: "rgba(31,209,131,0.35)" },
  pos:         { bg: "rgba(150,150,160,0.15)", text: "#9696a0", border: "rgba(150,150,160,0.35)" },
  telegram:    { bg: "rgba(0,180,200,0.15)",   text: "#00b4c8", border: "rgba(0,180,200,0.35)" },
  delivery:    { bg: "rgba(245,166,35,0.15)",  text: "#f5a623", border: "rgba(245,166,35,0.35)" },
};

const MOCK_ALLOCATIONS: Record<string, Record<SalesChannel, number>> = {
  "prod-001": { wildberries: 50, ozon: 30, yandex_market: 0, website: 15, pos: 0, telegram: 0, delivery: 0 },
  "prod-002": { wildberries: 120, ozon: 80, yandex_market: 0, website: 20, pos: 30, telegram: 0, delivery: 0 },
  "prod-003": { wildberries: 0, ozon: 0, yandex_market: 0, website: 4, pos: 4, telegram: 0, delivery: 0 },
  "prod-004": { wildberries: 0, ozon: 0, yandex_market: 0, website: 0, pos: 800, telegram: 0, delivery: 0 },
  "prod-006": { wildberries: 0, ozon: 0, yandex_market: 0, website: 0, pos: 0, telegram: 0, delivery: 0 },
  "prod-007": { wildberries: 0, ozon: 10, yandex_market: 0, website: 5, pos: 10, telegram: 0, delivery: 0 },
};

const LAST_SYNC: Record<string, string> = {
  wildberries: "24 мая, 14:32",
  ozon: "24 мая, 11:05",
};

function totalAllocated(allocs: Record<SalesChannel, number>): number {
  return Object.values(allocs).reduce((s, v) => s + v, 0);
}

function fmtQty(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function ChannelAllocationPanel() {
  const { products } = useInventory();
  const ACTIVE_PRODUCTS = useMemo(() => products.filter((p) => p.status === "active"), [products]);
  const [allocations, setAllocations] =
    useState<Record<string, Record<SalesChannel, number>>>(MOCK_ALLOCATIONS);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [mode, setMode] = useState<AllocationMode>("qty");
  const [syncingWb, setSyncingWb] = useState(false);
  const [syncingOzon, setSyncingOzon] = useState(false);
  const [syncTimes, setSyncTimes] = useState(LAST_SYNC);

  const statsTotal = useMemo(() => {
    let totalAlloc = 0;
    let totalAvail = 0;
    ACTIVE_PRODUCTS.forEach((p) => {
      const avail = getAvailableStock(p);
      totalAvail += avail;
      const alloc = allocations[p.id];
      if (alloc) totalAlloc += Math.min(totalAllocated(alloc), avail);
    });
    return { totalAlloc, totalUnalloc: totalAvail - totalAlloc, totalAvail };
  }, [allocations, ACTIVE_PRODUCTS]);

  const productsWithAlloc = useMemo(
    () => ACTIVE_PRODUCTS.filter((p) => allocations[p.id] && totalAllocated(allocations[p.id]) > 0).length,
    [allocations, ACTIVE_PRODUCTS]
  );

  const connectedChannels = useMemo(() => {
    const set = new Set<SalesChannel>();
    ACTIVE_PRODUCTS.forEach((p) => {
      const alloc = allocations[p.id];
      if (!alloc) return;
      (Object.keys(alloc) as SalesChannel[]).forEach((ch) => {
        if (alloc[ch] > 0) set.add(ch);
      });
    });
    return set.size;
  }, [allocations, ACTIVE_PRODUCTS]);

  function handleSync(channel: "wildberries" | "ozon") {
    if (channel === "wildberries") {
      setSyncingWb(true);
      setTimeout(() => {
        setSyncingWb(false);
        setSyncTimes((t) => ({ ...t, wildberries: "только что" }));
      }, 1400);
    } else {
      setSyncingOzon(true);
      setTimeout(() => {
        setSyncingOzon(false);
        setSyncTimes((t) => ({ ...t, ozon: "только что" }));
      }, 1400);
    }
  }

  function updateAllocation(productId: string, channel: SalesChannel, value: number) {
    setAllocations((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? blankAlloc()), [channel]: Math.max(0, value) },
    }));
  }

  function autoDistribute(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const avail = getAvailableStock(product);
    const currentAlloc = allocations[productId] ?? blankAlloc();
    const used = totalAllocated(currentAlloc);
    const remaining = Math.max(0, avail - used);
    if (remaining === 0) return;
    const productChannels = product.channels.filter((ch) => CHANNELS.includes(ch));
    if (productChannels.length === 0) return;
    const perChannel = Math.floor(remaining / productChannels.length);
    const newAlloc = { ...currentAlloc };
    productChannels.forEach((ch) => {
      newAlloc[ch] = (newAlloc[ch] ?? 0) + perChannel;
    });
    setAllocations((prev) => ({ ...prev, [productId]: newAlloc }));
  }

  const editingProduct = editingProductId ? products.find((p) => p.id === editingProductId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Товаров с аллокацией" value={String(productsWithAlloc)} />
        <StatCard label="Подключено каналов" value={String(connectedChannels)} />
        <StatCard label="Нераспределено" value={fmtQty(statsTotal.totalUnalloc) + " шт"} accent="amber" />
        <StatCard label="Распределено" value={fmtQty(statsTotal.totalAlloc) + " шт"} accent="green" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
          {(["qty", "percent"] as AllocationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition",
                mode === m
                  ? "bg-[var(--c-bg3)] text-[var(--c-text)] shadow"
                  : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
              )}
            >
              {m === "qty" ? "Количество" : "Процент"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncButton
            label="Синхронизировать с WB"
            lastSync={syncTimes.wildberries}
            loading={syncingWb}
            color="#b44fe8"
            onClick={() => handleSync("wildberries")}
          />
          <SyncButton
            label="Синхронизировать с Ozon"
            lastSync={syncTimes.ozon}
            loading={syncingOzon}
            color="#4d9fff"
            onClick={() => handleSync("ozon")}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <div className="border-b border-[var(--c-border)] px-5 py-3 grid gap-3" style={{ gridTemplateColumns: "1fr 80px repeat(6,1fr) 40px" }}>
          <span className="text-xs font-medium text-[var(--c-text2)]">Товар / SKU</span>
          <span className="text-xs font-medium text-[var(--c-text2)] text-center">Доступно</span>
          {CHANNELS.map((ch) => (
            <span key={ch} className="text-xs font-medium truncate" style={{ color: CHANNEL_COLORS[ch].text }}>
              {CHANNEL_LABELS[ch]}
            </span>
          ))}
          <span />
        </div>

        <div className="divide-y divide-[var(--c-border)]">
          {ACTIVE_PRODUCTS.map((product) => (
            <ProductAllocationRow
              key={product.id}
              product={product}
              alloc={allocations[product.id] ?? blankAlloc()}
              mode={mode}
              onEdit={() => setEditingProductId(product.id)}
            />
          ))}
        </div>
      </div>

      {editingProduct && (
        <AllocationEditor
          product={editingProduct}
          alloc={allocations[editingProduct.id] ?? blankAlloc()}
          mode={mode}
          onModeChange={setMode}
          onChange={(ch, val) => updateAllocation(editingProduct.id, ch, val)}
          onAutoDistribute={() => autoDistribute(editingProduct.id)}
          onClose={() => setEditingProductId(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const colorMap = { green: "var(--c-green)", amber: "var(--c-amber)", red: "var(--c-red)" };
  const color = accent ? colorMap[accent] : "var(--c-text)";
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="text-xs text-[var(--c-text2)] mb-1.5">{label}</p>
      <p className="text-xl font-bold tabular" style={{ color }}>{value}</p>
    </div>
  );
}

function SyncButton({
  label, lastSync, loading, color, onClick,
}: {
  label: string; lastSync: string; loading: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
      style={{ borderColor: color + "55", backgroundColor: color + "18", color }}
    >
      <RefreshCw size={12} className={cn(loading && "animate-spin")} />
      <span>{label}</span>
      <span className="text-[10px] opacity-60 ml-1">{lastSync}</span>
    </button>
  );
}

function ProductAllocationRow({
  product, alloc, mode, onEdit,
}: {
  product: Product;
  alloc: Record<SalesChannel, number>;
  mode: AllocationMode;
  onEdit: () => void;
}) {
  const avail = getAvailableStock(product);
  const used = totalAllocated(alloc);
  const over = used > avail;

  return (
    <div
      className="grid items-center gap-3 px-5 py-3 hover:bg-[var(--c-bg3)] transition"
      style={{ gridTemplateColumns: "1fr 80px repeat(6,1fr) 40px" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--c-text)] truncate">{product.name}</p>
        <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
      </div>

      <div className="text-center">
        <span className="text-sm font-bold tabular text-[var(--c-text)]">{fmtQty(avail)}</span>
        {over && <AlertTriangle size={10} className="inline ml-1 text-[var(--c-red)]" />}
      </div>

      {CHANNELS.map((ch) => {
        const qty = alloc[ch] ?? 0;
        const pct = avail > 0 ? Math.min(100, Math.round((qty / avail) * 100)) : 0;
        const isActive = qty > 0;
        const colors = CHANNEL_COLORS[ch];
        return (
          <div key={ch} className="flex flex-col gap-1">
            {isActive ? (
              <>
                <span className="text-xs font-semibold tabular" style={{ color: colors.text }}>
                  {mode === "percent" ? `${pct}%` : fmtQty(qty)}
                </span>
                <div className="h-1 w-full rounded-full bg-[var(--c-bg3)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: colors.text }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs text-[var(--c-text3)]">—</span>
            )}
          </div>
        );
      })}

      <button
        onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg2)] hover:text-[var(--c-text)] transition"
      >
        <Edit2 size={13} />
      </button>
    </div>
  );
}

function AllocationEditor({
  product, alloc, mode, onModeChange, onChange, onAutoDistribute, onClose,
}: {
  product: Product;
  alloc: Record<SalesChannel, number>;
  mode: AllocationMode;
  onModeChange: (m: AllocationMode) => void;
  onChange: (ch: SalesChannel, val: number) => void;
  onAutoDistribute: () => void;
  onClose: () => void;
}) {
  const avail = getAvailableStock(product);
  const used = totalAllocated(alloc);
  const remaining = avail - used;
  const overAllocated = used > avail;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[var(--c-bg)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Аллокация по каналам</h2>
            <p className="text-xs text-[var(--c-text3)] mt-0.5 truncate max-w-xs">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 text-center">
              <p className="text-[10px] text-[var(--c-text2)] mb-1">Доступно</p>
              <p className="text-lg font-bold tabular text-[var(--c-text)]">{fmtQty(avail)}</p>
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 text-center">
              <p className="text-[10px] text-[var(--c-text2)] mb-1">Распределено</p>
              <p className={cn("text-lg font-bold tabular", overAllocated ? "text-[var(--c-red)]" : "text-[var(--c-green)]")}>
                {fmtQty(used)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 text-center">
              <p className="text-[10px] text-[var(--c-text2)] mb-1">Остаток</p>
              <p className={cn("text-lg font-bold tabular", remaining < 0 ? "text-[var(--c-red)]" : "text-[var(--c-text)]")}>
                {fmtQty(remaining)}
              </p>
            </div>
          </div>

          {overAllocated && (
            <div className="flex items-start gap-3 rounded-xl border border-[rgba(240,80,80,0.25)] bg-[rgba(240,80,80,0.08)] p-4">
              <AlertTriangle size={15} className="text-[var(--c-red)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--c-red)]">
                Аллокация превышает доступный остаток на {fmtQty(used - avail)} шт. Уменьшите значения.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
            {(["qty", "percent"] as AllocationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  mode === m ? "bg-[var(--c-bg3)] text-[var(--c-text)]" : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                )}
              >
                {m === "qty" ? "Кол-во" : "Процент"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {CHANNELS.map((ch) => {
              const qty = alloc[ch] ?? 0;
              const pct = avail > 0 ? Math.round((qty / avail) * 100) : 0;
              const colors = CHANNEL_COLORS[ch];
              const isProductChannel = product.channels.includes(ch);

              return (
                <div
                  key={ch}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition",
                    isProductChannel ? "border-[var(--c-border)]" : "border-[var(--c-border)] opacity-50"
                  )}
                  style={{ backgroundColor: qty > 0 ? colors.bg : "var(--c-bg2)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.text }} />
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {CHANNEL_LABELS[ch]}
                      </span>
                      {!isProductChannel && (
                        <span className="text-[10px] text-[var(--c-text3)]">(не подключён)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular text-[var(--c-text2)]">
                        {mode === "percent" ? `${pct}%` : `${fmtQty(qty)} шт`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={mode === "percent" ? 100 : avail}
                      value={mode === "percent" ? pct : qty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        onChange(ch, mode === "percent" ? Math.round((v / 100) * avail) : v);
                      }}
                      className="w-full accent-current h-1.5"
                      style={{ accentColor: colors.text }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={mode === "percent" ? 100 : avail}
                        value={mode === "percent" ? pct : qty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          onChange(ch, mode === "percent" ? Math.round((v / 100) * avail) : v);
                        }}
                        className="h-8 w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm tabular text-right text-[var(--c-text)] focus:outline-none focus:border-[var(--c-green)]"
                      />
                      <span className="text-xs text-[var(--c-text3)]">
                        {mode === "percent" ? "%" : "шт"}
                      </span>
                      {qty > 0 && (
                        <button
                          onClick={() => onChange(ch, 0)}
                          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:text-[var(--c-red)] transition"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-2 w-full rounded-full bg-[var(--c-bg3)] overflow-hidden flex">
            {CHANNELS.map((ch) => {
              const qty = alloc[ch] ?? 0;
              const pct = avail > 0 ? Math.min(100, (qty / avail) * 100) : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={ch}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: CHANNEL_COLORS[ch].text }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4 shrink-0">
          <button
            onClick={onAutoDistribute}
            className="flex items-center gap-2 rounded-xl border border-[var(--c-border2)] px-4 py-2 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Zap size={14} />
            Авто-распределение
          </button>
          <button
            onClick={onClose}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <Check size={14} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function blankAlloc(): Record<SalesChannel, number> {
  return { wildberries: 0, ozon: 0, yandex_market: 0, website: 0, pos: 0, telegram: 0, delivery: 0 };
}
