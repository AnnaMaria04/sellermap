import test from "node:test";
import assert from "node:assert/strict";
import { calculateUnitEconomics, buildEconomicsInput } from "../src/lib/analysis/economics";
import { makeDecision } from "../src/lib/analysis/decision-engine";
import { analyzeMarket } from "../src/lib/analysis/market-analysis";
import { fingerprintSupplierProduct } from "../src/lib/analysis/product-fingerprint";
import { inferSupplierTitleFromUrl, parseSupplierDimensionText, parseSupplierWeightKg } from "../src/lib/supplierParsing";
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
  assert.ok(["strong_opportunity", "can_test", "research_more", "risky", "reject"].includes(decision.verdict));
  assert.equal(typeof decision.opportunityScore, "number");
  assert.ok(decision.mainReasons.length >= 3);
});

test("Alibaba URL fallback creates a useful product identity", () => {
  const title = inferSupplierTitleFromUrl("https://www.alibaba.com/product-detail/UNI-POSCA-PC-3M-High-Quality_1601453694879.html");
  assert.equal(title, "UNI POSCA PC 3M High Quality");
});

test("supplier normalization prefers package dimensions and gross weight", () => {
  const dimensions = parseSupplierDimensionText("15X1X1 cm");
  const weight = parseSupplierWeightKg("0.030 kg");
  assert.deepEqual(dimensions, { length: 15, width: 1, height: 1, unit: "cm" });
  assert.equal(weight, 0.03);
});

test("decision blocks launch verdict when supplier cost is missing", () => {
  const noCostSupplier = { ...supplier, supplierPriceMin: null };
  const fingerprint = fingerprintSupplierProduct(noCostSupplier);
  const market = analyzeMarket(noCostSupplier, fingerprint, competitors);
  const economics = calculateUnitEconomics(buildEconomicsInput(noCostSupplier, market, { fxRate: 90, targetPriceRub: 790 }), market);
  const decision = makeDecision({ supplier: noCostSupplier, fingerprint, market, economics });
  assert.equal(decision.verdict, "needs_more_data");
  assert.ok(decision.mainRisks.includes("Нет подтверждённой цены поставщика"));
});
