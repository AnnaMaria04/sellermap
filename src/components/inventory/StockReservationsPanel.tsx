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
  Filter,
  ChevronDown,
  Store,
  Globe,
  Package,
  Info,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";

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

const SOURCE_CONFIG: Record<ReservationSource, { label: string; color: string; bg: string }> = {
  wildberries:   { label: "WB",            color: "text-purple-400",            bg: "bg-purple-400/10" },
  ozon:          { label: "Ozon",          color: "text-[var(--c-blue)]",       bg: "bg-[var(--c-blue)]/10" },
  yandex_market: { label: "Яндекс.Маркет", color: "text-yellow-400",            bg: "bg-yellow-400/10" },
  website:       { label: "Сайт",          color: "text-[var(--c-green)]",      bg: "bg-[var(--c-green)]/10" },
  manual:        { label: "Вручную",       color: "text-[var(--c-text2)]",      bg: "bg-[var(--c-bg3)]" },
  pos:           { label: "POS",           color: "text-[var(--c-amber)]",      bg: "bg-[var(--c-amber)]/10" },
};

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Активен",   color: "text-[var(--c-green)]",  bg: "bg-[var(--c-green)]/10" },
  fulfilled: { label: "Выполнен",  color: "text-[var(--c-text3)]",  bg: "bg-[var(--c-bg3)]" },
  cancelled: { label: "Отменён",   color: "text-[var(--c-red)]",    bg: "bg-[var(--c-red)]/10" },
  expired:   { label: "Истёк",     color: "text-[var(--c-amber)]",  bg: "bg-[var(--c-amber)]/10" },
};

function SourceIcon({ source }: { source: ReservationSource }) {
  if (source === "manual") return <ShoppingBag size={13} />;
  if (source === "pos") return <Store size={13} />;
  if (source === "website") return <Globe size={13} />;
  return <Package size={13} />;
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

const TODAY_STR = "2026-05-25";
const TOMORROW_STR = "2026-05-26";

function isExpiringToday(r: Reservation) {
  return r.status === "active" && r.expiresAt && r.expiresAt <= TOMORROW_STR;
}

export function StockReservationsPanel() {
  const { products, locations, reservations, actions } = useInventory();

  function getLocationName(id: string) {
    return locations.find(l => l.id === id)?.name ?? id;
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ReservationSource | "all">("all");
  const [searchQ, setSearchQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImpact, setShowImpact] = useState(false);

  const [form, setForm] = useState({
    productSearch: "",
    productId: "",
    productName: "",
    sku: "",
    locationId: "loc-warehouse",
    qty: "",
    source: "manual" as ReservationSource,
    orderRef: "",
    customerName: "",
    expiresAt: "",
    note: "",
  });
  const [productResults, setProductResults] = useState<Product[]>([]);

  const stats = useMemo(() => {
    const active = reservations.filter(r => r.status === "active");
    const totalUnits = active.reduce((s, r) => s + r.qty, 0);
    const reservedValue = active.reduce((s, r) => {
      const p = products.find(x => x.id === r.productId);
      return s + r.qty * (p?.costPrice ?? 0);
    }, 0);
    const expiringToday = active.filter(isExpiringToday).length;
    const marketplace = active.filter(r => ["wildberries", "ozon", "yandex_market"].includes(r.source)).length;
    const manual = active.filter(r => ["manual", "pos", "website"].includes(r.source)).length;
    return { totalUnits, reservedValue, expiringToday, marketplace, manual };
  }, [reservations, products]);

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (searchQ && !r.productName.toLowerCase().includes(searchQ.toLowerCase()) && !(r.orderRef ?? "").toLowerCase().includes(searchQ.toLowerCase()) && !(r.customerName ?? "").toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
  }, [reservations, statusFilter, sourceFilter, searchQ]);

  const stockImpact = useMemo(() => {
    const map: Record<string, { productName: string; physical: number; reserved: number }> = {};
    reservations.filter(r => r.status === "active").forEach(r => {
      if (!map[r.productId]) {
        const p = products.find(x => x.id === r.productId);
        map[r.productId] = { productName: r.productName, physical: p?.totalPhysical ?? 0, reserved: 0 };
      }
      map[r.productId].reserved += r.qty;
    });
    return Object.entries(map).map(([id, v]) => ({ productId: id, ...v, available: Math.max(0, v.physical - v.reserved) }));
  }, [reservations, products]);

  function handleRelease(id: string) {
    actions.releaseReservation(id);
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  function handleBulkRelease() {
    selected.forEach((id) => actions.releaseReservation(id));
    setSelected(new Set());
  }

  function handleBulkExtend() {
    const newExpiry = new Date(TODAY_STR);
    newExpiry.setDate(newExpiry.getDate() + 7);
    const expiryStr = newExpiry.toISOString().split("T")[0];
    selected.forEach((id) => actions.extendReservation(id, expiryStr));
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
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  }

  function handleProductSearch(q: string) {
    setForm(p => ({ ...p, productSearch: q, productId: "", productName: "", sku: "" }));
    setProductResults(q.length > 1 ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []);
  }

  function selectProduct(p: Product) {
    setForm(prev => ({ ...prev, productSearch: p.name, productId: p.id, productName: p.name, sku: p.sku }));
    setProductResults([]);
  }

  function handleCreate() {
    if (!form.productId || !form.qty) return;
    actions.createReservation({
      productId: form.productId,
      locationId: form.locationId,
      qty: parseInt(form.qty),
      source: form.source,
      orderRef: form.orderRef || undefined,
      customerName: form.customerName || undefined,
      expiresAt: form.expiresAt || undefined,
      note: form.note || undefined,
    });
    setShowCreate(false);
    setForm({ productSearch: "", productId: "", productName: "", sku: "", locationId: "loc-warehouse", qty: "", source: "manual", orderRef: "", customerName: "", expiresAt: "", note: "" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Резервирование остатков</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Управление резервами под заказы и клиентов</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
        >
          <Plus size={15} />
          Создать резерв
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Активных резервов", value: `${stats.totalUnits} шт`, icon: Package, color: "text-[var(--c-blue)]" },
          { label: "Зарезервировано на", value: `${fmt(stats.reservedValue)} ₽`, icon: ShoppingBag, color: "text-[var(--c-text2)]" },
          { label: "Истекают сегодня", value: stats.expiringToday, icon: Clock, color: stats.expiringToday > 0 ? "text-[var(--c-amber)]" : "text-[var(--c-text3)]" },
          { label: "Маркетплейс / Прямые", value: `${stats.marketplace} / ${stats.manual}`, icon: Store, color: "text-[var(--c-text2)]" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-[var(--c-text3)]">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--c-text)]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
        <Info size={14} className="text-[var(--c-text3)] shrink-0" />
        <span className="text-sm text-[var(--c-text3)]">
          <span className="font-medium text-[var(--c-text2)]">Авто-истечение:</span> резервы без привязки к заказу автоматически снимаются через 7 дней после создания.
        </span>
      </div>

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
          <option value="pos">POS</option>
        </select>
        {(statusFilter !== "all" || sourceFilter !== "all") && (
          <button
            onClick={() => { setStatusFilter("all"); setSourceFilter("all"); }}
            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)]"
          >
            <X size={13} /> Сбросить
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
          <span className="text-sm text-[var(--c-text2)]">Выбрано: {selected.size}</span>
          <button
            onClick={handleBulkRelease}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--c-red)]/10 border border-[var(--c-red)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/15 transition"
          >
            <XCircle size={13} /> Снять резервы
          </button>
          <button
            onClick={handleBulkExtend}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--c-blue)]/10 border border-[var(--c-blue)]/20 px-3 py-1.5 text-xs font-medium text-[var(--c-blue)] hover:bg-[var(--c-blue)]/15 transition"
          >
            <RotateCcw size={13} /> Продлить на 7 дней
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[var(--c-text3)] hover:text-[var(--c-text)]">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-[var(--c-border)]"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Товар</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Склад</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Кол-во</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Источник</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Заказ / Клиент</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Истекает</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const expToday = isExpiringToday(r);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-[var(--c-border)] last:border-0 transition",
                    expToday ? "bg-[var(--c-amber)]/4" : "hover:bg-[var(--c-bg3)]",
                    selected.has(r.id) && "bg-[var(--c-blue)]/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="rounded border-[var(--c-border)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--c-text)]">{r.productName}</div>
                    <div className="text-xs text-[var(--c-text3)]">{r.sku}</div>
                    {r.note && <div className="text-xs text-[var(--c-text3)] mt-0.5 italic">{r.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{getLocationName(r.locationId)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--c-text)]">{r.qty} шт</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", SOURCE_CONFIG[r.source].color, SOURCE_CONFIG[r.source].bg)}>
                      <SourceIcon source={r.source} />
                      {SOURCE_CONFIG[r.source].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.orderRef && <div className="text-sm text-[var(--c-text)]">{r.orderRef}</div>}
                    {r.customerName && <div className="text-xs text-[var(--c-text3)]">{r.customerName}</div>}
                    {!r.orderRef && !r.customerName && <span className="text-[var(--c-text3)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG[r.status].color, STATUS_CONFIG[r.status].bg)}>
                      {STATUS_CONFIG[r.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.expiresAt ? (
                      <div className={cn("text-sm", expToday ? "text-[var(--c-amber)] font-medium" : "text-[var(--c-text2)]")}>
                        {expToday && <AlertTriangle size={12} className="inline mr-1" />}
                        {r.expiresAt}
                      </div>
                    ) : (
                      <span className="text-[var(--c-text3)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "active" && (
                      <button
                        onClick={() => handleRelease(r.id)}
                        title="Снять резерв"
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] px-2.5 py-1.5 text-xs text-[var(--c-text3)] hover:text-[var(--c-red)] hover:border-[var(--c-red)]/30 hover:bg-[var(--c-red)]/5 transition"
                      >
                        <Trash2 size={12} />
                        Снять
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-[var(--c-text3)]">Резервы не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <button
          onClick={() => setShowImpact(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
        >
          <div className="flex items-center gap-2">
            <Info size={15} className="text-[var(--c-blue)]" />
            Влияние на доступный остаток
          </div>
          <ChevronDown size={15} className={cn("text-[var(--c-text3)] transition", showImpact ? "rotate-180" : "")} />
        </button>
        {showImpact && (
          <div className="border-t border-[var(--c-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text3)]">Товар</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">Физический</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">Зарезервировано</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text3)]">Доступно</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text3)]" />
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
                      <span className="text-xs text-[var(--c-text3)] italic">Влияет на доступный остаток</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--c-text)]">Создать резерв</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Товар</label>
                <input
                  value={form.productSearch}
                  onChange={e => handleProductSearch(e.target.value)}
                  placeholder="Поиск товара..."
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
                {productResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg">
                    {productResults.map(p => (
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
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Склад</label>
                  <select
                    value={form.locationId}
                    onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                  >
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Количество</label>
                  <input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Источник</label>
                <select
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value as ReservationSource }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                >
                  <option value="manual">Вручную</option>
                  <option value="wildberries">Wildberries</option>
                  <option value="ozon">Ozon</option>
                  <option value="yandex_market">Яндекс.Маркет</option>
                  <option value="website">Сайт</option>
                  <option value="pos">POS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Номер заказа</label>
                  <input
                    value={form.orderRef}
                    onChange={e => setForm(p => ({ ...p, orderRef: e.target.value }))}
                    placeholder="WB-12345"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Клиент</label>
                  <input
                    value={form.customerName}
                    onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="Имя клиента"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Срок действия</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Примечание</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={2}
                  placeholder="Необязательно..."
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] resize-none focus:outline-none focus:border-[var(--c-blue)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.productId || !form.qty}
                  className="flex-1 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  Создать резерв
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
