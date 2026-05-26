"use client";

import { useState, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  X,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Store,
  Globe,
  Package,
  Info,
  Trash2,
  RotateCcw,
  TrendingDown,
  BadgeCheck,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { STOCK_TERMS } from "@/components/inventory/ui/StockTerms";

type ReservationStatus = "active" | "fulfilled" | "cancelled" | "expired";
type ReservationSource = "manual" | "wildberries" | "ozon" | "yandex_market" | "website" | "pos";

interface Reservation {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  qty: number;
  source: ReservationSource;
  orderRef?: string;
  customerName?: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt?: string;
  fulfilledAt?: string;
  note?: string;
}

// ─── Source config (per spec) ────────────────────────────────────────────────
const SOURCE_CONFIG: Record<ReservationSource, { label: string; color: string }> = {
  wildberries:   { label: "WB",      color: "text-purple-400 bg-purple-400/10" },
  ozon:          { label: "Ozon",    color: "text-sky-400 bg-sky-400/10" },
  yandex_market: { label: "YM",      color: "text-yellow-400 bg-yellow-400/10" },
  website:       { label: "Сайт",    color: "text-[var(--c-green)] bg-[var(--c-green-dim)]" },
  pos:           { label: "Касса",   color: "text-[var(--c-amber)] bg-[var(--c-amber-dim)]" },
  manual:        { label: "Ручной",  color: "text-[var(--c-text3)] bg-[var(--c-bg3)]" },
};

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Активен",  color: "text-[var(--c-green)]", bg: "bg-[var(--c-green)]/10" },
  fulfilled: { label: "Выполнен", color: "text-[var(--c-text3)]", bg: "bg-[var(--c-bg3)]" },
  cancelled: { label: "Отменён",  color: "text-[var(--c-red)]",   bg: "bg-[var(--c-red)]/10" },
  expired:   { label: "Истёк",    color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber)]/10" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: ReservationSource }) {
  if (source === "manual")  return <ShoppingBag size={13} />;
  if (source === "pos")     return <Store size={13} />;
  if (source === "website") return <Globe size={13} />;
  return <Package size={13} />;
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

/** Expiry countdown label per spec */
function expiryLabel(expiresAt: string | undefined): { text: string; color: string } {
  if (!expiresAt) return { text: "Бессрочно", color: "text-[var(--c-text3)]" };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return { text: "Истёк", color: "text-[var(--c-red)]" };
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return { text: `${hours} ч.`, color: "text-[var(--c-red)]" };
  const days = Math.floor(hours / 24);
  return {
    text: `${days} дн.`,
    color: days <= 3 ? "text-[var(--c-amber)]" : "text-[var(--c-text3)]",
  };
}

/** Is this active reservation expiring within 24 hours? */
function isExpiringSoon(r: Reservation): boolean {
  if (r.status !== "active" || !r.expiresAt) return false;
  const diff = new Date(r.expiresAt).getTime() - Date.now();
  return diff >= 0 && diff < 86_400_000; // 24 h in ms
}

/** ISO date string 3 days from now */
function in3Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split("T")[0];
}

/** ISO date string 7 days from now */
function in7Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StockReservationsPanel() {
  const { products, locations, reservations, actions } = useInventory();

  function getLocationName(id: string) {
    return locations.find(l => l.id === id)?.name ?? id;
  }

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter]   = useState<ReservationStatus | "all">("all");
  const [sourceFilter, setSourceFilter]   = useState<ReservationSource | "all">("all");
  const [searchQ, setSearchQ]             = useState("");
  const [showCreate, setShowCreate]       = useState(false);
  const [showImpact, setShowImpact]       = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState<Set<string>>(new Set());

  // ── Creation form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    productSearch: "",
    productId: "",
    productName: "",
    sku: "",
    locationId: locations[0]?.id ?? "loc-warehouse",
    qty: "",
    source: "manual" as ReservationSource,
    orderRef: "",
    customerName: "",
    expiresAt: in7Days(),
    note: "",
  });
  const [productResults, setProductResults] = useState<Product[]>([]);

  // Available stock for selected product + location
  const availableForForm = useMemo(() => {
    if (!form.productId || !form.locationId) return null;
    const p = products.find(x => x.id === form.productId);
    if (!p) return null;
    const physical = p.variants?.length
      ? p.variants.reduce((s, v) => s + (v.stock[form.locationId] ?? 0), 0)
      : (p.stockByLocation[form.locationId] ?? 0);
    const committed = reservations
      .filter(r => r.productId === form.productId && r.locationId === form.locationId && r.status === "active")
      .reduce((s, r) => s + r.qty, 0);
    return Math.max(0, physical - committed);
  }, [form.productId, form.locationId, products, reservations]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = reservations.filter(r => r.status === "active");
    const totalReservations = active.length;
    const totalUnits = active.reduce((s, r) => s + r.qty, 0);
    const expiringSoon = active.filter(isExpiringSoon).length;
    const reservedValue = active.reduce((s, r) => {
      const p = products.find(x => x.id === r.productId);
      return s + r.qty * (p?.price ?? 0);
    }, 0);
    return { totalReservations, totalUnits, expiringSoon, reservedValue };
  }, [reservations, products]);

  // ── Expiring-soon alerts (active, not dismissed) ─────────────────────────────
  const expiringAlerts = useMemo(
    () => reservations.filter(r => isExpiringSoon(r) && !alertsDismissed.has(r.id)),
    [reservations, alertsDismissed],
  );

  // ── Filtered table rows ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    return reservations.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (q) {
        const hit =
          r.productName.toLowerCase().includes(q) ||
          (r.orderRef    ?? "").toLowerCase().includes(q) ||
          (r.customerName ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, sourceFilter, searchQ]);

  // ── Stock impact table ───────────────────────────────────────────────────────
  const stockImpact = useMemo(() => {
    const map: Record<string, { productName: string; physical: number; reserved: number }> = {};
    reservations
      .filter(r => r.status === "active")
      .forEach(r => {
        if (!map[r.productId]) {
          const p = products.find(x => x.id === r.productId);
          map[r.productId] = { productName: r.productName, physical: p?.totalPhysical ?? 0, reserved: 0 };
        }
        map[r.productId].reserved += r.qty;
      });
    return Object.entries(map).map(([id, v]) => ({
      productId: id,
      ...v,
      available: Math.max(0, v.physical - v.reserved),
    }));
  }, [reservations, products]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  function handleRelease(id: string) {
    actions.releaseReservation(id);
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  function handleFulfill(id: string) {
    actions.fulfillReservation(id);
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  function handleExtend3Days(id: string) {
    actions.extendReservation(id, in3Days());
    setAlertsDismissed(prev => new Set(prev).add(id));
  }

  function handleBulkRelease() {
    selected.forEach(id => actions.releaseReservation(id));
    setSelected(new Set());
  }

  function handleBulkFulfill() {
    selected.forEach(id => actions.fulfillReservation(id));
    setSelected(new Set());
  }

  function handleBulkExtend() {
    const expiry = in7Days();
    selected.forEach(id => actions.extendReservation(id, expiry));
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function handleProductSearch(q: string) {
    setForm(p => ({ ...p, productSearch: q, productId: "", productName: "", sku: "" }));
    setProductResults(
      q.length > 1
        ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
        : [],
    );
  }

  function selectProduct(p: Product) {
    setForm(prev => ({ ...prev, productSearch: p.name, productId: p.id, productName: p.name, sku: p.sku }));
    setProductResults([]);
  }

  function resetForm() {
    setForm({
      productSearch: "", productId: "", productName: "", sku: "",
      locationId: locations[0]?.id ?? "loc-warehouse",
      qty: "", source: "manual", orderRef: "", customerName: "",
      expiresAt: in7Days(), note: "",
    });
    setProductResults([]);
  }

  function handleCreate() {
    if (!form.productId || !form.qty) return;
    actions.createReservation({
      productId:    form.productId,
      locationId:   form.locationId,
      qty:          parseInt(form.qty, 10),
      source:       form.source,
      orderRef:     form.orderRef    || undefined,
      customerName: form.customerName || undefined,
      expiresAt:    form.expiresAt   || undefined,
      note:         form.note        || undefined,
    });
    setShowCreate(false);
    resetForm();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Резервирование остатков</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Управление резервами под заказы и клиентов</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
        >
          <Plus size={15} />
          Создать резерв
        </button>
      </div>

      {/* ── Stats dashboard ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Активных резервов",
            value: `${stats.totalReservations}`,
            sub: `${fmt(stats.totalUnits)} шт`,
            icon: Package,
            color: "text-[var(--c-blue)]",
            iconBg: "bg-[var(--c-blue)]/10",
          },
          {
            label: "Зарезервировано",
            value: `${fmt(stats.reservedValue)} ₽`,
            sub: "по цене продажи",
            icon: ShoppingBag,
            color: "text-[var(--c-text2)]",
            iconBg: "bg-[var(--c-bg3)]",
          },
          {
            label: "Истекают < 24 ч",
            value: `${stats.expiringSoon}`,
            sub: stats.expiringSoon > 0 ? "требуют внимания" : "всё в порядке",
            icon: Bell,
            color: stats.expiringSoon > 0 ? "text-[var(--c-red)]" : "text-[var(--c-text3)]",
            iconBg: stats.expiringSoon > 0 ? "bg-[var(--c-red)]/10" : "bg-[var(--c-bg3)]",
          },
          {
            label: "Единиц зарезервировано",
            value: `${fmt(stats.totalUnits)} шт`,
            sub: "по всем складам",
            icon: TrendingDown,
            color: "text-[var(--c-amber)]",
            iconBg: "bg-[var(--c-amber)]/10",
          },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg", s.iconBg)}>
                <s.icon size={14} className={s.color} />
              </div>
              <span className="text-xs text-[var(--c-text3)] leading-tight">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--c-text)]">{s.value}</div>
            <div className="text-xs text-[var(--c-text3)] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Expiry alerts banner ── */}
      {expiringAlerts.length > 0 && (
        <div className="rounded-xl border border-[var(--c-red)]/30 bg-[var(--c-red)]/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--c-red)]/20">
            <AlertTriangle size={15} className="text-[var(--c-red)] shrink-0" />
            <span className="text-sm font-medium text-[var(--c-red)]">
              Резервы истекают в течение 24 часов ({expiringAlerts.length})
            </span>
          </div>
          <div className="divide-y divide-[var(--c-red)]/10">
            {expiringAlerts.map(r => {
              const exp = expiryLabel(r.expiresAt);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[var(--c-text)] truncate block">{r.productName}</span>
                    <span className="text-xs text-[var(--c-text3)]">
                      {r.qty} шт · {getLocationName(r.locationId)}
                      {r.orderRef && ` · ${r.orderRef}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-medium", exp.color)}>
                      <Clock size={11} className="inline mr-1" />
                      {exp.text}
                    </span>
                    <button
                      onClick={() => handleExtend3Days(r.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--c-blue)]/10 border border-[var(--c-blue)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-blue)] hover:bg-[var(--c-blue)]/15 transition"
                    >
                      <RotateCcw size={11} />
                      Продлить на 3 дня
                    </button>
                    <button
                      onClick={() => setAlertsDismissed(prev => new Set(prev).add(r.id))}
                      className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
                      title="Скрыть"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Auto-expiry notice ── */}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
        <Info size={14} className="text-[var(--c-text3)] shrink-0" />
        <span className="text-sm text-[var(--c-text3)]">
          <span className="font-medium text-[var(--c-text2)]">Авто-истечение:</span>{" "}
          резервы без привязки к заказу автоматически снимаются через 7 дней после создания.
        </span>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Поиск товара, заказа, клиента..."
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ReservationStatus | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="fulfilled">Выполненные</option>
          <option value="cancelled">Отменённые</option>
          <option value="expired">Истёкшие</option>
        </select>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as ReservationSource | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все источники</option>
          <option value="wildberries">Wildberries</option>
          <option value="ozon">Ozon</option>
          <option value="yandex_market">Яндекс.Маркет</option>
          <option value="website">Сайт</option>
          <option value="manual">Вручную</option>
          <option value="pos">Касса</option>
        </select>
        {(statusFilter !== "all" || sourceFilter !== "all" || searchQ) && (
          <button
            onClick={() => { setStatusFilter("all"); setSourceFilter("all"); setSearchQ(""); }}
            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <X size={13} /> Сбросить
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--c-text3)]">{filtered.length} резервов</span>
      </div>

      {/* ── Bulk actions bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--c-text2)]">Выбрано: {selected.size}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkRelease}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--c-red)]/10 border border-[var(--c-red)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/15 transition"
            >
              <XCircle size={13} />
              Снять выбранные
            </button>
            <button
              onClick={handleBulkFulfill}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)]/10 border border-[var(--c-green)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-green)] hover:bg-[var(--c-green)]/15 transition"
            >
              <BadgeCheck size={13} />
              Выполнить выбранные
            </button>
            <button
              onClick={handleBulkExtend}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--c-blue)]/10 border border-[var(--c-blue)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-blue)] hover:bg-[var(--c-blue)]/15 transition"
            >
              <RotateCcw size={13} />
              Продлить на 7 дней
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
            title="Снять выделение"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Reservations table ── */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]/50">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[var(--c-border)]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Товар</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Склад</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Кол-во</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Канал</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Заказ / Клиент</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">Истекает</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const expiringSoon = isExpiringSoon(r);
                const exp = expiryLabel(r.expiresAt);
                const isSelected = selected.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-[var(--c-border)] last:border-0 transition",
                      isSelected
                        ? "bg-[var(--c-blue)]/6"
                        : expiringSoon
                          ? "bg-[var(--c-red)]/4 hover:bg-[var(--c-red)]/6"
                          : "hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    {/* checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded border-[var(--c-border)]"
                      />
                    </td>

                    {/* product */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--c-text)]">{r.productName}</div>
                      <div className="text-xs text-[var(--c-text3)]">{r.sku}</div>
                      {r.note && (
                        <div className="text-xs text-[var(--c-text3)] mt-0.5 italic truncate max-w-[200px]">{r.note}</div>
                      )}
                    </td>

                    {/* location */}
                    <td className="px-4 py-3 text-sm text-[var(--c-text2)] whitespace-nowrap">
                      {getLocationName(r.locationId)}
                    </td>

                    {/* qty */}
                    <td className="px-4 py-3 text-right font-semibold text-[var(--c-text)] whitespace-nowrap">
                      {r.qty} шт
                    </td>

                    {/* source badge */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        SOURCE_CONFIG[r.source].color,
                      )}>
                        <SourceIcon source={r.source} />
                        {SOURCE_CONFIG[r.source].label}
                      </span>
                    </td>

                    {/* order / customer */}
                    <td className="px-4 py-3">
                      {r.orderRef   && <div className="text-sm text-[var(--c-text)] font-medium">{r.orderRef}</div>}
                      {r.customerName && <div className="text-xs text-[var(--c-text3)]">{r.customerName}</div>}
                      {!r.orderRef && !r.customerName && <span className="text-[var(--c-text3)]">—</span>}
                    </td>

                    {/* status */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        STATUS_CONFIG[r.status].color,
                        STATUS_CONFIG[r.status].bg,
                      )}>
                        {STATUS_CONFIG[r.status].label}
                      </span>
                    </td>

                    {/* expiry countdown */}
                    <td className="px-4 py-3">
                      <div className={cn("flex items-center gap-1 text-sm whitespace-nowrap", exp.color)}>
                        {expiringSoon && <AlertTriangle size={12} className="shrink-0" />}
                        <Clock size={11} className="shrink-0 opacity-60" />
                        {exp.text}
                      </div>
                    </td>

                    {/* row actions */}
                    <td className="px-4 py-3">
                      {r.status === "active" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFulfill(r.id)}
                            title="Выполнить"
                            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-2 py-1.5 text-xs text-[var(--c-text3)] hover:text-[var(--c-green)] hover:border-[var(--c-green)]/30 hover:bg-[var(--c-green)]/5 transition"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                          <button
                            onClick={() => handleRelease(r.id)}
                            title="Снять резерв"
                            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-2 py-1.5 text-xs text-[var(--c-text3)] hover:text-[var(--c-red)] hover:border-[var(--c-red)]/30 hover:bg-[var(--c-red)]/5 transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Package size={32} className="mx-auto mb-3 text-[var(--c-text3)] opacity-40" />
                    <p className="text-sm text-[var(--c-text3)]">Резервы не найдены</p>
                    {(statusFilter !== "all" || sourceFilter !== "all" || searchQ) && (
                      <p className="text-xs text-[var(--c-text3)] mt-1">Попробуйте изменить фильтры</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Stock impact accordion ── */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <button
          onClick={() => setShowImpact(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
        >
          <div className="flex items-center gap-2">
            <Info size={15} className="text-[var(--c-blue)]" />
            Влияние на доступный остаток
          </div>
          <ChevronDown size={15} className={cn("text-[var(--c-text3)] transition-transform", showImpact && "rotate-180")} />
        </button>
        {showImpact && (
          <div className="border-t border-[var(--c-border)] overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text3)]">Товар</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">{STOCK_TERMS.onHand.label}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">{STOCK_TERMS.committed.label}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">{STOCK_TERMS.available.label}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {stockImpact.map(item => (
                  <tr key={item.productId} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-5 py-3 font-medium text-[var(--c-text)]">{item.productName}</td>
                    <td className="px-5 py-3 text-right text-[var(--c-text2)]">{item.physical} шт</td>
                    <td className="px-5 py-3 text-right text-[var(--c-amber)]">−{item.reserved} шт</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--c-green)]">{item.available} шт</td>
                    <td className="px-5 py-3">
                      {item.available === 0 && (
                        <span className="text-xs text-[var(--c-red)] font-medium">Нет свободного остатка</span>
                      )}
                      {item.available > 0 && item.available <= 5 && (
                        <span className="text-xs text-[var(--c-amber)]">Мало остатков</span>
                      )}
                    </td>
                  </tr>
                ))}
                {stockImpact.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-[var(--c-text3)]">
                      Активных резервов нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create reservation drawer (modal) ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4 shrink-0">
              <div>
                <h3 className="font-semibold text-[var(--c-text)]">Создать резерв</h3>
                <p className="text-xs text-[var(--c-text3)] mt-0.5">Зарезервировать товар под заказ или клиента</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition"
              >
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>

            {/* modal body */}
            <div className="p-6 space-y-4 overflow-y-auto">

              {/* product search */}
              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">
                  Товар <span className="text-[var(--c-red)]">*</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  <input
                    value={form.productSearch}
                    onChange={e => handleProductSearch(e.target.value)}
                    placeholder="Начните вводить название..."
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-xl overflow-hidden">
                      {productResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectProduct(p)}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-[var(--c-bg3)] transition"
                        >
                          <span className="text-[var(--c-text)] text-left">{p.name}</span>
                          <span className="text-[var(--c-text3)] text-xs ml-2 shrink-0">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.productId && (
                  <p className="text-xs text-[var(--c-green)] mt-1">SKU: {form.sku}</p>
                )}
              </div>

              {/* location + qty */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">
                    Склад <span className="text-[var(--c-red)]">*</span>
                  </label>
                  <select
                    value={form.locationId}
                    onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  >
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">
                    Количество <span className="text-[var(--c-red)]">*</span>
                    {availableForForm !== null && (
                      <span className="ml-1 text-[var(--c-text3)] font-normal">(доступно: {availableForForm})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={availableForForm ?? undefined}
                    value={form.qty}
                    onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
                    placeholder="0"
                    className={cn(
                      "w-full rounded-lg border bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]",
                      availableForForm !== null && parseInt(form.qty || "0", 10) > availableForForm
                        ? "border-[var(--c-red)]"
                        : "border-[var(--c-border)]",
                    )}
                  />
                  {availableForForm !== null && parseInt(form.qty || "0", 10) > availableForForm && (
                    <p className="text-xs text-[var(--c-red)] mt-1">Превышает доступный остаток</p>
                  )}
                </div>
              </div>

              {/* source */}
              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Источник</label>
                <select
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value as ReservationSource }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                >
                  <option value="manual">Ручной</option>
                  <option value="website">Сайт</option>
                  <option value="pos">Касса</option>
                  <option value="wildberries">Wildberries</option>
                  <option value="ozon">Ozon</option>
                  <option value="yandex_market">Яндекс.Маркет</option>
                </select>
              </div>

              {/* order ref + customer */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Номер заказа</label>
                  <input
                    value={form.orderRef}
                    onChange={e => setForm(p => ({ ...p, orderRef: e.target.value }))}
                    placeholder="WB-12345"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Клиент</label>
                  <input
                    value={form.customerName}
                    onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="Иван Иванов"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              {/* expires at */}
              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">
                  Срок действия
                  <span className="ml-1 text-[var(--c-text3)] font-normal">(по умолчанию 7 дней)</span>
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
              </div>

              {/* note */}
              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Примечание</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={2}
                  placeholder="Необязательно..."
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] resize-none focus:outline-none focus:border-[var(--c-blue)]"
                />
              </div>
            </div>

            {/* modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[var(--c-border)] shrink-0">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.productId || !form.qty || parseInt(form.qty || "0", 10) < 1}
                className="flex-1 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Создать резерв
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
