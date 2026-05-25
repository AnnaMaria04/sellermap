import { describe, expect, it } from "vitest";
import {
  buildInventoryFlowChecklist,
  buildSellerModuleTabs,
  calculateAvailableToSell,
  createEnrichmentPlan,
  type SellerOnboardingProfile,
} from "../src/lib/inventory/foundation";

describe("calculateAvailableToSell", () => {
  it("calculates available stock and status map", () => {
    const result = calculateAvailableToSell({
      physicalUnits: 100,
      reservedUnits: 20,
      damagedUnits: 5,
      expiredUnits: 3,
      inTransitUnits: 7,
      shelfUnits: 30,
      storeUnits: 40,
      returnUnits: 2,
      allocatedMarketplaceUnits: 10,
    });

    expect(result.availableToSellRaw).toBe(65);
    expect(result.availableToSell).toBe(65);
    expect(result.statusMap.on_hand).toBe(100);
    expect(result.statusMap.reserved).toBe(20);
    expect(result.warnings).toHaveLength(0);
  });

  it("clamps negative availability and emits warning", () => {
    const result = calculateAvailableToSell({
      physicalUnits: 10,
      reservedUnits: 20,
      damagedUnits: 0,
      expiredUnits: 0,
      inTransitUnits: 0,
    });

    expect(result.availableToSellRaw).toBe(-10);
    expect(result.availableToSell).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("flow helpers", () => {
  const baseProfile: SellerOnboardingProfile = {
    businessType: "retail",
    channels: ["website"],
    locations: ["warehouse"],
  };

  it("builds module tabs based on profile", () => {
    expect(buildSellerModuleTabs(baseProfile)).toEqual([
      "Marketplace Intelligence",
      "Inventory",
    ]);

    expect(
      buildSellerModuleTabs({
        ...baseProfile,
        businessType: "cafe",
        channels: ["website", "pos"],
      }),
    ).toEqual(["Marketplace Intelligence", "Inventory", "POS", "Recipes"]);
  });

  it("builds enrichment tasks from draft context", () => {
    expect(
      createEnrichmentPlan({
        checkId: "1",
        createdAt: new Date().toISOString(),
        productName: "Coffee",
        supplierUrl: "https://supplier.test/coffee",
      }),
    ).toEqual([
      {
        source: "supplier",
        priority: "high",
        dedupeKey: "supplier:https://supplier.test/coffee",
      },
      {
        source: "wildberries",
        priority: "normal",
        dedupeKey: "wildberries:Coffee",
      },
    ]);
  });

  it("adds POS step only when POS is enabled", () => {
    expect(buildInventoryFlowChecklist(baseProfile)).not.toContain("pos_sync");

    expect(
      buildInventoryFlowChecklist({
        ...baseProfile,
        channels: ["website", "pos"],
      }),
    ).toContain("pos_sync");
  });
});
