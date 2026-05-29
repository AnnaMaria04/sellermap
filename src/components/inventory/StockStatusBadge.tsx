"use client";

import { cn } from "@/lib/utils";
import type { StockStatus } from "@/mock/inventory";

interface Props {
  status: StockStatus;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

const CONFIG: Record<StockStatus, { label: string; dot: string; badge: string }> = {
  in_stock: {
    label: "В наличии",
    dot: "bg-[var(--c-green)]",
    badge: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]",
  },
  low_stock: {
    label: "Мало",
    dot: "bg-[var(--c-amber)]",
    badge: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]",
  },
  out_of_stock: {
    label: "Нет в наличии",
    dot: "bg-[var(--c-red)]",
    badge: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]",
  },
  overstock: {
    label: "Переполнен",
    dot: "bg-[var(--c-blue)]",
    badge: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]",
  },
};

export function StockStatusBadge({ status, count, size = "md", className }: Props) {
  const cfg = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        cfg.badge,
        className,
      )}
    >
      <span className={cn("rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", cfg.dot)} />
      {cfg.label}
      {count !== undefined && (
        <span className="opacity-70">{count}</span>
      )}
    </span>
  );
}

export function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:              { label: "Черновик",         cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
    sent:               { label: "Отправлен",        cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
    confirmed:          { label: "Подтверждён",      cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
    in_transit:         { label: "В пути",           cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]" },
    partially_received: { label: "Частично принят",  cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
    closed:             { label: "Закрыт",           cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
    issue:              { label: "Проблема",         cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

export function TransferStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:     { label: "Черновик", cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
    in_transit: { label: "В пути",  cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]" },
    received:  { label: "Принят",  cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
    partial:   { label: "Частично", cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

export function MovementTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    receipt:    { label: "Поступление",    cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
    sale:       { label: "Продажа",        cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
    reserve:    { label: "Резерв",         cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]" },
    return:     { label: "Возврат",        cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]" },
    write_off:  { label: "Списание",       cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]" },
    transfer:   { label: "Перемещение",    cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
    adjustment: { label: "Корректировка", cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
    stocktake:  { label: "Инвентаризация", cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
    labeling:   { label: "Маркировка",    cls: "bg-[var(--c-blue-dim)] text-[var(--c-blue)] border-[rgba(77,159,255,0.2)]" },
    cost_change:{ label: "Цена",          cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
  };
  const cfg = map[type] ?? { label: type, cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: "Активный",   cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
    draft:    { label: "Черновик",   cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" },
    archived: { label: "Архив",      cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-[var(--c-bg3)] text-[var(--c-text2)] border-[var(--c-border2)]" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
