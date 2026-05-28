import type { Product, StockMovement } from "@/mock/inventory";

/**
 * Lightweight price-elasticity helper.
 *
 * Real elasticity needs price-history-per-day × sales-per-day. Until that table
 * exists, we approximate with what we have:
 *  - Today's price (`product.price`) is our only observed price point.
 *  - Sales history comes from `stock_movements` of type "sale".
 *
 * Without ≥3 different historical price points we can't fit a meaningful
 * regression, so this lib focuses on:
 *  (a) telling the caller whether it has enough data, and
 *  (b) when it does (a price-history input is provided), returning the
 *      regression coefficient + revenue/profit scenarios at ±10%.
 */

export interface PricePoint { price: number; weeklyUnits: number }

export interface ElasticityResult {
  /** Sample size used for the fit. */
  samples: number;
  /** Elasticity coefficient (∆Q% / ∆P%). Negative for normal goods. */
  elasticity: number;
  /** R² of the linear fit on log(price) vs log(units). */
  rSquared: number;
  /** Slope and intercept of the log-log regression. */
  slope: number;
  intercept: number;
}

/** Fit log(units) = intercept + slope * log(price). Slope = elasticity. */
export function fitElasticity(points: PricePoint[]): ElasticityResult | null {
  const usable = points.filter((p) => p.price > 0 && p.weeklyUnits > 0);
  if (usable.length < 3) return null;
  // Need at least two distinct prices.
  const distinctPrices = new Set(usable.map((p) => p.price));
  if (distinctPrices.size < 2) return null;

  const xs = usable.map((p) => Math.log(p.price));
  const ys = usable.map((p) => Math.log(p.weeklyUnits));
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  // R²
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * xs[i];
    ssRes += (ys[i] - yHat) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { samples: n, elasticity: slope, rSquared, slope, intercept };
}

/** Predicted weekly units at a candidate price using the fitted model. */
export function predictUnits(model: ElasticityResult, price: number): number {
  return Math.max(0, Math.exp(model.intercept + model.slope * Math.log(price)));
}

export interface PriceScenario {
  label: string;
  price: number;
  units: number;
  revenue: number;
  profit: number;
}

export function priceScenarios(
  model: ElasticityResult,
  currentPrice: number,
  costPrice: number,
): PriceScenario[] {
  const make = (label: string, factor: number): PriceScenario => {
    const price = Math.round(currentPrice * factor);
    const units = predictUnits(model, price);
    const revenue = price * units;
    const profit = (price - costPrice) * units;
    return { label, price, units, revenue, profit };
  };
  return [
    make("−10%", 0.9),
    make("Текущая", 1),
    make("+10%", 1.1),
  ];
}

/** Convenience: build PricePoint[] for a product from movements.
 *  Today every sale uses the current product price, so this returns a single
 *  observation. Once a price-change-history table exists this gets richer. */
export function recentSalesAsPoints(product: Product, movements: StockMovement[]): PricePoint[] {
  const sales = movements.filter((m) => m.type === "sale" && m.productId === product.id);
  if (sales.length === 0) return [];
  // Bucket by ISO week to approximate weekly_units at this single price point.
  const byWeek = new Map<string, number>();
  for (const m of sales) {
    const week = m.createdAt.slice(0, 10);
    byWeek.set(week, (byWeek.get(week) ?? 0) + Math.abs(m.qtyDelta));
  }
  return [...byWeek.values()].map((units) => ({ price: product.price, weeklyUnits: units }));
}
