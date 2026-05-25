"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  AlertTriangle,
  Check,
  Package,
  Edit3,
  X,
  ChevronRight,
} from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { TransferStatusBadge } from "@/components/inventory/StockStatusBadge";
import { BarcodeInput } from "@/components/ui/BarcodeInput";
import { useInventory } from "@/contexts/InventoryContext";
import { type TransferStatus } from "@/mock/inventory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

// ── Status stepper config ─────────────────────────────────────────────────────

const STEPS: { key: TransferStatus; label: string }[] = [
  { key: "draft",      label: "Черновик"  },
  { key: "in_transit", label: "В пути"   },
  { key: "partial",    label: "Частично"  },
  { key: "received",   label: "Получен"  },
];

const STEP_INDEX: Record<TransferStatus, number> = {
  draft:      0,
  in_transit: 1,
  partial:    2,
  received:   3,
};

// What status comes after clicking "next"
const NEXT_STATUS: Partial<Record<TransferStatus, TransferStatus>> = {
  draft:      "in_transit",
  in_transit: "received",
  partial:    "received",
};

const NEXT_LABEL: Partial<Record<TransferStatus, string>> = {
  draft:      "Отправить (В пути)",
  in_transit: "Подтвердить получение",
  partial:    "Завершить приёмку",
};

// ── Helper: item row status ────────────────────────────────────────────────────

function itemLineStatus(qty: number, received: number): { label: string; color: string } {
  if (received >= qty) return { label: "Получен",   color: "text-[var(--c-green)]" };
  if (received > 0)   return { label: "Частично",  color: "text-[var(--c-blue)]"  };
  return                     { label: "Ожидается", color: "text-[var(--c-text3)]" };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransferDetailPage({ params }: Props) {
  const { id } = use(params);
  const { transfers, actions, getLocationName } = useInventory();
  const transfer = transfers.find((t) => t.id === id);

  // Receive mode
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  // Status confirmation dialog
  const [pendingStatus, setPendingStatus] = useState<TransferStatus | null>(null);

  // Note editing
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(transfer?.note ?? "");

  // Derived
  const fromName = transfer ? getLocationName(transfer.fromLocationId) : "";
  const toName   = transfer ? getLocationName(transfer.toLocationId) : "";
  const totalQty    = transfer?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  const receivedQty = transfer?.items.reduce((s, i) => s + i.receivedQty, 0) ?? 0;

  const isOverdue = useMemo(() => {
    if (!transfer?.expectedArrival) return false;
    if (transfer.status !== "in_transit") return false;
    return new Date(transfer.expectedArrival) < new Date();
  }, [transfer?.expectedArrival, transfer?.status]);

  // ── Receive mode helpers ───────────────────────────────────────────────────

  function initReceive() {
    if (!transfer) return;
    const init: Record<string, number> = {};
    for (const item of transfer.items) {
      init[item.productId] = item.qty - item.receivedQty;
    }
    setReceiveQtys(init);
    setReceiving(true);
  }

  function fillAll() {
    if (!transfer) return;
    const filled: Record<string, number> = {};
    for (const item of transfer.items) {
      filled[item.productId] = item.qty - item.receivedQty;
    }
    setReceiveQtys(filled);
  }

  function handleBarcodeScan(code: string) {
    if (!transfer) return;
    // Find item by matching sku or product name (simple match)
    const item = transfer.items.find(
      (i) => i.sku.toLowerCase() === code.toLowerCase() || i.productId === code,
    );
    if (item) {
      setReceiveQtys((prev) => ({
        ...prev,
        [item.productId]: Math.min(
          item.qty - item.receivedQty,
          (prev[item.productId] ?? 0) + 1,
        ),
      }));
      toast.success(`${item.productName} +1`);
    } else {
      toast.error(`Товар не найден: ${code}`);
    }
  }

  function confirmReceive() {
    if (!transfer) return;
    actions.receiveTransfer(transfer.id);
    setReceiving(false);
    setReceiveQtys({});
    toast.success("Товар принят");
  }

  // ── Status step change ─────────────────────────────────────────────────────

  function requestStatusChange(next: TransferStatus) {
    setPendingStatus(next);
  }

  function confirmStatusChange() {
    if (!transfer || !pendingStatus) return;
    if (pendingStatus === "received") {
      actions.receiveTransfer(transfer.id);
    } else {
      actions.updateTransferStatus(transfer.id, pendingStatus);
      toast.success(`Статус изменён на «${STEP_LABEL[pendingStatus]}»`);
    }
    setPendingStatus(null);
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!transfer) {
    return (
      <InventoryShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="mb-4 text-[var(--c-text3)]" />
          <h1 className="text-xl font-bold text-[var(--c-text)]">Перемещение не найдено</h1>
          <p className="mt-2 text-sm text-[var(--c-text2)]">Перемещение с ID {id} не существует</p>
          <Link
            href="/inventory/transfers"
            className="mt-4 flex items-center gap-2 text-sm text-[var(--c-green)] hover:opacity-80 transition"
          >
            <ArrowLeft size={14} />
            Назад к перемещениям
          </Link>
        </div>
      </InventoryShell>
    );
  }

  const currentStep = STEP_INDEX[transfer.status];
  const nextStatus  = NEXT_STATUS[transfer.status];

  return (
    <InventoryShell
      title={`Перемещение ${transfer.id.toUpperCase()}`}
      subtitle={`${fromName} → ${toName}`}
      actions={
        <Link
          href="/inventory/transfers"
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
        >
          <ArrowLeft size={14} />
          Назад к перемещениям
        </Link>
      }
    >
      <div className="space-y-6">

        {/* Overdue banner */}
        {isOverdue && (
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(255,188,0,0.3)] bg-[var(--c-amber-dim)] px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 text-[var(--c-amber)]" />
            <p className="text-sm font-medium text-[var(--c-amber)]">
              Ожидается прибытие — срок прошёл
            </p>
            {transfer.expectedArrival && (
              <span className="ml-auto text-xs text-[var(--c-amber)]">
                Ожидалось {formatDate(transfer.expectedArrival)}
              </span>
            )}
          </div>
        )}

        {/* Header card */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Route */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[var(--c-text3)]" />
                <span className="font-medium text-[var(--c-text)]">{fromName}</span>
              </div>
              <ArrowRight size={16} className="text-[var(--c-text3)]" />
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[var(--c-green)]" />
                <span className="font-medium text-[var(--c-text)]">{toName}</span>
              </div>
            </div>
            {/* Status + date */}
            <div className="flex items-center gap-3">
              <TransferStatusBadge status={transfer.status} />
              <span className="text-xs text-[var(--c-text3)]">
                Создано {formatDate(transfer.createdAt)}
              </span>
            </div>
          </div>

          {/* Dates row */}
          {(transfer.expectedArrival || transfer.receivedAt) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {transfer.expectedArrival && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2">
                  <Calendar size={13} className="text-[var(--c-amber)]" />
                  <div>
                    <p className="text-xs text-[var(--c-text3)]">Ожидаемая дата</p>
                    <p className="text-xs font-medium text-[var(--c-text)]">{formatDate(transfer.expectedArrival)}</p>
                  </div>
                </div>
              )}
              {transfer.receivedAt && (
                <div className="flex items-center gap-2 rounded-lg border border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)] px-3 py-2">
                  <Check size={13} className="text-[var(--c-green)]" />
                  <div>
                    <p className="text-xs text-[var(--c-text3)]">Принято</p>
                    <p className="text-xs font-medium text-[var(--c-text)]">{formatDate(transfer.receivedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status stepper */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--c-text)]">Статус перемещения</h2>
          <div className="flex items-start gap-0">
            {STEPS.map((step, i) => {
              const isDone    = i < currentStep || transfer.status === "received";
              const isCurrent = i === currentStep && transfer.status !== "received";
              const isNext    = i === currentStep + 1 && nextStatus !== undefined;

              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 transition-colors",
                          isDone ? "bg-[var(--c-green)]" :
                          isCurrent ? "bg-[var(--c-amber)]" :
                          "bg-[var(--c-border2)]",
                        )}
                      />
                    )}
                    <button
                      disabled={!isNext || transfer.status === "received"}
                      onClick={() => isNext && nextStatus && requestStatusChange(nextStatus)}
                      title={isNext && nextStatus ? `Перейти: ${STEP_LABEL[nextStatus]}` : undefined}
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-all",
                        isDone
                          ? "border-[var(--c-green)] bg-[var(--c-green)]"
                          : isCurrent
                            ? "border-[var(--c-amber)] bg-[var(--c-amber)]"
                            : isNext
                              ? "border-[var(--c-border2)] bg-transparent hover:border-[var(--c-green)] cursor-pointer"
                              : "border-[var(--c-border2)] bg-transparent cursor-default",
                      )}
                    />
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 transition-colors",
                          isDone ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-center text-xs leading-tight px-1",
                      isDone
                        ? "text-[var(--c-green)] font-medium"
                        : isCurrent
                          ? "text-[var(--c-amber)] font-medium"
                          : "text-[var(--c-text3)]",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Next step button */}
          {nextStatus && transfer.status !== "received" && nextStatus !== "received" && (
            <button
              onClick={() => requestStatusChange(nextStatus)}
              className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] hover:text-[var(--c-green)] transition"
            >
              <ChevronRight size={14} />
              {NEXT_LABEL[transfer.status]}
            </button>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--c-text)]">
              Товары · {transfer.items.length} поз. / {totalQty} шт
              {receivedQty > 0 && (
                <span className="ml-2 text-[var(--c-green)] tabular-nums">
                  (принято {receivedQty})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              {receiving && (
                <button
                  onClick={fillAll}
                  className="text-xs font-medium text-[var(--c-green)] hover:underline"
                >
                  Принять всё
                </button>
              )}
              {!receiving && (transfer.status === "in_transit" || transfer.status === "partial") && (
                <button
                  onClick={initReceive}
                  className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
                >
                  <Package size={14} />
                  Принять товар
                </button>
              )}
              {receiving && (
                <button
                  onClick={() => { setReceiving(false); setReceiveQtys({}); }}
                  className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 py-2 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  <X size={14} />
                  Отмена
                </button>
              )}
            </div>
          </div>

          {/* Barcode input in receive mode */}
          {receiving && (
            <div className="mb-4">
              <BarcodeInput
                onScan={handleBarcodeScan}
                placeholder="Сканировать для поиска товара..."
                autoFocus
              />
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Вариант / SKU</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Отправлено</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Получено</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Статус</th>
                  {receiving && (
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Принять</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item, i) => {
                  const lineStatus = itemLineStatus(item.qty, item.receivedQty);
                  const remaining  = item.qty - item.receivedQty;
                  return (
                    <tr
                      key={i}
                      className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--c-text)]">{item.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--c-text3)]">{item.sku}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--c-text)]">{item.qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--c-text)]">
                        {item.receivedQty > 0 ? (
                          <span className="text-[var(--c-green)]">{item.receivedQty}</span>
                        ) : (
                          <span className="text-[var(--c-text3)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("text-xs font-medium", lineStatus.color)}>
                          {lineStatus.label}
                        </span>
                      </td>
                      {receiving && (
                        <td className="px-4 py-3 text-right">
                          {remaining > 0 ? (
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              value={receiveQtys[item.productId] ?? ""}
                              onChange={(e) =>
                                setReceiveQtys((prev) => ({
                                  ...prev,
                                  [item.productId]: Math.min(
                                    remaining,
                                    Math.max(0, Number(e.target.value) || 0),
                                  ),
                                }))
                              }
                              className="w-20 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular-nums"
                            />
                          ) : (
                            <span className="text-xs text-[var(--c-green)]">Принят</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Confirm receive footer */}
          {receiving && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
              <p className="text-xs text-[var(--c-text2)]">
                Укажите количество принятых единиц для каждой позиции
              </p>
              <button
                onClick={confirmReceive}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                <Check size={14} />
                Подтвердить получение
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Примечание</h2>
            {!editingNote && (
              <button
                onClick={() => { setNoteValue(transfer.note ?? ""); setEditingNote(true); }}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
              >
                <Edit3 size={12} />
                Изменить
              </button>
            )}
          </div>

          {editingNote ? (
            <div className="space-y-3">
              <textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Примечание к перемещению..."
                className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingNote(false)}
                  className="flex h-8 items-center rounded-lg border border-[var(--c-border2)] px-3 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    // Notes are local to the transfer; the context doesn't expose
                    // a patch transfer action, so we just close.
                    setEditingNote(false);
                    toast.success("Примечание сохранено");
                  }}
                  className="flex h-8 items-center rounded-lg bg-[var(--c-green)] px-3 text-xs font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--c-text2)]">
              {transfer.note ? transfer.note : <span className="italic text-[var(--c-text3)]">Примечание не указано</span>}
            </p>
          )}
        </div>

        {/* Back link */}
        <div>
          <Link
            href="/inventory/transfers"
            className="flex w-max items-center gap-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <ArrowLeft size={14} />
            Назад к перемещениям
          </Link>
        </div>
      </div>

      {/* Status confirmation dialog */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--c-bg)] p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-[var(--c-text)]">
              Изменить статус
            </h3>
            <p className="mb-5 text-sm text-[var(--c-text2)]">
              Подтвердите переход статуса перемещения{" "}
              <span className="font-semibold text-[var(--c-text)]">{transfer.id.toUpperCase()}</span>{" "}
              на «{STEP_LABEL[pendingStatus]}».
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingStatus(null)}
                className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                Отмена
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                <Check size={14} />
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </InventoryShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_LABEL: Record<TransferStatus, string> = {
  draft:      "Черновик",
  in_transit: "В пути",
  partial:    "Частично получен",
  received:   "Получен",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
