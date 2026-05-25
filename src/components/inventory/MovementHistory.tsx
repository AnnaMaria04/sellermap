"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  History,
} from "lucide-react";
import {
  MOVEMENT_LABELS,
  getLocationName,
  type MovementType,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { MovementTypeBadge } from "./StockStatusBadge";
import { exportData } from "@/lib/export";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

// Matches the actual MovementType values in mock/inventory.ts
const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = MOVEMENT_LABELS;

export function MovementHistory() {
  const { movements, locations, products } = useInventory();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const typeFilter = (searchParams.get("type") ?? "all") as MovementType | "all";
  const locationFilter = searchParams.get("location") ?? "all";
  const productFilter = searchParams.get("product") ?? "all";
  const page = Number(searchParams.get("page") ?? "1");

  // Product search box state (local, not URL — URL stores productId)
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Text search (local state, not URL — for immediate filtering without route changes)
  const [search, setSearch] = useState("");

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // reset to page 1 on filter change
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setPageParam(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  // Sync product search input label from URL productFilter
  useEffect(() => {
    if (productFilter === "all") {
      setProductSearch("");
    } else {
      const prod = products.find((p) => p.id === productFilter);
      if (prod) setProductSearch(prod.name);
    }
  }, [productFilter, products]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 30);
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [products, productSearch]);

  // Main filtering + sorting
  const filtered = useMemo(() => {
    let list = [...movements];

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
  }, [movements, search, typeFilter, locationFilter, productFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    const all = movements;
    const inbound = all.filter((m) => m.qtyDelta > 0).reduce((s, m) => s + m.qtyDelta, 0);
    const outbound = all.filter((m) => m.qtyDelta < 0).reduce((s, m) => s + Math.abs(m.qtyDelta), 0);
    return { total: all.length, inbound, outbound };
  }, [movements]);

  const hasFilters = typeFilter !== "all" || locationFilter !== "all" || productFilter !== "all";

  function handleExport() {
    exportData({
      filename: "history",
      title: "История движений",
      format: "csv",
      columns: [
        {
          key: "createdAt",
          label: "Дата",
          format: (m) => new Date(m.createdAt).toLocaleString("ru-RU"),
        },
        {
          key: "type",
          label: "Тип",
          format: (m) => MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
        },
        {
          key: "productId",
          label: "Товар",
          format: (m) => products.find((p) => p.id === m.productId)?.name ?? m.productName,
        },
        {
          key: "locationId",
          label: "Локация",
          format: (m) => locations.find((l) => l.id === m.locationId)?.name ?? getLocationName(m.locationId),
        },
        {
          key: "qtyDelta",
          label: "Количество",
          format: (m) => String(m.qtyDelta),
        },
        {
          key: "qtyAfter",
          label: "Остаток после",
          format: (m) => String(m.qtyAfter),
        },
        {
          key: "reason",
          label: "Причина",
          format: (m) => m.reason ?? "",
        },
      ],
      rows: filtered,
    });
  }

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
        {/* Text search */}
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

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setFilter("type", e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все типы</option>
          {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Location filter */}
        <select
          value={locationFilter}
          onChange={(e) => setFilter("location", e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все локации</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Product search input */}
        <div ref={productSearchRef} className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none" />
          <input
            type="text"
            placeholder="Товар..."
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setProductDropdownOpen(true);
              if (e.target.value === "") {
                setFilter("product", "all");
              }
            }}
            onFocus={() => setProductDropdownOpen(true)}
            className="h-9 w-44 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-7 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
          {productFilter !== "all" && (
            <button
              onClick={() => {
                setProductSearch("");
                setFilter("product", "all");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text)]"
              aria-label="Сбросить фильтр товара"
            >
              ×
            </button>
          )}
          {productDropdownOpen && filteredProducts.length > 0 && (
            <div className="absolute top-10 left-0 z-50 w-64 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-lg max-h-56 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProductSearch(p.name);
                    setFilter("product", p.id);
                    setProductDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[var(--c-bg3)] transition",
                    productFilter === p.id && "bg-[var(--c-bg3)]",
                  )}
                >
                  <span className="text-sm text-[var(--c-text)] truncate w-full">{p.name}</span>
                  <span className="text-xs text-[var(--c-text3)]">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
        >
          <Download size={14} />
          Экспорт
        </button>
      </div>

      <p className="text-sm text-[var(--c-text2)]">{filtered.length} операций</p>

      {/* Timeline */}
      <div className="relative space-y-0 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History size={40} className="text-[var(--c-text3)] mb-3" />
            <p className="text-sm font-medium text-[var(--c-text)]">Нет движений</p>
            <p className="text-xs text-[var(--c-text3)] mt-1">
              {hasFilters
                ? "Попробуйте изменить фильтры"
                : "Движения товаров появятся здесь"}
            </p>
            {hasFilters && (
              <button
                onClick={() => router.replace(pathname)}
                className="mt-3 text-xs text-[var(--c-green)] hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          paginated.map((movement, idx) => {
            const isPositive = movement.qtyDelta > 0;
            const isNeutral = movement.qtyDelta === 0;
            const locationName = getLocationName(movement.locationId);

            return (
              <div
                key={movement.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition hover:bg-[var(--c-bg3)]",
                  idx !== paginated.length - 1 && "border-b border-[var(--c-border)]",
                )}
              >
                {/* Delta indicator */}
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isPositive
                      ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                      : isNeutral
                      ? "bg-[var(--c-bg3)] text-[var(--c-text3)]"
                      : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight size={15} />
                  ) : isNeutral ? (
                    <Minus size={15} />
                  ) : (
                    <ArrowDownRight size={15} />
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[var(--c-text)]">{movement.productName}</p>
                        <MovementTypeBadge type={movement.type} />
                      </div>
                      <p className="text-xs text-[var(--c-text3)] mt-0.5">
                        {movement.sku} · {locationName}
                      </p>
                      {movement.reason && (
                        <p className="text-xs text-[var(--c-text2)] mt-1">{movement.reason}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-base font-bold tabular",
                          isPositive
                            ? "text-[var(--c-green)]"
                            : isNeutral
                            ? "text-[var(--c-text2)]"
                            : "text-[var(--c-red)]",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {movement.qtyDelta}
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
                        Ссылка:{" "}
                        <span className="text-[var(--c-blue)]">
                          {movement.referenceId.toUpperCase()}
                        </span>
                      </p>
                    )}
                    {movement.note && (
                      <p className="text-xs text-[var(--c-text2)] italic">{movement.note}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4">
          <button
            disabled={safePage <= 1}
            onClick={() => setPageParam(safePage - 1)}
            className="flex h-8 items-center gap-1 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Назад
          </button>
          <span className="text-sm text-[var(--c-text2)]">
            Страница {safePage} из {totalPages} · {filtered.length} записей
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPageParam(safePage + 1)}
            className="flex h-8 items-center gap-1 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Вперёд →
          </button>
        </div>
      )}
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
