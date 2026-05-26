"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";
import type { Customer, CustomerTier } from "@/mock/inventory";
import {
  Search,
  UserPlus,
  X,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Star,
  ShoppingBag,
  TrendingUp,
  Award,
  Save,
  Plus,
} from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<CustomerTier, { bg: string; color: string; label: string }> = {
  vip: { bg: "bg-[var(--c-amber-dim)]", color: "text-[var(--c-amber)]", label: "VIP" },
  wholesale: { bg: "bg-[var(--c-blue-dim)]", color: "text-[var(--c-blue)]", label: "Оптовый" },
  regular: { bg: "bg-[var(--c-green-dim)]", color: "text-[var(--c-green)]", label: "Постоянный" },
  new: { bg: "bg-[var(--c-bg3)]", color: "text-[var(--c-text3)]", label: "Новый" },
};

type TierFilter = "all" | CustomerTier;

const TIER_TABS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Оптовые" },
  { value: "regular", label: "Постоянные" },
  { value: "new", label: "Новые" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtNum = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Tier Badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: CustomerTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cfg.bg,
        cfg.color,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Add Customer Modal ────────────────────────────────────────────────────────

interface AddCustomerModalProps {
  onClose: () => void;
}

function AddCustomerModal({ onClose }: AddCustomerModalProps) {
  const { actions } = useInventory();
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    email: string;
    city: string;
    tier: CustomerTier;
  }>({
    name: "",
    phone: "",
    email: "",
    city: "",
    tier: "new",
  });
  const [error, setError] = useState("");

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name") setError("");
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Имя клиента обязательно");
      return;
    }
    actions.createCustomer({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      tier: form.tier,
      loyaltyPoints: 0,
      totalOrders: 0,
      totalSpent: 0,
      tags: [],
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Новый клиент</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Имя / Название <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Иван Петров"
              className={cn(
                "w-full rounded-lg border bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)]",
                "focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]",
                error ? "border-[var(--c-red)]" : "border-[var(--c-border)]",
              )}
            />
            {error && <p className="mt-1 text-xs text-[var(--c-red)]">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Телефон</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.ru"
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Город</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Москва"
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Категория</label>
              <select
                value={form.tier}
                onChange={(e) => handleChange("tier", e.target.value)}
                className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              >
                {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--c-border)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={14} />
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Detail Drawer ────────────────────────────────────────────────────

interface DetailDrawerProps {
  customer: Customer;
  onClose: () => void;
}

function DetailDrawer({ customer, onClose }: DetailDrawerProps) {
  const { actions } = useInventory();
  const [tier, setTier] = useState<CustomerTier>(customer.tier);
  const [note, setNote] = useState(customer.note ?? "");
  const [pointsInput, setPointsInput] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    actions.updateCustomer(customer.id, { tier, note: note.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleAddPoints() {
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts <= 0) return;
    actions.addLoyaltyPoints(customer.id, pts);
    setPointsInput("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-green-dim)] text-sm font-bold text-[var(--c-green)]">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--c-text)]">{customer.name}</p>
              <TierBadge tier={customer.tier} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact info */}
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">Контакты</p>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <Phone size={14} className="shrink-0 text-[var(--c-text3)]" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <Mail size={14} className="shrink-0 text-[var(--c-text3)]" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                <MapPin size={14} className="shrink-0 text-[var(--c-text3)]" />
                <span>{customer.city}</span>
              </div>
            )}
            {!customer.phone && !customer.email && !customer.city && (
              <p className="text-sm text-[var(--c-text3)]">Контактные данные не указаны</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--c-text3)] mb-1">
                <ShoppingBag size={13} />
                <span className="text-[11px]">Заказов</span>
              </div>
              <p className="text-lg font-bold text-[var(--c-text)]">{fmtNum(customer.totalOrders)}</p>
            </div>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--c-text3)] mb-1">
                <TrendingUp size={13} />
                <span className="text-[11px]">Выручка</span>
              </div>
              <p className="text-sm font-bold text-[var(--c-text)]">{fmtMoney(customer.totalSpent)}</p>
            </div>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--c-text3)] mb-1">
                <Award size={13} />
                <span className="text-[11px]">Баллы</span>
              </div>
              <p className="text-lg font-bold text-[var(--c-amber)]">{fmtNum(customer.loyaltyPoints)}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">История</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--c-text2)]">Первый заказ</span>
              <span className="text-[var(--c-text)]">{fmtDate(customer.firstOrderAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--c-text2)]">Последний заказ</span>
              <span className="text-[var(--c-text)]">{fmtDate(customer.lastOrderAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--c-text2)]">Клиент с</span>
              <span className="text-[var(--c-text)]">{fmtDate(customer.createdAt)}</span>
            </div>
          </div>

          {/* Tags */}
          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--c-bg3)] px-2.5 py-0.5 text-xs text-[var(--c-text2)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tier selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Категория клиента</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as CustomerTier)}
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
            >
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loyalty points */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Начислить баллы лояльности</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder="Количество баллов"
                className="flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              />
              <button
                onClick={handleAddPoints}
                disabled={!pointsInput || parseInt(pointsInput, 10) <= 0}
                className="rounded-lg bg-[var(--c-amber-dim)] px-3 py-2 text-sm font-medium text-[var(--c-amber)] hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Заметка</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Добавьте заметку о клиенте..."
              className="w-full resize-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--c-border)] p-4">
          <button
            onClick={handleSave}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
              saved
                ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                : "bg-[var(--c-green)] text-white hover:opacity-90",
            )}
          >
            <Save size={14} />
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function CustomersPanel() {
  const router = useRouter();
  const { customers } = useInventory();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesTier = tierFilter === "all" || c.tier === tierFilter;
      if (!matchesTier) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, tierFilter]);

  // Aggregate stats
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const vipCount = customers.filter((c) => c.tier === "vip").length;

  return (
    <>
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 text-[var(--c-text3)] mb-2">
              <Star size={15} />
              <span className="text-xs font-medium">Всего клиентов</span>
            </div>
            <p className="text-2xl font-bold text-[var(--c-text)]">{fmtNum(customers.length)}</p>
          </div>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 text-[var(--c-amber)] mb-2">
              <Award size={15} />
              <span className="text-xs font-medium">VIP клиентов</span>
            </div>
            <p className="text-2xl font-bold text-[var(--c-text)]">{fmtNum(vipCount)}</p>
          </div>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 text-[var(--c-green)] mb-2">
              <TrendingUp size={15} />
              <span className="text-xs font-medium">Общая выручка</span>
            </div>
            <p className="text-lg font-bold text-[var(--c-text)]">{fmtMoney(totalSpent)}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, телефону, email..."
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] py-2 pl-9 pr-3 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <UserPlus size={15} />
            Добавить клиента
          </button>
        </div>

        {/* Tier filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--c-border)] pb-px">
          {TIER_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTierFilter(value)}
              className={cn(
                "shrink-0 rounded-t-lg px-3 py-1.5 text-sm font-medium transition",
                tierFilter === value
                  ? "border-b-2 border-[var(--c-green)] text-[var(--c-green)]"
                  : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-bg3)]">
              <Search size={22} className="text-[var(--c-text3)]" />
            </div>
            <p className="text-sm font-medium text-[var(--c-text2)]">Клиенты не найдены</p>
            <p className="mt-1 text-xs text-[var(--c-text3)]">
              {search ? "Попробуйте изменить поисковый запрос" : "Добавьте первого клиента"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Клиент
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Контакты
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Город
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Заказы
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Выручка
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Баллы
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                    Последний заказ
                  </th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => router.push(`/inventory/customers/${customer.id}`)}
                    className="group cursor-pointer border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-green-dim)] text-xs font-bold text-[var(--c-green)]">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--c-text)]">{customer.name}</p>
                          <TierBadge tier={customer.tier} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--c-text2)]">
                            <Phone size={11} className="shrink-0 text-[var(--c-text3)]" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--c-text2)]">
                            <Mail size={11} className="shrink-0 text-[var(--c-text3)]" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {!customer.phone && !customer.email && (
                          <span className="text-xs text-[var(--c-text3)]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--c-text2)]">
                      {customer.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--c-text)]">
                      {fmtNum(customer.totalOrders)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--c-text)]">
                      {fmtMoney(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-[var(--c-amber)]">
                        {fmtNum(customer.loyaltyPoints)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--c-text2)]">
                      {fmtDate(customer.lastOrderAt)}
                    </td>
                    <td className="px-2 py-3">
                      <ChevronRight
                        size={15}
                        className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-[var(--c-text3)]">
            Показано {fmtNum(filtered.length)} из {fmtNum(customers.length)} клиентов
          </p>
        )}
      </div>

      {selected && (
        <DetailDrawer
          key={selected.id}
          customer={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
