import { describe, it, expect } from "vitest";
import { aggregateFromCompetitors } from "@/lib/analysis/marketAggregates";

describe("aggregateFromCompetitors", () => {
  it("returns null when no usable price data", () => {
    expect(aggregateFromCompetitors([])).toBeNull();
    expect(
      aggregateFromCompetitors([
        { price_rub: 0, review_count: 100 },
        { price_rub: null, review_count: 200 },
      ]),
    ).toBeNull();
  });

  it("computes median, percentiles, and average prices", () => {
    const rows = [
      { price_rub: 100, review_count: 0 },
      { price_rub: 200, review_count: 0 },
      { price_rub: 300, review_count: 0 },
      { price_rub: 400, review_count: 0 },
      { price_rub: 500, review_count: 0 },
    ];
    const agg = aggregateFromCompetitors(rows)!;
    expect(agg.sampleSize).toBe(5);
    expect(agg.medianPrice).toBe(300);
    expect(agg.p25Price).toBe(200);
    expect(agg.p75Price).toBe(400);
    expect(agg.averagePrice).toBe(300);
  });

  it("derives review medians and a top-10 estimate", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      price_rub: 1000 + i * 10,
      review_count: i * 10,
    }));
    const agg = aggregateFromCompetitors(rows)!;
    expect(agg.medianReviews).toBeGreaterThanOrEqual(80);
    expect(agg.medianReviews).toBeLessThanOrEqual(110);
    // The top-decile median should sit above the global median.
    expect(agg.top10MedianReviews).toBeGreaterThan(agg.medianReviews);
  });

  it("classifies seller concentration from top-3 share", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      price_rub: 1000,
      review_count: 0,
    }));
    // 70% of search volume on three sellers → high concentration.
    const sellersHigh = ["a", "a", "a", "b", "b", "b", "c", "c", "x", "y"];
    const high = aggregateFromCompetitors(rows, { sellerColumn: sellersHigh })!;
    expect(high.sellerCount).toBe(5);
    // 8/10 = 80% on the top-3 — should classify as high concentration.
    expect(high.concentrationLevel).toBe("high");

    // Evenly spread sellers → low concentration.
    const sellersLow = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const evenRows = Array.from({ length: 20 }, () => ({ price_rub: 1000, review_count: 0 }));
    const low = aggregateFromCompetitors(evenRows, { sellerColumn: sellersLow })!;
    expect(low.sellerCount).toBe(20);
    expect(low.concentrationLevel).toBe("low");
  });

  it("returns only positive prices in the percentile band", () => {
    const rows = [
      { price_rub: 0, review_count: 0 },
      { price_rub: -50, review_count: 0 },
      { price_rub: 1000, review_count: 0 },
      { price_rub: 2000, review_count: 0 },
      { price_rub: 3000, review_count: 0 },
    ];
    const agg = aggregateFromCompetitors(rows)!;
    expect(agg.p25Price).toBeGreaterThan(0);
    expect(agg.medianPrice).toBeGreaterThan(0);
  });
});
