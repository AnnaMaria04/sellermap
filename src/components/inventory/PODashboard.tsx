"use client";

import { useMemo, useState } from "react";
import {
  Truck,
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Hash,
  Package,
  CreditCard,
  TrendingUp,
  Timer,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { type PurchaseOrder, type PurchaseOrderItem } from "@/mock/inventory";
import { cn, formatRub } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000,
  );
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function dateColor(iso: string): string {
  const d = diffDays(iso, today());
  if (d < 0) return "text-[var(--c-red)]";
  if (d === 0) return "text-[var(--c-amber)]";
  return "text-[var(--c-green)]";
}

function totalItems(po: PurchaseOrder): number {
  return po.items.reduce((s, i) => s + i.qty, 0);
}

function remainingItems(po: PurchaseOrder): PurchaseOrderItem[] {
  return po.items.filter((i) => i.qty - i.receivedQty > 0);
}

// ─── KPI card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "amber" | "blue" | "green" | "red";
}

function KpiCard({ icon, label, value, sub, accent = "blue" }: KpiCardProps) {
  const accentCls: Record<string, string> = {
    amber: "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
    blue: "bg-[var(--c-blue-dim)] text-[var(--c-blue)]",
    green: "bg-[var(--c-green-dim)] text-[var(--c-green)]",
    red: "bg-[var(--c-red-dim)] text-[var(--c-red)]",
  };
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          accentCls[accent],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-[var(--c-text)]">
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-[var(--c-text2)]">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Inline receive panel ────────────────────────────────────────────────────

interface ReceivePanelProps {
  po: PurchaseOrder;
  locationName: string;
  onClose: () => void;
}

function ReceivePanel({ po, locationName, onClose }: ReceivePanelProps) {
  const { actions } = useInventory();
  const remaining = remainingItems(po);

  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(remaining.map((i) => [i.productId, 0])),
  );

  function setAll() {
    setQtys(
      Object.fromEntries(remaining.map((i) => [i.productId, i.qty - i.receivedQty])),
    );
  }

  function handleSave() {
    const nonZero: Record<string, number> = {};
    for (const [k, v] of Object.entries(qtys)) {
      if (v > 0) nonZero[k] = v;
    }
    if (Object.keys(nonZero).length === 0) return;
    actions.receivePOItems(po.id, nonZero, po.locationId);
    onClose();
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--c-border2)] bg-[var(--c-bg3)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--c-text)]">
          Принять товар — {locationName}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-[var(--c-text3)] hover:text-[var(--c-text)]"
          aria-label="Закрыть"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 space-y-2">
        {remaining.map((item) => {
          const max = item.qty - item.receivedQty;
          return (
            <div
              key={item.productId}
              className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--c-text)]">
                  {item.productName}
                </p>
                <p className="text-xs text-[var(--c-text3)]">
                  Заказано {item.qty} · Принято {item.receivedQty} · Ожидается {max}
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={max}
                value={qtys[item.productId] ?? 0}
                onChange={(e) =>
                  setQtys((prev) => ({
                    ...prev,
                    [item.productId]: Math.min(
                      max,
                      Math.max(0, Number(e.target.value)),
                    ),
                  }))
                }
                className="w-20 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5 text-center text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]"
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={setAll}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-xs font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          Принять всё
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-[var(--c-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Сохранить поступление
        </button>
      </div>
    </div>
  );
}

// ─── Delivery row ────────────────────────────────────────────────────────────

interface DeliveryRowProps {
  po: PurchaseOrder;
  locationName: string;
}

function DeliveryRow({ po, locationName }: DeliveryRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="flex flex-wrap items-start gap-3">
        {/* supplier + date */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--c-text)]">{po.supplierName}</p>
          {po.expectedArrival ? (
            <p
              className={cn(
                "mt-0.5 text-xs font-medium",
                dateColor(po.expectedArrival),
              )}
            >
              {fmtDate(po.expectedArrival)}
              {diffDays(po.expectedArrival, today()) < 0 && (
                <span className="ml-1 text-[var(--c-text3)]">(просрочено)</span>
              )}
              {diffDays(po.expectedArrival, today()) === 0 && (
                <span className="ml-1 text-[var(--c-text3)]">(сегодня)</span>
              )}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--c-text3)]">Дата не указана</p>
          )}
        </div>

        {/* meta chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-xs text-[var(--c-text2)]">
            <Package className="h-3 w-3" />
            {totalItems(po)} ед.
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-xs text-[var(--c-text2)]">
            <MapPin className="h-3 w-3" />
            {locationName}
          </span>
          {po.trackingNumber && (
            <span className="flex items-center gap-1 rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-xs text-[var(--c-text2)]">
              <Hash className="h-3 w-3" />
              {po.trackingNumber}
            </span>
          )}
          <span className="text-sm font-semibold text-[var(--c-text)]">
            {formatRub(po.totalAmount)}
          </span>
        </div>

        {/* action */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            open
              ? "bg-[var(--c-bg3)] text-[var(--c-text2)]"
              : "bg-[var(--c-blue)] text-white hover:opacity-90",
          )}
        >
          {open ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Принять товар
            </>
          )}
        </button>
      </div>

      {open && (
        <ReceivePanel
          po={po}
          locationName={locationName}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Payment bar ─────────────────────────────────────────────────────────────

interface PayBarProps {
  label: string;
  count: number;
  amount: number;
  total: number;
  colorCls: string;
}

function PayBar({ label, count, amount, total, colorCls }: PayBarProps) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--c-text2)]">
          {label}{" "}
          <span className="font-semibold text-[var(--c-text)]">({count})</span>
        </span>
        <span className="font-medium text-[var(--c-text)]">
          {formatRub(amount)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
        <div
          className={cn("h-full rounded-full transition-all", colorCls)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

export function PODashboard() {
  const { purchaseOrders, locations } = useInventory();

  const todayStr = today();
  const nowMonth = todayStr.slice(0, 7); // "YYYY-MM"

  // helpers
  function getLocName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? id;
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const inTransit = purchaseOrders.filter((p) => p.status === "in_transit");
    const pendingConfirm = purchaseOrders.filter(
      (p) => p.status === "draft" || p.status === "sent",
    );
    const partiallyReceived = purchaseOrders.filter(
      (p) => p.status === "partially_received",
    );
    const closedThisMonth = purchaseOrders.filter(
      (p) =>
        p.status === "closed" &&
        p.receivedAt &&
        p.receivedAt.startsWith(nowMonth),
    );

    const inTransitValue = inTransit.reduce((s, p) => s + p.totalAmount, 0);

    return { inTransit, pendingConfirm, partiallyReceived, closedThisMonth, inTransitValue };
  }, [purchaseOrders, nowMonth]);

  // ── Expected deliveries (in_transit | confirmed), sorted ─────────────────
  const upcoming = useMemo(
    () =>
      purchaseOrders
        .filter(
          (p) => p.status === "in_transit" || p.status === "confirmed",
        )
        .sort((a, b) => {
          if (!a.expectedArrival && !b.expectedArrival) return 0;
          if (!a.expectedArrival) return 1;
          if (!b.expectedArrival) return -1;
          return a.expectedArrival.localeCompare(b.expectedArrival);
        }),
    [purchaseOrders],
  );

  // ── Overdue ───────────────────────────────────────────────────────────────
  const overdue = useMemo(
    () =>
      purchaseOrders.filter(
        (p) =>
          p.expectedArrival &&
          p.expectedArrival < todayStr &&
          p.status !== "closed",
      ),
    [purchaseOrders, todayStr],
  );

  // ── Supplier performance ──────────────────────────────────────────────────
  const supplierPerf = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        total: number;
        closedOnTime: number;
        closedTotal: number;
        leadTimeSum: number;
        spent: number;
      }
    > = {};

    for (const po of purchaseOrders) {
      if (!map[po.supplierId]) {
        map[po.supplierId] = {
          name: po.supplierName,
          total: 0,
          closedOnTime: 0,
          closedTotal: 0,
          leadTimeSum: 0,
          spent: 0,
        };
      }
      const s = map[po.supplierId];
      s.total += 1;
      s.spent += po.totalAmount;

      if (po.status === "closed" && po.receivedAt) {
        s.closedTotal += 1;
        const lead = diffDays(po.receivedAt, po.createdAt);
        s.leadTimeSum += Math.max(0, lead);
        if (po.expectedArrival && po.receivedAt <= po.expectedArrival) {
          s.closedOnTime += 1;
        }
      }
    }

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        onTimeRate:
          s.closedTotal > 0
            ? Math.round((s.closedOnTime / s.closedTotal) * 100)
            : null,
        avgLead:
          s.closedTotal > 0
            ? Math.round(s.leadTimeSum / s.closedTotal)
            : null,
      }));
  }, [purchaseOrders]);

  // ── Payment status ────────────────────────────────────────────────────────
  const paymentSummary = useMemo(() => {
    const groups: Record<"unpaid" | "partial" | "paid", { count: number; amount: number }> = {
      unpaid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
    };
    for (const po of purchaseOrders) {
      const key = (po.paymentStatus ?? "unpaid") as "unpaid" | "partial" | "paid";
      groups[key].count += 1;
      groups[key].amount += po.totalAmount;
    }
    const totalAmount =
      groups.unpaid.amount + groups.partial.amount + groups.paid.amount;
    return { groups, totalAmount };
  }, [purchaseOrders]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="В пути"
          value={kpis.inTransit.length}
          sub={formatRub(kpis.inTransitValue)}
          accent="amber"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Ожидают подтверждения"
          value={kpis.pendingConfirm.length}
          accent="blue"
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5" />}
          label="Частично получены"
          value={kpis.partiallyReceived.length}
          accent="blue"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Закрыто (месяц)"
          value={kpis.closedThisMonth.length}
          accent="green"
        />
      </div>

      {/* ── Overdue alert ── */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--c-red)]" />
            <span className="text-sm font-semibold text-[var(--c-red)]">
              Просроченные поставки — {overdue.length}
            </span>
          </div>
          <div className="space-y-2">
            {overdue.map((po) => {
              const days = po.expectedArrival
                ? Math.abs(diffDays(todayStr, po.expectedArrival))
                : null;
              return (
                <div
                  key={po.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[rgba(240,80,80,0.2)] bg-[var(--c-bg2)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--c-text)]">
                      {po.supplierName}
                    </p>
                    {days !== null && (
                      <p className="text-xs text-[var(--c-red)]">
                        Просрочено на {days}{" "}
                        {days === 1 ? "день" : days < 5 ? "дня" : "дней"}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--c-text)]">
                    {formatRub(po.totalAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expected deliveries ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--c-text)]">
          Ожидаемые поставки
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-8 text-center text-sm text-[var(--c-text3)]">
            Нет активных поставок в пути или подтверждённых
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((po) => (
              <DeliveryRow
                key={po.id}
                po={po}
                locationName={getLocName(po.locationId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom grid: supplier perf + payment ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Supplier performance */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--c-text3)]" />
            <h2 className="text-sm font-semibold text-[var(--c-text)]">
              Эффективность поставщиков
            </h2>
          </div>

          {supplierPerf.length === 0 ? (
            <p className="text-center text-sm text-[var(--c-text3)]">
              Нет данных
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-border)] text-[var(--c-text3)]">
                    <th className="pb-2 text-left font-medium">Поставщик</th>
                    <th className="pb-2 text-center font-medium">Заказов</th>
                    <th className="pb-2 text-center font-medium">В срок</th>
                    <th className="pb-2 text-center font-medium">
                      <span className="flex items-center justify-center gap-1">
                        <Timer className="h-3 w-3" />
                        Срок
                      </span>
                    </th>
                    <th className="pb-2 text-right font-medium">Потрачено</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-border)]">
                  {supplierPerf.map((s) => (
                    <tr key={s.name}>
                      <td className="py-2.5 pr-2 font-medium text-[var(--c-text)]">
                        {s.name}
                      </td>
                      <td className="py-2.5 text-center text-[var(--c-text2)]">
                        {s.total}
                      </td>
                      <td className="py-2.5 text-center">
                        {s.onTimeRate !== null ? (
                          <span
                            className={cn(
                              "font-semibold",
                              s.onTimeRate >= 80
                                ? "text-[var(--c-green)]"
                                : s.onTimeRate >= 50
                                  ? "text-[var(--c-amber)]"
                                  : "text-[var(--c-red)]",
                            )}
                          >
                            {s.onTimeRate}%
                          </span>
                        ) : (
                          <span className="text-[var(--c-text3)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-[var(--c-text2)]">
                        {s.avgLead !== null ? (
                          `${s.avgLead} дн.`
                        ) : (
                          <span className="text-[var(--c-text3)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-medium text-[var(--c-text)]">
                        {formatRub(s.spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment status */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--c-text3)]" />
            <h2 className="text-sm font-semibold text-[var(--c-text)]">
              Статусы оплаты
            </h2>
          </div>

          <div className="space-y-4">
            <PayBar
              label="Не оплачено"
              count={paymentSummary.groups.unpaid.count}
              amount={paymentSummary.groups.unpaid.amount}
              total={paymentSummary.totalAmount}
              colorCls="bg-[var(--c-red)]"
            />
            <PayBar
              label="Частично оплачено"
              count={paymentSummary.groups.partial.count}
              amount={paymentSummary.groups.partial.amount}
              total={paymentSummary.totalAmount}
              colorCls="bg-[var(--c-amber)]"
            />
            <PayBar
              label="Оплачено"
              count={paymentSummary.groups.paid.count}
              amount={paymentSummary.groups.paid.amount}
              total={paymentSummary.totalAmount}
              colorCls="bg-[var(--c-green)]"
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--c-border)] pt-3">
            <span className="text-xs text-[var(--c-text3)]">Итого</span>
            <span className="text-sm font-semibold text-[var(--c-text)]">
              {formatRub(paymentSummary.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
