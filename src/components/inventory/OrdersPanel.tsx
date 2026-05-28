"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart,
  X,
  Search,
  Download,
  Package,
  TrendingUp,
  Truck,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  Boxes,
  Percent,
  Wallet,
  Store,
  Globe,
  Send,
  PackageCheck,
  ArrowRight,
  Plus,
  Trash2,
  ChevronDown,
  Hash,
} from "lucide-react";
import { cn, formatRub, formatDateRu, formatDec } from "@/lib/utils";

/** Channel-aware fallback when the marketplace doesn't share the buyer's name. */
function customerLabel(order: Order): string {
  if (order.customerName) return order.customerName;
  if (order.channel === "wildberries") return "Покупатель WB";
  if (order.channel === "ozon") return "Покупатель Ozon";
  return "Без имени";
}
import {
  type Order,
  type OrderStatus,
  type OrderChannel,
  type FulfillmentModel,
  type Product,
  type Location,
  ORDER_STATUS_LABELS,
  CHANNEL_LABELS,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { orderEconomics, costLookupFromProducts, type CostLookup } from "@/lib/inventory/finance";
import { exportData } from "@/lib/export";

// ── Presentation config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string }> = {
  new:       { color: "text-[var(--c-blue)]",  bg: "bg-[var(--c-blue)]/10" },
  confirmed: { color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber)]/10" },
  packed:    { color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber)]/10" },
  shipped:   { color: "text-[var(--c-blue)]",  bg: "bg-[var(--c-blue)]/10" },
  delivered: { color: "text-[var(--c-green)]", bg: "bg-[var(--c-green)]/10" },
  cancelled: { color: "text-[var(--c-text3)]", bg: "bg-[var(--c-bg3)]" },
  returned:  { color: "text-[var(--c-red)]",   bg: "bg-[var(--c-red)]/10" },
};

const CHANNEL_CONFIG: Record<OrderChannel, { color: string; bg: string }> = {
  wildberries:   { color: "text-purple-400",        bg: "bg-purple-400/10" },
  ozon:          { color: "text-[var(--c-blue)]",   bg: "bg-[var(--c-blue)]/10" },
  yandex_market: { color: "text-yellow-400",        bg: "bg-yellow-400/10" },
  website:       { color: "text-[var(--c-green)]",  bg: "bg-[var(--c-green)]/10" },
  pos:           { color: "text-[var(--c-amber)]",  bg: "bg-[var(--c-amber)]/10" },
  telegram:      { color: "text-sky-400",           bg: "bg-sky-400/10" },
};

const FULFILLMENT_LABELS: Record<FulfillmentModel, string> = {
  FBO: "FBO · склад площадки",
  FBS: "FBS · свой склад",
  DBS: "DBS · своя доставка",
  self: "Собственная доставка",
};

const CHANNEL_DEFAULT_COMMISSION: Record<OrderChannel, number> = {
  wildberries:   17,
  ozon:          15,
  yandex_market: 13,
  website:       0,
  pos:           0,
  telegram:      0,
};

const CHANNEL_LABELS_RU: Record<OrderChannel, string> = {
  wildberries:   "Wildberries",
  ozon:          "Ozon",
  yandex_market: "Яндекс Маркет",
  website:       "Сайт",
  pos:           "Розница (POS)",
  telegram:      "Telegram",
};

const FULFILLMENT_LABELS_SHORT: Record<FulfillmentModel, string> = {
  FBO:  "FBO — склад площадки",
  FBS:  "FBS — свой склад",
  DBS:  "DBS — своя доставка",
  self: "Самовывоз / собственная",
};

// Orders awaiting shipment.
const PENDING_STATUSES: OrderStatus[] = ["new", "confirmed", "packed"];
// Statuses for which a fulfillment (ship) action is allowed.
const FULFILLABLE: OrderStatus[] = ["new", "confirmed", "packed"];

// Linear workflow used by the "advance status" control.
const STATUS_FLOW: OrderStatus[] = ["new", "confirmed", "packed", "shipped", "delivered"];

function ChannelIcon({ channel, size = 13 }: { channel: OrderChannel; size?: number }) {
  if (channel === "pos") return <Store size={size} />;
  if (channel === "website") return <Globe size={size} />;
  if (channel === "telegram") return <Send size={size} />;
  return <Package size={size} />;
}

function money(n: number): string {
  return formatRub(n);
}

function channelLabel(channel: OrderChannel): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

function itemsSummary(order: Order): string {
  const positions = order.items.length;
  const units = order.items.reduce((s, i) => s + i.qty, 0);
  return `${positions} поз. · ${units} шт`;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.color, cfg.bg)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: OrderChannel }) {
  const cfg = CHANNEL_CONFIG[channel];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.color, cfg.bg)}>
      <ChannelIcon channel={channel} />
      {channelLabel(channel)}
    </span>
  );
}

function MarginPill({ pct }: { pct: number }) {
  const color = pct >= 25 ? "text-[var(--c-green)]" : pct >= 10 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]";
  return <span className={cn("text-xs font-medium", color)}>{pct >= 0 ? "" : "−"}{Math.abs(Math.round(pct))}%</span>;
}

function generateOrderNumber(): string {
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `MAN-${suffix}`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function OrdersPanel() {
  const { orders, products, locations, actions, getLocationName } = useInventory();
  const costFor = useMemo(() => costLookupFromProducts(products), [products]);

  const [searchQ, setSearchQ] = useState("");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  // Two-step confirmation for the stock-decrementing fulfill action.
  const [confirmFulfillId, setConfirmFulfillId] = useState<string | null>(null);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  // ── Stat aggregates ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let realizedRevenue = 0;
    let newCount = 0;
    let awaiting = 0;
    for (const o of orders) {
      const e = orderEconomics(o, costFor);
      if (e.realized) realizedRevenue += e.revenue;
      if (o.status === "new") newCount += 1;
      if (PENDING_STATUSES.includes(o.status)) awaiting += 1;
    }
    return {
      total: orders.length,
      newCount,
      realizedRevenue,
      awaiting,
    };
  }, [orders, costFor]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return orders.filter((o) => {
      if (channelFilter !== "all" && o.channel !== channelFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q) {
        const inNumber = o.orderNumber.toLowerCase().includes(q);
        const inCustomer = (o.customerName ?? "").toLowerCase().includes(q);
        const inRegion = (o.region ?? "").toLowerCase().includes(q);
        if (!inNumber && !inCustomer && !inRegion) return false;
      }
      return true;
    });
  }, [orders, channelFilter, statusFilter, searchQ]);

  const filtersActive = channelFilter !== "all" || statusFilter !== "all" || searchQ.trim() !== "";

  // ── Actions ─────────────────────────────────────────────────────────────
  function handleExport() {
    exportData<Order>({
      filename: "orders",
      title: "Заказы",
      subtitle: "Экспорт списка заказов SellerMap",
      format: "excel",
      meta: [
        { label: "Всего заказов", value: String(filtered.length) },
        { label: "Дата выгрузки", value: new Date().toLocaleDateString("ru-RU") },
      ],
      columns: [
        { key: "orderNumber", label: "Номер заказа" },
        { key: "channel", label: "Канал", format: (o) => channelLabel(o.channel) },
        { key: "status", label: "Статус", format: (o) => ORDER_STATUS_LABELS[o.status] },
        { key: "revenue", label: "Выручка, ₽", align: "right", format: (o) => Math.round(o.revenue) },
        { key: "createdAt", label: "Создан" },
      ],
      rows: filtered,
    });
  }

  function requestFulfill(id: string) {
    setConfirmFulfillId(id);
  }

  function confirmFulfill() {
    if (!confirmFulfillId) return;
    actions.fulfillOrder(confirmFulfillId);
    setConfirmFulfillId(null);
  }

  function handleAdvance(order: Order) {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    actions.updateOrderStatus(order.id, next);
  }

  function handleCancel(id: string) {
    actions.cancelOrder(id);
  }

  function resetFilters() {
    setChannelFilter("all");
    setStatusFilter("all");
    setSearchQ("");
  }

  const confirmTarget = confirmFulfillId ? orders.find((o) => o.id === confirmFulfillId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Toolbar — page title comes from InventoryShell header */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
        >
          <Download size={15} />
          Экспорт
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Всего заказов", value: String(stats.total), icon: ClipboardList, color: "text-[var(--c-text2)]" },
          { label: "Новых заказов", value: String(stats.newCount), icon: ShoppingCart, color: stats.newCount > 0 ? "text-[var(--c-blue)]" : "text-[var(--c-text3)]" },
          { label: "Выручка (реализ.)", value: money(stats.realizedRevenue), icon: TrendingUp, color: "text-[var(--c-green)]" },
          { label: "Ждут отгрузки", value: String(stats.awaiting), icon: Truck, color: stats.awaiting > 0 ? "text-[var(--c-amber)]" : "text-[var(--c-text3)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-[var(--c-text3)]">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--c-text)]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Поиск по номеру, клиенту, региону..."
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as OrderChannel | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все каналы</option>
          {(["wildberries", "ozon", "yandex_market", "website", "pos", "telegram"] as OrderChannel[]).map((ch) => (
            <option key={ch} value={ch}>{channelLabel(ch)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
            <option key={st} value={st}>{ORDER_STATUS_LABELS[st]}</option>
          ))}
        </select>
        {filtersActive && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)]"
          >
            <X size={13} /> Сбросить
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--c-text3)]">
          Показано {filtered.length} из {orders.length}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="Ручной заказ (продажа вне маркетплейса: прямая продажа, сайт). Заказы WB/Ozon приходят автоматически при синхронизации."
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
        >
          <Plus size={15} />
          Создать заказ вручную
        </button>
      </div>

      {/* Orders table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Заказ</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Клиент / Регион</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Состав</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Выручка</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Прибыль</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Создан</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Действие</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((o) => {
              const e = orderEconomics(o, costFor);
              const canFulfill = FULFILLABLE.includes(o.status);
              return (
                <tr
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    "border-b border-[var(--c-border)] last:border-0 cursor-pointer transition",
                    selectedId === o.id ? "bg-[var(--c-blue)]/5" : "hover:bg-[var(--c-bg3)]",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--c-text)]">{o.orderNumber}</div>
                    <div className="mt-1">
                      <ChannelBadge channel={o.channel} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className={o.customerName ? "text-[var(--c-text)]" : "text-[var(--c-text3)]"}>{customerLabel(o)}</div>
                    <div className="text-xs text-[var(--c-text3)]">{o.region ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{itemsSummary(o)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--c-text)]">{money(e.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className={cn("font-medium", e.netProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      {e.netProfit >= 0 ? "" : "−"}{money(Math.abs(e.netProfit))}
                    </div>
                    <div className="mt-0.5"><MarginPill pct={e.marginPct} /></div>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text3)]">{formatDateRu(o.createdAt)}</td>
                  <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                    {canFulfill ? (
                      <button
                        onClick={() => requestFulfill(o.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--c-green)]/10 border border-[var(--c-green)]/20 px-2.5 py-1.5 text-xs font-medium text-[var(--c-green)] hover:bg-[var(--c-green)]/15 transition"
                      >
                        <PackageCheck size={13} />
                        Отгрузить
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--c-text3)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text3)]">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--c-text3)]">
                    <ShoppingCart size={28} className="opacity-40" />
                    <div className="text-sm">
                      {filtersActive ? "Заказы по фильтрам не найдены" : "Заказов пока нет"}
                    </div>
                    {filtersActive && (
                      <button onClick={resetFilters} className="text-xs text-[var(--c-blue)] hover:underline">
                        Сбросить фильтры
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > visibleCount && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + 50)}
            className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            Показать ещё ({filtered.length - visibleCount})
          </button>
        </div>
      )}

      {/* Create order drawer */}
      {showCreate && (
        <CreateOrderDrawer
          products={products}
          locations={locations}
          onClose={() => setShowCreate(false)}
          onCreate={(order) => {
            actions.createOrder(order);
            setShowCreate(false);
          }}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <OrderDrawer
          order={selected}
          costFor={costFor}
          getLocationName={getLocationName}
          onClose={() => setSelectedId(null)}
          onFulfill={() => requestFulfill(selected.id)}
          onAdvance={() => handleAdvance(selected)}
          onCancel={() => handleCancel(selected.id)}
        />
      )}

      {/* Fulfillment confirmation */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-amber)]/15">
                <AlertTriangle size={18} className="text-[var(--c-amber)]" />
              </div>
              <h3 className="font-semibold text-[var(--c-text)]">Собрать и отгрузить заказ</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--c-text2)]">
                Заказ <span className="font-medium text-[var(--c-text)]">{confirmTarget.orderNumber}</span> будет переведён
                в статус «Отправлен». Со склада <span className="font-medium text-[var(--c-text)]">{getLocationName(confirmTarget.locationId)}</span> будут
                списаны товары:
              </p>
              <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] divide-y divide-[var(--c-border)]">
                {confirmTarget.items.map((it) => (
                  <div key={it.productId} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-[var(--c-text)]">{it.productName}</span>
                    <span className="font-medium text-[var(--c-amber)]">−{it.qty} шт</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--c-text3)]">Это действие изменит физический остаток и его нельзя отменить автоматически.</p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setConfirmFulfillId(null)}
                  className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmFulfill}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
                >
                  <PackageCheck size={15} />
                  Списать и отгрузить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

interface OrderDrawerProps {
  order: Order;
  costFor: CostLookup;
  getLocationName: (id: string) => string;
  onClose: () => void;
  onFulfill: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}

function OrderDrawer({ order, costFor, getLocationName, onClose, onFulfill, onAdvance, onCancel }: OrderDrawerProps) {
  const e = orderEconomics(order, costFor);
  const canFulfill = FULFILLABLE.includes(order.status);
  const flowIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[flowIdx + 1] : null;
  const canCancel = order.status !== "cancelled" && order.status !== "delivered" && order.status !== "returned";
  const totalUnits = order.items.reduce((s, i) => s + i.qty, 0);

  const breakdown: { label: string; value: number; tone: "pos" | "neg" | "neutral" }[] = [
    { label: "Выручка", value: e.revenue, tone: "pos" },
    { label: "Себестоимость (COGS)", value: -e.cogs, tone: "neg" },
    { label: `Комиссия канала (${formatDec((order.commissionRate ?? 0) * 100, 1)}%)`, value: -e.commission, tone: "neg" },
    { label: "Логистика", value: -e.logistics, tone: "neg" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-[var(--c-text)]">{order.orderNumber}</h3>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ChannelBadge channel={order.channel} />
              <span className="text-xs text-[var(--c-text3)]">{FULFILLMENT_LABELS[order.fulfillment]}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
            <X size={18} className="text-[var(--c-text3)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order meta */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={User} label="Клиент" value={customerLabel(order)} />
            <InfoRow icon={MapPin} label="Регион" value={order.region ?? "—"} />
            <InfoRow icon={Store} label="Склад" value={getLocationName(order.locationId)} />
            <InfoRow icon={Boxes} label="Состав" value={`${order.items.length} поз. · ${totalUnits} шт`} />
            <InfoRow icon={Calendar} label="Создан" value={formatDateRu(order.createdAt)} />
            <InfoRow icon={Truck} label="Отправлен" value={formatDateRu(order.shippedAt)} />
            {order.deliveredAt && <InfoRow icon={CheckCircle2} label="Доставлен" value={formatDateRu(order.deliveredAt)} />}
            {order.externalNumber && <InfoRow icon={Hash} label="ID на маркетплейсе" value={order.externalNumber} />}
          </div>

          {order.note && (
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 text-sm text-[var(--c-text2)] italic">
              {order.note}
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--c-text)]">
              <Package size={15} className="text-[var(--c-blue)]" />
              Позиции заказа
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--c-text3)]">Товар</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Кол-во</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Цена</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Себест.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => {
                    const unitCost = it.unitCost > 0 ? it.unitCost : (costFor(it.productId) ?? 0);
                    const lineProfit = (it.unitPrice - unitCost) * it.qty;
                    return (
                      <tr key={it.productId} className="border-b border-[var(--c-border)] last:border-0">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[var(--c-text)]">{it.productName}</div>
                          <div className="text-xs text-[var(--c-text3)]">{it.sku}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text2)]">{it.qty} шт</td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text2)]">{money(it.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text3)]">{money(unitCost)}</td>
                        <td className={cn("px-3 py-2.5 text-right font-medium", lineProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                          {lineProfit >= 0 ? "" : "−"}{money(Math.abs(lineProfit))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Economics breakdown */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--c-text)]">
              <Wallet size={15} className="text-[var(--c-green)]" />
              Экономика заказа
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] divide-y divide-[var(--c-border)]">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-[var(--c-text2)]">{b.label}</span>
                  <span
                    className={cn(
                      "font-medium",
                      b.tone === "pos" ? "text-[var(--c-text)]" : b.tone === "neg" ? "text-[var(--c-red)]" : "text-[var(--c-text2)]",
                    )}
                  >
                    {b.value < 0 ? "−" : ""}{money(Math.abs(b.value))}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--c-bg3)]">
                <span className="text-sm font-semibold text-[var(--c-text)]">Чистая прибыль</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-base font-bold", e.netProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                    {e.netProfit >= 0 ? "" : "−"}{money(Math.abs(e.netProfit))}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--c-bg)] px-2 py-0.5">
                    <Percent size={11} className="text-[var(--c-text3)]" />
                    <MarginPill pct={e.marginPct} />
                  </span>
                </div>
              </div>
            </div>
            {!e.realized && (
              <p className="mt-2 text-xs text-[var(--c-text3)]">
                Прибыль учитывается в P&L только после отгрузки или доставки заказа.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-1">
            {canFulfill && (
              <button
                onClick={onFulfill}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--c-green)] py-3 text-sm font-medium text-white hover:opacity-90 transition"
              >
                <PackageCheck size={16} />
                Собрать и отгрузить
              </button>
            )}
            {nextStatus && order.status !== "packed" && order.status !== "shipped" && (
              <button
                onClick={onAdvance}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--c-blue)]/30 bg-[var(--c-blue)]/10 py-2.5 text-sm font-medium text-[var(--c-blue)] hover:bg-[var(--c-blue)]/15 transition"
              >
                <ArrowRight size={15} />
                Перевести в «{ORDER_STATUS_LABELS[nextStatus]}»
              </button>
            )}
            {nextStatus && order.status === "shipped" && (
              <button
                onClick={onAdvance}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--c-green)]/30 bg-[var(--c-green)]/10 py-2.5 text-sm font-medium text-[var(--c-green)] hover:bg-[var(--c-green)]/15 transition"
              >
                <CheckCircle2 size={15} />
                Отметить доставленным
              </button>
            )}
            {canCancel && (
              <button
                onClick={onCancel}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text3)] hover:text-[var(--c-red)] hover:border-[var(--c-red)]/30 hover:bg-[var(--c-red)]/5 transition"
              >
                <XCircle size={15} />
                Отменить заказ
              </button>
            )}
            {!canFulfill && !nextStatus && !canCancel && (
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-3 text-center text-sm text-[var(--c-text3)]">
                Заказ завершён — действия недоступны
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 text-[var(--c-text3)] shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-[var(--c-text3)]">{label}</div>
        <div className="text-sm text-[var(--c-text)] truncate">{value}</div>
      </div>
    </div>
  );
}

// ── Create Order Drawer ────────────────────────────────────────────────────

interface DraftItem {
  id: string;
  product: Product;
  qty: number;
  unitPrice: number;
}

interface CreateOrderDrawerProps {
  products: Product[];
  locations: Location[];
  onClose: () => void;
  onCreate: (order: Order) => void;
}

function CreateOrderDrawer({ products, locations, onClose, onCreate }: CreateOrderDrawerProps) {
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0];

  const [channel, setChannel] = useState<OrderChannel>("wildberries");
  const [fulfillment, setFulfillment] = useState<FulfillmentModel>("FBS");
  const [orderNumber, setOrderNumber] = useState(() => generateOrderNumber());
  const [customerName, setCustomerName] = useState("");
  const [region, setRegion] = useState("");
  const [locationId, setLocationId] = useState(defaultLocation?.id ?? "");
  const [status, setStatus] = useState<OrderStatus>("new");
  const [logisticsCost, setLogisticsCost] = useState(0);
  const [commissionRate, setCommissionRate] = useState(CHANNEL_DEFAULT_COMMISSION["wildberries"]);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  // Product search state for the inline product picker
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Update commission when channel changes
  function handleChannelChange(ch: OrderChannel) {
    setChannel(ch);
    setCommissionRate(CHANNEL_DEFAULT_COMMISSION[ch]);
  }

  const activeProducts = useMemo(
    () => products.filter((p) => p.status !== "archived"),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return activeProducts.slice(0, 20);
    return activeProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [activeProducts, productSearch]);

  function addProduct(product: Product) {
    // If product already in list, increment qty
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `draft-${Date.now()}-${Math.random()}`,
          product,
          qty: 1,
          unitPrice: product.price,
        },
      ]);
    }
    setProductSearch("");
    setShowProductPicker(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItemQty(id: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
    );
  }

  function updateItemPrice(id: string, price: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unitPrice: Math.max(0, price) } : i)),
    );
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const commissionAmount = subtotal * (commissionRate / 100);

  const isValid = orderNumber.trim() !== "" && items.length > 0;

  function handleSave() {
    if (!isValid) return;
    const id = `ord-${Date.now()}`;
    const revenue = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const order: Order = {
      id,
      orderNumber: orderNumber.trim(),
      channel,
      fulfillment,
      status,
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        qty: i.qty,
        unitPrice: i.unitPrice,
        unitCost: i.product.costPrice,
      })),
      locationId,
      customerName: customerName.trim() || undefined,
      region: region.trim() || undefined,
      revenue,
      commissionRate: commissionRate / 100,
      logisticsCost,
      createdAt: new Date().toISOString().split("T")[0],
      note: note.trim() || undefined,
    };
    onCreate(order);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl animate-in slide-in-from-right flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--c-green)]/15">
              <Plus size={16} className="text-[var(--c-green)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--c-text)]">Новый заказ</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
            <X size={18} className="text-[var(--c-text3)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Section: Basic details */}
            <section className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">Основные данные</h4>

              <div className="grid grid-cols-2 gap-4">
                {/* Channel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Канал</label>
                  <div className="relative">
                    <select
                      value={channel}
                      onChange={(e) => handleChannelChange(e.target.value as OrderChannel)}
                      className="w-full appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 pr-8 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                    >
                      {(Object.keys(CHANNEL_LABELS_RU) as OrderChannel[]).map((ch) => (
                        <option key={ch} value={ch}>{CHANNEL_LABELS_RU[ch]}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  </div>
                </div>

                {/* Fulfillment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Тип доставки</label>
                  <div className="relative">
                    <select
                      value={fulfillment}
                      onChange={(e) => setFulfillment(e.target.value as FulfillmentModel)}
                      className="w-full appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 pr-8 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                    >
                      {(Object.keys(FULFILLMENT_LABELS_SHORT) as FulfillmentModel[]).map((f) => (
                        <option key={f} value={f}>{FULFILLMENT_LABELS_SHORT[f]}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  </div>
                </div>

                {/* Order number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Номер заказа</label>
                  <input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="MAN-XXXXX"
                    className={cn(
                      "w-full rounded-lg border bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]",
                      orderNumber.trim() === "" ? "border-[var(--c-red)]/50" : "border-[var(--c-border)]",
                    )}
                  />
                  {orderNumber.trim() === "" && (
                    <p className="text-xs text-[var(--c-red)]">Обязательное поле</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Статус</label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderStatus)}
                      className="w-full appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 pr-8 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                    >
                      {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                        <option key={st} value={st}>{ORDER_STATUS_LABELS[st]}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  </div>
                </div>

                {/* Customer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Клиент <span className="text-[var(--c-text3)]">(необязательно)</span></label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>

                {/* Region */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Регион <span className="text-[var(--c-text3)]">(необязательно)</span></label>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Москва"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Склад</label>
                  <div className="relative">
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 pr-8 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Economics */}
            <section className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">Экономика</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Доставка, ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={logisticsCost}
                    onChange={(e) => setLogisticsCost(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--c-text2)]">Комиссия, %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>
            </section>

            {/* Section: Line items */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">Позиции заказа</h4>
                {items.length === 0 && (
                  <span className="text-xs text-[var(--c-red)]">Добавьте хотя бы один товар</span>
                )}
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden divide-y divide-[var(--c-border)]">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 px-3 py-2 bg-[var(--c-bg3)]">
                    <span className="text-xs font-medium text-[var(--c-text3)]">Товар</span>
                    <span className="text-xs font-medium text-[var(--c-text3)] text-right">Кол-во</span>
                    <span className="text-xs font-medium text-[var(--c-text3)] text-right">Цена, ₽</span>
                    <span className="text-xs font-medium text-[var(--c-text3)] text-right">Итого</span>
                    <span />
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] items-center gap-2 px-3 py-2.5">
                      {/* Product info */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--c-text)] truncate">{item.product.name}</div>
                        <div className="text-xs text-[var(--c-text3)]">{item.product.sku}</div>
                      </div>
                      {/* Qty */}
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                        className="w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1 text-sm text-right text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                      />
                      {/* Unit price */}
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                        className="w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1 text-sm text-right text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                      />
                      {/* Line total */}
                      <div className="text-sm font-medium text-right text-[var(--c-text)]">
                        {Math.round(item.qty * item.unitPrice).toLocaleString("ru-RU")}
                      </div>
                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red)]/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Product picker trigger */}
              <div className="relative">
                <button
                  onClick={() => { setShowProductPicker((v) => !v); setProductSearch(""); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text3)] hover:border-[var(--c-blue)] hover:text-[var(--c-blue)] hover:bg-[var(--c-blue)]/5 transition"
                >
                  <Plus size={15} />
                  Добавить товар
                </button>

                {/* Inline product search dropdown */}
                {showProductPicker && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-[var(--c-border)]">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                        <input
                          autoFocus
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Поиск товара по названию или SKU..."
                          className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-8 pr-3 py-1.5 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredProducts.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-[var(--c-text3)]">Товары не найдены</div>
                      )}
                      {filteredProducts.map((p) => {
                        const stock = Object.values(p.stockByLocation).reduce((s, n) => s + n, 0);
                        const alreadyAdded = items.some((i) => i.product.id === p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--c-bg3)] transition"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)]">
                              <Package size={14} className="text-[var(--c-text3)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</div>
                              <div className="text-xs text-[var(--c-text3)]">{p.sku} · {stock} шт на складе</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-[var(--c-text)]">{money(p.price)}</div>
                              {alreadyAdded && (
                                <div className="text-xs text-[var(--c-green)]">добавлен</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-[var(--c-border)] p-2">
                      <button
                        onClick={() => setShowProductPicker(false)}
                        className="w-full rounded-lg py-1.5 text-xs text-[var(--c-text3)] hover:bg-[var(--c-bg3)] transition"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Summary */}
            {items.length > 0 && (
              <section className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] divide-y divide-[var(--c-border)]">
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-[var(--c-text2)]">Подытог</span>
                  <span className="font-medium text-[var(--c-text)]">{money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-[var(--c-text2)]">Комиссия ({commissionRate}%)</span>
                  <span className="text-[var(--c-red)]">−{money(commissionAmount)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-[var(--c-text2)]">Логистика</span>
                  <span className="text-[var(--c-red)]">−{money(logisticsCost)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--c-bg3)]">
                  <span className="text-sm font-semibold text-[var(--c-text)]">Выручка</span>
                  <span className="text-base font-bold text-[var(--c-green)]">{money(subtotal)}</span>
                </div>
              </section>
            )}

            {/* Section: Note */}
            <section className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--c-text2)]">Примечание <span className="text-[var(--c-text3)]">(необязательно)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Комментарий к заказу..."
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)] resize-none"
              />
            </section>

          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 shrink-0 border-t border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-4">
          {!isValid && (
            <p className="mb-3 text-xs text-[var(--c-text3)]">
              {orderNumber.trim() === "" && items.length === 0
                ? "Укажите номер заказа и добавьте хотя бы один товар"
                : orderNumber.trim() === ""
                ? "Укажите номер заказа"
                : "Добавьте хотя бы один товар"}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                isValid
                  ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                  : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
              )}
            >
              <PackageCheck size={15} />
              Создать заказ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
