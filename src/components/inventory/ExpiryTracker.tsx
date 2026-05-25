"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  X,
  Plus,
  Filter,
  Search,
  Star,
  Clock,
  ChevronDown,
  Trash2,
  ArrowLeftRight,
  ShieldAlert,
  CheckCircle2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";

type BatchStatus = "ok" | "expiring_soon" | "expired" | "quarantine";

interface Batch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  qty: number;
  remainingQty: number;
  manufactureDate: string;
  expiryDate: string;
  locationId: string;
  status: BatchStatus;
  receivedAt: string;
  supplierId?: string;
  costPrice: number;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - now.getTime()) / 86400000);
}

const TODAY = new Date("2026-05-25");

function computeStatus(expiryDate: string): BatchStatus {
  const d = daysUntil(expiryDate);
  if (d < 0) return "expired";
  if (d <= 7) return "expiring_soon";
  return "ok";
}

const MOCK_BATCHES: Batch[] = [
  {
    id: "bat-001", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001",
    batchNumber: "BTH-2026-001", qty: 100, remainingQty: 45,
    manufactureDate: "2025-11-01", expiryDate: "2026-05-20",
    locationId: "loc-warehouse", status: "expired", receivedAt: "2025-11-10",
    supplierId: "sup-001", costPrice: 820,
  },
  {
    id: "bat-002", productId: "prod-002", productName: "Несессер водонепроницаемый", sku: "NSS-002",
    batchNumber: "BTH-2026-002", qty: 80, remainingQty: 80,
    manufactureDate: "2026-01-15", expiryDate: "2026-05-28",
    locationId: "loc-warehouse", status: "expiring_soon", receivedAt: "2026-01-20",
    supplierId: "sup-001", costPrice: 540,
  },
  {
    id: "bat-003", productId: "prod-002", productName: "Несессер водонепроницаемый", sku: "NSS-002",
    batchNumber: "BTH-2026-003", qty: 60, remainingQty: 55,
    manufactureDate: "2026-02-01", expiryDate: "2026-06-01",
    locationId: "loc-store", status: "expiring_soon", receivedAt: "2026-02-05",
    supplierId: "sup-001", costPrice: 540,
  },
  {
    id: "bat-004", productId: "prod-003", productName: "Компрессионные мешки 3 шт", sku: "CMP-003",
    batchNumber: "BTH-2026-004", qty: 200, remainingQty: 120,
    manufactureDate: "2026-01-01", expiryDate: "2026-06-15",
    locationId: "loc-warehouse", status: "ok", receivedAt: "2026-01-05",
    supplierId: "sup-002", costPrice: 290,
  },
  {
    id: "bat-005", productId: "prod-005", productName: "Кофе зерновой 250г", sku: "COF-005",
    batchNumber: "BTH-2026-005", qty: 50, remainingQty: 30,
    manufactureDate: "2025-12-01", expiryDate: "2026-05-30",
    locationId: "loc-warehouse", status: "expiring_soon", receivedAt: "2025-12-10",
    supplierId: "sup-004", costPrice: 680,
  },
  {
    id: "bat-006", productId: "prod-005", productName: "Кофе зерновой 250г", sku: "COF-005",
    batchNumber: "BTH-2026-006", qty: 100, remainingQty: 90,
    manufactureDate: "2026-02-15", expiryDate: "2026-08-15",
    locationId: "loc-warehouse", status: "ok", receivedAt: "2026-02-20",
    supplierId: "sup-004", costPrice: 680,
  },
  {
    id: "bat-007", productId: "prod-006", productName: "Фильтры для кофе 100 шт", sku: "FLT-006",
    batchNumber: "BTH-2026-007", qty: 300, remainingQty: 280,
    manufactureDate: "2025-09-01", expiryDate: "2026-09-01",
    locationId: "loc-warehouse", status: "ok", receivedAt: "2025-09-10",
    supplierId: "sup-004", costPrice: 180,
  },
  {
    id: "bat-008", productId: "prod-003", productName: "Компрессионные мешки 3 шт", sku: "CMP-003",
    batchNumber: "BTH-2026-008", qty: 150, remainingQty: 14,
    manufactureDate: "2025-10-01", expiryDate: "2026-05-24",
    locationId: "loc-store", status: "expired", receivedAt: "2025-10-05",
    supplierId: "sup-002", costPrice: 290,
  },
  {
    id: "bat-009", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001",
    batchNumber: "BTH-2026-009", qty: 120, remainingQty: 57,
    manufactureDate: "2026-03-01", expiryDate: "2026-09-01",
    locationId: "loc-warehouse", status: "ok", receivedAt: "2026-03-10",
    supplierId: "sup-001", costPrice: 820,
  },
  {
    id: "bat-010", productId: "prod-004", productName: "Замок для чемодана TSA", sku: "LCK-004",
    batchNumber: "BTH-2026-010", qty: 200, remainingQty: 180,
    manufactureDate: "2026-01-01", expiryDate: "2027-01-01",
    locationId: "loc-warehouse", status: "ok", receivedAt: "2026-01-15",
    supplierId: "sup-002", costPrice: 340,
  },
  {
    id: "bat-011", productId: "prod-006", productName: "Фильтры для кофе 100 шт", sku: "FLT-006",
    batchNumber: "BTH-2026-011", qty: 100, remainingQty: 22,
    manufactureDate: "2024-11-01", expiryDate: "2026-05-31",
    locationId: "loc-store", status: "expiring_soon", receivedAt: "2024-11-10",
    supplierId: "sup-004", costPrice: 180,
  },
  {
    id: "bat-012", productId: "prod-004", productName: "Замок для чемодана TSA", sku: "LCK-004",
    batchNumber: "BTH-2026-012", qty: 80, remainingQty: 0,
    manufactureDate: "2025-06-01", expiryDate: "2026-05-22",
    locationId: "loc-returns", status: "quarantine", receivedAt: "2025-06-10",
    supplierId: "sup-002", costPrice: 340,
  },
];

const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string }> = {
  ok:             { label: "В норме",       color: "text-[var(--c-green)]",  bg: "bg-[var(--c-green)]/10" },
  expiring_soon:  { label: "Истекает",      color: "text-[var(--c-amber)]",  bg: "bg-[var(--c-amber)]/10" },
  expired:        { label: "Просрочено",    color: "text-[var(--c-red)]",    bg: "bg-[var(--c-red)]/10" },
  quarantine:     { label: "Карантин",      color: "text-[var(--c-text3)]",  bg: "bg-[var(--c-bg3)]" },
};

function daysLabel(days: number): string {
  if (days < 0) return `Просрочено ${Math.abs(days)} дн.`;
  if (days === 0) return "Истекает сегодня";
  return `${days} дн.`;
}

function daysColor(days: number): string {
  if (days < 0 || days <= 7) return "text-[var(--c-red)] font-semibold";
  if (days <= 30) return "text-[var(--c-amber)] font-medium";
  return "text-[var(--c-green)]";
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

export function ExpiryTracker() {
  const { products, locations, suppliers } = useInventory();
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name ?? id;
  const [batches, setBatches] = useState<Batch[]>(MOCK_BATCHES);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [form, setForm] = useState({
    productSearch: "",
    productId: "",
    productName: "",
    sku: "",
    batchNumber: "",
    manufactureDate: "",
    expiryDate: "",
    locationId: "loc-warehouse",
    qty: "",
    supplierId: "",
  });
  const [productResults, setProductResults] = useState<Product[]>([]);

  const counts = useMemo(() => {
    const expired = batches.filter(b => daysUntil(b.expiryDate) < 0 && b.status !== "quarantine").length;
    const expiring7 = batches.filter(b => { const d = daysUntil(b.expiryDate); return d >= 0 && d <= 7; }).length;
    const expiring30 = batches.filter(b => { const d = daysUntil(b.expiryDate); return d > 7 && d <= 30; }).length;
    const ok = batches.filter(b => { const d = daysUntil(b.expiryDate); return d > 30 && b.status !== "quarantine"; }).length;
    return { expired, expiring7, expiring30, ok };
  }, [batches]);

  const sortedFiltered = useMemo(() => {
    return batches
      .filter(b => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (locationFilter !== "all" && b.locationId !== locationFilter) return false;
        if (searchQ && !b.productName.toLowerCase().includes(searchQ.toLowerCase()) && !b.batchNumber.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [batches, statusFilter, locationFilter, searchQ]);

  const fefoByProduct = useMemo(() => {
    const map: Record<string, Batch[]> = {};
    batches
      .filter(b => b.status !== "expired" && b.status !== "quarantine" && b.remainingQty > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .forEach(b => {
        if (!map[b.productId]) map[b.productId] = [];
        map[b.productId].push(b);
      });
    return map;
  }, [batches]);

  const fefoFirstIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(fefoByProduct).forEach(arr => { if (arr.length) ids.add(arr[0].id); });
    return ids;
  }, [fefoByProduct]);

  function handleWriteOffExpired() {
    setBatches(prev => prev.map(b => daysUntil(b.expiryDate) < 0 && b.status !== "quarantine" ? { ...b, remainingQty: 0, status: "expired" as BatchStatus } : b));
  }

  function handleWriteOff(id: string) {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, remainingQty: 0 } : b));
  }

  function handleQuarantine(id: string) {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: "quarantine" as BatchStatus } : b));
  }

  function handleProductSearch(q: string) {
    setForm(p => ({ ...p, productSearch: q, productId: "", productName: "", sku: "" }));
    setProductResults(q.length > 1 ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []);
  }

  function selectProduct(p: Product) {
    setForm(prev => ({ ...prev, productSearch: p.name, productId: p.id, productName: p.name, sku: p.sku }));
    setProductResults([]);
  }

  function handleRegister() {
    if (!form.productId || !form.batchNumber || !form.expiryDate || !form.qty) return;
    const status = computeStatus(form.expiryDate);
    setBatches(prev => [{
      id: `bat-${Date.now()}`,
      productId: form.productId,
      productName: form.productName,
      sku: form.sku,
      batchNumber: form.batchNumber,
      qty: parseInt(form.qty),
      remainingQty: parseInt(form.qty),
      manufactureDate: form.manufactureDate,
      expiryDate: form.expiryDate,
      locationId: form.locationId,
      status,
      receivedAt: TODAY.toISOString().split("T")[0],
      supplierId: form.supplierId || undefined,
      costPrice: products.find(p => p.id === form.productId)?.costPrice ?? 0,
    }, ...prev]);
    setShowRegister(false);
    setForm({ productSearch: "", productId: "", productName: "", sku: "", batchNumber: "", manufactureDate: "", expiryDate: "", locationId: "loc-warehouse", qty: "", supplierId: "" });
  }

  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string }> = [];
    batches.forEach(b => { if (!seen.has(b.productId)) { seen.add(b.productId); result.push({ id: b.productId, name: b.productName }); } });
    return result;
  }, [batches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Сроки годности и партии</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Отслеживание FEFO и управление партиями</p>
        </div>
        <div className="flex items-center gap-3">
          {counts.expired > 0 && (
            <button
              onClick={handleWriteOffExpired}
              className="flex items-center gap-2 rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red)]/10 px-3 py-2 text-sm font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/15 transition"
            >
              <Trash2 size={14} />
              Списать просроченные
            </button>
          )}
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={15} />
            Зарегистрировать партию
          </button>
        </div>
      </div>

      {(counts.expired > 0 || counts.expiring7 > 0) && (
        <div className="space-y-2">
          {counts.expired > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--c-red)]/30 bg-[var(--c-red)]/5 px-4 py-3">
              <AlertTriangle size={16} className="text-[var(--c-red)] shrink-0" />
              <span className="text-sm text-[var(--c-red)] font-medium">
                {counts.expired} {counts.expired === 1 ? "партия просрочена" : "партии просрочены"} — требуют немедленного списания
              </span>
            </div>
          )}
          {counts.expiring7 > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--c-amber)]/30 bg-[var(--c-amber)]/5 px-4 py-3">
              <Clock size={16} className="text-[var(--c-amber)] shrink-0" />
              <span className="text-sm text-[var(--c-amber)] font-medium">
                {counts.expiring7} {counts.expiring7 === 1 ? "партия истекает" : "партии истекают"} в течение 7 дней
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Просрочено", count: counts.expired, color: "text-[var(--c-red)]", bg: "border-[var(--c-red)]/20 bg-[var(--c-red)]/5", icon: AlertTriangle },
          { label: "Истекает ≤ 7 дней", count: counts.expiring7, color: "text-[var(--c-amber)]", bg: "border-[var(--c-amber)]/20 bg-[var(--c-amber)]/5", icon: Clock },
          { label: "Истекает ≤ 30 дней", count: counts.expiring30, color: "text-yellow-400", bg: "border-yellow-400/20 bg-yellow-400/5", icon: Clock },
          { label: "В норме", count: counts.ok, color: "text-[var(--c-green)]", bg: "border-[var(--c-green)]/20 bg-[var(--c-green)]/5", icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-4 cursor-pointer", s.bg)} onClick={() => setStatusFilter(s.label === "Просрочено" ? "expired" : s.label === "В норме" ? "ok" : s.label.includes("7") ? "expiring_soon" : "all")}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-[var(--c-text3)]">{s.label}</span>
            </div>
            <div className={cn("text-2xl font-bold", s.color)}>{s.count}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Поиск товара или партии..."
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as BatchStatus | "all")}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="ok">В норме</option>
          <option value="expiring_soon">Истекает</option>
          <option value="expired">Просрочено</option>
          <option value="quarantine">Карантин</option>
        </select>
        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
        >
          <option value="all">Все склады</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {statusFilter !== "all" && (
          <button onClick={() => setStatusFilter("all")} className="flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)]">
            <X size={13} /> Сбросить
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Товар / Партия</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Склад</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Произведено</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Истекает</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Осталось дней</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Остаток</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Стоимость</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.map(batch => {
              const d = daysUntil(batch.expiryDate);
              const isFefoFirst = fefoFirstIds.has(batch.id);
              return (
                <tr key={batch.id} className={cn("border-b border-[var(--c-border)] last:border-0 transition", d < 0 ? "bg-[var(--c-red)]/3" : d <= 7 ? "bg-[var(--c-amber)]/3" : "hover:bg-[var(--c-bg3)]")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isFefoFirst && <Star size={12} className="text-[var(--c-green)] shrink-0" aria-label="FEFO: использовать первым" />}
                      <div>
                        <div className="font-medium text-[var(--c-text)]">{batch.productName}</div>
                        <div className="text-xs text-[var(--c-text3)]">{batch.sku} · {batch.batchNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{getLocationName(batch.locationId)}</td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{batch.manufactureDate}</td>
                  <td className="px-4 py-3 text-[var(--c-text2)]">{batch.expiryDate}</td>
                  <td className={cn("px-4 py-3 text-right", daysColor(d))}>{daysLabel(d)}</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text)]">{batch.remainingQty} / {batch.qty} шт</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text2)]">{fmt(batch.remainingQty * batch.costPrice)} ₽</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG[batch.status].color, STATUS_CONFIG[batch.status].bg)}>
                      {STATUS_CONFIG[batch.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleWriteOff(batch.id)}
                        title="Списать"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red)]/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => handleQuarantine(batch.id)}
                        title="Карантин"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-amber)] hover:bg-[var(--c-amber)]/10 transition"
                      >
                        <ShieldAlert size={13} />
                      </button>
                      <button
                        title="Переместить"
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-blue)] hover:bg-[var(--c-blue)]/10 transition"
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedFiltered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-[var(--c-text3)]">Партии не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <button
          onClick={() => setExpandedProduct(expandedProduct ? null : "all")}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
        >
          <div className="flex items-center gap-2">
            <Star size={15} className="text-[var(--c-green)]" />
            Рекомендации FEFO по товарам
          </div>
          <ChevronDown size={15} className={cn("text-[var(--c-text3)] transition", expandedProduct ? "rotate-180" : "")} />
        </button>
        {expandedProduct && (
          <div className="border-t border-[var(--c-border)] px-5 py-4 space-y-4">
            {Object.entries(fefoByProduct).map(([productId, productBatches]) => (
              <div key={productId}>
                <div className="text-xs font-medium text-[var(--c-text2)] mb-2">{productBatches[0]?.productName}</div>
                <div className="space-y-1.5">
                  {productBatches.map((b, idx) => (
                    <div key={b.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-xs", idx === 0 ? "bg-[var(--c-green)]/8 border border-[var(--c-green)]/20" : "bg-[var(--c-bg3)]")}>
                      {idx === 0 && <Star size={11} className="text-[var(--c-green)] shrink-0" />}
                      {idx > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[var(--c-text3)]/30 shrink-0" />}
                      <span className={idx === 0 ? "font-medium text-[var(--c-green)]" : "text-[var(--c-text2)]"}>
                        #{idx + 1} · {b.batchNumber}
                      </span>
                      <span className="text-[var(--c-text3)]">Истекает: {b.expiryDate}</span>
                      <span className="ml-auto text-[var(--c-text2)]">{b.remainingQty} шт</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--c-text)]">Зарегистрировать партию</h3>
              <button onClick={() => setShowRegister(false)} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Товар</label>
                <input
                  value={form.productSearch}
                  onChange={e => handleProductSearch(e.target.value)}
                  placeholder="Поиск товара..."
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
                {productResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg">
                    {productResults.map(p => (
                      <button key={p.id} onClick={() => selectProduct(p)} className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[var(--c-bg3)]">
                        <span className="text-[var(--c-text)]">{p.name}</span>
                        <span className="text-[var(--c-text3)]">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Номер партии</label>
                  <input
                    value={form.batchNumber}
                    onChange={e => setForm(p => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="BTH-2026-XXX"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Количество</label>
                  <input
                    type="number"
                    value={form.qty}
                    onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Дата производства</label>
                  <input
                    type="date"
                    value={form.manufactureDate}
                    onChange={e => setForm(p => ({ ...p, manufactureDate: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Срок годности</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Склад</label>
                <select
                  value={form.locationId}
                  onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                >
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Поставщик</label>
                <select
                  value={form.supplierId}
                  onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none"
                >
                  <option value="">Не указан</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRegister(false)} className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                  Отмена
                </button>
                <button
                  onClick={handleRegister}
                  disabled={!form.productId || !form.batchNumber || !form.expiryDate || !form.qty}
                  className="flex-1 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  Зарегистрировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
