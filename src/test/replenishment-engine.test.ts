import { describe, it, expect } from "vitest";
import {
  computeReplenishment,
  dailyVelocity,
  salesFromMovements,
  salesFromOrders,
  suggestionsToDraftPOs,
  type SalesPoint,
} from "@/lib/replenishment/engine";
import type { Product, ReplenishmentRule, StockMovement, Order } from "@/mock/inventory";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1", name: "Test", sku: "TEST-1",
    category: "Test", productType: "product", status: "active",
    hasVariants: false, variants: [],
    price: 1000, costPrice: 400,
    channels: [], tags: [], requiresLabeling: false,
    stockByLocation: { "loc-main": 5 }, reservedUnits: 0, damagedUnits: 0, inTransitUnits: 0, totalPhysical: 5,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    ...overrides,
  };
}

function makeRule(overrides: Partial<ReplenishmentRule> = {}): ReplenishmentRule {
  return {
    id: "rule-1", productId: "p1", productName: "Test", sku: "TEST-1",
    triggerType: "min_stock", reorderQty: 50, isActive: true,
    nextCheck: "2026-06-01",
    ...overrides,
  };
}

const NOW = new Date("2026-05-30T00:00:00Z");

describe("dailyVelocity", () => {
  it("averages units sold over the window", () => {
    const sales: SalesPoint[] = [
      { productId: "p1", qty: 30, date: "2026-05-20" },
      { productId: "p1", qty: 30, date: "2026-05-25" },
      { productId: "p2", qty: 100, date: "2026-05-25" },
    ];
    expect(dailyVelocity("p1", sales, 30, NOW)).toBe(2); // 60 / 30
  });

  it("ignores sales outside the window", () => {
    const sales: SalesPoint[] = [{ productId: "p1", qty: 300, date: "2026-01-01" }];
    expect(dailyVelocity("p1", sales, 30, NOW)).toBe(0);
  });
});

describe("computeReplenishment", () => {
  it("triggers a min_stock rule when available is at or below the minimum", () => {
    const s = computeReplenishment({
      products: [makeProduct({ totalPhysical: 5 })],
      rules: [makeRule({ triggerType: "min_stock", minStock: 10, reorderQty: 50 })],
      sales: [], now: NOW,
    });
    expect(s).toHaveLength(1);
    expect(s[0].recommendedQty).toBe(50);
    expect(s[0].available).toBe(5);
  });

  it("does not trigger when stock is comfortably above the minimum", () => {
    const s = computeReplenishment({
      products: [makeProduct({ totalPhysical: 100 })],
      rules: [makeRule({ triggerType: "min_stock", minStock: 10 })],
      sales: [], now: NOW,
    });
    expect(s).toHaveLength(0);
  });

  it("subtracts reserved and damaged units from available", () => {
    const s = computeReplenishment({
      products: [makeProduct({ totalPhysical: 20, reservedUnits: 8, damagedUnits: 4 })],
      rules: [makeRule({ triggerType: "min_stock", minStock: 10 })],
      sales: [], now: NOW,
    });
    expect(s).toHaveLength(1); // available = 8 <= 10
    expect(s[0].available).toBe(8);
  });

  it("days_of_stock orders enough to cover the horizon", () => {
    // velocity 2/day, available 5 -> 2.5 days remaining <= 7 target -> trip.
    const sales: SalesPoint[] = [{ productId: "p1", qty: 60, date: "2026-05-25" }];
    const s = computeReplenishment({
      products: [makeProduct({ totalPhysical: 5 })],
      rules: [makeRule({ triggerType: "days_of_stock", daysOfStock: 7, reorderQty: 10 })],
      sales, now: NOW,
    });
    expect(s).toHaveLength(1);
    // target = ceil(2*7)=14, minus available 5 = 9; but reorderQty floor is 10.
    expect(s[0].recommendedQty).toBe(10);
    expect(s[0].dailyVelocity).toBe(2);
  });

  it("days_of_stock does not trigger with ample coverage", () => {
    const sales: SalesPoint[] = [{ productId: "p1", qty: 30, date: "2026-05-25" }];
    const s = computeReplenishment({
      products: [makeProduct({ totalPhysical: 100 })],
      rules: [makeRule({ triggerType: "days_of_stock", daysOfStock: 7 })],
      sales, now: NOW,
    });
    expect(s).toHaveLength(0);
  });

  it("skips inactive rules and unknown products", () => {
    const s = computeReplenishment({
      products: [makeProduct()],
      rules: [
        makeRule({ id: "r1", isActive: false, minStock: 10 }),
        makeRule({ id: "r2", productId: "ghost", minStock: 10 }),
      ],
      sales: [], now: NOW,
    });
    expect(s).toHaveLength(0);
  });

  it("sorts the most urgent suggestions first", () => {
    const sales: SalesPoint[] = [
      { productId: "p1", qty: 300, date: "2026-05-29" }, // fast mover
      { productId: "p2", qty: 30, date: "2026-05-29" },
    ];
    const s = computeReplenishment({
      products: [
        makeProduct({ id: "p1", totalPhysical: 5 }),
        makeProduct({ id: "p2", totalPhysical: 5 }),
      ],
      rules: [
        makeRule({ id: "r1", productId: "p1", triggerType: "days_of_stock", daysOfStock: 30 }),
        makeRule({ id: "r2", productId: "p2", triggerType: "days_of_stock", daysOfStock: 30 }),
      ],
      sales, now: NOW,
    });
    expect(s[0].productId).toBe("p1"); // fewer days remaining
  });
});

describe("salesFromMovements / salesFromOrders", () => {
  it("derives sales points from sale movements", () => {
    const movements: StockMovement[] = [
      { id: "m1", type: "sale", productId: "p1", productName: "x", sku: "s", qtyBefore: 5, qtyAfter: 4, qtyDelta: -1, locationId: "loc-main", userId: "u", userName: "U", createdAt: "2026-05-25" },
      { id: "m2", type: "receipt", productId: "p1", productName: "x", sku: "s", qtyBefore: 4, qtyAfter: 14, qtyDelta: 10, locationId: "loc-main", userId: "u", userName: "U", createdAt: "2026-05-26" },
    ];
    const pts = salesFromMovements(movements);
    expect(pts).toHaveLength(1);
    expect(pts[0]).toEqual({ productId: "p1", qty: 1, date: "2026-05-25" });
  });

  it("ignores cancelled and returned orders", () => {
    const orders = [
      { id: "o1", status: "delivered", createdAt: "2026-05-25", items: [{ productId: "p1", qty: 2 }] },
      { id: "o2", status: "cancelled", createdAt: "2026-05-25", items: [{ productId: "p1", qty: 9 }] },
    ] as unknown as Order[];
    const pts = salesFromOrders(orders);
    expect(pts).toHaveLength(1);
    expect(pts[0].qty).toBe(2);
  });
});

describe("suggestionsToDraftPOs", () => {
  it("groups suggestions into one draft PO per supplier with totals", () => {
    const products = [
      makeProduct({ id: "p1", costPrice: 100, supplierId: "sup-1" }),
      makeProduct({ id: "p2", costPrice: 200, supplierId: "sup-1" }),
    ];
    const rules = [
      makeRule({ id: "r1", productId: "p1", minStock: 10 }),
      makeRule({ id: "r2", productId: "p2", minStock: 10 }),
    ];
    const suggestions = computeReplenishment({ products, rules, sales: [], now: NOW });
    const pos = suggestionsToDraftPOs(suggestions, products);
    expect(pos).toHaveLength(1);
    expect(pos[0].lines).toHaveLength(2);
    expect(pos[0].totalQty).toBe(100); // 50 + 50
    expect(pos[0].totalCost).toBe(50 * 100 + 50 * 200);
  });
});
