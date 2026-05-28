import { describe, it, expect } from "vitest";
import { fitElasticity, predictUnits, priceScenarios, priceAt, recentSalesAsPoints } from "@/lib/inventory/elasticity";
import type { Product, StockMovement } from "@/mock/inventory";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1", name: "Test", sku: "TEST-1",
    category: "Test", productType: "product", status: "active",
    hasVariants: false, variants: [],
    price: 1000, costPrice: 500,
    channels: [], tags: [], requiresLabeling: false,
    stockByLocation: {}, reservedUnits: 0, damagedUnits: 0, inTransitUnits: 0, totalPhysical: 0,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    ...overrides,
  };
}

function makeSale(productId: string, date: string, qty: number): StockMovement {
  return {
    id: `mv-${date}-${qty}`, type: "sale", productId, productName: productId, sku: productId,
    qtyBefore: 0, qtyAfter: 0, qtyDelta: -qty,
    locationId: "loc-main", userId: "u", userName: "u",
    createdAt: `${date}T00:00:00.000Z`,
  };
}

describe("fitElasticity", () => {
  it("returns null when fewer than 3 distinct points", () => {
    expect(fitElasticity([])).toBeNull();
    expect(fitElasticity([{ price: 100, weeklyUnits: 5 }, { price: 100, weeklyUnits: 6 }])).toBeNull();
  });

  it("returns null when all prices are identical", () => {
    expect(fitElasticity([
      { price: 100, weeklyUnits: 5 },
      { price: 100, weeklyUnits: 7 },
      { price: 100, weeklyUnits: 9 },
    ])).toBeNull();
  });

  it("recovers the elasticity coefficient for a clean log-log dataset", () => {
    // Synthetic: units = 100_000 * price^(-1.5)
    const points = [100, 150, 200, 250, 300].map((p) => ({
      price: p,
      weeklyUnits: Math.round(100_000 * Math.pow(p, -1.5)),
    }));
    const model = fitElasticity(points);
    expect(model).not.toBeNull();
    expect(model!.elasticity).toBeLessThan(-1);
    expect(model!.elasticity).toBeGreaterThan(-2);
    expect(model!.rSquared).toBeGreaterThan(0.9);
  });
});

describe("predictUnits + priceScenarios", () => {
  it("scenarios at ±10% are bracketed around the current price", () => {
    const model = fitElasticity([
      { price: 100, weeklyUnits: 100 },
      { price: 150, weeklyUnits: 60 },
      { price: 200, weeklyUnits: 40 },
    ])!;
    const s = priceScenarios(model, 150, 50);
    expect(s).toHaveLength(3);
    expect(s[0].price).toBe(135);
    expect(s[2].price).toBe(165);
    // Elastic demand: lower price → more units, higher price → fewer.
    expect(s[0].units).toBeGreaterThan(s[2].units);
    // Profit calc is sane (positive when price > cost).
    expect(s[1].profit).toBeGreaterThan(0);
  });

  it("predictUnits never returns negative", () => {
    const model = fitElasticity([
      { price: 100, weeklyUnits: 100 },
      { price: 200, weeklyUnits: 50 },
      { price: 300, weeklyUnits: 30 },
    ])!;
    expect(predictUnits(model, 1)).toBeGreaterThanOrEqual(0);
    expect(predictUnits(model, 10000)).toBeGreaterThanOrEqual(0);
  });
});

describe("priceAt + recentSalesAsPoints with priceHistory", () => {
  it("returns the price effective on a given date", () => {
    const p = makeProduct({
      price: 900,
      priceHistory: [
        { price: 1200, from: "2026-01-01" },
        { price: 1000, from: "2026-03-01" },
        { price: 900,  from: "2026-05-01" },
      ],
    });
    expect(priceAt(p, "2026-01-15")).toBe(1200);
    expect(priceAt(p, "2026-03-01")).toBe(1000);
    expect(priceAt(p, "2026-04-30")).toBe(1000);
    expect(priceAt(p, "2026-05-02")).toBe(900);
  });

  it("falls back to current price when no history", () => {
    const p = makeProduct({ price: 1500 });
    expect(priceAt(p, "2026-06-10")).toBe(1500);
  });

  it("buckets sales into (week × price) points using priceHistory", () => {
    const p = makeProduct({
      price: 900,
      priceHistory: [
        { price: 1200, from: "2026-01-01" },
        { price: 900,  from: "2026-03-01" },
      ],
    });
    const movements: StockMovement[] = [
      makeSale("p1", "2026-02-10", 3),
      makeSale("p1", "2026-02-12", 4),
      makeSale("p1", "2026-03-15", 8),
      makeSale("p1", "2026-03-17", 5),
    ];
    const points = recentSalesAsPoints(p, movements);
    // Two distinct prices → at least two points.
    const prices = points.map((x) => x.price);
    expect(prices).toContain(1200);
    expect(prices).toContain(900);
    // Higher price → fewer units; lower price → more units (in this synthetic data).
    const hi = points.find((x) => x.price === 1200)!;
    const lo = points.find((x) => x.price === 900)!;
    expect(lo.weeklyUnits).toBeGreaterThan(hi.weeklyUnits);
  });
});
