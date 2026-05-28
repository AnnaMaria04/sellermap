import { describe, it, expect } from "vitest";
import { fitElasticity, predictUnits, priceScenarios } from "@/lib/inventory/elasticity";

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
