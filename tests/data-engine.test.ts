import assert from "node:assert/strict";
import test from "node:test";
import { calculateHistoricalConfidence } from "../src/lib/analysis/confidence-score";
import { calculateDailyMarketMetrics } from "../src/lib/analysis/daily-market-metrics";
import { calculatePriceChangeFromHistory, calculateReviewGrowthFromHistory } from "../src/lib/analysis/historical-metrics-core";
import { estimateSalesFromReviewVelocity, estimateSalesFromSnapshots, proxyOnlyEstimate } from "../src/lib/analysis/sales-estimation";
import type { WBProduct } from "../src/lib/providers/market/types";

const products: WBProduct[] = [
  { nmId: "1", title: "Маркер A", priceRub: 500, reviewCount: 100, sellerName: "A", searchKeyword: "маркер", searchPosition: 1, source: "own-wb" },
  { nmId: "2", title: "Маркер B", priceRub: 700, reviewCount: 300, sellerName: "B", searchKeyword: "маркер", searchPosition: 2, source: "own-wb" },
  { nmId: "3", title: "Маркер C", priceRub: 900, reviewCount: 500, sellerName: "A", searchKeyword: "маркер", searchPosition: 3, source: "own-wb" },
];

test("daily market metrics calculate price and seller concentration", () => {
  const metrics = calculateDailyMarketMetrics("маркер", products, "Канцтовары");
  assert.equal(metrics.median_price, 700);
  assert.equal(metrics.p25_price, 500);
  assert.equal(metrics.p75_price, 700);
  assert.equal(metrics.seller_count, 2);
  assert.equal(metrics.top3_seller_share, 1);
});

test("historical metrics calculate review and price deltas", () => {
  const history = [
    { nm_id: "1", query: "маркер", price_rub: 700, review_count: 100, search_position: 3, stock_signal: null, created_at: "2026-01-01T00:00:00Z" },
    { nm_id: "1", query: "маркер", price_rub: 650, review_count: 145, search_position: 2, stock_signal: null, created_at: "2026-01-31T00:00:00Z" },
  ];
  assert.equal(calculateReviewGrowthFromHistory(history), 45);
  assert.equal(calculatePriceChangeFromHistory(history), -50);
});

test("review velocity produces estimated range, proxy only returns null sales", () => {
  const estimate = estimateSalesFromReviewVelocity({
    nmId: "1",
    currentReviews: 145,
    previousReviews: 100,
    priceRub: 650,
    daysOfHistory: 30,
    snapshotCount: 4,
  });
  assert.equal(estimate.method, "review_velocity_estimate");
  assert.equal(estimate.estimatedSalesLow, 225);
  assert.equal(estimate.estimatedSalesMid, 450);
  assert.equal(estimate.estimatedRevenueHigh, 585000);

  const proxy = proxyOnlyEstimate("1");
  assert.equal(proxy.method, "proxy_only");
  assert.equal(proxy.estimatedSalesLow, null);
});

test("snapshot sales estimate requires enough history", () => {
  const estimate = estimateSalesFromSnapshots("1", [
    { nm_id: "1", price_rub: 700, review_count: 100, created_at: "2026-01-01T00:00:00Z" },
    { nm_id: "1", price_rub: 650, review_count: 145, created_at: "2026-01-31T00:00:00Z" },
  ]);
  assert.equal(estimate.method, "review_velocity_estimate");
});

test("confidence score improves with history and source quality", () => {
  const confidence = calculateHistoricalConfidence({
    daysOfHistory: 30,
    snapshotCount: 8,
    competitorsAnalyzed: 30,
    hasReviewGrowth: true,
    hasRankHistory: true,
    hasStockSignal: false,
    source: "own-wb",
  });
  assert.ok(confidence.score > 60);
  assert.ok(["medium", "high"].includes(confidence.level));
});
