import { describe, it, expect } from "vitest";
import { getAvailableStock } from "@/mock/inventory";

describe("getAvailableStock", () => {
  const makeProduct = (overrides = {}) => ({
    totalPhysical: 100,
    reservedUnits: 10,
    damagedUnits: 5,
    inTransitUnits: 20,
    ...overrides,
  });

  it("excludes reserved and damaged from available", () => {
    expect(getAvailableStock(makeProduct() as any)).toBe(85); // 100 - 10 - 5
  });

  it("does NOT subtract in-transit (not yet in warehouse)", () => {
    // inTransitUnits should NOT reduce available stock — goods not yet received
    expect(getAvailableStock(makeProduct({ inTransitUnits: 999 }) as any)).toBe(85);
  });

  it("never returns negative", () => {
    expect(getAvailableStock(makeProduct({ reservedUnits: 200 }) as any)).toBe(0);
  });
});
