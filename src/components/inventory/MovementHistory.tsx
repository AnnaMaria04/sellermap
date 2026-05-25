"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  SlidersHorizontal,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  MOVEMENTS,
  LOCATIONS,
  PRODUCTS,
  MOVEMENT_LABELS,
  getLocationName,
  type MovementType,
} from "@/mock/inventory";
import { MovementTypeBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";

export function MovementHistory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...MOVEMENTS];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.reason?.toLowerCase().includes(q) ||
          m.userName.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((m) => m.type === typeFilter);
    }
    if (locationFilter !== "all") {
      list = list.filter((m) => m.locationId === locationFilter);
    }
    if (productFilter !== "all") {
      list = list.filter((m) => m.productId === productFilter);
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [search, typeFilter, locationFilter, productFilter]);

  const stats = useMemo(() => {
    const all = MOVEMENTS;
    const inbound = all.filter((m) => m.qtyDelta > 0).reduce((s, m) => s + m.qtyDelta, 0);
    const outbound = all.filter((m) => m.qtyDelta < 0).reduce((s, m) => s + Math.abs(m.qtyDelta), 0);
    return { total: all.length, inbound, outbound };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Операций</p>
          <p className="text-2xl font-bold text-[var(--c-text)]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Приход (ед.)</p>
          <p className="text-2xl font-bold text-[var(--c-green)]">+{stats.inbound}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Расход (ед.)</p>
          <p className="text-2xl font-bold text-[var(--c-red)]">−{stats.outbound}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по товару, SKU, пользователю..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as MovementType | "all")}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все типы</option>
          {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все локации</option>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все товары</option>
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
          <Download size={14} />
          Экспорт
        </button>
      </div>

      <p className="text-sm text-[var(--c-text2)]">{filtered.length} операций</p>

      {/* Timeline */}
      <div className="relative space-y-0 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-[var(--c-text3)]">Операции не найдены</div>
        )}
        {filtered.map((movement, idx) => {
          const isPositive = movement.qtyDelta > 0;
          const isNeutral = movement.qtyDelta === 0;
          const locationName = getLocationName(movement.locationId);

          return (
            <div
              key={movement.id}
              className={cn(
                "flex items-start gap-4 px-5 py-4 transition hover:bg-[var(--c-bg3)]",
                idx !== filtered.length - 1 && "border-b border-[var(--c-border)]",
              )}
            >
              {/* Delta indicator */}
              <div className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isPositive
                  ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                  : isNeutral
                  ? "bg-[var(--c-bg3)] text-[var(--c-text3)]"
                  : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
              )}>
                {isPositive ? <ArrowUpRight size={15} /> : isNeutral ? <Minus size={15} /> : <ArrowDownRight size={15} />}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[var(--c-text)]">{movement.productName}</p>
                      <MovementTypeBadge type={movement.type} />
                    </div>
                    <p className="text-xs text-[var(--c-text3)] mt-0.5">{movement.sku} · {locationName}</p>
                    {movement.reason && (
                      <p className="text-xs text-[var(--c-text2)] mt-1">{movement.reason}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-base font-bold tabular",
                      isPositive ? "text-[var(--c-green)]" : isNeutral ? "text-[var(--c-text2)]" : "text-[var(--c-red)]",
                    )}>
                      {isPositive ? "+" : ""}{movement.qtyDelta}
                    </p>
                    <p className="text-xs text-[var(--c-text3)] tabular">
                      {movement.qtyBefore} → {movement.qtyAfter}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-[var(--c-text3)]">{formatDateTime(movement.createdAt)}</p>
                  <p className="text-xs text-[var(--c-text3)]">{movement.userName}</p>
                  {movement.referenceId && (
                    <p className="text-xs text-[var(--c-text3)]">
                      Ссылка: <span className="text-[var(--c-blue)]">{movement.referenceId.toUpperCase()}</span>
                    </p>
                  )}
                  {movement.note && (
                    <p className="text-xs text-[var(--c-text2)] italic">{movement.note}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
