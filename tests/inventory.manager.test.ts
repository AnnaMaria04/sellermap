import { describe, expect, it } from "vitest";
import { InventoryManager } from "../src/lib/inventory/manager";

describe("InventoryManager", () => {
  it("creates product and applies movement history", () => {
    const manager = new InventoryManager();

    manager.createProduct({
      productName: "Milk",
      sku: "MILK-1L",
      accountingType: "ingredient",
      channels: ["pos", "website"],
      variants: [],
    });

    manager.applyMovement({
      type: "receipt",
      sku: "MILK-1L",
      unitsDelta: 30,
      location: "warehouse",
      actorId: "user-1",
    });

    manager.applyMovement({
      type: "reserve",
      sku: "MILK-1L",
      unitsDelta: 5,
      location: "warehouse",
      actorId: "user-1",
    });

    manager.applyMovement({
      type: "write_off",
      sku: "MILK-1L",
      unitsDelta: 2,
      location: "damaged",
      actorId: "user-1",
    });

    const availability = manager.getAvailability("MILK-1L");
    expect(availability.availableToSell).toBe(23);

    const movements = manager.listMovements("MILK-1L");
    expect(movements).toHaveLength(3);
    expect(movements[0].type).toBe("receipt");
  });

  it("throws for unknown SKU", () => {
    const manager = new InventoryManager();
    expect(() => manager.getAvailability("UNKNOWN")).toThrowError(/Unknown SKU/);
  });
});
