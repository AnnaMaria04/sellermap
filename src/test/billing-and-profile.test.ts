import { describe, it, expect } from "vitest";
import { PLANS, getPlan, computeUsage } from "@/lib/billing/plans";
import { toOnboardingProfile, sellerModuleTabs } from "@/lib/inventory/seller-profile";

describe("billing plans", () => {
  it("exposes free/business/scale tiers", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "business", "scale"]);
  });

  it("getPlan falls back to free for unknown ids", () => {
    // @ts-expect-error testing the fallback path
    expect(getPlan("nope").id).toBe("free");
  });

  it("computeUsage flags over-limit metrics on the free plan", () => {
    const m = computeUsage(getPlan("free"), {
      products: 150,
      ordersPerMonth: 10,
      staff: 1,
      locations: 1,
      integrations: 0,
    });
    const products = m.find((x) => x.key === "products")!;
    expect(products.overLimit).toBe(true);
    expect(products.ratio).toBe(1); // clamped
  });

  it("treats unlimited (-1) limits as never over and zero ratio", () => {
    const m = computeUsage(getPlan("scale"), {
      products: 99999,
      ordersPerMonth: 99999,
      staff: 50,
      locations: 20,
      integrations: 10,
    });
    expect(m.every((x) => !x.overLimit)).toBe(true);
    expect(m.every((x) => x.ratio === 0)).toBe(true);
  });
});

describe("seller onboarding profile", () => {
  it("infers a retail model for online-only channels", () => {
    const p = toOnboardingProfile({ channels: ["wildberries", "ozon"] });
    expect(p.businessType).toBe("retail");
    expect(p.locations).toEqual(["warehouse"]);
    expect(p.channels).toEqual(["wildberries", "ozon"]);
  });

  it("infers a hybrid model and a store location when POS is present", () => {
    const p = toOnboardingProfile({ channels: ["pos", "website"] });
    expect(p.businessType).toBe("hybrid");
    expect(p.locations).toContain("store");
  });

  it("drops unknown channels", () => {
    const p = toOnboardingProfile({ channels: ["wildberries", "sber", "tiktok"] });
    expect(p.channels).toEqual(["wildberries"]);
  });

  it("sellerModuleTabs adds POS when offline selling is enabled", () => {
    expect(sellerModuleTabs({ channels: ["wildberries"] })).not.toContain("POS");
    expect(sellerModuleTabs({ channels: ["pos"] })).toContain("POS");
  });
});
