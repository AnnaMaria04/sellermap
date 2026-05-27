"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowRight,
  Check,
  X,
  Truck,
  Package,
  MapPin,
  Trash2,
  ChevronRight,
  Download,
  FileText,
  Calendar,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import {
  type Transfer,
  type TransferStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { TransferStatusBadge } from "./StockStatusBadge";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { cn } from "@/lib/utils";
import { exportData, type ExportFormat } from "@/lib/export";

// ── Status timeline config ───────────────────────────────────────────────────

const TIMELINE_STEPS: { key: TransferStatus | "_"; label: string }[] = [
  { key: "draft",      label: "Черновик" },
  { key: "in_transit", label: "В пути"   },
  { key: "received",   label: "Получен"  },
];

const STATUS_STEP_INDEX: Record<TransferStatus, number> = {
  draft:      0,
  in_transit: 1,
  received:   2,
  partial:    1, // partial sits between in_transit and received
};

function TransferTimeline({ status }: { status: TransferStatus }) {
  const currentStep = STATUS_STEP_INDEX[status];
  const isPartial = status === "partial";

  return (
    <div className="flex items-center gap-1.5">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < currentStep || (i === currentStep && status === "received");
        const isCurrent = i === currentStep && status !== "received";
        const isPartialStep = isPartial && i === 1;

        return (
          <div key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  isDone || (isPartial && i <= 1)
                    ? "bg-[var(--c-green)]"
                    : isCurrent
                      ? "bg-[var(--c-amber)]"
                      : "bg-[var(--c-border2)]",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full border-2 transition-colors",
                  isDone
                    ? "border-[var(--c-green)] bg-[var(--c-green)]"
                    : isPartialStep
                      ? "border-[var(--c-blue)] bg-[var(--c-blue)]"
                      : isCurrent
                        ? "border-[var(--c-amber)] bg-[var(--c-amber)]"
                        : "border-[var(--c-border2)] bg-transparent",
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Summary stats ────────────────────────────────────────────────────────────

function SummaryStats({ transfers }: { transfers: Transfer[] }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const inTransitCount = transfers.filter((t) => t.status === "in_transit").length;
  const draftCount     = transfers.filter((t) => t.status === "draft").length;
  const receivedThisMonth = transfers.filter(
    (t) =>
      (t.status === "received" || t.status === "partial") &&
      t.receivedAt &&
      t.receivedAt >= monthStart,
  ).length;

  const stats = [
    {
      label: "Активных перемещений",
      value: inTransitCount,
      icon: <Truck size={16} />,
      color: "text-[var(--c-amber)]",
      iconBg: "bg-[var(--c-amber-dim)]",
      iconColor: "text-[var(--c-amber)]",
    },
    {
      label: "В черновиках",
      value: draftCount,
      icon: <FileText size={16} />,
      color: "text-[var(--c-text)]",
      iconBg: "bg-[var(--c-bg3)]",
      iconColor: "text-[var(--c-text2)]",
    },
    {
      label: "Получено за месяц",
      value: receivedThisMonth,
      icon: <CheckCheck size={16} />,
      color: "text-[var(--c-green)]",
      iconBg: "bg-[var(--c-green-dim)]",
      iconColor: "text-[var(--c-green)]",
    },
    {
      label: "Всего",
      value: transfers.length,
      icon: <Package size={16} />,
      color: "text-[var(--c-text)]",
      iconBg: "bg-[var(--c-bg3)]",
      iconColor: "text-[var(--c-text2)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"
        >
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", stat.iconBg, stat.iconColor)}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--c-text2)] leading-tight mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums leading-none", stat.color)}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Export dropdown ──────────────────────────────────────────────────────────

function ExportButton({ transfers }: { transfers: Transfer[] }) {
  const { locations } = useInventory();
  const [open, setOpen] = useState(false);

  function doExport(format: ExportFormat) {
    setOpen(false);
    exportData({
      filename: `перемещения-${new Date().toISOString().slice(0, 10)}`,
      title: "Перемещения склада",
      subtitle: `Сформировано: ${new Date().toLocaleDateString("ru-RU")} · Записей: ${transfers.length}`,
      format,
      columns: [
        { key: "id",          label: "ID",                  format: (r) => r.id.toUpperCase() },
        { key: "from",        label: "Откуда",              format: (r) => locations.find(l => l.id === r.fromLocationId)?.name ?? r.fromLocationId },
        { key: "to",          label: "Куда",                format: (r) => locations.find(l => l.id === r.toLocationId)?.name ?? r.toLocationId },
        { key: "status",      label: "Статус",              format: (r) => STATUS_LABEL[r.status] ?? r.status },
        { key: "items",       label: "Товаров (позиций)",   format: (r) => r.items.length },
        { key: "qty",         label: "Кол-во (шт)",         format: (r) => r.items.reduce((s, i) => s + i.qty, 0), align: "right" },
        { key: "receivedQty", label: "Принято (шт)",        format: (r) => r.items.reduce((s, i) => s + i.receivedQty, 0), align: "right" },
        { key: "createdAt",   label: "Создано",             format: (r) => formatDate(r.createdAt) },
        { key: "expected",    label: "Ожид. дата",          format: (r) => r.expectedArrival ? formatDate(r.expectedArrival) : "—" },
        { key: "receivedAt",  label: "Принято",             format: (r) => r.receivedAt ? formatDate(r.receivedAt) : "—" },
        { key: "note",        label: "Примечание",          format: (r) => r.note ?? "" },
      ],
      rows: transfers,
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg2)] transition"
      >
        <Download size={14} />
        Экспорт
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 min-w-[160px] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
            {(["csv", "excel", "pdf"] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => doExport(fmt)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] first:rounded-t-xl last:rounded-b-xl transition"
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  onCreateTransfer?: () => void;
}

export function TransfersPanel({ onCreateTransfer: _onCreateTransfer }: Props) {
  const { transfers, locations, actions } = useInventory();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "draft" | "done">("all");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const matchesTab = (t: Transfer) =>
    tab === "all" ||
    (tab === "active" && t.status === "in_transit") ||
    (tab === "draft" && t.status === "draft") ||
    (tab === "done" && (t.status === "received" || t.status === "partial"));

  const tabCounts = useMemo(() => ({
    all: transfers.length,
    active: transfers.filter((t) => t.status === "in_transit").length,
    draft: transfers.filter((t) => t.status === "draft").length,
    done: transfers.filter((t) => t.status === "received" || t.status === "partial").length,
  }), [transfers]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("open") === "create") {
      setShowForm(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const filtered = useMemo(() => {
    let list = [...transfers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.items.some((i) => i.productName.toLowerCase().includes(q)) ||
          (locations.find(l => l.id === t.fromLocationId)?.name ?? t.fromLocationId).toLowerCase().includes(q) ||
          (locations.find(l => l.id === t.toLocationId)?.name ?? t.toLocationId).toLowerCase().includes(q),
      );
    }
    list = list.filter(matchesTab);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transfers, search, tab, locations]);

  // Keep selected transfer in sync when transfers change (e.g. after receive)
  const currentSelected = useMemo(
    () => (selectedTransfer ? (transfers.find((t) => t.id === selectedTransfer.id) ?? null) : null),
    [selectedTransfer, transfers],
  );

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <SummaryStats transfers={transfers} />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
        {([
          ["all", "Все"],
          ["active", "В пути"],
          ["draft", "Черновики"],
          ["done", "Завершённые"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === id ? "bg-[var(--c-bg3)] text-[var(--c-text)]" : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {label}
            {tabCounts[id] > 0 && <span className="text-[var(--c-text3)]">{tabCounts[id]}</span>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по локации, товару..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ExportButton transfers={filtered} />
          <button
            onClick={() => setShowForm(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={15} />
            Создать перемещение
          </button>
        </div>
      </div>

      {/* Transfers list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            icon={<Truck size={24} />}
            title="Нет перемещений"
            description="Перемещения не найдены. Измените фильтры или создайте новое перемещение между локациями."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                <Plus size={15} />
                Создать перемещение
              </button>
            }
          />
        )}
        {filtered.map((transfer) => (
          <TransferCard
            key={transfer.id}
            transfer={transfer}
            onClick={() => setSelectedTransfer(transfer)}
          />
        ))}
      </div>

      {/* Transfer detail panel */}
      {currentSelected && (
        <TransferDetailPanel
          transfer={currentSelected}
          onClose={() => setSelectedTransfer(null)}
          onReceive={(id, partialQtys) => { actions.receiveTransfer(id, partialQtys); setSelectedTransfer(null); }}
        />
      )}

      {/* Create transfer form */}
      {showForm && (
        <CreateTransferForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ── Transfer card ─────────────────────────────────────────────────────────────

function TransferCard({ transfer, onClick }: { transfer: Transfer; onClick: () => void }) {
  const { locations } = useInventory();
  const fromName = locations.find(l => l.id === transfer.fromLocationId)?.name ?? transfer.fromLocationId;
  const toName   = locations.find(l => l.id === transfer.toLocationId)?.name ?? transfer.toLocationId;
  const totalQty    = transfer.items.reduce((s, i) => s + i.qty, 0);
  const receivedQty = transfer.items.reduce((s, i) => s + i.receivedQty, 0);

  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-5 py-4 cursor-pointer hover:bg-[var(--c-bg3)] transition sm:flex-row sm:items-center sm:gap-4"
    >
      {/* Route + items */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin size={13} className="text-[var(--c-text3)]" />
            <span className="text-sm font-medium text-[var(--c-text)]">{fromName}</span>
          </div>
          <ArrowRight size={14} className="shrink-0 text-[var(--c-text3)]" />
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin size={13} className="text-[var(--c-green)]" />
            <span className="text-sm font-medium text-[var(--c-text)]">{toName}</span>
          </div>
          <span className="ml-auto text-xs text-[var(--c-text3)] tabular-nums sm:hidden">{formatDate(transfer.createdAt)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {transfer.items.slice(0, 3).map((item, i) => (
            <span
              key={i}
              className="rounded-full bg-[var(--c-bg3)] border border-[var(--c-border)] px-2 py-0.5 text-xs text-[var(--c-text2)]"
            >
              {item.productName} × {item.qty}
            </span>
          ))}
          {transfer.items.length > 3 && (
            <span className="text-xs text-[var(--c-text3)] self-center">+{transfer.items.length - 3}</span>
          )}
        </div>
      </div>

      {/* Timeline + meta */}
      <div className="flex items-center gap-4 shrink-0">
        <TransferTimeline status={transfer.status} />

        <div className="hidden text-right sm:block">
          <p className="text-xs text-[var(--c-text3)]">{formatDate(transfer.createdAt)}</p>
          <p className="text-xs text-[var(--c-text2)] mt-0.5 tabular-nums">{totalQty} ед.</p>
        </div>

        {transfer.status === "partial" && (
          <div className="w-16">
            <div className="h-1.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--c-blue)]"
                style={{ width: `${totalQty > 0 ? (receivedQty / totalQty) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-[var(--c-text3)] mt-0.5 text-right tabular-nums">{receivedQty}/{totalQty}</p>
          </div>
        )}

        <TransferStatusBadge status={transfer.status} />
        <ChevronRight size={16} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition" />
      </div>
    </div>
  );
}

// ── Transfer detail panel ────────────────────────────────────────────────────

interface DetailProps {
  transfer: Transfer;
  onClose: () => void;
  onReceive: (id: string, partialQtys?: Record<string, number>) => void;
}

function TransferDetailPanel({ transfer, onClose, onReceive }: DetailProps) {
  const { locations } = useInventory();
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});

  const fromName = locations.find(l => l.id === transfer.fromLocationId)?.name ?? transfer.fromLocationId;
  const toName   = locations.find(l => l.id === transfer.toLocationId)?.name ?? transfer.toLocationId;

  const totalQty    = transfer.items.reduce((s, i) => s + i.qty, 0);
  const receivedQty = transfer.items.reduce((s, i) => s + i.receivedQty, 0);

  function fillAll() {
    const filled: Record<string, string> = {};
    for (const item of transfer.items) {
      filled[item.productId] = String(item.qty - item.receivedQty);
    }
    setReceiveQtys(filled);
  }

  function confirmReceive() {
    const parsed: Record<string, number> = {};
    for (const [pid, qty] of Object.entries(receiveQtys)) {
      const n = parseInt(qty, 10);
      if (!isNaN(n) && n > 0) parsed[pid] = n;
    }
    onReceive(transfer.id, Object.keys(parsed).length > 0 ? parsed : undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">{transfer.id.toUpperCase()}</h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-[var(--c-text3)]">{fromName}</span>
              <ArrowRight size={12} className="text-[var(--c-text3)]" />
              <span className="text-xs text-[var(--c-green)]">{toName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Status + timeline */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <TransferStatusBadge status={transfer.status} />
              <span className="text-xs text-[var(--c-text3)]">Создано: {formatDate(transfer.createdAt)}</span>
            </div>

            {/* Full labeled timeline */}
            <div className="flex items-start gap-0">
              {TIMELINE_STEPS.map((step, i) => {
                const currentStep = STATUS_STEP_INDEX[transfer.status];
                const isDone = i < currentStep || (i === currentStep && transfer.status === "received");
                const isCurrent = i === currentStep && transfer.status !== "received";
                const isPartialStep = transfer.status === "partial" && i === 1;

                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {i > 0 && (
                        <div className={cn(
                          "h-0.5 flex-1",
                          isDone || (transfer.status === "partial" && i <= 1)
                            ? "bg-[var(--c-green)]"
                            : isCurrent
                              ? "bg-[var(--c-amber)]"
                              : "bg-[var(--c-border2)]",
                        )} />
                      )}
                      <div className={cn(
                        "h-3 w-3 shrink-0 rounded-full border-2 transition-colors",
                        isDone
                          ? "border-[var(--c-green)] bg-[var(--c-green)]"
                          : isPartialStep
                            ? "border-[var(--c-blue)] bg-[var(--c-blue)]"
                            : isCurrent
                              ? "border-[var(--c-amber)] bg-[var(--c-amber)]"
                              : "border-[var(--c-border2)] bg-transparent",
                      )} />
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={cn(
                          "h-0.5 flex-1",
                          isDone
                            ? "bg-[var(--c-green)]"
                            : "bg-[var(--c-border2)]",
                        )} />
                      )}
                    </div>
                    <span className={cn(
                      "mt-1.5 text-center text-xs",
                      isDone
                        ? "text-[var(--c-green)] font-medium"
                        : isPartialStep
                          ? "text-[var(--c-blue)] font-medium"
                          : isCurrent
                            ? "text-[var(--c-amber)] font-medium"
                            : "text-[var(--c-text3)]",
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          {(transfer.expectedArrival || transfer.receivedAt) && (
            <div className="grid grid-cols-2 gap-2">
              {transfer.expectedArrival && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] px-3 py-2.5">
                  <Calendar size={14} className="text-[var(--c-amber)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--c-text2)]">Ожидаемая дата</p>
                    <p className="text-xs font-medium text-[var(--c-text)]">{formatDate(transfer.expectedArrival)}</p>
                  </div>
                </div>
              )}
              {transfer.receivedAt && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--c-green-dim)] border border-[rgba(31,209,131,0.2)] px-3 py-2.5">
                  <Check size={14} className="text-[var(--c-green)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--c-text2)]">Принято</p>
                    <p className="text-xs font-medium text-[var(--c-text)]">{formatDate(transfer.receivedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">
                Товары · {transfer.items.length} поз. / {totalQty} шт
              </h3>
              {receiving && (
                <button
                  onClick={fillAll}
                  className="text-xs font-medium text-[var(--c-green)] hover:underline"
                >
                  Принять всё
                </button>
              )}
            </div>
            <div className="space-y-2">
              {transfer.items.map((item, i) => {
                const remaining = item.qty - item.receivedQty;
                return (
                  <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--c-text)] leading-tight">{item.productName}</p>
                        <p className="mt-0.5 text-xs text-[var(--c-text3)]">{item.sku}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[var(--c-text)] tabular-nums">{item.qty} шт</p>
                        {item.receivedQty > 0 && (
                          <p className="mt-0.5 text-xs text-[var(--c-green)] tabular-nums">
                            принято {item.receivedQty}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Partial progress bar */}
                    {item.receivedQty > 0 && item.receivedQty < item.qty && (
                      <div className="mt-2.5 h-1.5 rounded-full bg-[var(--c-bg2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--c-blue)]"
                          style={{ width: `${(item.receivedQty / item.qty) * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Receive input */}
                    {receiving && remaining > 0 && (
                      <div className="mt-3 flex items-center gap-2 border-t border-[var(--c-border)] pt-3">
                        <label className="text-xs text-[var(--c-text2)]">Принять:</label>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={receiveQtys[item.productId] ?? ""}
                          onChange={(e) =>
                            setReceiveQtys((prev) => ({ ...prev, [item.productId]: e.target.value }))
                          }
                          className="w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular-nums"
                        />
                        <span className="text-xs text-[var(--c-text3)]">из {remaining} шт</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note */}
          {transfer.note && (
            <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
              <p className="text-xs font-medium text-[var(--c-text2)] mb-1">Примечание</p>
              <p className="text-sm text-[var(--c-text)]">{transfer.note}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          {!receiving && transfer.status === "in_transit" && (
            <button
              onClick={() => setReceiving(true)}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Package size={16} />
              Принять товар
            </button>
          )}

          {receiving && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--c-text2)] text-center">
                Укажите количество принятых единиц для каждой позиции
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setReceiving(false); setReceiveQtys({}); }}
                  className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmReceive}
                  className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
                >
                  <Check size={14} />
                  Подтвердить получение
                </button>
              </div>
            </div>
          )}

          {(transfer.status === "received" || (transfer.status !== "in_transit" && !receiving)) && (
            <button
              onClick={onClose}
              className="flex w-full h-10 items-center justify-center rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Закрыть
            </button>
          )}
          <Link
            href={`/inventory/transfers/${transfer.id}`}
            className="flex w-full h-9 items-center justify-center gap-1.5 rounded-lg text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)] transition"
          >
            <ExternalLink size={13} />
            Открыть полную страницу →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Create transfer form ──────────────────────────────────────────────────────

function CreateTransferForm({ onClose }: { onClose: () => void }) {
  const { products, locations, actions } = useInventory();

  const [fromId, setFromId] = useState(locations.find((l) => l.isDefault)?.id ?? "");
  const [toId, setToId] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<
    { productId: string; productName: string; sku: string; qty: number; maxQty: number }[]
  >([]);
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Products available at fromId location
  const availableProducts = useMemo(() => {
    const q = searchQ.toLowerCase();
    return products
      .filter((p) => {
        if (p.status !== "active") return false;
        if (lines.find((l) => l.productId === p.id)) return false;
        const stock = fromId ? (p.stockByLocation[fromId] ?? 0) : 0;
        if (stock <= 0) return false;
        if (q) return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        return true;
      })
      .slice(0, 10);
  }, [products, searchQ, fromId, lines]);

  function stockAtFrom(productId: string): number {
    const p = products.find((x) => x.id === productId);
    return fromId ? (p?.stockByLocation[fromId] ?? 0) : 0;
  }

  function addLine(p: (typeof products)[0]) {
    const maxQty = stockAtFrom(p.id);
    setLines((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, sku: p.sku, qty: 1, maxQty },
    ]);
    setShowSearch(false);
    setSearchQ("");
  }

  function updateQty(index: number, raw: string) {
    const parsed = parseInt(raw, 10);
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const qty = isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, l.maxQty));
        return { ...l, qty };
      }),
    );
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!fromId) errs.push("Выберите откуда");
    if (!toId) errs.push("Выберите куда");
    if (fromId && toId && fromId === toId) errs.push("Локации «Откуда» и «Куда» должны различаться");
    if (lines.length === 0) errs.push("Добавьте хотя бы один товар");
    for (const l of lines) {
      if (l.qty <= 0) errs.push(`Количество для «${l.productName}» должно быть больше 0`);
      if (l.qty > l.maxQty) errs.push(`Недостаточно товара «${l.productName}» (доступно: ${l.maxQty})`);
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    actions.createTransfer({
      fromLocationId: fromId,
      toLocationId: toId,
      status: "in_transit",
      items: lines.map((l) => ({ productId: l.productId, productName: l.productName, sku: l.sku, qty: l.qty, receivedQty: 0 })),
      expectedArrival: expectedArrival || undefined,
      note: note.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  const isValid = fromId && toId && fromId !== toId && lines.length > 0;

  // When fromId changes, cap existing lines to new available stock
  function handleFromChange(newFromId: string) {
    setFromId(newFromId);
    setLines((prev) =>
      prev
        .map((l) => {
          const p = products.find((x) => x.id === l.productId);
          const maxQty = p ? (p.stockByLocation[newFromId] ?? 0) : 0;
          return { ...l, maxQty, qty: Math.min(l.qty, maxQty) };
        })
        .filter((l) => l.maxQty > 0),
    );
  }

  const fromLocations = locations.filter((l) => !["damaged", "in_transit"].includes(l.type));
  const toLocations   = locations.filter((l) => l.id !== fromId);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Новое перемещение</h2>
            <p className="text-xs text-[var(--c-text3)] mt-0.5">Перемещение товаров между локациями</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] p-4">
              <p className="mb-2 text-xs font-semibold text-[var(--c-red)]">Исправьте ошибки:</p>
              <ul className="space-y-1">
                {errors.map((e, i) => (
                  <li key={i} className="text-xs text-[var(--c-red)]">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Route */}
          <div>
            <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
              Маршрут
            </h3>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Откуда</label>
                <select
                  value={fromId}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  {fromLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="pb-1.5">
                <ArrowRight size={18} className="text-[var(--c-text3)]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Куда</label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  <option value="">Выберите...</option>
                  {toLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expected date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
              Ожидаемая дата прибытия
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none" />
              <input
                type="date"
                value={expectedArrival}
                onChange={(e) => setExpectedArrival(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
              Товары {lines.length > 0 && <span className="text-[var(--c-text3)] font-normal">({lines.length} поз.)</span>}
            </h3>

            {/* Product search dropdown */}
            <div className="relative mb-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                disabled={!fromId}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition",
                  fromId
                    ? "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:border-[var(--c-green)] hover:text-[var(--c-text)]"
                    : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
                )}
              >
                <Plus size={14} />
                {fromId ? "Добавить товар" : "Сначала выберите локацию «Откуда»"}
              </button>
              {showSearch && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                  <div className="border-b border-[var(--c-border)] p-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                      <input
                        autoFocus
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Поиск по названию или SKU..."
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-8 pr-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    {availableProducts.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-[var(--c-text3)]">
                        {searchQ ? "Товары не найдены" : "Нет доступных товаров в выбранной локации"}
                      </p>
                    ) : (
                      availableProducts.map((p) => {
                        const stock = p.stockByLocation[fromId] ?? 0;
                        return (
                          <button
                            key={p.id}
                            onClick={() => addLine(p)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--c-bg3)] transition"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--c-text)] truncate">{p.name}</p>
                              <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-xs text-[var(--c-text2)] tabular-nums">
                              {stock} шт
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lines */}
            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--c-border)] p-6 text-center">
                <Package size={20} className="mx-auto mb-2 text-[var(--c-text3)]" />
                <p className="text-xs text-[var(--c-text3)]">Добавьте товары для перемещения</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)] truncate">{line.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{line.sku} · макс. {line.maxQty} шт</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={line.maxQty}
                        value={line.qty}
                        onChange={(e) => updateQty(i, e.target.value)}
                        className={cn(
                          "w-20 rounded-lg border px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:outline-none tabular-nums",
                          line.qty > line.maxQty
                            ? "border-[var(--c-red)] bg-[var(--c-red-dim)] focus:border-[var(--c-red)]"
                            : "border-[var(--c-border2)] bg-[var(--c-bg2)] focus:border-[var(--c-green)]",
                        )}
                      />
                      <span className="text-xs text-[var(--c-text3)]">шт</span>
                    </div>
                    <button
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-[var(--c-text3)] hover:text-[var(--c-red)] transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Totals */}
                <div className="flex justify-end pt-1 pr-1">
                  <span className="text-xs text-[var(--c-text2)] tabular-nums">
                    Итого: {lines.reduce((s, l) => s + l.qty, 0)} шт · {lines.length} поз.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Необязательно..."
              className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saved}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              isValid && !saved
                ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]"
                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {saved ? (
              <>
                <Check size={14} />
                Создано
              </>
            ) : (
              <>
                <Truck size={14} />
                Создать перемещение
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TransferStatus, string> = {
  draft:      "Черновик",
  in_transit: "В пути",
  received:   "Принят",
  partial:    "Частично",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
