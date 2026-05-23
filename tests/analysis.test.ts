import test from "node:test";
import assert from "node:assert/strict";
import { calculateUnitEconomics, buildEconomicsInput } from "../src/lib/analysis/economics";
import { makeDecision } from "../src/lib/analysis/decision-engine";
import { analyzeMarket } from "../src/lib/analysis/market-analysis";
import { fingerprintSupplierProduct } from "../src/lib/analysis/product-fingerprint";
import type { SupplierProduct } from "../src/lib/providers/supplier/types";
import type { WBProduct } from "../src/lib/providers/market/types";

const supplier: SupplierProduct = {
  supplierUrl: "manual://posca",
  platform: "manual",
  productTitle: "UNI POSCA PC-3M High Quality Acrylic Paint Marker",
  productImages: [],
  supplierPriceMin: 1.2,
  currency: "USD",
  moq: 10,
  specs: { model: "PC-3M" },
  packageSize: { lengthCm: 15, widthCm: 1, heightCm: 1 },
  grossWeightKg: 0.03,
};

const competitors: WBProduct[] = [
  { nmId: "1", title: "Акриловый маркер POSCA", priceRub: 690, rating: 4.9, reviewCount: 1200, sellerName: "A", searchKeyword: "акриловый маркер", searchPosition: 1, source: "apify" },
  { nmId: "2", title: "Набор акриловых маркеров", priceRub: 790, rating: 4.8, reviewCount: 900, sellerName: "B", searchKeyword: "акриловый маркер", searchPosition: 2, source: "apify" },
  { nmId: "3", title: "Маркер для рисования", priceRub: 590, rating: 4.7, reviewCount: 400, sellerName: "C", searchKeyword: "маркер для рисования", searchPosition: 3, source: "apify" },
  { nmId: "4", title: "Перманентный маркер", priceRub: 490, rating: 4.5, reviewCount: 120, sellerName: "A", searchKeyword: "перманентный маркер", searchPosition: 4, source: "apify" },
];

test("fingerprint creates Russian WB keywords from supplier title", () => {
  const fingerprint = fingerprintSupplierProduct(supplier);
  assert.equal(fingerprint.productType, "акриловый маркер");
  assert.ok(fingerprint.ruKeywords.includes("акриловый маркер"));
});

test("market analysis calculates robust price and review stats", () => {
  const fingerprint = fingerprintSupplierProduct(supplier);
  const market = analyzeMarket(supplier, fingerprint, competitors);
  assert.equal(market.priceStats.median, 640);
  assert.equal(market.reviewStats.max, 1200);
  assert.equal(market.sellerConcentration.sellerCount, 3);
  assert.ok(market.demand.demandScore > 0);
});

test("economics calculates margin and break-even without NaN", () => {
  const fingerprint = fingerprintSupplierProduct(supplier);
  const market = analyzeMarket(supplier, fingerprint, competitors);
  const input = buildEconomicsInput(supplier, market, { fxRate: 90, targetPriceRub: 790 });
  const economics = calculateUnitEconomics(input, market);
  assert.ok(Number.isFinite(economics.marginPercent));
  assert.ok(economics.breakEvenPriceRub > 0);
});

test("decision engine returns an actionable verdict", () => {
  const fingerprint = fingerprintSupplierProduct(supplier);
  const market = analyzeMarket(supplier, fingerprint, competitors);
  const economics = calculateUnitEconomics(buildEconomicsInput(supplier, market, { fxRate: 90, targetPriceRub: 790 }), market);
  const decision = makeDecision({ supplier, fingerprint, market, economics });
  assert.ok(["worth_testing", "risky", "avoid", "needs_more_data"].includes(decision.verdict));
  assert.equal(typeof decision.opportunityScore, "number");
  assert.ok(decision.mainReasons.length >= 3);
});
