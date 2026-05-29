import { describe, it, expect } from "vitest";
import {
  priceCart,
  isPromotionEligible,
  promotionDiscount,
  type CartLine,
} from "@/lib/promotions/engine";
import type { Promotion } from "@/mock/inventory";

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo-x",
    name: "Test promo",
    type: "percentage",
    status: "active",
    channels: ["all"],
    discountValue: 10,
    productIds: [],
    usageCount: 0,
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
    createdAt: "2026-01-01",
    ...overrides,
  };
}

const NOW = new Date("2026-05-15T12:00:00Z");

const cart: CartLine[] = [
  { id: "l1", productId: "p1", category: "Одежда", qty: 2, unitPrice: 1000 },
  { id: "l2", productId: "p2", category: "Электроника", qty: 1, unitPrice: 3000 },
];

describe("isPromotionEligible", () => {
  it("rejects non-active promotions", () => {
    expect(isPromotionEligible(promo({ status: "paused" }), cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(promo({ status: "scheduled" }), cart, { channel: "pos", now: NOW })).toBe(false);
  });

  it("respects the active date window", () => {
    const p = promo({ startsAt: "2026-06-01", endsAt: "2026-06-30" });
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(p, cart, { channel: "pos", now: new Date("2026-06-15") })).toBe(true);
  });

  it("treats endsAt as inclusive of the whole day", () => {
    const p = promo({ endsAt: "2026-05-15" });
    expect(isPromotionEligible(p, cart, { channel: "pos", now: new Date("2026-05-15T23:00:00Z") })).toBe(true);
  });

  it("matches channels", () => {
    const p = promo({ channels: ["website"] });
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(p, cart, { channel: "website", now: NOW })).toBe(true);
  });

  it("requires a matching promo code when one is set", () => {
    const p = promo({ promoCode: "HELLO10" });
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW, promoCode: "hello10" })).toBe(true);
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW, promoCode: "WRONG" })).toBe(false);
  });

  it("enforces usage limits", () => {
    expect(isPromotionEligible(promo({ usageLimit: 5, usageCount: 5 }), cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(promo({ usageLimit: 5, usageCount: 4 }), cart, { channel: "pos", now: NOW })).toBe(true);
  });

  it("enforces minimum order amount against the targeted subtotal", () => {
    const p = promo({ minOrderAmount: 10000 });
    expect(isPromotionEligible(p, cart, { channel: "pos", now: NOW })).toBe(false);
  });

  it("requires the promotion to target at least one line", () => {
    expect(isPromotionEligible(promo({ productIds: ["nope"] }), cart, { channel: "pos", now: NOW })).toBe(false);
    expect(isPromotionEligible(promo({ categoryFilter: "Игрушки" }), cart, { channel: "pos", now: NOW })).toBe(false);
  });
});

describe("promotionDiscount", () => {
  it("percentage discounts every targeted line", () => {
    const r = promotionDiscount(promo({ discountValue: 10 }), cart);
    // 10% of (2000 + 3000) = 500
    expect(r.discount).toBe(500);
    expect(r.lineDiscounts.l1).toBe(200);
    expect(r.lineDiscounts.l2).toBe(300);
  });

  it("percentage honours category filter", () => {
    const r = promotionDiscount(promo({ discountValue: 30, categoryFilter: "Одежда" }), cart);
    expect(r.discount).toBe(600); // 30% of 2000
    expect(r.lineDiscounts.l2).toBeUndefined();
  });

  it("fixed amount is capped at and distributed across the targeted subtotal", () => {
    const r = promotionDiscount(promo({ type: "fixed", discountValue: 500 }), cart);
    expect(r.discount).toBe(500);
    // pro-rata: 2000/5000*500=200, 3000/5000*500=300
    expect(r.lineDiscounts.l1).toBe(200);
    expect(r.lineDiscounts.l2).toBe(300);
  });

  it("fixed amount never exceeds the targeted subtotal", () => {
    const single: CartLine[] = [{ id: "l1", productId: "p1", qty: 1, unitPrice: 300 }];
    const r = promotionDiscount(promo({ type: "fixed", discountValue: 500 }), single);
    expect(r.discount).toBe(300);
  });

  it("bogo discounts every second unit fully by default", () => {
    const r = promotionDiscount(promo({ type: "bogo", discountValue: 100, productIds: ["p1"] }), cart);
    // qty 2 -> 1 free unit at 1000
    expect(r.discount).toBe(1000);
  });

  it("bundle_price discounts down to the fixed bundle price", () => {
    const r = promotionDiscount(promo({ type: "bundle_price", discountValue: 4000 }), cart);
    // subtotal 5000 -> bundle price 4000 -> saving 1000
    expect(r.discount).toBe(1000);
  });

  it("free_shipping produces no line discount", () => {
    const r = promotionDiscount(promo({ type: "free_shipping" }), cart);
    expect(r.discount).toBe(0);
    expect(r.freeShipping).toBe(true);
  });
});

describe("priceCart", () => {
  it("applies only the best single promotion by default", () => {
    const promos = [
      promo({ id: "a", discountValue: 10 }), // 500
      promo({ id: "b", discountValue: 30, categoryFilter: "Одежда" }), // 600
    ];
    const r = priceCart(cart, promos, { channel: "pos", now: NOW });
    expect(r.subtotal).toBe(5000);
    expect(r.discount).toBe(600);
    expect(r.total).toBe(4400);
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0].promotionId).toBe("b");
  });

  it("stacks all eligible promotions when asked", () => {
    const promos = [
      promo({ id: "a", discountValue: 10 }),
      promo({ id: "b", type: "fixed", discountValue: 500 }),
    ];
    const r = priceCart(cart, promos, { channel: "pos", now: NOW, stack: true });
    expect(r.discount).toBe(1000);
    expect(r.applied).toHaveLength(2);
  });

  it("never discounts below zero", () => {
    const small: CartLine[] = [{ id: "l1", productId: "p1", qty: 1, unitPrice: 100 }];
    const r = priceCart(small, [promo({ type: "fixed", discountValue: 9999 })], { channel: "pos", now: NOW });
    expect(r.total).toBe(0);
    expect(r.discount).toBe(100);
  });

  it("honours free shipping alongside a value discount", () => {
    const promos = [
      promo({ id: "v", discountValue: 10 }),
      promo({ id: "ship", type: "free_shipping" }),
    ];
    const r = priceCart(cart, promos, { channel: "pos", now: NOW });
    expect(r.freeShipping).toBe(true);
    expect(r.discount).toBe(500);
    expect(r.applied.some((a) => a.freeShipping)).toBe(true);
  });

  it("returns the bare subtotal when nothing is eligible", () => {
    const r = priceCart(cart, [promo({ status: "expired" })], { channel: "pos", now: NOW });
    expect(r.discount).toBe(0);
    expect(r.total).toBe(5000);
    expect(r.applied).toHaveLength(0);
  });
});
