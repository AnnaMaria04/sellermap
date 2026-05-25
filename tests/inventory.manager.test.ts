import { describe, expect, it } from "vitest";
import { createInitialStockStatus } from "../src/lib/inventory/foundation.js";
import {
  buildNotificationFromRecommendation,
  createPurchaseOrderDraft,
  createStockMovement,
  getProductAvailability,
  receivePurchaseOrder,
  recommendReorder,
  type InventoryStore,
} from "../src/lib/inventory/manager.js";

describe("inventory manager", () => {
  it("returns availability views for a product across snapshots", () => {
    const store: InventoryStore = {
      products: [],
      snapshots: [
        {
          productId: "p1",
          locationId: "warehouse",
          status: createInitialStockStatus({ physical: 10, reserved: 2 }),
          updatedAt: "2026-05-24T10:00:00.000Z",
        },
        {
          productId: "p2",
          status: createInitialStockStatus({ physical: 99 }),
          updatedAt: "2026-05-24T10:00:00.000Z",
        },
      ],
      purchaseOrders: [],
      movements: [],
      recommendations: [],
      notifications: [],
    };

    expect(getProductAvailability(store, "p1")).toHaveLength(1);
    expect(getProductAvailability(store, "p1")[0]?.availability.availableToSell).toBe(8);
  });

  it("creates purchase order drafts and closes them after full receiving", () => {
    const draft = createPurchaseOrderDraft({
      id: "po1",
      supplierId: "s1",
      lines: [
        {
          productId: "p1",
          quantityOrdered: 12,
          quantityReceived: 0,
          unitPurchasePrice: 100,
        },
      ],
    });

    const received = receivePurchaseOrder(draft, [
      {
        productId: "p1",
        ordered: 12,
        received: 12,
        damaged: 0,
        missing: 0,
        extra: 0,
      },
    ]);

    expect(received.status).toBe("closed");
    expect(received.lines[0]?.quantityReceived).toBe(12);
  });

  it("marks receiving as a problem when damaged, missing, extra, or notes are present", () => {
    const draft = createPurchaseOrderDraft({
      id: "po2",
      supplierId: "s1",
      lines: [
        {
          productId: "p1",
          quantityOrdered: 12,
          quantityReceived: 0,
          unitPurchasePrice: 100,
        },
      ],
    });

    const received = receivePurchaseOrder(draft, [
      {
        productId: "p1",
        ordered: 12,
        received: 10,
        damaged: 1,
        missing: 1,
        extra: 0,
      },
    ]);

    expect(received.status).toBe("problem");
    expect(received.lines[0]?.quantityReceived).toBe(10);
  });

  it("creates audit movement records with before and after quantities", () => {
    expect(
      createStockMovement({
        id: "m1",
        type: "transfer",
        productId: "p1",
        fromLocationId: "warehouse",
        toLocationId: "store",
        quantityDelta: -3,
        beforeQuantity: 10,
        actorId: "user1",
        occurredAt: "2026-05-24T10:00:00.000Z",
      }),
    ).toMatchObject({
      beforeQuantity: 10,
      afterQuantity: 7,
      type: "transfer",
    });
  });

  it("builds a reorder recommendation and notification when lead time exceeds coverage", () => {
    const recommendation = recommendReorder({
      id: "r1",
      productId: "p1",
      availability: {
        availableToSell: 8,
        rawAvailableToSell: 8,
        warnings: [],
      },
      demand: {
        productId: "p1",
        averageDailySales: 2,
        averageWeeklySales: 14,
        averageMonthlySales: 60,
      },
      supplierLeadTimeDays: 5,
    });

    expect(recommendation).toMatchObject({
      action: "order_now",
      priority: "high",
      suggestedQuantity: 38,
    });

    expect(
      buildNotificationFromRecommendation({
        id: "n1",
        recommendation: recommendation!,
        channels: ["dashboard", "telegram"],
        createdAt: "2026-05-24T10:00:00.000Z",
      }),
    ).toMatchObject({
      type: "reorder_due",
      channels: ["dashboard", "telegram"],
      productId: "p1",
    });
  });
});
