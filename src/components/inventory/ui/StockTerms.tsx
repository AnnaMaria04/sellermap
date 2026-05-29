import { type Product, getAvailableStock } from "@/mock/inventory";
import { cn } from "@/lib/utils";

/**
 * Canonical inventory terminology — one source of truth so every panel uses the
 * same five words and colors (mirrors Shopify's On hand / Committed / Available
 * / Incoming / Unavailable model).
 */
export type StockTerm = "onHand" | "committed" | "available" | "incoming" | "unavailable";

export const STOCK_TERMS: Record<StockTerm, { label: string; short: string; hint: string; color: string }> = {
  onHand: {
    label: "В наличии",
    short: "Физически",
    hint: "Физический остаток на складе",
    color: "text-[var(--c-text)]",
  },
  available: {
    label: "Доступно",
    short: "Доступно",
    hint: "Можно продать: в наличии − резерв − брак − в пути",
    color: "text-[var(--c-green)]",
  },
  committed: {
    label: "Зарезервировано",
    short: "Резерв",
    hint: "Под заказы покупателей",
    color: "text-[var(--c-amber)]",
  },
  incoming: {
    label: "Ожидается",
    short: "В пути",
    hint: "В пути от поставщика",
    color: "text-[var(--c-blue)]",
  },
  unavailable: {
    label: "Недоступно",
    short: "Брак",
    hint: "Повреждено или удержано",
    color: "text-[var(--c-red)]",
  },
};

export interface StockBreakdown {
  onHand: number;
  available: number;
  committed: number;
  incoming: number;
  unavailable: number;
}

export function getStockBreakdown(product: Product): StockBreakdown {
  return {
    onHand: product.totalPhysical,
    available: getAvailableStock(product),
    committed: product.reservedUnits,
    incoming: product.inTransitUnits,
    unavailable: product.damagedUnits,
  };
}

/** Inline labelled value, e.g. "Резерв 12". Hidden when value is 0 unless showZero. */
export function StockStat({
  term,
  value,
  showZero = false,
  className,
}: {
  term: StockTerm;
  value: number;
  showZero?: boolean;
  className?: string;
}) {
  if (value === 0 && !showZero) return null;
  const t = STOCK_TERMS[term];
  return (
    <span className={cn("inline-flex items-baseline gap-1 text-xs", className)} title={t.hint}>
      <span className="text-[var(--c-text3)]">{t.short}</span>
      <span className={cn("font-semibold tabular", t.color)}>{value}</span>
    </span>
  );
}

/** Full breakdown row for a product — the standard stock summary used in detail views. */
export function StockBreakdownRow({ product, className }: { product: Product; className?: string }) {
  const b = getStockBreakdown(product);
  const order: StockTerm[] = ["available", "onHand", "committed", "incoming", "unavailable"];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {order.map((term) => (
        <StockStat key={term} term={term} value={b[term]} showZero={term === "available" || term === "onHand"} />
      ))}
    </div>
  );
}
