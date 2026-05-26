"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  X,
  Plus,
  Search,
  Star,
  Clock,
  ChevronDown,
  Trash2,
  ArrowLeftRight,
  ShieldAlert,
  CheckCircle2,
  Package,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product, type InventoryBatch, type BatchStatus } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeStatus(expiryDate: string): BatchStatus {
  const d = daysUntilExpiry(expiryDate);
  if (d < 0) return "expired";
  if (d <= 7) return "expiring_soon";
  return "ok";
}

function countdownLabel(days: number): string {
  if (days < 0) return `Истёк ${Math.abs(days)} дн. назад`;
  if (days === 0) return "Истекает сегодня";
  if (days === 1) return "Истекает завтра";
  return `Истекает через ${days} дн.`;
}

function countdownColor(days: number): string {
  if (days < 0) return "text-[var(--c-red)] font-semibold";
  if (days <= 7) return "text-[var(--c-red)] font-medium";
  if (days <= 30) return "text-[var(--c-amber)] font-medium";
  return "text-[var(--c-green)]";
}

function daysLabel(days: number): string {
  if (days < 0) return `Просрочено ${Math.abs(days)} дн.`;
  if (days === 0) return "Истекает сегодня";
  return `${days} дн.`;
}

function daysColor(days: number): string {
  if (days < 0 || days <= 7) return "text-[var(--c-red)] font-semibold";
  if (days <= 30) return "text-[var(--c-amber)] font-medium";
  return "text-[var(--c-green)]";
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string }> = {
  ok:             { label: "В норме",    color: "text-[var(--c-green)]", bg: "bg-[var(--c-green)]/10" },
  expiring_soon:  { label: "Истекает",   color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber)]/10" },
  expired:        { label: "Просрочено", color: "text-[var(--c-red)]",   bg: "bg-[var(--c-red)]/10"   },
  quarantine:     { label: "Карантин",   color: "text-[var(--c-text3)]", bg: "bg-[var(--c-bg3)]"      },
};

// ── Main Component ────────────────────────────────────────────────────────────

export function ExpiryTracker() {
  const { products, locations, suppliers, batches, actions } = useInventory();
  const getLocationName = (id: string) => locations.find((l) => l.id === id)?.name ?? id;

  const [statusFilter, setStatusFilter] = useState<BatchStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [confirmWriteOffAll, setConfirmWriteOffAll] = useState(false);

  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "";
  const [form, setForm] = useState({
    productSearch: "",
    productId: "",
    productName: "",
    sku: "",
    batchNumber: "",
    manufactureDate: "",
    expiryDate: "",
    locationId: defaultLocationId,
    qty: "",
    supplierId: "",
  });
  const [productResults, setProductResults] = useState<Product[]>([]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const expired  = batches.filter((b) => daysUntilExpiry(b.expiryDate) < 0 && b.status !== "quarantine").length;
    const critical = batches.filter((b) => { const d = daysUntilExpiry(b.expiryDate); return d >= 0 && d <= 7; }).length;
    const warning  = batches.filter((b) => { const d = daysUntilExpiry(b.expiryDate); return d > 7 && d <= 30; }).length;
    const ok       = batches.filter((b) => { const d = daysUntilExpiry(b.expiryDate); return d > 30 && b.status !== "quarantine"; }).length;
    return { expired, critical, warning, ok };
  }, [batches]);

  // ── Filtered & sorted batches ─────────────────────────────────────────────
  const sortedFiltered = useMemo(() => {
    return batches
      .filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (locationFilter !== "all" && b.locationId !== locationFilter) return false;
        if (searchQ && !b.productName.toLowerCase().includes(searchQ.toLowerCase()) && !b.batchNumber.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [batches, statusFilter, locationFilter, searchQ]);

  // ── FEFO ──────────────────────────────────────────────────────────────────
  const fefoByProduct = useMemo(() => {
    const map: Record<string, InventoryBatch[]> = {};
    batches
      .filter((b) => b.status !== "expired" && b.status !== "quarantine" && b.remainingQty > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .forEach((b) => {
        if (!map[b.productId]) map[b.productId] = [];
        map[b.productId].push(b);
      });
    return map;
  }, [batches]);

  const fefoFirstIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(fefoByProduct).forEach((arr) => { if (arr.length) ids.add(arr[0].id); });
    return ids;
  }, [fefoByProduct]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleWriteOffExpired() {
    batches
      .filter((b) => daysUntilExpiry(b.expiryDate) < 0 && b.status !== "quarantine" && b.remainingQty > 0)
      .forEach((b) => {
        actions.adjustStock(b.productId, b.locationId, -b.remainingQty, "write_off", `Истёк срок годности — партия ${b.batchNumber}`);
      });
    actions.writeOffAllExpired();
    setConfirmWriteOffAll(false);
  }

  function handleWriteOff(id: string) {
    const batch = batches.find((b) => b.id === id);
    if (batch && batch.remainingQty > 0) {
      actions.adjustStock(batch.productId, batch.locationId, -batch.remainingQty, "write_off", `Истёк срок годности — партия ${batch.batchNumber}`);
    }
    actions.writeOffBatch(id);
  }

  function handleQuarantine(id: string) {
    actions.quarantineBatch(id);
  }

  function handleProductSearch(q: string) {
    setForm((p) => ({ ...p, productSearch: q, productId: "", productName: "", sku: "" }));
    setProductResults(
      q.length > 1
        ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
        : [],
    );
  }

  function selectProduct(p: Product) {
    setForm((prev) => ({ ...prev, productSearch: p.name, productId: p.id, productName: p.name, sku: p.sku }));
    setProductResults([]);
  }

  function handleRegister() {
    if (!form.productId || !form.batchNumber || !form.expiryDate || !form.qty) return;
    const status = computeStatus(form.expiryDate);
    const newBatch: InventoryBatch = {
      id: `bat-${Date.now()}`,
      productId: form.productId,
      productName: form.productName,
      sku: form.sku,
      batchNumber: form.batchNumber,
      qty: parseInt(form.qty),
      remainingQty: parseInt(form.qty),
      manufactureDate: form.manufactureDate || undefined,
      expiryDate: form.expiryDate,
      locationId: form.locationId,
      status,
      receivedAt: new Date().toISOString().split("T")[0],
      supplierId: form.supplierId || undefined,
      costPrice: products.find((p) => p.id === form.productId)?.costPrice ?? 0,
    };
    actions.registerBatch(newBatch);
    setShowRegister(false);
    setForm({ productSearch: "", productId: "", productName: "", sku: "", batchNumber: "", manufactureDate: "", expiryDate: "", locationId: defaultLocationId, qty: "", supplierId: "" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Сроки годности и партии</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Отслеживание FEFO и управление партиями</p>
        </div>
        <div className="flex items-center gap-3">
          {counts.expired > 0 && (
            <button
              onClick={() => setConfirmWriteOffAll(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red)]/10 px-3 py-2 text-sm font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/15 transition"
            >
              <Ban size={14} />
              Списать все истёкшие
            </button>
          )}
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={15} />
            Зарегистрировать партию
          </button>
        </div>
      </div>

      {/* Предупреждения */}
      {(counts.expired > 0 || counts.critical > 0 || counts.warning > 0) && (
        <div className="space-y-2">
          {counts.expired > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--c-red)]/30 bg-[var(--c-red)]/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-[var(--c-red)] shrink-0" />
                <span className="text-sm text-[var(--c-red)] font-medium">
                  {counts.expired} {counts.expired === 1 ? "партия просрочена" : "партии просрочены"} — требуют немедленного списания
                </span>
              </div>
              <button
                onClick={() => setConfirmWriteOffAll(true)}
                className="shrink-0 rounded-lg border border-[var(--c-red)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--c-red)] hover:bg-[var(--c-red)]/10 transition"
              >
                Списать всё
              </button>
            </div>
          )}
          {counts.critical > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--c-red)]/25 bg-[var(--c-red)]/4 px-4 py-3">
              <Clock size={16} className="text-[var(--c-red)] shrink-0" />
              <span className="text-sm text-[var(--c-red)] font-medium">
                {counts.critical} {counts.critical === 1 ? "партия истекает" : "партии истекают"} в течение 7 дней — критический уровень
              </span>
            </div>
          )}
          {counts.warning > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--c-amber)]/30 bg-[var(--c-amber)]/5 px-4 py-3">
              <Clock size={16} className="text-[var(--c-amber)] shrink-0" />
              <span className="text-sm text-[var(--c-amber)] font-medium">
                {counts.warning} {counts.warning === 1 ? "партия истекает" : "партии истекают"} в течение 30 дней — контролируйте сбыт
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Просрочено",        count: counts.expired,  color: "text-[var(--c-red)]",   bg: "border-[var(--c-red)]/20 bg-[var(--c-red)]/5",   icon: AlertTriangle, status: "expired"       as const },
          { label: "Истекает ≤ 7 дней", count: counts.critical, color: "text-[var(--c-red)]",   bg: "border-[var(--c-red)]/15 bg-[var(--c-red)]/3",   icon: Clock,         status: "expiring_soon" as const },
          { label: "Истекает ≤ 30 дней",count: counts.warning,  color: "text-[var(--c-amber)]", bg: "border-[var(--c-amber)]/20 bg-[var(--c-amber)]/5", icon: Clock,         status: "expiring_soon" as const },
          { label: "В норме",           count: counts.ok,       color: "text-[var(--c-green)]", bg: "border-[var(--c-green)]/20 bg-[var(--c-green)]/5", icon: CheckCircle2,  status: "ok"            as const },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.status ? "all" : s.status)}
            className={cn("rounded-xl border p-4 text-left cursor-pointer hover:opacity-80 transition", s.bg, statusFilter === s.status && "ring-2 ring-[var(--c-border2)]")}
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-[var(--c-text3)]">{s.label}</span>
            </div>
            <div className={cn("text-2xl font-bold", s.color)}>{s.count}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Поиск товара или партии..."
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BatchStatus | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="ok">В норме</option>
          <option value="expiring_soon">Истекает</option>
          <option value="expired">Просрочено</option>
          <option value="quarantine">Карантин</option>
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все склады</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {(statusFilter !== "all" || locationFilter !== "all" || searchQ) && (
          <button
            onClick={() => { setStatusFilter("all"); setLocationFilter("all"); setSearchQ(""); }}
            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <X size={13} /> Сбросить
          </button>
        )}
      </div>

      {/* Batch table */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Товар / Партия</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Склад</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Истекает</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Осталось дней</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Остаток</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Стоимость</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Отсчёт</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.map((batch) => {
              const d = daysUntilExpiry(batch.expiryDate);
              const isFefoFirst = fefoFirstIds.has(batch.id);
              return (
                <tr
                  key={batch.id}
                  className={cn(
                    "border-b border-[var(--c-border)] last:border-0 transition",
                    d < 0         ? "bg-[var(--c-red)]/3"   :
                    d <= 7        ? "bg-[var(--c-red)]/2"   :
                    d <= 30       ? "bg-[var(--c-amber)]/2" :
                                    "hover:bg-[var(--c-bg3)]",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isFefoFirst && <Star size={12} className="text-[var(--c-green)] shrink-0" aria-label="FEFO: использовать первым" />}
                      <div>
                        <div className="font-medium text-[var(--c-text)]">{batch.productName}</div>
                        <div className="text-xs text-[var(--c-text3)]">{batch.sku} · {batch.batchNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{getLocationName(batch.locationId)}</td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{batch.expiryDate}</td>
                  <td className={cn("px-4 py-3 text-right tabular-nums", daysColor(d))}>{daysLabel(d)}</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text)] tabular-nums">{batch.remainingQty} / {batch.qty} шт</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text2)] tabular-nums">{fmt(batch.remainingQty * batch.costPrice)} ₽</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG[batch.status].color, STATUS_CONFIG[batch.status].bg)}>
                      {STATUS_CONFIG[batch.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs", countdownColor(d))}>
                      {d < 0 ? "Истёк" : countdownLabel(d)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleWriteOff(batch.id)}
                        title="Списать"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red)]/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => handleQuarantine(batch.id)}
                        title="Отправить в карантин"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-amber)] hover:bg-[var(--c-amber)]/10 transition"
                      >
                        <ShieldAlert size={13} />
                      </button>
                      <Link
                        href="/inventory/transfers"
                        title="Переместить"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-blue)] hover:bg-[var(--c-blue)]/10 transition"
                      >
                        <ArrowLeftRight size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedFiltered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-[var(--c-text3)]">
                  <Package size={32} className="mx-auto mb-3 text-[var(--c-border2)]" />
                  Партии не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Batch cards (expiring / expired) with quarantine button */}
      {sortedFiltered.filter((b) => daysUntilExpiry(b.expiryDate) <= 30).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Партии требующие внимания</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedFiltered
              .filter((b) => daysUntilExpiry(b.expiryDate) <= 30)
              .map((batch) => {
                const d = daysUntilExpiry(batch.expiryDate);
                const isExpired = d < 0;
                const isCritical = d >= 0 && d <= 7;
                return (
                  <div
                    key={batch.id}
                    className={cn(
                      "rounded-xl border p-4 space-y-3",
                      isExpired  ? "border-[var(--c-red)]/30 bg-[var(--c-red)]/5"   :
                      isCritical ? "border-[var(--c-red)]/20 bg-[var(--c-red)]/3"   :
                                   "border-[var(--c-amber)]/25 bg-[var(--c-amber)]/4",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--c-text)] truncate">{batch.productName}</p>
                        <p className="text-xs text-[var(--c-text3)] mt-0.5">{batch.batchNumber} · {getLocationName(batch.locationId)}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG[batch.status].color, STATUS_CONFIG[batch.status].bg)}>
                        {STATUS_CONFIG[batch.status].label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--c-text2)]">
                      <span>Срок годности: <span className="font-medium text-[var(--c-text)]">{batch.expiryDate}</span></span>
                      <span className="tabular-nums">{batch.remainingQty} шт</span>
                    </div>

                    {/* Countdown */}
                    <div className={cn("rounded-lg px-3 py-2 text-xs font-semibold", countdownColor(d),
                      isExpired  ? "bg-[var(--c-red)]/10"   :
                      isCritical ? "bg-[var(--c-red)]/8"    :
                                   "bg-[var(--c-amber)]/10",
                    )}>
                      {d < 0
                        ? `Истёк ${Math.abs(d)} дн. назад`
                        : d === 0
                          ? "Истекает сегодня"
                          : `Истекает через ${d} ${d === 1 ? "день" : d < 5 ? "дня" : "дней"}`
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuarantine(batch.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--c-amber)]/30 bg-[var(--c-amber)]/10 py-2 text-xs font-medium text-[var(--c-amber)] hover:bg-[var(--c-amber)]/15 transition"
                      >
                        <ShieldAlert size={12} />
                        Отправить в карантин
                      </button>
                      <button
                        onClick={() => handleWriteOff(batch.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--c-red)]/25 bg-[var(--c-red)]/8 px-3 py-2 text-xs font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/12 transition"
                      >
                        <Trash2 size={12} />
                        Списать
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* FEFO recommendations */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <button
          onClick={() => setExpandedProduct(expandedProduct ? null : "all")}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
        >
          <div className="flex items-center gap-2">
            <Star size={15} className="text-[var(--c-green)]" />
            Рекомендации FEFO по товарам
          </div>
          <ChevronDown size={15} className={cn("text-[var(--c-text3)] transition", expandedProduct ? "rotate-180" : "")} />
        </button>
        {expandedProduct && (
          <div className="border-t border-[var(--c-border)] px-5 py-4 space-y-4">
            {Object.entries(fefoByProduct).map(([productId, productBatches]) => (
              <div key={productId}>
                <div className="text-xs font-medium text-[var(--c-text2)] mb-2">{productBatches[0]?.productName}</div>
                <div className="space-y-1.5">
                  {productBatches.map((b, idx) => (
                    <div
                      key={b.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-xs",
                        idx === 0 ? "bg-[var(--c-green)]/8 border border-[var(--c-green)]/20" : "bg-[var(--c-bg3)]",
                      )}
                    >
                      {idx === 0
                        ? <Star size={11} className="text-[var(--c-green)] shrink-0" />
                        : <span className="w-2.5 h-2.5 rounded-full bg-[var(--c-text3)]/30 shrink-0" />
                      }
                      <span className={idx === 0 ? "font-medium text-[var(--c-green)]" : "text-[var(--c-text2)]"}>
                        #{idx + 1} · {b.batchNumber}
                      </span>
                      <span className="text-[var(--c-text3)]">Истекает: {b.expiryDate}</span>
                      <span className={cn("ml-auto text-xs font-medium", countdownColor(daysUntilExpiry(b.expiryDate)))}>
                        {countdownLabel(daysUntilExpiry(b.expiryDate))}
                      </span>
                      <span className="text-[var(--c-text2)] tabular-nums">{b.remainingQty} шт</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(fefoByProduct).length === 0 && (
              <p className="text-sm text-center text-[var(--c-text3)] py-4">Нет активных партий</p>
            )}
          </div>
        )}
      </div>

      {/* Confirm write-off all expired */}
      {confirmWriteOffAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--c-red)]/10 border border-[var(--c-red)]/20">
                  <AlertTriangle size={20} className="text-[var(--c-red)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--c-text)]">Списать все истёкшие?</h3>
                  <p className="text-xs text-[var(--c-text2)] mt-0.5">Действие необратимо</p>
                </div>
              </div>
              <p className="text-sm text-[var(--c-text2)]">
                Будет списано <span className="font-semibold text-[var(--c-red)]">{counts.expired}</span>{" "}
                {counts.expired === 1 ? "просроченная партия" : "просроченных партии"}.
                Остатки обнулятся и движения будут записаны в историю.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setConfirmWriteOffAll(false)}
                  className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleWriteOffExpired}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--c-red)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <Trash2 size={14} />
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register batch modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--c-text)]">Зарегистрировать партию</h3>
              <button onClick={() => setShowRegister(false)} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Товар</label>
                <input
                  value={form.productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Поиск товара..."
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
                {productResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg">
                    {productResults.map((p) => (
                      <button key={p.id} onClick={() => selectProduct(p)} className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[var(--c-bg3)]">
                        <span className="text-[var(--c-text)]">{p.name}</span>
                        <span className="text-[var(--c-text3)]">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Номер партии</label>
                  <input
                    value={form.batchNumber}
                    onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="BTH-2026-XXX"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Количество</label>
                  <input
                    type="number"
                    value={form.qty}
                    onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Дата производства</label>
                  <input
                    type="date"
                    value={form.manufactureDate}
                    onChange={(e) => setForm((p) => ({ ...p, manufactureDate: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Срок годности</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Склад</label>
                <select
                  value={form.locationId}
                  onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                >
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Поставщик</label>
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                >
                  <option value="">Не указан</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Preview countdown if expiryDate filled */}
              {form.expiryDate && (
                <div className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium",
                  countdownColor(daysUntilExpiry(form.expiryDate)),
                  daysUntilExpiry(form.expiryDate) < 0 ? "bg-[var(--c-red)]/10" :
                  daysUntilExpiry(form.expiryDate) <= 30 ? "bg-[var(--c-amber)]/10" :
                  "bg-[var(--c-green)]/10",
                )}>
                  {countdownLabel(daysUntilExpiry(form.expiryDate))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRegister(false)} className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                  Отмена
                </button>
                <button
                  onClick={handleRegister}
                  disabled={!form.productId || !form.batchNumber || !form.expiryDate || !form.qty}
                  className="flex-1 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Зарегистрировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
