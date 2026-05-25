import type {
  DemandSnapshot,
  InventoryRecommendation,
  InventorySnapshot,
  NotificationEvent,
  ProductCard,
  PurchaseOrderDraft,
  StockMovement,
  Supplier,
} from "./foundation";
import { calculateAvailableToSell, createInitialStockStatus } from "./foundation";
import { buildNotificationFromRecommendation, createStockMovement, recommendReorder } from "./manager";

export interface SellerInventoryWorkspace {
  sellerId: string;
  sellerName: string;
  businessProfile: {
    businessType: "retail_store" | "online_offline" | "coffee_shop" | "small_production" | "marketplace_seller";
    channels: string[];
    locations: string[];
  };
  products: ProductCard[];
  suppliers: Supplier[];
  snapshots: InventorySnapshot[];
  purchaseOrders: PurchaseOrderDraft[];
  movements: StockMovement[];
  demand: DemandSnapshot[];
  recommendations: InventoryRecommendation[];
  notifications: NotificationEvent[];
  updatedAt: string;
}

export function createDemoWorkspace(now = new Date().toISOString()): SellerInventoryWorkspace {
  const products: ProductCard[] = [
    {
      id: "coffee-beans-250",
      name: "Кофе Бразилия 250 г",
      description: "Зерно для розницы, сайта и Telegram-заказов.",
      category: "Кофе",
      type: "variant_parent",
      accountingType: "product",
      sku: "COF-BR-250",
      barcode: "4607000000012",
      variants: [
        {
          id: "coffee-beans-250-medium",
          sku: "COF-BR-250-M",
          barcode: "4607000000013",
          attributes: { помол: "средний", упаковка: "250 г" },
          salePrice: 640,
          purchasePrice: 310,
        },
        {
          id: "coffee-beans-250-whole",
          sku: "COF-BR-250-W",
          barcode: "4607000000014",
          attributes: { помол: "зерно", упаковка: "250 г" },
          salePrice: 690,
          purchasePrice: 325,
        },
      ],
      channels: [
        { channel: "pos", isActive: true },
        { channel: "website", isActive: true, deliveryCost: 120 },
        { channel: "telegram", isActive: true },
      ],
      supplierId: "supplier-roast",
      salePrice: 690,
      purchasePrice: 325,
      packagingCost: 28,
      labels: [{ barcode: "4607000000012", labelType: "price_tag" }],
      marking: { required: false, status: "not_required" },
    },
    {
      id: "milk-1l",
      name: "Молоко 1 л",
      description: "Ингредиент для кофейни с контролем срока годности.",
      category: "Ингредиенты",
      type: "simple",
      accountingType: "ingredient",
      sku: "MILK-1L",
      barcode: "4607000000029",
      variants: [],
      channels: [{ channel: "pos", isActive: true }],
      supplierId: "supplier-dairy",
      salePrice: 0,
      purchasePrice: 78,
      marking: {
        required: true,
        system: "chestny_znak",
        gtin: "04607000000029",
        dataMatrix: "0104607000000029215D8F",
        batch: "M-0526",
        expiresAt: "2026-05-30",
        status: "verified",
      },
    },
    {
      id: "gift-set",
      name: "Подарочный набор кофе",
      description: "Комплект из кофе, открытки и упаковки.",
      category: "Подарки",
      type: "kit",
      accountingType: "bundle",
      sku: "GIFT-COF-01",
      barcode: "4607000000036",
      variants: [],
      channels: [
        { channel: "website", isActive: true, deliveryCost: 180 },
        { channel: "wildberries", isActive: true, commissionRate: 0.19, marketplaceAllocation: 12 },
        { channel: "ozon", isActive: true, commissionRate: 0.17, marketplaceAllocation: 8 },
      ],
      supplierId: "supplier-pack",
      salePrice: 1490,
      purchasePrice: 760,
      packagingCost: 95,
      components: [
        { productId: "coffee-beans-250", quantity: 2 },
        { productId: "gift-pack", quantity: 1 },
      ],
      marking: { required: false, status: "not_required" },
    },
  ];

  const snapshots: InventorySnapshot[] = [
    {
      productId: "coffee-beans-250",
      locationId: "warehouse",
      status: createInitialStockStatus({
        physical: 84,
        reserved: 12,
        warehouse: 46,
        showroom: 8,
        store: 30,
        inTransit: 10,
        damaged: 3,
        returns: 4,
        expired: 1,
        marketplaceAllocated: 9,
      }),
      updatedAt: now,
    },
    {
      productId: "milk-1l",
      locationId: "store",
      status: createInitialStockStatus({
        physical: 31,
        reserved: 0,
        warehouse: 12,
        store: 19,
        expired: 3,
      }),
      updatedAt: now,
    },
    {
      productId: "gift-set",
      locationId: "warehouse",
      status: createInitialStockStatus({
        physical: 22,
        reserved: 7,
        warehouse: 22,
        marketplaceAllocated: 20,
      }),
      updatedAt: now,
    },
  ];

  const demand: DemandSnapshot[] = [
    {
      productId: "coffee-beans-250",
      averageDailySales: 8,
      averageWeeklySales: 56,
      averageMonthlySales: 240,
      daysUntilStockout: 7,
      seasonalityIndex: 1.12,
      inventoryValue: 27300,
      margin: 33,
    },
    {
      productId: "milk-1l",
      averageDailySales: 9,
      averageWeeklySales: 63,
      averageMonthlySales: 270,
      daysUntilStockout: 3,
      seasonalityIndex: 1,
      inventoryValue: 2418,
      margin: 0,
    },
    {
      productId: "gift-set",
      averageDailySales: 1.4,
      averageWeeklySales: 10,
      averageMonthlySales: 42,
      daysUntilStockout: 10,
      seasonalityIndex: 1.35,
      inventoryValue: 16720,
      margin: 36,
    },
  ];

  const firstSnapshot = snapshots[0];
  const firstDemand = demand[0];

  const recommendation = firstSnapshot && firstDemand ? recommendReorder({
    id: "rec-coffee-order",
    productId: "coffee-beans-250",
    availability: calculateAvailableToSell(firstSnapshot.status),
    demand: firstDemand,
    supplierLeadTimeDays: 9,
  }) : undefined;

  const recommendations = [
    recommendation,
    {
      id: "rec-milk-expiry",
      action: "check_marking",
      productId: "milk-1l",
      priority: "high",
      reason: "Есть 3 просроченные единицы и маркировка требует проверки при продаже.",
    },
    {
      id: "rec-gift-transfer",
      action: "transfer",
      productId: "gift-set",
      priority: "medium",
      reason: "На маркетплейсы выделено 20 наборов, но продажи сайта растут быстрее.",
      suggestedQuantity: 6,
    },
  ].filter(Boolean) as InventoryRecommendation[];

  const notifications = recommendations.map((item, index) =>
    buildNotificationFromRecommendation({
      id: `notice-${index + 1}`,
      recommendation: item,
      channels: index === 0 ? ["dashboard", "telegram"] : ["dashboard"],
      createdAt: now,
    }),
  );

  notifications.push({
    id: "notice-supplier-price",
    type: "supplier_price_increased",
    channels: ["dashboard", "email"],
    supplierId: "supplier-roast",
    message: "Поставщик кофе поднял цену на 7%. Проверьте маржу и цену продажи.",
    createdAt: now,
  });

  return {
    sellerId: "demo-seller",
    sellerName: "Кофейня на районе",
    businessProfile: {
      businessType: "online_offline",
      channels: ["POS / касса", "Сайт", "Telegram", "Wildberries", "Ozon"],
      locations: ["Склад", "Магазин", "Витрина", "Онлайн-резерв", "Брак", "Возвраты", "В пути"],
    },
    products,
    suppliers: [
      {
        id: "supplier-roast",
        name: "Обжарщик Север",
        leadTimeDays: 9,
        minimumOrderQuantity: 20,
        currentPurchasePrice: 325,
        previousPurchasePrice: 304,
        catalogConnected: true,
      },
      {
        id: "supplier-dairy",
        name: "Молочная линия",
        leadTimeDays: 2,
        minimumOrderQuantity: 12,
        currentPurchasePrice: 78,
        previousPurchasePrice: 78,
      },
      {
        id: "supplier-pack",
        name: "Упаковка Про",
        leadTimeDays: 5,
        minimumOrderQuantity: 30,
        currentPurchasePrice: 95,
        previousPurchasePrice: 91,
        catalogConnected: true,
      },
    ],
    snapshots,
    purchaseOrders: [
      {
        id: "po-1024",
        supplierId: "supplier-roast",
        status: "partially_received",
        expectedArrivalDate: "2026-05-28",
        lines: [
          {
            productId: "coffee-beans-250",
            quantityOrdered: 60,
            quantityReceived: 40,
            unitPurchasePrice: 325,
            previousPurchasePrice: 304,
            minimumOrderQuantity: 20,
          },
        ],
      },
    ],
    movements: [
      createStockMovement({
        id: "move-1",
        type: "receipt",
        productId: "coffee-beans-250",
        toLocationId: "warehouse",
        quantityDelta: 40,
        beforeQuantity: 44,
        relatedDocumentId: "po-1024",
        reason: "Частичная приёмка от поставщика",
        actorId: "manager",
        occurredAt: now,
      }),
      createStockMovement({
        id: "move-2",
        type: "reserve",
        productId: "gift-set",
        fromLocationId: "warehouse",
        toLocationId: "marketplace",
        quantityDelta: -8,
        beforeQuantity: 30,
        relatedDocumentId: "ozon-allocation",
        reason: "Выделение под Ozon",
        actorId: "owner",
        occurredAt: now,
      }),
      createStockMovement({
        id: "move-3",
        type: "write_off",
        productId: "milk-1l",
        fromLocationId: "store",
        quantityDelta: -3,
        beforeQuantity: 34,
        reason: "Просрочка",
        actorId: "barista",
        occurredAt: now,
      }),
    ],
    demand,
    recommendations,
    notifications,
    updatedAt: now,
  };
}

export function getAvailabilityByProduct(workspace: SellerInventoryWorkspace) {
  return workspace.products.map((product) => {
    const snapshot = workspace.snapshots.find((item) => item.productId === product.id);
    const availability = snapshot
      ? calculateAvailableToSell(snapshot.status)
      : calculateAvailableToSell(createInitialStockStatus());
    const demand = workspace.demand.find((item) => item.productId === product.id);
    const supplier = workspace.suppliers.find((item) => item.id === product.supplierId);

    return {
      product,
      snapshot,
      availability,
      demand,
      supplier,
    };
  });
}

export function calculateWorkspaceResult(workspace: SellerInventoryWorkspace) {
  const rows = getAvailabilityByProduct(workspace);
  const inventoryValue = rows.reduce((sum, row) => {
    const purchasePrice = row.product.purchasePrice ?? 0;
    return sum + row.availability.availableToSell * purchasePrice;
  }, 0);

  const frozenValue = rows.reduce((sum, row) => {
    const purchasePrice = row.product.purchasePrice ?? 0;
    const damaged = row.snapshot?.status.damaged ?? 0;
    const expired = row.snapshot?.status.expired ?? 0;
    return sum + (damaged + expired) * purchasePrice;
  }, 0);

  const lowStockCount = rows.filter((row) => (row.demand?.daysUntilStockout ?? 999) <= 7).length;
  const alertsCount = workspace.notifications.length;

  return {
    rows,
    inventoryValue,
    frozenValue,
    lowStockCount,
    alertsCount,
    availableTotal: rows.reduce((sum, row) => sum + row.availability.availableToSell, 0),
  };
}
