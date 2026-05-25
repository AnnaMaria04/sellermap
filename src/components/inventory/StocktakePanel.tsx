"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  ClipboardList,
  Check,
  X,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  MinusCircle,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import {
  getLocationName,
  type Stocktake,
  type StocktakeItem,
  type StocktakeStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

interface Props {
  onCreateStocktake?: () => void;
}

export function StocktakePanel({ onCreateStocktake }: Props) {
  const { stocktakes, locations, actions } = useInventory();
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
        <StatCard label="Расхождений" value={stocktakes.flatMap((s) => s.items).filter((i) => i.variance !== null && i.variance !== 0).length} color="red" />
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--c-text)]">История инвентаризаций</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
        >
          <Plus size={15} />
          Начать инвентаризацию
        </button>
      </div>

      {/* Stocktake cards */}
      <div className="space-y-3">
        {stocktakes.map((stk) => {
          const cfg = statusConfig[stk.status];
          const counted = stk.items.filter((i) => i.countedQty !== null).length;
          const variances = stk.items.filter((i) => i.variance !== null && i.variance !== 0);
          const locationName = getLocationName(stk.locationId);

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
                <div className="flex items-center gap-3 mt-1.5">
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
                      className="h-full rounded-full bg-[var(--c-green)]"
                      style={{ width: `${(counted / stk.items.length) * 100}%` }}
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

              <ChevronRight size={16} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 shrink-0 transition" />
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

function StocktakeDetailPanel({ stocktake, onClose }: { stocktake: Stocktake; onClose: () => void }) {
  const { actions } = useInventory();
  const [items, setItems] = useState<StocktakeItem[]>(stocktake.items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [countValue, setCountValue] = useState("");

  const locationName = getLocationName(stocktake.locationId);
  const counted = items.filter((i) => i.countedQty !== null).length;
  const variances = items.filter((i) => i.variance !== null && i.variance !== 0);
  const totalVariance = variances.reduce((s, i) => s + (i.variance ?? 0), 0);

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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Инвентаризация</h2>
            <p className="text-xs text-[var(--c-text2)]">{locationName} · {formatDate(stocktake.createdAt)}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-[var(--c-text2)]">Прогресс</p>
            <p className="text-xs font-medium text-[var(--c-text)] tabular">{counted}/{items.length}</p>
          </div>
          <div className="h-2 rounded-full bg-[var(--c-bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--c-green)] transition-all"
              style={{ width: `${items.length > 0 ? (counted / items.length) * 100 : 0}%` }}
            />
          </div>
          {variances.length > 0 && (
            <p className="mt-1.5 text-xs text-[var(--c-amber)]">
              {variances.length} расхождений, итого: {totalVariance > 0 ? "+" : ""}{totalVariance} шт
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {items.map((item) => {
              const isEditing = editingId === item.productId;
              const hasVariance = item.variance !== null && item.variance !== 0;
              const isCounted = item.countedQty !== null;

              return (
                <div
                  key={item.productId}
                  className={cn(
                    "rounded-xl border p-4 transition",
                    hasVariance
                      ? "border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)]"
                      : isCounted
                      ? "border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)]"
                      : "border-[var(--c-border)] bg-[var(--c-bg3)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isCounted && !hasVariance && (
                          <CheckCircle size={14} className="shrink-0 text-[var(--c-green)]" />
                        )}
                        {hasVariance && (
                          <AlertTriangle size={14} className="shrink-0 text-[var(--c-amber)]" />
                        )}
                        {!isCounted && (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--c-border2)]" />
                        )}
                        <p className="text-sm font-medium text-[var(--c-text)] truncate">{item.productName}</p>
                      </div>
                      <p className="text-xs text-[var(--c-text3)] mt-0.5 ml-5">{item.sku}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-[var(--c-text3)]">в системе</p>
                      <p className="text-sm font-medium text-[var(--c-text)] tabular">{item.systemQty}</p>
                    </div>
                  </div>

                  {/* Count input or result */}
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
                          onClick={() => { setEditingId(item.productId); setCountValue(item.countedQty !== null ? String(item.countedQty) : ""); }}
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
                            <span className={cn("font-semibold tabular", hasVariance ? "text-[var(--c-amber)]" : "text-[var(--c-green)]")}>
                              {item.countedQty}
                              {hasVariance && (
                                <span className="ml-1.5 text-xs">
                                  ({item.variance! > 0 ? "+" : ""}{item.variance})
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                          <Camera size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  {item.reason && (
                    <p className="mt-2 text-xs text-[var(--c-text3)]">Причина: {item.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          {stocktake.status === "in_progress" && (
            <button
              onClick={() => { actions.completeStocktake(stocktake.id); onClose(); }}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
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
    </div>
  );
}

function CreateStocktakeForm({ onClose }: { onClose: () => void }) {
  const { products, locations, actions } = useInventory();
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
    actions.createStocktake(locationId, items, note || undefined);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Новая инвентаризация</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
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
                  <label key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--c-bg3)] cursor-pointer transition">
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
          <button onClick={onClose} className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            {saved ? <><Check size={14} /> Создано</> : <><ClipboardList size={14} /> Начать инвентаризацию</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: "green" | "amber" | "red" | "blue" }) {
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
