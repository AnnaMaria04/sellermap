"use client";

import { use, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Check,
  Pencil,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { POStatusBadge } from "@/components/inventory/StockStatusBadge";
import { useInventory } from "@/contexts/InventoryContext";
import { PO_STATUS_LABELS, type PurchaseOrderStatus } from "@/mock/inventory";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(expectedArrival: string, status: PurchaseOrderStatus): boolean {
  if (["closed", "issue"].includes(status)) return false;
  return new Date(expectedArrival) < new Date();
}

function daysOverdue(expectedArrival: string): number {
  const diff = Date.now() - new Date(expectedArrival).getTime();
  return Math.floor(diff / 86400000);
}

// ── Status Stepper ────────────────────────────────────────────────────────────

const STATUS_FLOW: PurchaseOrderStatus[] = [
  "draft",
  "sent",
  "confirmed",
  "in_transit",
  "partially_received",
  "closed",
];

function getNextStatus(current: PurchaseOrderStatus): PurchaseOrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function StatusStepper({
  status,
  onAdvance,
}: {
  status: PurchaseOrderStatus;
  onAdvance: (newStatus: PurchaseOrderStatus) => void;
}) {
  const [confirming, setConfirming] = useState<PurchaseOrderStatus | null>(null);
  const currentIdx = STATUS_FLOW.indexOf(status);

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--c-text)]">Статус заказа</h3>

      {/* Steps - horizontal on desktop, condensed on mobile */}
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {STATUS_FLOW.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isNext = idx === currentIdx + 1;
          const isFuture = idx > currentIdx;

          return (
            <div key={s} className="flex flex-1 min-w-0 items-center">
              <div className="flex flex-col items-center min-w-[72px] flex-1">
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition shrink-0",
                    isDone
                      ? "border-[var(--c-green)] bg-[var(--c-green)] text-[var(--c-bg)]"
                      : isCurrent
                        ? "border-[var(--c-green)] bg-[var(--c-bg)] text-[var(--c-green)]"
                        : isNext
                          ? "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:border-[var(--c-green)] hover:text-[var(--c-green)] cursor-pointer"
                          : "border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text3)] cursor-default",
                  )}
                  disabled={!isNext}
                  onClick={() => {
                    if (isNext) setConfirming(s);
                  }}
                  title={isNext ? `Перевести в статус "${PO_STATUS_LABELS[s]}"` : undefined}
                >
                  {isDone ? (
                    <Check size={14} />
                  ) : isCurrent ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-green)]" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </button>
                <p
                  className={cn(
                    "mt-1.5 text-center text-[10px] leading-tight",
                    isCurrent
                      ? "font-semibold text-[var(--c-green)]"
                      : isDone
                        ? "text-[var(--c-text2)]"
                        : "text-[var(--c-text3)]",
                  )}
                >
                  {PO_STATUS_LABELS[s]}
                </p>
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    "mt-[-18px] h-0.5 flex-1",
                    idx < currentIdx ? "bg-[var(--c-green)]" : "bg-[var(--c-border)]",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirming && (
        <div className="mt-4 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] p-4">
          <p className="text-sm text-[var(--c-text)]">
            Перевести заказ в статус{" "}
            <strong>&quot;{PO_STATUS_LABELS[confirming]}&quot;</strong>?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(null)}
              className="h-8 flex-1 rounded-lg border border-[var(--c-border2)] text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onAdvance(confirming);
                setConfirming(null);
              }}
              className="h-8 flex-1 rounded-lg bg-[var(--c-green)] text-xs font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Line Items Table ──────────────────────────────────────────────────────────

function LineItemsTable({
  po,
  onReceive,
}: {
  po: ReturnType<typeof useInventory>["purchaseOrders"][number];
  onReceive: (qtys: Record<string, number>) => void;
}) {
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleBarcodeSearch = useCallback(
    (value: string) => {
      setBarcodeSearch(value);
      if (!value.trim()) return;
      const q = value.trim().toLowerCase();
      const matched = po.items.find(
        (item) =>
          item.sku.toLowerCase() === q ||
          item.productName.toLowerCase().includes(q),
      );
      if (matched) {
        const ref = inputRefs.current[matched.productId];
        if (ref) {
          ref.focus();
          ref.select();
        }
      }
    },
    [po.items],
  );

  const handleConfirmReceive = () => {
    const received: Record<string, number> = {};
    Object.entries(receiveQtys).forEach(([productId, qtyStr]) => {
      const qty = parseInt(qtyStr);
      if (!isNaN(qty) && qty > 0) received[productId] = qty;
    });
    if (Object.keys(received).length === 0) {
      toast.error("Введите количество принятого товара");
      return;
    }
    onReceive(received);
    setReceiving(false);
    setReceiveQtys({});
    setBarcodeSearch("");
    toast.success("Товар принят на склад");
  };

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">Позиции заказа</h3>
        {!receiving && po.status !== "closed" && po.status !== "draft" && (
          <button
            onClick={() => setReceiving(true)}
            className="flex h-8 items-center gap-2 rounded-lg bg-[var(--c-green)] px-3 text-xs font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <Package size={13} />
            Принять товар
          </button>
        )}
        {receiving && (
          <button
            onClick={() => {
              setReceiving(false);
              setReceiveQtys({});
              setBarcodeSearch("");
            }}
            className="h-8 rounded-lg border border-[var(--c-border2)] px-3 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
        )}
      </div>

      {receiving && (
        <div className="border-b border-[var(--c-border)] px-5 py-3">
          <input
            type="text"
            placeholder="Сканировать штрихкод или введите артикул..."
            value={barcodeSearch}
            onChange={(e) => handleBarcodeSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                Товар
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                Артикул
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                Заказано
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                {receiving ? "Принять" : "Принято"}
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                Цена
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => {
              const isHighlighted =
                receiving &&
                barcodeSearch.trim() &&
                (item.sku.toLowerCase() === barcodeSearch.trim().toLowerCase() ||
                  item.productName
                    .toLowerCase()
                    .includes(barcodeSearch.trim().toLowerCase()));

              return (
                <tr
                  key={item.productId}
                  className={cn(
                    "border-b border-[var(--c-border)] last:border-0",
                    isHighlighted && "bg-[var(--c-green-dim)]",
                  )}
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-[var(--c-text)]">
                      {item.productName}
                    </p>
                    {item.note && (
                      <p className="text-xs text-[var(--c-text3)] mt-0.5">{item.note}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-[var(--c-text2)] tabular">{item.sku}</p>
                  </td>
                  <td className="px-5 py-4 text-right tabular">
                    <p className="text-sm text-[var(--c-text)]">{item.qty}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {receiving ? (
                      <input
                        ref={(el) => {
                          inputRefs.current[item.productId] = el;
                        }}
                        type="number"
                        min={0}
                        max={item.qty - item.receivedQty}
                        value={receiveQtys[item.productId] ?? ""}
                        onChange={(e) =>
                          setReceiveQtys((prev) => ({
                            ...prev,
                            [item.productId]: e.target.value,
                          }))
                        }
                        className="w-24 ml-auto block rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular"
                      />
                    ) : (
                      <p className="text-sm text-[var(--c-text)] tabular">
                        {item.receivedQty}{" "}
                        <span className="text-[var(--c-text3)]">/ {item.qty}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right tabular">
                    <p className="text-sm text-[var(--c-text)]">
                      {item.unitCost.toLocaleString("ru-RU")} ₽
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right tabular">
                    <p className="text-sm font-medium text-[var(--c-text)]">
                      {item.totalCost.toLocaleString("ru-RU")} ₽
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {receiving && (
        <div className="border-t border-[var(--c-border)] px-5 py-4">
          <button
            onClick={handleConfirmReceive}
            className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <Check size={16} />
            Подтвердить получение
          </button>
        </div>
      )}
    </div>
  );
}

// ── Info Card ─────────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight
          ? "border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)]"
          : "border-[var(--c-border)] bg-[var(--c-bg2)]",
      )}
    >
      <p
        className={cn(
          "text-xs mb-1",
          highlight ? "text-[var(--c-red)]" : "text-[var(--c-text3)]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-[var(--c-red)]" : "text-[var(--c-text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Notes Section ─────────────────────────────────────────────────────────────

function NotesSection({
  note,
  onSave,
}: {
  note: string | undefined;
  onSave: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">Примечание</h3>
        {!editing && (
          <button
            onClick={() => {
              setValue(note ?? "");
              setEditing(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 h-8 rounded-lg border border-[var(--c-border2)] text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onSave(value);
                setEditing(false);
                toast.success("Примечание сохранено");
              }}
              className="flex-1 h-8 rounded-lg bg-[var(--c-green)] text-xs font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--c-text2)] whitespace-pre-wrap">
          {note ?? <span className="italic text-[var(--c-text3)]">Нет примечания</span>}
        </p>
      )}
    </div>
  );
}

// ── Activity Timeline ─────────────────────────────────────────────────────────

function ActivityTimeline({
  po,
}: {
  po: ReturnType<typeof useInventory>["purchaseOrders"][number];
}) {
  const events: { label: string; date: string }[] = [
    { label: "Заказ создан", date: po.createdAt },
  ];

  if (po.status !== "draft" && po.updatedAt !== po.createdAt) {
    events.push({
      label: `Статус изменён: ${PO_STATUS_LABELS[po.status]}`,
      date: po.updatedAt,
    });
  }

  if (po.receivedAt) {
    events.push({ label: "Товар принят на склад", date: po.receivedAt });
  }

  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--c-text)]">Активность</h3>
      <div className="space-y-4">
        {sorted.map((ev, i) => (
          <div key={i} className="flex gap-3">
            <div className="relative flex flex-col items-center">
              <div className="h-2 w-2 rounded-full bg-[var(--c-green)] mt-1 shrink-0" />
              {i < sorted.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-[var(--c-border)]" />
              )}
            </div>
            <div className="pb-1 min-h-[28px]">
              <p className="text-sm text-[var(--c-text)]">{ev.label}</p>
              <p className="text-xs text-[var(--c-text3)]">{formatDateTime(ev.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Section ───────────────────────────────────────────────────────────

function PaymentSection({
  po,
}: {
  po: ReturnType<typeof useInventory>["purchaseOrders"][number];
}) {
  const paymentLabels: Record<string, string> = {
    unpaid: "Не оплачен",
    partial: "Частично оплачен",
    paid: "Оплачен",
  };
  const paymentColors: Record<string, string> = {
    unpaid: "text-[var(--c-red)]",
    partial: "text-[var(--c-amber)]",
    paid: "text-[var(--c-green)]",
  };

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--c-text)]">Оплата</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--c-text2)]">Сумма заказа</span>
          <span className="text-sm font-semibold text-[var(--c-text)] tabular">
            {po.totalAmount.toLocaleString("ru-RU")} {po.currency}
          </span>
        </div>
        {po.paymentStatus && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--c-text2)]">Статус оплаты</span>
            <span
              className={cn(
                "text-sm font-medium",
                paymentColors[po.paymentStatus] ?? "text-[var(--c-text)]",
              )}
            >
              {paymentLabels[po.paymentStatus] ?? po.paymentStatus}
            </span>
          </div>
        )}
        {po.trackingNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--c-text2)]">Трек-номер</span>
            <span className="text-sm text-[var(--c-text)] tabular font-mono">
              {po.trackingNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { purchaseOrders, locations, actions } = useInventory();

  const po = purchaseOrders.find((p) => p.id === id);

  if (!po) {
    return (
      <InventoryShell title="Заказ не найден">
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Package size={48} className="text-[var(--c-text3)]" />
          <p className="text-lg font-semibold text-[var(--c-text)]">ПЗ не найден</p>
          <p className="text-sm text-[var(--c-text2)]">
            Заказ с ID &quot;{id}&quot; не существует.
          </p>
          <Link
            href="/inventory/purchase-orders"
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <ArrowLeft size={14} />
            Все заказы
          </Link>
        </div>
      </InventoryShell>
    );
  }

  const overdue =
    po.expectedArrival ? isOverdue(po.expectedArrival, po.status) : false;
  const location = locations.find((l) => l.id === po.locationId);

  const handleStatusAdvance = (newStatus: PurchaseOrderStatus) => {
    actions.updatePOStatus(po.id, newStatus);
    toast.success(`Статус изменён: ${PO_STATUS_LABELS[newStatus]}`);
  };

  const handleReceive = (qtys: Record<string, number>) => {
    actions.receivePOItems(po.id, qtys, po.locationId);
  };

  const handleSaveNote = (note: string) => {
    // updatePOStatus doesn't support note patch; we use the closest available
    // action. Since there's no updatePurchaseOrder, we update status preserving it
    // via a no-op status update won't help — but the context has UPDATE_PRODUCT pattern.
    // The actual note field isn't updatable via current actions.
    // We dispatch a toast only — the note update would require a new action.
    // For now this is a UI-only operation.
    void note;
    toast.info("Примечание обновлено (в режиме демо изменения не сохраняются)");
  };

  return (
    <InventoryShell
      title={`${po.id.toUpperCase()} — ${po.supplierName}`}
      subtitle={`Создан ${formatDate(po.createdAt)} · ${location?.name ?? po.locationId}`}
      actions={
        <Link
          href="/inventory/purchase-orders"
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
        >
          <ArrowLeft size={14} />
          Назад
        </Link>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Overdue banner */}
        {overdue && po.expectedArrival && (
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] px-5 py-4">
            <AlertTriangle size={18} className="text-[var(--c-red)] shrink-0" />
            <p className="text-sm font-medium text-[var(--c-red)]">
              ⚠️ Просрочен на {daysOverdue(po.expectedArrival)} дней — ожидался{" "}
              {formatDate(po.expectedArrival)}
            </p>
          </div>
        )}

        {/* Section 1: Header cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard label="Номер заказа" value={po.id.toUpperCase()} />
          <InfoCard label="Поставщик" value={po.supplierName} />
          <InfoCard label="Создан" value={formatDate(po.createdAt)} />
          <InfoCard
            label="Ожид. поставка"
            value={po.expectedArrival ? formatDate(po.expectedArrival) : "—"}
            highlight={overdue}
          />
        </div>

        {/* Section 2: Status stepper */}
        <StatusStepper status={po.status} onAdvance={handleStatusAdvance} />

        {/* Section 3: Line items */}
        <LineItemsTable po={po} onReceive={handleReceive} />

        {/* Section 4: Payment */}
        <PaymentSection po={po} />

        {/* Section 5: Notes */}
        <NotesSection note={po.note} onSave={handleSaveNote} />

        {/* Section 6: Activity */}
        <ActivityTimeline po={po} />
      </div>
    </InventoryShell>
  );
}
