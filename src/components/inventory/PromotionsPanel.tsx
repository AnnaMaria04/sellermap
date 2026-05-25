"use client";

import { useState, useMemo } from "react";
import {
  PROMOTIONS,
  PROMOTION_TYPE_LABELS,
  type Promotion,
  type PromotionType,
  type PromotionStatus,
  type PromotionChannel,
} from "@/mock/inventory";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  Check,
  Tag,
  Zap,
  TrendingUp,
  X,
} from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PromotionStatus, { bg: string; color: string; stripe: string; label: string }> = {
  active: {
    bg: "bg-[var(--c-green-dim)]",
    color: "text-[var(--c-green)]",
    stripe: "bg-[var(--c-green)]",
    label: "Активна",
  },
  scheduled: {
    bg: "bg-[var(--c-blue-dim)]",
    color: "text-[var(--c-blue)]",
    stripe: "bg-[var(--c-blue)]",
    label: "Запланирована",
  },
  expired: {
    bg: "bg-[var(--c-bg3)]",
    color: "text-[var(--c-text3)]",
    stripe: "bg-[var(--c-border2)]",
    label: "Завершена",
  },
  draft: {
    bg: "bg-[var(--c-amber-dim)]",
    color: "text-[var(--c-amber)]",
    stripe: "bg-[var(--c-amber)]",
    label: "Черновик",
  },
  paused: {
    bg: "bg-[var(--c-red-dim)]",
    color: "text-[var(--c-red)]",
    stripe: "bg-[var(--c-red)]",
    label: "Приостановлена",
  },
};

// ── Channel labels ─────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<PromotionChannel, string> = {
  all: "Все каналы",
  wildberries: "WB",
  ozon: "Ozon",
  yandex_market: "Яндекс Маркет",
  website: "Сайт",
  pos: "POS",
};

const ALL_CHANNELS: PromotionChannel[] = ["all", "wildberries", "ozon", "yandex_market", "website", "pos"];
const ALL_TYPES: PromotionType[] = ["percentage", "fixed", "bogo", "bundle_price", "free_shipping"];
const ALL_STATUSES: PromotionStatus[] = ["draft", "active", "scheduled", "expired", "paused"];

// ── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "scheduled" | "expired" | "draft";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "scheduled", label: "Запланированные" },
  { id: "expired", label: "Завершённые" },
  { id: "draft", label: "Черновики" },
];

// ── Helper: format date range ──────────────────────────────────────────────

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function formatDiscountLabel(promo: Promotion): string {
  if (promo.type === "bogo") return "2 по цене 1";
  if (promo.type === "free_shipping") return "Бесплатная доставка";
  if (promo.type === "bundle_price") return `Комплект −${promo.discountValue}%`;
  if (promo.type === "percentage") return `−${promo.discountValue}%`;
  return `−${promo.discountValue.toLocaleString("ru-RU")} ₽`;
}

// ── Empty form template ────────────────────────────────────────────────────

function emptyPromotion(): Omit<Promotion, "id" | "createdAt" | "usageCount"> {
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split("T")[0];
  return {
    name: "",
    description: "",
    type: "percentage",
    status: "draft",
    channels: ["all"],
    discountValue: 10,
    productIds: [],
    usageLimit: undefined,
    promoCode: "",
    categoryFilter: "",
    minOrderAmount: undefined,
    startsAt: today,
    endsAt: nextMonth,
  };
}

// ── Promo code copy chip ───────────────────────────────────────────────────

function PromoCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 py-0.5 font-mono text-xs text-[var(--c-text)] transition hover:bg-[var(--c-border)]"
      title="Скопировать промокод"
    >
      {copied ? <Check size={11} className="text-[var(--c-green)]" /> : <Copy size={11} />}
      {code}
    </button>
  );
}

// ── Promotion form (shared by create modal and edit drawer) ────────────────

interface PromoFormProps {
  value: Partial<Promotion>;
  onChange: (updated: Partial<Promotion>) => void;
}

function PromoForm({ value, onChange }: PromoFormProps) {
  function set<K extends keyof Promotion>(key: K, v: Promotion[K]) {
    onChange({ ...value, [key]: v });
  }

  function toggleChannel(ch: PromotionChannel) {
    const current = value.channels ?? [];
    if (ch === "all") {
      set("channels", ["all"]);
      return;
    }
    const without = current.filter((c) => c !== "all" && c !== ch);
    const hasIt = current.includes(ch);
    const next = hasIt ? without : [...without, ch];
    set("channels", next.length === 0 ? ["all"] : next);
  }

  const showDiscount = value.type !== "free_shipping" && value.type !== "bogo";
  const discountLabel =
    value.type === "percentage" || value.type === "bundle_price"
      ? "Размер скидки (%)"
      : "Сумма скидки (₽)";

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Название акции *</label>
        <input
          className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
          placeholder="Майская распродажа"
          value={value.name ?? ""}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Описание</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none transition"
          placeholder="Краткое описание для персонала"
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Type + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Тип акции</label>
          <select
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition"
            value={value.type ?? "percentage"}
            onChange={(e) => set("type", e.target.value as PromotionType)}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROMOTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Статус</label>
          <select
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition"
            value={value.status ?? "draft"}
            onChange={(e) => set("status", e.target.value as PromotionStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Discount value */}
      {showDiscount && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">{discountLabel}</label>
          <input
            type="number"
            min={0}
            max={value.type === "percentage" || value.type === "bundle_price" ? 100 : undefined}
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition"
            value={value.discountValue ?? 0}
            onChange={(e) => set("discountValue", Number(e.target.value))}
          />
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Начало</label>
          <input
            type="date"
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition"
            value={value.startsAt ?? ""}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Конец</label>
          <input
            type="date"
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition"
            value={value.endsAt ?? ""}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </div>
      </div>

      {/* Min order + usage limit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Мин. сумма заказа (₽)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
            placeholder="Без ограничений"
            value={value.minOrderAmount ?? ""}
            onChange={(e) =>
              set("minOrderAmount", e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Лимит использований</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
            placeholder="Без ограничений"
            value={value.usageLimit ?? ""}
            onChange={(e) =>
              set("usageLimit", e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        </div>
      </div>

      {/* Promo code */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Промокод (необязательно)</label>
        <input
          className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] placeholder:font-sans focus:border-[var(--c-green)] focus:outline-none uppercase transition"
          placeholder="SALE10"
          value={value.promoCode ?? ""}
          onChange={(e) => set("promoCode", e.target.value.toUpperCase())}
        />
      </div>

      {/* Category filter */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Фильтр по категории</label>
        <input
          className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
          placeholder="Одежда, Электроника..."
          value={value.categoryFilter ?? ""}
          onChange={(e) => set("categoryFilter", e.target.value)}
        />
      </div>

      {/* Channels */}
      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--c-text2)]">Каналы продаж</label>
        <div className="flex flex-wrap gap-2">
          {ALL_CHANNELS.map((ch) => {
            const active = (value.channels ?? []).includes(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  active
                    ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                    : "border-[var(--c-border2)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:border-[var(--c-border)] hover:text-[var(--c-text)]",
                )}
              >
                {CHANNEL_LABELS[ch]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Promotion card ─────────────────────────────────────────────────────────

interface CardProps {
  promo: Promotion;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}

function PromotionCard({ promo, onEdit, onTogglePause, onDelete }: CardProps) {
  const cfg = STATUS_CONFIG[promo.status];
  const discountLabel = formatDiscountLabel(promo);

  const scopeLabel = promo.categoryFilter
    ? `Категория: ${promo.categoryFilter}`
    : promo.productIds.length > 0
    ? `${promo.productIds.length} товар${promo.productIds.length === 1 ? "" : promo.productIds.length < 5 ? "а" : "ов"}`
    : "Все товары";

  const usagePct =
    promo.usageLimit && promo.usageLimit > 0
      ? Math.min(100, Math.round((promo.usageCount / promo.usageLimit) * 100))
      : null;

  const canPause = promo.status === "active" || promo.status === "scheduled";
  const isPaused = promo.status === "paused";

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] transition hover:border-[var(--c-border2)] hover:shadow-sm">
      {/* Left status stripe */}
      <div className={cn("w-1 shrink-0", cfg.stripe)} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Top row: title + status badge + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[var(--c-text)] truncate">{promo.name}</h3>
              {promo.promoCode && <PromoCodeChip code={promo.promoCode} />}
            </div>
            {promo.description && (
              <p className="mt-0.5 text-xs text-[var(--c-text3)] line-clamp-1">{promo.description}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Status badge */}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                cfg.bg,
                cfg.color,
              )}
            >
              {cfg.label}
            </span>

            {/* Edit */}
            <button
              onClick={onEdit}
              title="Редактировать"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
            >
              <Pencil size={13} />
            </button>

            {/* Pause / Resume */}
            {(canPause || isPaused) && (
              <button
                onClick={onTogglePause}
                title={isPaused ? "Возобновить" : "Приостановить"}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
              >
                {isPaused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
              </button>
            )}

            {/* Delete */}
            <button
              onClick={onDelete}
              title="Удалить"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-red-dim)] hover:text-[var(--c-red)] transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Middle row: type badge + channels + scope */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Discount badge */}
          <span className="flex items-center gap-1 rounded-full bg-[var(--c-bg3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--c-text2)]">
            <Tag size={10} />
            {discountLabel}
          </span>

          {/* Channels */}
          {promo.channels.map((ch) => (
            <span
              key={ch}
              className="rounded-full border border-[var(--c-border)] px-2 py-0.5 text-[11px] text-[var(--c-text3)]"
            >
              {CHANNEL_LABELS[ch]}
            </span>
          ))}

          {/* Scope */}
          <span className="text-xs text-[var(--c-text3)]">{scopeLabel}</span>
        </div>

        {/* Bottom row: dates + usage */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--c-text3)]">
            {formatDate(promo.startsAt)} — {formatDate(promo.endsAt)}
          </span>

          {promo.usageLimit != null ? (
            <div className="flex flex-col gap-1 sm:w-40">
              <div className="flex justify-between text-[11px] text-[var(--c-text3)]">
                <span>{promo.usageCount.toLocaleString("ru-RU")} / {promo.usageLimit.toLocaleString("ru-RU")} исп.</span>
                <span>{usagePct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    (usagePct ?? 0) >= 90 ? "bg-[var(--c-red)]" : "bg-[var(--c-green)]",
                  )}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-[var(--c-text3)]">
              {promo.usageCount > 0
                ? `${promo.usageCount.toLocaleString("ru-RU")} использований`
                : "Ещё не использовалась"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drawer / Modal wrapper ─────────────────────────────────────────────────

interface DrawerProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  saveLabel?: string;
}

function Drawer({ title, onClose, onSave, children, saveLabel = "Сохранить" }: DrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--c-border)] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-[var(--c-green)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  dimColor,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  dimColor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", dimColor)}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
        <p className="text-lg font-bold text-[var(--c-text)]">{value}</p>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function PromotionsPanel() {
  const [promotions, setPromotions] = useState<Promotion[]>(PROMOTIONS);
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Drawer state
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Promotion>>({});

  // Create modal state
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Partial<Promotion>>(emptyPromotion());

  // ── Stats ──────────────────────────────────────────────────────────────

  const activePromos = useMemo(() => promotions.filter((p) => p.status === "active"), [promotions]);

  const totalUsageToday = useMemo(
    () => activePromos.reduce((sum, p) => sum + p.usageCount, 0),
    [activePromos],
  );

  const estimatedDiscount = useMemo(() => {
    return activePromos.reduce((sum, p) => {
      if (p.type === "percentage") return sum + p.discountValue * 100; // rough estimate
      if (p.type === "fixed") return sum + p.discountValue * p.usageCount;
      return sum;
    }, 0);
  }, [activePromos]);

  // ── Filters ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = promotions;

    if (tab === "active") list = list.filter((p) => p.status === "active" || p.status === "paused");
    else if (tab === "scheduled") list = list.filter((p) => p.status === "scheduled");
    else if (tab === "expired") list = list.filter((p) => p.status === "expired");
    else if (tab === "draft") list = list.filter((p) => p.status === "draft");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.promoCode ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [promotions, tab, search]);

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleEdit(promo: Promotion) {
    setEditingPromo(promo);
    setEditDraft({ ...promo });
  }

  function handleSaveEdit() {
    if (!editingPromo) return;
    setPromotions((prev) =>
      prev.map((p) => (p.id === editingPromo.id ? ({ ...p, ...editDraft } as Promotion) : p)),
    );
    setEditingPromo(null);
    setEditDraft({});
  }

  function handleTogglePause(promo: Promotion) {
    setPromotions((prev) =>
      prev.map((p) => {
        if (p.id !== promo.id) return p;
        const next: PromotionStatus =
          p.status === "paused" ? "active" : "paused";
        return { ...p, status: next };
      }),
    );
  }

  function handleDelete(id: string) {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  function handleOpenCreate() {
    setCreateDraft(emptyPromotion());
    setCreating(true);
  }

  function handleSaveCreate() {
    if (!createDraft.name?.trim()) return;
    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      name: createDraft.name,
      description: createDraft.description,
      type: createDraft.type ?? "percentage",
      status: createDraft.status ?? "draft",
      channels: createDraft.channels ?? ["all"],
      discountValue: createDraft.discountValue ?? 0,
      minOrderAmount: createDraft.minOrderAmount,
      productIds: createDraft.productIds ?? [],
      categoryFilter: createDraft.categoryFilter || undefined,
      usageLimit: createDraft.usageLimit,
      usageCount: 0,
      promoCode: createDraft.promoCode || undefined,
      startsAt: createDraft.startsAt ?? "",
      endsAt: createDraft.endsAt ?? "",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPromotions((prev) => [newPromo, ...prev]);
    setCreating(false);
    setCreateDraft(emptyPromotion());
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Активных акций"
          value={String(activePromos.length)}
          icon={Zap}
          color="text-[var(--c-green)]"
          dimColor="bg-[var(--c-green-dim)]"
        />
        <StatCard
          label="Всего использований"
          value={totalUsageToday.toLocaleString("ru-RU")}
          icon={TrendingUp}
          color="text-[var(--c-blue)]"
          dimColor="bg-[var(--c-blue-dim)]"
        />
        <StatCard
          label="Скидок выдано (оценка)"
          value={`${estimatedDiscount.toLocaleString("ru-RU")} ₽`}
          icon={Tag}
          color="text-[var(--c-amber)]"
          dimColor="bg-[var(--c-amber-dim)]"
        />
      </div>

      {/* Toolbar: filter tabs + search + create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
          {FILTER_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
                tab === id
                  ? "bg-[var(--c-green)] text-white"
                  : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
            />
            <input
              className="w-52 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] py-2 pl-8 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
              placeholder="Поиск по акциям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Создать акцию</span>
            <span className="sm:hidden">Создать</span>
          </button>
        </div>
      </div>

      {/* Promo list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-bg2)] py-16 text-center">
          <Tag size={32} className="mb-3 text-[var(--c-text3)]" />
          <p className="text-sm font-medium text-[var(--c-text2)]">Акции не найдены</p>
          <p className="mt-1 text-xs text-[var(--c-text3)]">
            {search
              ? "Попробуйте изменить условия поиска"
              : "Создайте первую акцию, нажав «Создать акцию»"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onEdit={() => handleEdit(promo)}
              onTogglePause={() => handleTogglePause(promo)}
              onDelete={() => handleDelete(promo.id)}
            />
          ))}
        </div>
      )}

      {/* Edit drawer */}
      {editingPromo && (
        <Drawer
          title="Редактировать акцию"
          onClose={() => { setEditingPromo(null); setEditDraft({}); }}
          onSave={handleSaveEdit}
        >
          <PromoForm value={editDraft} onChange={setEditDraft} />
        </Drawer>
      )}

      {/* Create drawer */}
      {creating && (
        <Drawer
          title="Новая акция"
          onClose={() => { setCreating(false); setCreateDraft(emptyPromotion()); }}
          onSave={handleSaveCreate}
          saveLabel="Создать акцию"
        >
          <PromoForm value={createDraft} onChange={setCreateDraft} />
        </Drawer>
      )}
    </div>
  );
}
