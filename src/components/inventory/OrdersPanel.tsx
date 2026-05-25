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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Order,
  type OrderStatus,
  type OrderChannel,
  type FulfillmentModel,
  ORDER_STATUS_LABELS,
  CHANNEL_LABELS,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { orderEconomics } from "@/lib/inventory/finance";
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
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
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

// ── Main component ───────────────────────────────────────────────────────────

export function OrdersPanel() {
  const { orders, actions, getLocationName } = useInventory();

  const [searchQ, setSearchQ] = useState("");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      const e = orderEconomics(o);
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
  }, [orders]);

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

  const channelsPresent = useMemo(
    () => [...new Set(orders.map((o) => o.channel))],
    [orders],
  );

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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Заказы</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Обработка и отгрузка заказов с маркетплейсов и прямых каналов</p>
        </div>
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
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <table className="w-full text-sm">
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
            {filtered.map((o) => {
              const e = orderEconomics(o);
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
                    {o.customerName ? (
                      <div className="text-[var(--c-text)]">{o.customerName}</div>
                    ) : (
                      <div className="text-[var(--c-text3)]">Без имени</div>
                    )}
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
                  <td className="px-4 py-3 text-[var(--c-text3)]">{o.createdAt}</td>
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

      {/* Detail drawer */}
      {selected && (
        <OrderDrawer
          order={selected}
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
  getLocationName: (id: string) => string;
  onClose: () => void;
  onFulfill: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}

function OrderDrawer({ order, getLocationName, onClose, onFulfill, onAdvance, onCancel }: OrderDrawerProps) {
  const e = orderEconomics(order);
  const canFulfill = FULFILLABLE.includes(order.status);
  const flowIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[flowIdx + 1] : null;
  const canCancel = order.status !== "cancelled" && order.status !== "delivered" && order.status !== "returned";
  const totalUnits = order.items.reduce((s, i) => s + i.qty, 0);

  const breakdown: { label: string; value: number; tone: "pos" | "neg" | "neutral" }[] = [
    { label: "Выручка", value: e.revenue, tone: "pos" },
    { label: "Себестоимость (COGS)", value: -e.cogs, tone: "neg" },
    { label: `Комиссия канала (${Math.round((order.commissionRate ?? 0) * 100)}%)`, value: -e.commission, tone: "neg" },
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
            <InfoRow icon={User} label="Клиент" value={order.customerName ?? "Без имени"} />
            <InfoRow icon={MapPin} label="Регион" value={order.region ?? "—"} />
            <InfoRow icon={Store} label="Склад" value={getLocationName(order.locationId)} />
            <InfoRow icon={Boxes} label="Состав" value={`${order.items.length} поз. · ${totalUnits} шт`} />
            <InfoRow icon={Calendar} label="Создан" value={order.createdAt} />
            <InfoRow icon={Truck} label="Отправлен" value={order.shippedAt ?? "—"} />
            {order.deliveredAt && <InfoRow icon={CheckCircle2} label="Доставлен" value={order.deliveredAt} />}
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
                    const lineProfit = (it.unitPrice - it.unitCost) * it.qty;
                    return (
                      <tr key={it.productId} className="border-b border-[var(--c-border)] last:border-0">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[var(--c-text)]">{it.productName}</div>
                          <div className="text-xs text-[var(--c-text3)]">{it.sku}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text2)]">{it.qty} шт</td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text2)]">{money(it.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-[var(--c-text3)]">{money(it.unitCost)}</td>
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
            {nextStatus && order.status !== "packed" && (
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
