import { describe, it, expect } from "vitest";
import { resolveEnabledModules } from "@/lib/modules/resolve";
import { MODULES, MODULE_BY_ID, moduleForRoute, CORE_MODULES, type ModuleId } from "@/lib/modules/registry";

describe("module registry", () => {
  it("every core module is marked core and has routes", () => {
    for (const id of CORE_MODULES) {
      expect(MODULE_BY_ID[id].core).toBe(true);
      expect(MODULE_BY_ID[id].routes.length).toBeGreaterThan(0);
    }
  });

  it("moduleForRoute resolves by longest prefix", () => {
    expect(moduleForRoute("/inventory/products")).toBe("products");
    expect(moduleForRoute("/inventory/products/collections")).toBe("products");
    expect(moduleForRoute("/inventory/purchase-orders")).toBe("b2b");
    expect(moduleForRoute("/inventory/transfers")).toBe("warehousing");
    expect(moduleForRoute("/inventory/bundles")).toBe("recipes");
    expect(moduleForRoute("/inventory/erp1c")).toBe("erp1c");
    expect(moduleForRoute("/inventory/storefront")).toBe("storefront");
    expect(moduleForRoute("/inventory/unknown-xyz")).toBeNull();
  });
});

describe("resolveEnabledModules", () => {
  it("always includes core modules", () => {
    const set = resolveEnabledModules({ segment: "marketplace", channels: [] });
    for (const id of CORE_MODULES) expect(set.has(id)).toBe(true);
  });

  it("marketplace segment enables marketplaces, not pos/recipes", () => {
    const set = resolveEnabledModules({ segment: "marketplace" });
    expect(set.has("marketplaces")).toBe(true);
    expect(set.has("pos")).toBe(false);
    expect(set.has("recipes")).toBe(false);
    expect(set.has("erp1c")).toBe(false);
  });

  it("small_retail enables pos but not marketplaces/erp1c", () => {
    const set = resolveEnabledModules({ segment: "small_retail" });
    expect(set.has("pos")).toBe(true);
    expect(set.has("marketplaces")).toBe(false);
    expect(set.has("erp1c")).toBe(false);
  });

  it("producer enables warehousing/b2b/recipes/labeling", () => {
    const set = resolveEnabledModules({ segment: "producer" });
    for (const id of ["warehousing", "b2b", "recipes", "labeling"] as ModuleId[]) {
      expect(set.has(id)).toBe(true);
    }
    expect(set.has("storefront")).toBe(false);
  });

  it("enterprise enables erp1c + warehousing", () => {
    const set = resolveEnabledModules({ segment: "enterprise" });
    expect(set.has("erp1c")).toBe(true);
    expect(set.has("warehousing")).toBe(true);
  });

  it("ecommerce enables storefront + marketing + pos", () => {
    const set = resolveEnabledModules({ segment: "ecommerce" });
    expect(set.has("storefront")).toBe(true);
    expect(set.has("marketing")).toBe(true);
    expect(set.has("pos")).toBe(true);
  });

  it("channel auto-suggests a module (add-on) even off-segment", () => {
    // A small_retail seller who also sells on WB gets marketplaces.
    const set = resolveEnabledModules({ segment: "small_retail", channels: ["wildberries"] });
    expect(set.has("marketplaces")).toBe(true);
  });

  it("explicit override turns a module on and off (core stays on)", () => {
    const on = resolveEnabledModules({ segment: "marketplace", overrides: { recipes: true } });
    expect(on.has("recipes")).toBe(true);
    const off = resolveEnabledModules({ segment: "ecommerce", overrides: { marketing: false } });
    expect(off.has("marketing")).toBe(false);
    const coreOff = resolveEnabledModules({ segment: "ecommerce", overrides: { products: false } });
    expect(coreOff.has("products")).toBe(true); // core cannot be disabled
  });

  it("no segment + no channels → full superset (no regression)", () => {
    const set = resolveEnabledModules({});
    for (const m of MODULES) expect(set.has(m.id)).toBe(true);
  });

  it("no segment but channels infer a segment", () => {
    const set = resolveEnabledModules({ channels: ["pos"] });
    // hybrid → small_retail → pos on, but not the full superset (erp1c off)
    expect(set.has("pos")).toBe(true);
    expect(set.has("erp1c")).toBe(false);
  });
});
