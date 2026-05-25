"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  Package,
  PackageX,
  Clock,
  ShoppingCart,
  Calendar,
  FileCheck,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  ChevronDown,
  Filter,
  X,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeAlerts } from "@/lib/inventory/alerts";
import { useDismissedAlerts } from "@/hooks/useDismissedAlerts";
import { useInventory } from "@/contexts/InventoryContext";

type NotifType =
  | "low_stock"
  | "out_of_stock"
  | "po_arrived"
  | "po_delayed"
  | "reorder_triggered"
  | "expiry_warning"
  | "system"
  | "write_off_approval";

type NotifPriority = "critical" | "high" | "medium" | "low";

interface Notification {
  id: string;
  type: NotifType;
  priority: NotifPriority;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  productId?: string;
}

type TabId = "all" | "unread" | "critical" | "settings";
type DeliveryMethod = "in_app" | "email" | "telegram";
type Frequency = "instant" | "hourly" | "daily";

interface NotifRule {
  enabled: boolean;
  delivery: DeliveryMethod[];
  frequency: Frequency;
}

const TYPE_LABELS: Record<NotifType, string> = {
  low_stock: "Низкий остаток",
  out_of_stock: "Нет в наличии",
  po_arrived: "Поставка прибыла",
  po_delayed: "Задержка поставки",
  reorder_triggered: "Автозаказ",
  expiry_warning: "Срок годности",
  system: "Системное",
  write_off_approval: "Согласование списания",
};

const PRIORITY_COLORS: Record<NotifPriority, string> = {
  critical: "var(--c-red)",
  high: "var(--c-amber)",
  medium: "var(--c-blue)",
  low: "var(--c-text3)",
};

const DEFAULT_RULES: Record<NotifType, NotifRule> = {
  low_stock:          { enabled: true,  delivery: ["in_app", "telegram"], frequency: "instant" },
  out_of_stock:       { enabled: true,  delivery: ["in_app", "email", "telegram"], frequency: "instant" },
  po_arrived:         { enabled: true,  delivery: ["in_app"], frequency: "instant" },
  po_delayed:         { enabled: true,  delivery: ["in_app", "email"], frequency: "instant" },
  reorder_triggered:  { enabled: true,  delivery: ["in_app"], frequency: "hourly" },
  expiry_warning:     { enabled: true,  delivery: ["in_app", "email"], frequency: "daily" },
  system:             { enabled: false, delivery: ["in_app"], frequency: "daily" },
  write_off_approval: { enabled: true,  delivery: ["in_app", "email"], frequency: "instant" },
};

function TypeIcon({ type, size = 14 }: { type: NotifType; size?: number }) {
  switch (type) {
    case "low_stock":          return <AlertTriangle size={size} />;
    case "out_of_stock":       return <PackageX size={size} />;
    case "po_arrived":         return <Package size={size} />;
    case "po_delayed":         return <Clock size={size} />;
    case "reorder_triggered":  return <ShoppingCart size={size} />;
    case "expiry_warning":     return <Calendar size={size} />;
    case "system":             return <Bell size={size} />;
    case "write_off_approval": return <FileCheck size={size} />;
  }
}

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export function NotificationsCenter() {
  const { products, batches } = useInventory();
  const { dismissed, dismiss, dismissAll } = useDismissedAlerts();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [rules, setRules] = useState<Record<NotifType, NotifRule>>(DEFAULT_RULES);
  const [filterPriority, setFilterPriority] = useState<NotifPriority | "all">("all");
  const [filterType, setFilterType] = useState<NotifType | "all">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const notifications: Notification[] = useMemo(
    () =>
      computeAlerts(products, batches).map((a) => ({
        id: a.id,
        type: a.type as NotifType,
        priority: a.priority as NotifPriority,
        title: a.title,
        body: a.body,
        isRead: dismissed.has(a.id),
        createdAt: a.createdAt,
        productId: a.productId,
      })),
    [products, batches, dismissed],
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter((n) => n.priority === "critical" && !n.isRead).length;

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "unread" && n.isRead) return false;
      if (activeTab === "critical" && n.priority !== "critical") return false;
      if (filterPriority !== "all" && n.priority !== filterPriority) return false;
      if (filterType !== "all" && n.type !== filterType) return false;
      return true;
    });
  }, [notifications, activeTab, filterPriority, filterType]);

  function markRead(id: string) {
    dismiss(id);
  }

  function markAllRead() {
    dismissAll(notifications.map((n) => n.id));
  }

  function clearRead() {
    dismissAll(notifications.map((n) => n.id));
  }

  function updateRule(type: NotifType, update: Partial<NotifRule>) {
    setRules((prev) => ({ ...prev, [type]: { ...prev[type], ...update } }));
  }

  function toggleDelivery(type: NotifType, method: DeliveryMethod) {
    const current = rules[type].delivery;
    const next = current.includes(method) ? current.filter((m) => m !== method) : [...current, method];
    updateRule(type, { delivery: next });
  }

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: "all", label: "Все" },
    { id: "unread", label: "Непрочитанные", badge: unreadCount },
    { id: "critical", label: "Критичные", badge: criticalCount },
    { id: "settings", label: "Настройки" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(240,80,80,0.12)] border border-[rgba(240,80,80,0.2)]">
            <Bell size={18} className="text-[var(--c-red)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Уведомления</h2>
            <p className="text-xs text-[var(--c-text3)]">{unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все уведомления прочитаны"}</p>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--c-red)] px-2.5 py-0.5 text-xs font-bold text-white tabular">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition disabled:opacity-40"
          >
            <CheckCheck size={13} />
            Отметить все прочитанными
          </button>
          <button
            onClick={clearRead}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-text2)] hover:text-[var(--c-red)] transition"
          >
            <Trash2 size={13} />
            Очистить прочитанные
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--c-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px",
              activeTab === tab.id
                ? "border-[var(--c-green)] text-[var(--c-text)]"
                : "border-transparent text-[var(--c-text3)] hover:text-[var(--c-text2)]"
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular",
                tab.id === "critical" ? "bg-[var(--c-red)] text-white" : "bg-[var(--c-bg3)] text-[var(--c-text2)]"
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab !== "settings" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={13} className="text-[var(--c-text3)]" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as NotifPriority | "all")}
              className="h-8 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-xs text-[var(--c-text)] focus:outline-none"
            >
              <option value="all">Все приоритеты</option>
              <option value="critical">Критичный</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as NotifType | "all")}
              className="h-8 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-xs text-[var(--c-text)] focus:outline-none"
            >
              <option value="all">Все типы</option>
              {(Object.keys(TYPE_LABELS) as NotifType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            {(filterPriority !== "all" || filterType !== "all") && (
              <button
                onClick={() => { setFilterPriority("all"); setFilterType("all"); }}
                className="flex items-center gap-1 text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)] transition"
              >
                <X size={11} />
                Сбросить
              </button>
            )}
            <span className="ml-auto text-xs text-[var(--c-text3)]">{visibleNotifications.length} уведомлений</span>
          </div>

          <div className="space-y-2">
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--c-bg2)] border border-[var(--c-border)] mb-4">
                  <CheckCheck size={28} className="text-[var(--c-green)]" />
                </div>
                <p className="text-base font-semibold text-[var(--c-text)]">Все уведомления прочитаны</p>
                <p className="text-sm text-[var(--c-text3)] mt-1">Новые уведомления появятся здесь</p>
              </div>
            ) : (
              visibleNotifications.map((notif) => (
                <NotifCard
                  key={notif.id}
                  notif={notif}
                  hovered={hoveredId === notif.id}
                  onHover={() => setHoveredId(notif.id)}
                  onLeave={() => setHoveredId(null)}
                  onMarkRead={() => markRead(notif.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "settings" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--c-text2)]">
            Настройте, какие уведомления получать и по каким каналам
          </p>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
            <div className="border-b border-[var(--c-border)] px-5 py-3 grid gap-4" style={{ gridTemplateColumns: "1fr 60px 140px 180px" }}>
              <span className="text-xs font-medium text-[var(--c-text2)]">Тип уведомления</span>
              <span className="text-xs font-medium text-[var(--c-text2)] text-center">Вкл.</span>
              <span className="text-xs font-medium text-[var(--c-text2)]">Канал доставки</span>
              <span className="text-xs font-medium text-[var(--c-text2)]">Частота</span>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {(Object.keys(TYPE_LABELS) as NotifType[]).map((type) => {
                const rule = rules[type];
                return (
                  <div
                    key={type}
                    className="grid items-center gap-4 px-5 py-4 hover:bg-[var(--c-bg3)] transition"
                    style={{ gridTemplateColumns: "1fr 60px 140px 180px" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] text-[var(--c-text2)]">
                        <TypeIcon type={type} size={15} />
                      </div>
                      <span className="text-sm text-[var(--c-text)]">{TYPE_LABELS[type]}</span>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => updateRule(type, { enabled: !rule.enabled })}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          rule.enabled ? "bg-[var(--c-green)]" : "bg-[var(--c-bg3)] border border-[var(--c-border2)]"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                            rule.enabled ? "translate-x-4" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {(
                        [
                          { method: "in_app" as DeliveryMethod, Icon: Smartphone, label: "Прил." },
                          { method: "email" as DeliveryMethod, Icon: Mail, label: "Email" },
                          { method: "telegram" as DeliveryMethod, Icon: MessageSquare, label: "TG" },
                        ]
                      ).map(({ method, Icon, label }) => (
                        <button
                          key={method}
                          onClick={() => toggleDelivery(type, method)}
                          disabled={!rule.enabled}
                          title={label}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg border transition",
                            rule.delivery.includes(method) && rule.enabled
                              ? "border-[var(--c-green)] bg-[rgba(31,209,131,0.12)] text-[var(--c-green)]"
                              : "border-[var(--c-border)] text-[var(--c-text3)]",
                            !rule.enabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <Icon size={12} />
                        </button>
                      ))}
                    </div>

                    <select
                      value={rule.frequency}
                      disabled={!rule.enabled}
                      onChange={(e) => updateRule(type, { frequency: e.target.value as Frequency })}
                      className={cn(
                        "h-8 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-green)] transition",
                        !rule.enabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <option value="instant">Мгновенно</option>
                      <option value="hourly">Каждый час</option>
                      <option value="daily">Ежедневный дайджест</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifCard({
  notif, hovered, onHover, onLeave, onMarkRead,
}: {
  notif: Notification;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onMarkRead: () => void;
}) {
  const dotColor = PRIORITY_COLORS[notif.priority];

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 rounded-xl border px-5 py-4 transition group",
        notif.isRead
          ? "border-[var(--c-border)] bg-[var(--c-bg2)]"
          : "border-[var(--c-border2)] bg-[var(--c-bg3)]"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {!notif.isRead && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      )}

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
        style={{
          borderColor: dotColor + "40",
          backgroundColor: dotColor + "18",
          color: dotColor,
        }}
      >
        <TypeIcon type={notif.type} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className={cn("text-sm font-semibold text-[var(--c-text)]", notif.isRead && "font-medium opacity-80")}>
            {notif.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={notif.priority} />
            <span className="text-[11px] text-[var(--c-text3)] tabular whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--c-text2)] leading-relaxed">{notif.body}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[10px] text-[var(--c-text3)]">{TYPE_LABELS[notif.type]}</span>
        </div>
      </div>

      {!notif.isRead && hovered && (
        <button
          onClick={onMarkRead}
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-1.5 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition shadow"
        >
          <Check size={11} />
          Прочитано
        </button>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: NotifPriority }) {
  const labels: Record<NotifPriority, string> = {
    critical: "Критичный",
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
  };
  const color = PRIORITY_COLORS[priority];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: color + "20", color }}
    >
      {labels[priority]}
    </span>
  );
}
