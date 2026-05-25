"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  MapPin,
  Package,
  Plus,
  Minus,
  Hash,
  AlertTriangle,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import { PRODUCTS, LOCATIONS, MOVEMENTS, type Product } from "@/mock/inventory";
import { cn } from "@/lib/utils";

type AdjustType = "add" | "remove" | "set";
type AdjustReason = "stocktake" | "defect" | "accounting_error" | "return" | "theft" | "other";

interface RecentAdjust {
  id: string;
  date: string;
  type: AdjustType;
  qty: number;
  reason: AdjustReason;
  userName: string;
}

const REASON_LABELS: Record<AdjustReason, string> = {
  stocktake: "Инвентаризация",
  defect: "Брак",
  accounting_error: "Ошибка учёта",
  return: "Возврат",
  theft: "Кража",
  other: "Другое",
};

const MOCK_RECENT: Record<string, RecentAdjust[]> = {
  "prod-001": [
    { id: "ra-1", date: "2026-05-15T16:00:00Z", type: "remove", qty: 5, reason: "stocktake", userName: "Мария Иванова" },
    { id: "ra-2", date: "2026-05-08T11:20:00Z", type: "remove", qty: 1, reason: "theft", userName: "Пётр Сидоров" },
    { id: "ra-3", date: "2026-04-20T09:00:00Z", type: "add", qty: 50, reason: "return", userName: "Мария Иванова" },
  ],
  "prod-002": [
    { id: "ra-4", date: "2026-05-15T16:00:00Z", type: "remove", qty: 4, reason: "accounting_error", userName: "Мария Иванова" },
    { id: "ra-5", date: "2026-04-28T10:30:00Z", type: "add", qty: 195, reason: "stocktake", userName: "Мария Иванова" },
  ],
  "prod-004": [
    { id: "ra-6", date: "2026-05-15T16:30:00Z", type: "remove", qty: 52, reason: "defect", userName: "Мария Иванова" },
  ],
};

function getProductStock(product: Product, locationId: string): number {
  return product.stockByLocation[locationId] ?? 0;
}

function SelectInput({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] pl-3 pr-8 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
    </div>
  );
}

function StockChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber" | "red" | "default";
}) {
  const colorMap = {
    green: "text-[var(--c-green)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
    default: "text-[var(--c-text)]",
  };
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
      <span className="text-xs text-[var(--c-text3)] mb-1">{label}</span>
      <span className={cn("text-xl font-bold tabular", colorMap[color ?? "default"])}>{value}</span>
    </div>
  );
}

export function QuickStockAdjust({
  onClose,
  productId,
}: {
  onClose: () => void;
  productId?: string;
}) {
  const [selectedProductId, setSelectedProductId] = useState(productId ?? "");
  const [locationId, setLocationId] = useState(LOCATIONS.find((l) => l.isDefault)?.id ?? "");
  const [adjustType, setAdjustType] = useState<AdjustType>("add");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<AdjustReason>("stocktake");
  const [note, setNote] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(!productId);
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  const product = useMemo(
    () => PRODUCTS.find((p) => p.id === selectedProductId) ?? null,
    [selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        p.status === "active" &&
        (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [productSearch]);

  const currentStock = product ? getProductStock(product, locationId) : 0;

  const previewStock = useMemo(() => {
    if (!product) return 0;
    if (adjustType === "add") return currentStock + qty;
    if (adjustType === "remove") return Math.max(0, currentStock - qty);
    return qty;
  }, [product, adjustType, qty, currentStock, locationId]);

  const delta = previewStock - currentStock;

  const requiresApproval = useMemo(() => {
    if (!product || currentStock === 0) return false;
    return Math.abs(delta) > currentStock * 0.1;
  }, [product, delta, currentStock]);

  const recentAdjustments: RecentAdjust[] = selectedProductId
    ? (MOCK_RECENT[selectedProductId] ?? []).slice(0, 5)
    : [];

  function handleSubmit() {
    if (!product || !locationId) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      handleClose();
    }, 800);
  }

  const canSubmit = !!product && !!locationId && qty > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        className={cn(
          "relative ml-auto flex h-full w-full max-w-md flex-col bg-[var(--c-bg)] shadow-2xl transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Быстрая корректировка</h2>
            <p className="text-xs text-[var(--c-text3)] mt-0.5">Esc — закрыть</p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Товар</label>
            {product && !showProductSearch ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--c-green)] bg-[var(--c-green-dim)] px-4 py-3">
                <Package size={15} className="text-[var(--c-green)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{product.name}</p>
                  <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                </div>
                <button
                  onClick={() => { setShowProductSearch(true); setProductSearch(""); }}
                  className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition shrink-0"
                >
                  Изменить
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                <input
                  autoFocus
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Поиск по названию или SKU..."
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl max-h-52 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setShowProductSearch(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--c-bg3)] transition"
                      >
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-[var(--c-border)] bg-[var(--c-bg3)]">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--c-text)] truncate">{p.name}</p>
                          <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> Локация</span>
            </label>
            <SelectInput value={locationId} onChange={setLocationId}>
              {LOCATIONS.filter((l) => !["in_transit"].includes(l.type)).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </SelectInput>
          </div>

          {product && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--c-text2)]">Текущие остатки в локации</p>
              <div className="grid grid-cols-4 gap-2">
                <StockChip label="Физически" value={currentStock} color="default" />
                <StockChip label="Зарезерв." value={product.reservedUnits} color="amber" />
                <StockChip label="Брак" value={product.damagedUnits} color="red" />
                <StockChip
                  label="Доступно"
                  value={Math.max(0, currentStock - product.reservedUnits - product.damagedUnits)}
                  color="green"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Тип корректировки</label>
            <div className="flex gap-2">
              {(
                [
                  { key: "add" as AdjustType, label: "Добавить", icon: <Plus size={13} /> },
                  { key: "remove" as AdjustType, label: "Убрать", icon: <Minus size={13} /> },
                  { key: "set" as AdjustType, label: "Установить", icon: <Hash size={13} /> },
                ] as { key: AdjustType; label: string; icon: React.ReactNode }[]
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAdjustType(t.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition",
                    adjustType === t.key
                      ? t.key === "remove"
                        ? "border-[var(--c-red)] bg-[var(--c-red-dim)] text-[var(--c-red)]"
                        : t.key === "set"
                        ? "border-[var(--c-blue)] bg-[var(--c-blue-dim)] text-[var(--c-blue)]"
                        : "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                      : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)]",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              {adjustType === "set" ? "Точное количество" : "Количество"}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(0, q - 1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-center text-base font-bold tabular text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                <Plus size={14} />
              </button>
              <span className="text-sm text-[var(--c-text3)]">шт</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Причина</label>
            <SelectInput value={reason} onChange={(v) => setReason(v as AdjustReason)}>
              {Object.entries(REASON_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </SelectInput>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Необязательный комментарий..."
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
            />
          </div>

          {product && qty > 0 && (
            <div className={cn(
              "rounded-xl border p-4",
              requiresApproval
                ? "border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)]"
                : "border-[var(--c-border)] bg-[var(--c-bg3)]",
            )}>
              <p className="text-xs font-medium text-[var(--c-text2)] mb-2">Предварительный просмотр</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold tabular text-[var(--c-text)]">{currentStock}</span>
                  <span className="mx-2 text-[var(--c-text3)]">→</span>
                  <span className="text-lg font-bold tabular text-[var(--c-text)]">{previewStock}</span>
                  <span className="ml-1 text-sm text-[var(--c-text3)]">шт</span>
                </div>
                <span className={cn(
                  "text-base font-bold tabular",
                  delta > 0 ? "text-[var(--c-green)]" : delta < 0 ? "text-[var(--c-red)]" : "text-[var(--c-text3)]",
                )}>
                  {delta > 0 ? "+" : ""}{delta} шт
                </span>
              </div>
              {requiresApproval && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(245,166,35,0.2)]">
                  <AlertTriangle size={13} className="text-[var(--c-amber)] shrink-0" />
                  <p className="text-xs font-medium text-[var(--c-amber)]">
                    Требует подтверждения менеджера — изменение более 10% от остатка
                  </p>
                </div>
              )}
            </div>
          )}

          {recentAdjustments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} className="text-[var(--c-text3)]" />
                <p className="text-xs font-medium text-[var(--c-text2)]">Последние корректировки</p>
              </div>
              <div className="space-y-1.5">
                {recentAdjustments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        a.type === "add"
                          ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                          : a.type === "remove"
                          ? "bg-[var(--c-red-dim)] text-[var(--c-red)]"
                          : "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
                      )}
                    >
                      {a.type === "add" ? "+" : a.type === "remove" ? "−" : "="}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--c-text)]">
                        {a.type === "add" ? "+" : a.type === "remove" ? "−" : "="}{a.qty} шт
                        <span className="mx-1 text-[var(--c-text3)]">·</span>
                        {REASON_LABELS[a.reason]}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">{a.userName}</p>
                    </div>
                    <p className="text-xs text-[var(--c-text3)] tabular shrink-0">
                      {new Date(a.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-5 py-4">
          <button
            onClick={handleClose}
            className="h-10 flex-1 rounded-xl border border-[var(--c-border)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitted}
            className={cn(
              "flex h-10 flex-[2] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
              canSubmit && !submitted
                ? requiresApproval
                  ? "bg-[var(--c-amber)] text-[var(--c-bg)] hover:opacity-90"
                  : "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {submitted ? (
              <><Check size={15} /> Сохранено</>
            ) : requiresApproval ? (
              <><AlertTriangle size={15} /> Отправить на согласование</>
            ) : (
              <><Check size={15} /> Подтвердить корректировку</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
