"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  X,
  Check,
  Building2,
  Truck,
  Package,
  Edit3,
  ShoppingCart,
  TrendingUp,
  Users,
  Filter,
  ChevronDown,
  ExternalLink,
  Calendar,
  BadgeCheck,
} from "lucide-react";
import { type Supplier, type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { PurchaseOrderForm } from "@/components/inventory/PurchaseOrderForm";
import { cn } from "@/lib/utils";

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < Math.round(rating) ? "text-[var(--c-amber)]" : "text-[var(--c-text3)]"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// Interactive star selector for the form
function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className={cn(
            "text-xl transition",
            (hovered || value) >= star
              ? "text-[var(--c-amber)]"
              : "text-[var(--c-text3)]",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ── Country flag ──────────────────────────────────────────────────────────────

function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    Китай: "🇨🇳",
    Германия: "🇩🇪",
    США: "🇺🇸",
    Турция: "🇹🇷",
    Италия: "🇮🇹",
    Россия: "🇷🇺",
  };
  return flags[country] ?? "🌐";
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SuppliersPanel() {
  const { suppliers, products, purchaseOrders, actions } = useInventory();

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("Все");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState<string | undefined>();

  // ── Stats ─────────────────────────────────────────────────────────────────
  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString();
  }, []);

  const totalSpent = useMemo(
    () =>
      purchaseOrders
        .filter((po) => po.status === "closed")
        .reduce((s, po) => s + po.totalAmount, 0),
    [purchaseOrders],
  );

  const activeSupplierIds = useMemo(() => {
    return new Set(
      purchaseOrders
        .filter((po) => po.createdAt >= sixMonthsAgo)
        .map((po) => po.supplierId),
    );
  }, [purchaseOrders, sixMonthsAgo]);

  // ── Per-supplier PO aggregates ────────────────────────────────────────────
  const supplierPoStats = useMemo(() => {
    const stats: Record<
      string,
      { count: number; totalSpent: number; lastOrderDate: string | null }
    > = {};
    for (const po of purchaseOrders) {
      if (!stats[po.supplierId]) {
        stats[po.supplierId] = { count: 0, totalSpent: 0, lastOrderDate: null };
      }
      stats[po.supplierId].count += 1;
      if (po.status === "closed") {
        stats[po.supplierId].totalSpent += po.totalAmount;
      }
      if (
        !stats[po.supplierId].lastOrderDate ||
        po.createdAt > stats[po.supplierId].lastOrderDate!
      ) {
        stats[po.supplierId].lastOrderDate = po.createdAt;
      }
    }
    return stats;
  }, [purchaseOrders]);

  // ── Country list for filter ───────────────────────────────────────────────
  const countries = useMemo(() => {
    const all = Array.from(new Set(suppliers.map((s) => s.country))).sort();
    return ["Все", ...all];
  }, [suppliers]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) => {
      const matchSearch =
        q === "" ||
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q);
      const matchCountry =
        countryFilter === "Все" || s.country === countryFilter;
      return matchSearch && matchCountry;
    });
  }, [suppliers, search, countryFilter]);

  const supplierProducts = (supplierId: string) =>
    products.filter((p) => p.supplierId === supplierId);

  function openCreatePO(supplierId?: string) {
    setPoSupplierId(supplierId);
    setShowPOForm(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Header stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Users size={15} />}
          label="Всего поставщиков"
          value={suppliers.length}
        />
        <StatCard
          icon={<BadgeCheck size={15} />}
          label="Активных (6 мес.)"
          value={activeSupplierIds.size}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label="Потрачено (закрытые)"
          value={totalSpent.toLocaleString("ru-RU") + " ₽"}
          color="amber"
        />
      </div>

      {/* ── Search + filter ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full flex-1 sm:w-auto">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
          />
          <input
            type="text"
            placeholder="Поиск по названию, email, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none"
          />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-8 pr-7 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none"
          />
        </div>
        <button
          onClick={() => {
            setEditSupplier(null);
            setShowForm(true);
          }}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition whitespace-nowrap"
        >
          <Plus size={15} />
          Добавить поставщика
        </button>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <EmptyState
          icon={<Building2 size={24} />}
          title="Нет поставщиков"
          description="Поставщики не найдены. Измените поиск или добавьте нового поставщика."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              <Plus size={15} />
              Добавить поставщика
            </button>
          }
        />
      )}

      {/* ── Supplier grid ─────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((supplier) => {
            const prods = supplierProducts(supplier.id);
            const stats = supplierPoStats[supplier.id] ?? {
              count: 0,
              totalSpent: 0,
              lastOrderDate: null,
            };
            const isActive = activeSupplierIds.has(supplier.id);
            return (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                productCount={prods.length}
                poCount={stats.count}
                totalSpent={stats.totalSpent}
                lastOrderDate={stats.lastOrderDate}
                isActive={isActive}
                onOpen={() => setSelectedSupplier(supplier)}
                onEdit={(e) => {
                  e.stopPropagation();
                  setEditSupplier(supplier);
                  setShowForm(true);
                }}
                onCreateOrder={(e) => {
                  e.stopPropagation();
                  openCreatePO(supplier.id);
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Supplier detail drawer ────────────────────────────────────────── */}
      {selectedSupplier && (
        <SupplierDetailPanel
          supplier={selectedSupplier}
          products={supplierProducts(selectedSupplier.id)}
          poCount={supplierPoStats[selectedSupplier.id]?.count ?? 0}
          totalSpent={supplierPoStats[selectedSupplier.id]?.totalSpent ?? 0}
          lastOrderDate={supplierPoStats[selectedSupplier.id]?.lastOrderDate ?? null}
          onClose={() => setSelectedSupplier(null)}
          onEdit={() => {
            setEditSupplier(selectedSupplier);
            setSelectedSupplier(null);
            setShowForm(true);
          }}
          onCreateOrder={() => {
            setSelectedSupplier(null);
            openCreatePO(selectedSupplier.id);
          }}
        />
      )}

      {/* ── Add / edit supplier form ──────────────────────────────────────── */}
      {showForm && (
        <SupplierForm
          supplier={editSupplier ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditSupplier(null);
          }}
        />
      )}

      {/* ── Quick PO form ─────────────────────────────────────────────────── */}
      {showPOForm && (
        <PurchaseOrderForm
          initialSupplierId={poSupplierId}
          onClose={() => {
            setShowPOForm(false);
            setPoSupplierId(undefined);
          }}
        />
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: "green" | "amber";
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div
        className={cn(
          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
          color === "green"
            ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
            : color === "amber"
              ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]"
              : "bg-[var(--c-bg3)] text-[var(--c-text2)]",
        )}
      >
        {icon}
      </div>
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className="text-lg font-bold text-[var(--c-text)] tabular-nums">{value}</p>
    </div>
  );
}

// ── Supplier card ─────────────────────────────────────────────────────────────

function SupplierCard({
  supplier,
  productCount,
  poCount,
  totalSpent,
  lastOrderDate,
  isActive,
  onOpen,
  onEdit,
  onCreateOrder,
}: {
  supplier: Supplier;
  productCount: number;
  poCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  isActive: boolean;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onCreateOrder: (e: React.MouseEvent) => void;
}) {
  const formattedLastOrder = lastOrderDate
    ? new Date(lastOrderDate).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 transition hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)]"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-lg">
            {countryFlag(supplier.country)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--c-text)] truncate">
                {supplier.name}
              </p>
              {isActive && (
                <span className="shrink-0 rounded-full bg-[var(--c-green-dim)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--c-green)]">
                  актив.
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--c-text3)]">
              {supplier.country}
              {supplier.city ? `, ${supplier.city}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] opacity-0 group-hover:opacity-100 hover:bg-[var(--c-bg)] hover:text-[var(--c-text)] transition"
          >
            <Edit3 size={13} />
          </button>
        </div>
      </div>

      {/* Star rating */}
      <StarRating rating={supplier.rating} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Срок" value={`${supplier.leadTimeDays} дн.`} />
        <MiniStat
          label="Мин. заказ"
          value={supplier.minOrderQty ? `${supplier.minOrderQty} шт` : "—"}
        />
        <MiniStat label="Товаров" value={productCount} />
      </div>

      {/* Order history */}
      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2.5 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-[var(--c-text3)]">Заказов</p>
          <p className="text-sm font-semibold text-[var(--c-text)] tabular-nums">{poCount}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--c-text3)]">Потрачено</p>
          <p className="text-sm font-semibold text-[var(--c-text)] tabular-nums">
            {totalSpent > 0
              ? totalSpent >= 1_000_000
                ? (totalSpent / 1_000_000).toFixed(1) + " млн ₽"
                : (totalSpent / 1000).toFixed(0) + " тыс ₽"
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--c-text3)]">Посл. заказ</p>
          <p className="text-[11px] font-medium text-[var(--c-text2)]">
            {formattedLastOrder ?? "—"}
          </p>
        </div>
      </div>

      {/* Contact icons + actions */}
      <div className="flex items-center gap-2">
        {supplier.phone && (
          <a
            href={`tel:${supplier.phone}`}
            onClick={(e) => e.stopPropagation()}
            title={supplier.phone}
            className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <Phone size={13} />
          </a>
        )}
        {supplier.email && (
          <a
            href={`mailto:${supplier.email}`}
            onClick={(e) => e.stopPropagation()}
            title={supplier.email}
            className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <Mail size={13} />
          </a>
        )}
        {supplier.website && (
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <Globe size={13} />
          </a>
        )}
        {supplier.telegramHandle && (
          <a
            href={`https://t.me/${supplier.telegramHandle.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={supplier.telegramHandle}
            className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <MessageCircle size={13} />
          </a>
        )}
        <span className="ml-auto text-xs font-medium text-[var(--c-text3)]">
          {supplier.currency}
        </span>
        <button
          onClick={onCreateOrder}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--c-bg)] border border-[var(--c-border2)] px-2.5 py-1.5 text-xs font-medium text-[var(--c-text2)] hover:border-[var(--c-green)] hover:text-[var(--c-green)] transition"
        >
          <ShoppingCart size={12} />
          Создать заказ
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] py-2 text-center">
      <p className="text-[10px] text-[var(--c-text3)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--c-text)] tabular-nums">{value}</p>
    </div>
  );
}

// ── Supplier detail panel ─────────────────────────────────────────────────────

function SupplierDetailPanel({
  supplier,
  products,
  poCount,
  totalSpent,
  lastOrderDate,
  onClose,
  onEdit,
  onCreateOrder,
}: {
  supplier: Supplier;
  products: Product[];
  poCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  onClose: () => void;
  onEdit: () => void;
  onCreateOrder: () => void;
}) {
  const formattedLastOrder = lastOrderDate
    ? new Date(lastOrderDate).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-xl">
              {countryFlag(supplier.country)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">
                {supplier.name}
              </h2>
              <p className="text-xs text-[var(--c-text2)]">
                {supplier.country}
                {supplier.city ? `, ${supplier.city}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
              title="Редактировать"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <StarRating rating={supplier.rating} />
            <span className="text-sm font-medium text-[var(--c-text)]">
              {supplier.rating.toFixed(1)}
            </span>
          </div>

          {/* Order history summary */}
          <div className="grid grid-cols-3 gap-3">
            <InfoCell
              label="Заказов"
              value={String(poCount)}
              icon={<ShoppingCart size={13} />}
            />
            <InfoCell
              label="Потрачено"
              value={
                totalSpent > 0
                  ? totalSpent.toLocaleString("ru-RU") + " ₽"
                  : "—"
              }
              icon={<TrendingUp size={13} />}
            />
            <InfoCell
              label="Посл. заказ"
              value={formattedLastOrder ?? "—"}
              icon={<Calendar size={13} />}
            />
          </div>

          {/* Contacts */}
          <Section title="Контакты">
            <div className="space-y-2">
              {supplier.contactName && (
                <ContactRow
                  icon={<Building2 size={14} />}
                  label="Контакт"
                  value={supplier.contactName}
                />
              )}
              {supplier.email && (
                <ContactRow
                  icon={<Mail size={14} />}
                  label="Email"
                  value={supplier.email}
                  href={`mailto:${supplier.email}`}
                />
              )}
              {supplier.phone && (
                <ContactRow
                  icon={<Phone size={14} />}
                  label="Телефон"
                  value={supplier.phone}
                  href={`tel:${supplier.phone}`}
                />
              )}
              {supplier.telegramHandle && (
                <ContactRow
                  icon={<MessageCircle size={14} />}
                  label="Telegram"
                  value={supplier.telegramHandle}
                  href={`https://t.me/${supplier.telegramHandle.replace("@", "")}`}
                />
              )}
              {supplier.website && (
                <ContactRow
                  icon={<Globe size={14} />}
                  label="Сайт"
                  value={supplier.website}
                  href={supplier.website}
                />
              )}
            </div>
          </Section>

          {/* Terms */}
          <Section title="Условия поставки">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell
                label="Срок доставки"
                value={`${supplier.leadTimeDays} дней`}
                icon={<Truck size={13} />}
              />
              <InfoCell
                label="Мин. заказ"
                value={
                  supplier.minOrderQty ? `${supplier.minOrderQty} шт` : "—"
                }
                icon={<Package size={13} />}
              />
              <InfoCell label="Валюта" value={supplier.currency} />
              <InfoCell
                label="Условия оплаты"
                value={supplier.paymentTerms ?? "—"}
              />
            </div>
          </Section>

          {/* Links */}
          {(supplier.catalogUrl || supplier.priceListUrl) && (
            <Section title="Документы">
              <div className="space-y-2">
                {supplier.catalogUrl && (
                  <a
                    href={supplier.catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2.5 text-sm text-[var(--c-blue)] hover:opacity-80 transition"
                  >
                    <ExternalLink size={13} />
                    Каталог поставщика
                  </a>
                )}
                {supplier.priceListUrl && (
                  <a
                    href={supplier.priceListUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2.5 text-sm text-[var(--c-blue)] hover:opacity-80 transition"
                  >
                    <ExternalLink size={13} />
                    Прайс-лист
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Products */}
          {products.length > 0 && (
            <Section title={`Товары (${products.length})`}>
              <div className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3"
                  >
                    <Package
                      size={15}
                      className="text-[var(--c-text3)] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)] truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular-nums">
                        {p.costPrice.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {supplier.notes && (
            <Section title="Заметки">
              <p className="text-sm text-[var(--c-text2)]">{supplier.notes}</p>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          <button
            onClick={onCreateOrder}
            className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <ShoppingCart size={15} />
            Создать заказ поставщику
          </button>
          <Link
            href="/inventory/purchase-orders"
            className="flex w-full h-9 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Все заказы →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] px-3 py-2.5">
      <span className="text-[var(--c-text3)] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="text-sm text-[var(--c-blue)] hover:opacity-80 transition truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-[var(--c-text)] truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] p-3">
      <div className="flex items-center gap-1 mb-1">
        {icon && (
          <span className="text-[var(--c-text3)]">{icon}</span>
        )}
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
      </div>
      <p className="text-sm font-medium text-[var(--c-text)]">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Add / Edit supplier form ──────────────────────────────────────────────────

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: Supplier;
  onClose: () => void;
}) {
  const { actions } = useInventory();
  const isEdit = !!supplier;

  const [name, setName] = useState(supplier?.name ?? "");
  const [country, setCountry] = useState(supplier?.country ?? "Россия");
  const [city, setCity] = useState(supplier?.city ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [telegram, setTelegram] = useState(supplier?.telegramHandle ?? "");
  const [website, setWebsite] = useState(supplier?.website ?? "");
  const [catalogUrl, setCatalogUrl] = useState(supplier?.catalogUrl ?? "");
  const [priceListUrl, setPriceListUrl] = useState(supplier?.priceListUrl ?? "");
  const [leadTime, setLeadTime] = useState(String(supplier?.leadTimeDays ?? 7));
  const [minOrder, setMinOrder] = useState(
    supplier?.minOrderQty ? String(supplier.minOrderQty) : "",
  );
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR" | "CNY">(
    supplier?.currency ?? "RUB",
  );
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms ?? "");
  const [rating, setRating] = useState(supplier?.rating ?? 5);
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      country,
      city: city || undefined,
      contactName: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      telegramHandle: telegram || undefined,
      website: website || undefined,
      catalogUrl: catalogUrl || undefined,
      priceListUrl: priceListUrl || undefined,
      leadTimeDays: parseInt(leadTime) || 7,
      minOrderQty: minOrder ? parseInt(minOrder) : undefined,
      currency,
      paymentTerms: paymentTerms || undefined,
      rating,
      notes: notes || undefined,
    };
    if (isEdit && supplier) {
      actions.updateSupplier(supplier.id, data);
    } else {
      actions.addSupplier(data);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">
            {isEdit ? "Редактировать поставщика" : "Добавить поставщика"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic info */}
          <FormSection title="Основное">
            <Field label="Название компании" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ООО Поставщик"
                className={inp}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Страна">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inp}
                >
                  {[
                    "Россия",
                    "Китай",
                    "США",
                    "Германия",
                    "Турция",
                    "Италия",
                    "Другая",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Город">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Москва"
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Рейтинг">
              <StarSelector value={rating} onChange={setRating} />
            </Field>
          </FormSection>

          {/* Contacts */}
          <FormSection title="Контакты">
            <Field label="Контактное лицо">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Иван Петров"
                className={inp}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan@example.com"
                  className={inp}
                />
              </Field>
              <Field label="Телефон">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telegram">
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className={inp}
                />
              </Field>
              <Field label="Сайт">
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className={inp}
                />
              </Field>
            </div>
          </FormSection>

          {/* Terms */}
          <FormSection title="Условия поставки">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Срок доставки (дней)">
                <input
                  type="number"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="7"
                  min={1}
                  className={inp}
                />
              </Field>
              <Field label="Мин. заказ (шт)">
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="50"
                  min={1}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Валюта">
                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as typeof currency)
                  }
                  className={inp}
                >
                  {(["RUB", "USD", "EUR", "CNY"] as const).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Условия оплаты">
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="50% предоплата"
                  className={inp}
                />
              </Field>
            </div>
          </FormSection>

          {/* Links */}
          <FormSection title="Ссылки">
            <Field label="Каталог">
              <input
                type="url"
                value={catalogUrl}
                onChange={(e) => setCatalogUrl(e.target.value)}
                placeholder="https://..."
                className={inp}
              />
            </Field>
            <Field label="Прайс-лист">
              <input
                type="url"
                value={priceListUrl}
                onChange={(e) => setPriceListUrl(e.target.value)}
                placeholder="https://..."
                className={inp}
              />
            </Field>
          </FormSection>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Заметки
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(inp, "h-auto resize-none")}
              placeholder="Особенности работы, история сотрудничества..."
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
            disabled={!name.trim() || saved}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              name.trim() && !saved
                ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {saved ? (
              <>
                <Check size={14} /> Сохранено
              </>
            ) : isEdit ? (
              "Сохранить изменения"
            ) : (
              "Добавить поставщика"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
        {label}
        {required && <span className="ml-1 text-[var(--c-red)]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp =
  "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition";
