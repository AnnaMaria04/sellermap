"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Clock,
  TrendingDown,
  CheckCircle,
  X,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeAlerts, type ComputedAlert, type AlertSeverity, type AlertCategory } from "@/lib/inventory/alerts";
import { useDismissedAlerts } from "@/hooks/useDismissedAlerts";
import { useInventory } from "@/contexts/InventoryContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "critical" | "warning" | "stock" | "expiry";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return `${Math.floor(diff / 86400)} дн. назад`;
}

function severityColor(severity: AlertSeverity): string {
  if (severity === "critical") return "var(--c-red)";
  if (severity === "warning") return "var(--c-amber)";
  return "var(--c-blue)";
}

function CategoryIcon({ category, size = 16 }: { category: AlertCategory; size?: number }) {
  switch (category) {
    case "stock":       return <AlertTriangle size={size} />;
    case "expiry":      return <Clock size={size} />;
    case "performance": return <TrendingDown size={size} />;
    case "system":      return <Bell size={size} />;
  }
}

// ── Filter tabs config ────────────────────────────────────────────────────────

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "Все" },
  { id: "critical", label: "Критические" },
  { id: "warning",  label: "Предупреждения" },
  { id: "stock",    label: "Сток" },
  { id: "expiry",   label: "Сроки" },
];

function matchesTab(alert: ComputedAlert, tab: FilterTab): boolean {
  if (tab === "all")      return true;
  if (tab === "critical") return alert.severity === "critical";
  if (tab === "warning")  return alert.severity === "warning";
  if (tab === "stock")    return alert.category === "stock";
  if (tab === "expiry")   return alert.category === "expiry";
  return true;
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: ComputedAlert;
  onDismiss: (id: string) => void;
}) {
  const color = severityColor(alert.severity);

  return (
    <div
      className="relative flex items-start gap-4 overflow-hidden rounded-xl border border-[var(--c-border2)] bg-[var(--c-bg2)] transition hover:bg-[var(--c-bg3)] group"
    >
      {/* Left colored stripe */}
      <div
        className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="flex flex-1 items-start gap-4 px-5 py-4 pl-5">
        {/* Icon */}
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: color + "40",
            backgroundColor: color + "18",
            color,
          }}
        >
          <CategoryIcon category={alert.category} size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-[var(--c-text)]">{alert.title}</p>
            <span className="shrink-0 text-[11px] text-[var(--c-text3)] tabular whitespace-nowrap">
              {timeAgo(alert.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--c-text2)] leading-relaxed">{alert.description}</p>
          {alert.actionLabel && alert.actionHref && (
            <div className="mt-2">
              <Link
                href={alert.actionHref}
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition"
                style={{
                  backgroundColor: color + "18",
                  color,
                }}
              >
                {alert.actionLabel}
              </Link>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(alert.id)}
          title="Скрыть"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--c-text3)] opacity-0 transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] group-hover:opacity-100"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationsCenter() {
  const { products, batches } = useInventory();
  const { dismissed, dismiss, dismissAll } = useDismissedAlerts();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const allAlerts = useMemo(
    () => computeAlerts(products, batches).filter((a) => !dismissed.has(a.id)),
    [products, batches, dismissed],
  );

  const visibleAlerts = useMemo(
    () => allAlerts.filter((a) => matchesTab(a, activeTab)),
    [allAlerts, activeTab],
  );

  const criticalCount = useMemo(
    () => allAlerts.filter((a) => a.severity === "critical").length,
    [allAlerts],
  );
  const warningCount = useMemo(
    () => allAlerts.filter((a) => a.severity === "warning").length,
    [allAlerts],
  );

  function handleDismissAll() {
    dismissAll(allAlerts.map((a) => a.id));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(240,80,80,0.12)] border border-[rgba(240,80,80,0.2)]">
            <Bell size={18} className="text-[var(--c-red)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Уведомления</h2>
            <p className="text-xs text-[var(--c-text3)]">
              {allAlerts.length > 0
                ? `${allAlerts.length} активных уведомлений`
                : "Нет активных уведомлений"}
            </p>
          </div>
          {allAlerts.length > 0 && (
            <span className="rounded-full bg-[var(--c-red)] px-2.5 py-0.5 text-xs font-bold text-white tabular">
              {allAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={handleDismissAll}
          disabled={allAlerts.length === 0}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-text2)] hover:text-[var(--c-red)] transition disabled:opacity-40"
        >
          <CheckCheck size={13} />
          Очистить все
        </button>
      </div>

      {/* Summary row */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 text-sm">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-[var(--c-red)]">
              <AlertTriangle size={14} />
              {criticalCount} критических
            </span>
          )}
          {criticalCount > 0 && warningCount > 0 && (
            <span className="text-[var(--c-text3)]">·</span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-[var(--c-amber)]">
              <AlertTriangle size={14} />
              {warningCount} предупреждений
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--c-border)]">
        {TABS.map((tab) => {
          const count =
            tab.id === "all"
              ? allAlerts.length
              : allAlerts.filter((a) => matchesTab(a, tab.id)).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px",
                activeTab === tab.id
                  ? "border-[var(--c-green)] text-[var(--c-text)]"
                  : "border-transparent text-[var(--c-text3)] hover:text-[var(--c-text2)]",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular",
                    tab.id === "critical"
                      ? "bg-[var(--c-red)] text-white"
                      : "bg-[var(--c-bg3)] text-[var(--c-text2)]",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--c-bg2)] border border-[var(--c-border)] mb-4">
              <CheckCircle size={28} className="text-[var(--c-green)]" />
            </div>
            <p className="text-base font-semibold text-[var(--c-text)]">Всё в порядке</p>
            <p className="text-sm text-[var(--c-text3)] mt-1">Нет активных уведомлений</p>
          </div>
        ) : (
          visibleAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />
          ))
        )}
      </div>
    </div>
  );
}
