import { describe, expect, it } from "vitest";
import {
  calculateAvailableToSell,
  createInitialStockStatus,
  inventoryFlowChecklist,
} from "../src/lib/inventory/foundation.js";

describe("inventory foundation", () => {
  it("calculates available-to-sell from physical stock minus unavailable quantities", () => {
    const result = calculateAvailableToSell(
      createInitialStockStatus({
        physical: 25,
        reserved: 5,
        damaged: 2,
        expired: 1,
        inTransit: 4,
      }),
    );

    expect(result.availableToSell).toBe(13);
    expect(result.rawAvailableToSell).toBe(13);
    expect(result.warnings).toEqual([]);
  });

  it("clamps available-to-sell at zero and warns when raw availability is negative", () => {
    const result = calculateAvailableToSell(
      createInitialStockStatus({
        physical: 3,
        reserved: 6,
        damaged: 1,
        expired: 0,
        inTransit: 2,
      }),
    );

    expect(result.availableToSell).toBe(0);
    expect(result.rawAvailableToSell).toBe(-6);
    expect(result.warnings).toContain(
      "Raw available-to-sell is negative; check reservations, damaged, expired, and in-transit quantities.",
    );
    expect(result.warnings).toContain("Reserved quantity is greater than physical stock.");
  });

  it("documents the complete seller inventory flow checklist", () => {
    expect(inventoryFlowChecklist).toEqual([
      "onboard_business_profile",
      "configure_sales_channels",
      "create_or_import_products",
      "attach_barcodes_labels_and_marking",
      "load_location_stock_statuses",
      "connect_suppliers_and_purchase_orders",
      "receive_transfer_stocktake_write_off_returns",
      "record_movement_history",
      "calculate_analytics_forecasts_recommendations_alerts",
    ]);
  });
});
