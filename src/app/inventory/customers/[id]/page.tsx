"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Star,
  ShoppingBag,
  TrendingUp,
  Award,
  Package,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { CUSTOMER_TIER_LABELS, type CustomerTier } from "@/mock/inventory";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<CustomerTier, { bg: string; color: string }> = {
  vip: { bg: "bg-[var(--c-amber-dim)]", color: "text-[var(--c-amber)]" },
  wholesale: { bg: "bg-[var(--c-blue-dim)]", color: "text-[var(--c-blue)]" },
  regular: { bg: "bg-[var(--c-green-dim)]", color: "text-[var(--c-green)]" },
  new: { bg: "bg-[var(--c-bg3)]", color: "text-[var(--c-text3)]" },
};

function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateShort(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { customers, orders, actions } = useInventory();
  const customer = customers?.find((c) => c.id === id);

  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(customer?.note ?? "");
  const [newTag, setNewTag] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    city: customer?.city ?? "",
    tier: (customer?.tier ?? "new") as CustomerTier,
  });

  const customerOrders = useMemo(() => {
    if (!orders || !customer) return [];
    return orders
      .filter((o) => o.customerId === customer.id || o.customerName === customer.name)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, customer]);

  // Auto-computed segment
  const autoTier = useMemo((): CustomerTier => {
    if (!customer) return "new";
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86_400_000)
      : Infinity;
    if (daysSinceLastOrder >= 90) return "new";
    if (customer.totalOrders <= 2) return "new";
    if (customer.totalOrders >= 10 || customer.totalSpent >= 50_000) return "vip";
    return "regular";
  }, [customer]);

  if (!customer) {
    return (
      <InventoryShell title="Клиент не найден">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-[var(--c-text3)]">Клиент с ID {id} не найден</p>
          <Link href="/inventory/customers" className="text-sm text-[var(--c-green)] hover:underline">
            ← Вернуться к списку
          </Link>
        </div>
      </InventoryShell>
    );
  }

  const tierCfg = TIER_CONFIG[customer.tier];

  function saveNote() {
    if (!customer) return;
    actions.updateCustomer(customer.id, { note: noteText });
    setEditingNote(false);
  }

  function addTag() {
    if (!customer) return;
    const tag = newTag.trim();
    if (!tag || customer.tags.includes(tag)) { setNewTag(""); return; }
    actions.updateCustomer(customer.id, { tags: [...customer.tags, tag] });
    setNewTag("");
  }

  function removeTag(tag: string) {
    if (!customer) return;
    actions.updateCustomer(customer.id, { tags: customer.tags.filter((t) => t !== tag) });
  }

  function saveProfile() {
    if (!customer) return;
    actions.updateCustomer(customer.id, {
      name: profileDraft.name.trim() || customer.name,
      phone: profileDraft.phone.trim() || undefined,
      email: profileDraft.email.trim() || undefined,
      city: profileDraft.city.trim() || undefined,
      tier: profileDraft.tier,
    });
    setEditingProfile(false);
  }

  return (
    <InventoryShell title={customer.name} subtitle="Профиль клиента">
      {/* Back link */}
      <Link
        href="/inventory/customers"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
      >
        <ArrowLeft size={14} />
        Все клиенты
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left column — profile card */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--c-green-dim)] text-2xl font-bold text-[var(--c-green)]">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => { setProfileDraft({ name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", city: customer.city ?? "", tier: customer.tier }); setEditingProfile(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
              >
                <Edit2 size={14} />
              </button>
            </div>

            {editingProfile ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Имя"
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                />
                <input
                  type="tel"
                  value={profileDraft.phone}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Телефон"
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                />
                <input
                  type="email"
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                />
                <input
                  type="text"
                  value={profileDraft.city}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Город"
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                />
                <select
                  value={profileDraft.tier}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, tier: e.target.value as CustomerTier }))}
                  className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  {(Object.keys(CUSTOMER_TIER_LABELS) as CustomerTier[]).map((t) => (
                    <option key={t} value={t}>{CUSTOMER_TIER_LABELS[t]}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={saveProfile} className="flex-1 h-9 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
                    <Save size={13} className="inline mr-1.5" />Сохранить
                  </button>
                  <button onClick={() => setEditingProfile(false)} className="h-9 w-9 rounded-lg border border-[var(--c-border2)] text-[var(--c-text3)] hover:text-[var(--c-text)] transition flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-[var(--c-text)]">{customer.name}</h2>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", tierCfg.bg, tierCfg.color)}>
                    {CUSTOMER_TIER_LABELS[customer.tier]}
                  </span>
                </div>
                {autoTier !== customer.tier && (
                  <p className="mt-1 text-[11px] text-[var(--c-text3)]">
                    Авто-сегмент: {CUSTOMER_TIER_LABELS[autoTier]}
                  </p>
                )}
                <div className="mt-3 space-y-1.5">
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                      <Phone size={13} className="shrink-0" /> {customer.phone}
                    </a>
                  )}
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                      <Mail size={13} className="shrink-0" /> {customer.email}
                    </a>
                  )}
                  {customer.city && (
                    <p className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
                      <MapPin size={13} className="shrink-0" /> {customer.city}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--c-text)]">{customer.totalOrders}</p>
              <p className="text-xs text-[var(--c-text3)]">заказов</p>
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 text-center">
              <p className="text-lg font-bold text-[var(--c-green)]">{fmtMoney(customer.totalSpent)}</p>
              <p className="text-xs text-[var(--c-text3)]">всего потрачено</p>
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--c-amber)]">{customer.loyaltyPoints}</p>
              <p className="text-xs text-[var(--c-text3)]">баллов</p>
            </div>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 text-center">
              <p className="text-sm font-medium text-[var(--c-text)]">
                {customer.totalOrders > 0 ? fmtMoney(Math.round(customer.totalSpent / customer.totalOrders)) : "—"}
              </p>
              <p className="text-xs text-[var(--c-text3)]">средний чек</p>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[var(--c-text3)]">Первый заказ</span>
              <span className="text-xs text-[var(--c-text2)]">{fmtDate(customer.firstOrderAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--c-text3)]">Последний заказ</span>
              <span className="text-xs text-[var(--c-text2)]">{fmtDate(customer.lastOrderAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--c-text3)]">В базе с</span>
              <span className="text-xs text-[var(--c-text2)]">{fmtDate(customer.createdAt)}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <p className="mb-3 text-xs font-medium text-[var(--c-text2)]">Метки</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1 rounded-full border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-2.5 pr-1 py-0.5">
                  <span className="text-xs text-[var(--c-text2)]">{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--c-text3)] hover:bg-[var(--c-red-dim)] hover:text-[var(--c-red)] transition"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="+ метка"
                  className="h-6 w-24 rounded-full border border-dashed border-[var(--c-border2)] bg-transparent px-2 text-xs text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                />
                {newTag && (
                  <button onClick={addTag} className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--c-green)] text-[var(--c-bg)]">
                    <Plus size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--c-text2)]">Заметки</p>
              {!editingNote && (
                <button onClick={() => setEditingNote(true)} className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                  <Edit2 size={12} />
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Добавьте заметку о клиенте…"
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 text-xs font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
                    <Save size={12} />Сохранить
                  </button>
                  <button onClick={() => { setEditingNote(false); setNoteText(customer.note ?? ""); }} className="h-8 px-3 rounded-lg border border-[var(--c-border2)] text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--c-text3)]">
                {customer.note || "Нет заметок"}
              </p>
            )}
          </div>
        </div>

        {/* Right column — order history */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">История заказов</h2>
              <span className="text-xs text-[var(--c-text3)]">{customerOrders.length} заказов</span>
            </div>

            {customerOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ShoppingBag size={24} className="text-[var(--c-text3)]" />
                <p className="text-sm text-[var(--c-text3)]">Заказов пока нет</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--c-border)]">
                {customerOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/inventory/orders/${order.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--c-bg3)] transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)]">
                      <Package size={15} className="text-[var(--c-text2)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)]">{order.id.toUpperCase()}</p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {fmtDateShort(order.createdAt)} · {order.items.length} товаров
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular">
                        {fmtMoney(order.revenue)}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">{order.channel}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </InventoryShell>
  );
}
