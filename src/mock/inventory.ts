"use client";

export type ProductStatus = "active" | "draft" | "archived";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "overstock";
export type ProductType = "product" | "ingredient" | "bundle" | "recipe" | "consumable" | "packaging";
export type MovementType =
  | "receipt" | "sale" | "reserve" | "return" | "write_off"
  | "transfer" | "adjustment" | "stocktake" | "labeling" | "cost_change";
export type PurchaseOrderStatus =
  | "draft" | "sent" | "confirmed" | "in_transit" | "partially_received" | "closed" | "issue";
export type TransferStatus = "draft" | "in_transit" | "received" | "partial";
export type StocktakeStatus = "draft" | "in_progress" | "completed" | "cancelled";
export type SalesChannel = "pos" | "website" | "telegram" | "delivery" | "wildberries" | "ozon" | "yandex_market";

export interface ProductVariant {
  id: string; name: string; sku: string; barcode?: string;
  price: number; costPrice: number; stock: Record<string, number>; weight?: number;
}

export interface Product {
  id: string; name: string; description?: string; imageUrl?: string;
  category: string; productType: ProductType; status: ProductStatus;
  sku: string; barcode?: string; internalBarcode?: string;
  hasVariants: boolean; variants: ProductVariant[];
  price: number; costPrice: number; packagingCost?: number;
  deliveryCost?: number; channelCommission?: number; margin?: number;
  supplierId?: string; channels: SalesChannel[]; tags: string[];
  requiresLabeling: boolean; labelingType?: "chestny_znak" | "egais" | "mercury";
  dataMatrixCode?: string; gtin?: string; batchNumber?: string; expiryDate?: string;
  weight?: number; dimensions?: { length: number; width: number; height: number };
  createdAt: string; updatedAt: string;
  stockByLocation: Record<string, number>;
  reservedUnits: number; damagedUnits: number; inTransitUnits: number; totalPhysical: number;
}

export interface Supplier {
  id: string; name: string; contactName?: string; email?: string; phone?: string;
  website?: string; country: string; city?: string; paymentTerms?: string;
  leadTimeDays: number; minOrderQty?: number; currency: "RUB" | "USD" | "EUR" | "CNY";
  rating: number; notes?: string; createdAt: string;
  catalogUrl?: string; priceListUrl?: string; telegramHandle?: string;
}

export interface PurchaseOrderItem {
  productId: string; productName: string; sku: string;
  qty: number; receivedQty: number; unitCost: number; totalCost: number; note?: string;
}

export interface PurchaseOrder {
  id: string; supplierId: string; supplierName: string; status: PurchaseOrderStatus;
  items: PurchaseOrderItem[]; totalAmount: number; currency: "RUB" | "USD" | "EUR" | "CNY";
  createdAt: string; updatedAt: string; expectedArrival?: string; receivedAt?: string;
  note?: string; trackingNumber?: string; paymentStatus?: "unpaid" | "partial" | "paid";
  locationId: string;
}

export interface Transfer {
  id: string; fromLocationId: string; toLocationId: string; status: TransferStatus;
  items: { productId: string; productName: string; sku: string; qty: number; receivedQty: number }[];
  createdAt: string; expectedArrival?: string; receivedAt?: string; note?: string;
}

export interface StocktakeItem {
  productId: string; productName: string; sku: string;
  systemQty: number; countedQty: number | null; variance: number | null;
  reason?: string; photo?: string;
}

export interface Stocktake {
  id: string; locationId: string; status: StocktakeStatus; items: StocktakeItem[];
  createdAt: string; completedAt?: string; approvedBy?: string; note?: string;
}

export interface StockMovement {
  id: string; type: MovementType; productId: string; productName: string; sku: string;
  qtyBefore: number; qtyAfter: number; qtyDelta: number; locationId: string;
  userId: string; userName: string; createdAt: string; reason?: string;
  referenceId?: string; referenceType?: "purchase_order" | "transfer" | "stocktake" | "sale" | "return";
  note?: string;
}

export interface Location {
  id: string; name: string;
  type: "warehouse" | "store" | "showroom" | "backroom" | "online_reserve" | "returns" | "damaged" | "in_transit";
  address?: string; isDefault: boolean; capacity?: number;
}

export type ReservationStatus = "active" | "fulfilled" | "cancelled" | "expired";
export type ReservationSource = "manual" | "wildberries" | "ozon" | "yandex_market" | "website" | "pos";

export interface Reservation {
  id: string;
  productId: string; productName: string; sku: string;
  locationId: string; qty: number;
  source: ReservationSource; orderRef?: string; customerName?: string;
  status: ReservationStatus;
  createdAt: string; expiresAt?: string; fulfilledAt?: string; note?: string;
}

// ── Locations ───────────────────────────────────────────────────────────────
export const LOCATIONS: Location[] = [
  { id: "loc-warehouse", name: "Основной склад",    type: "warehouse",     address: "Москва, ул. Складская, 1",  isDefault: true,  capacity: 5000 },
  { id: "loc-store",     name: "Магазин на Арбате", type: "store",         address: "Москва, ул. Арбат, 12",     isDefault: false, capacity: 500  },
  { id: "loc-showroom",  name: "Шоурум",            type: "showroom",      address: "Москва, ул. Тверская, 5",   isDefault: false, capacity: 200  },
  { id: "loc-online",    name: "Онлайн-резерв",     type: "online_reserve",                                      isDefault: false, capacity: 2000 },
  { id: "loc-returns",   name: "Возвраты",           type: "returns",                                             isDefault: false, capacity: 300  },
  { id: "loc-damaged",   name: "Брак",              type: "damaged",                                             isDefault: false, capacity: 200  },
];

// ── Suppliers ───────────────────────────────────────────────────────────────
export const SUPPLIERS: Supplier[] = [
  { id: "sup-001", name: "ТД Текстиль Юг",       contactName: "Иван Петров",     email: "ivan@textile-yug.ru",         phone: "+7 (861) 123-45-67", website: "https://textile-yug.ru",     country: "Россия",   city: "Краснодар",       paymentTerms: "Оплата по факту",  leadTimeDays: 7,  minOrderQty: 50,  currency: "RUB", rating: 4.8, notes: "Одежда, головные уборы, аксессуары",                       createdAt: "2025-01-15", telegramHandle: "@textile_yug" },
  { id: "sup-002", name: "ShenzhenGoods Co.",     contactName: "Wang Wei",         email: "wangwei@szgoods.cn",          phone: "+86 755 8888 9999",  website: "https://szgoods.cn",         country: "Китай",    city: "Шэньчжэнь",       paymentTerms: "50% предоплата",   leadTimeDays: 25, minOrderQty: 100, currency: "CNY", rating: 4.2, notes: "Электроника, аксессуары, хозтовары",                        createdAt: "2025-02-01", catalogUrl: "https://1688.com/example" },
  { id: "sup-003", name: "ООО ПластУпак",         contactName: "Анна Смирнова",   email: "anna@plastupak.ru",           phone: "+7 (495) 555-12-34",                                            country: "Россия",   city: "Москва",          paymentTerms: "Отсрочка 14 дней", leadTimeDays: 3,  minOrderQty: 200, currency: "RUB", rating: 4.5, notes: "Упаковка, пакеты, коробки",                                 createdAt: "2025-01-20" },
  { id: "sup-004", name: "EuroCoffee Imports",    contactName: "Markus Braun",     email: "markus@eurocoffee.de",        phone: "+49 30 1234567",                                                country: "Германия", city: "Берлин",          paymentTerms: "Net 30",           leadTimeDays: 14, minOrderQty: 25,  currency: "EUR", rating: 4.9, notes: "Specialty кофе, строгий контроль обжарки",                  createdAt: "2025-03-10" },
  { id: "sup-005", name: "ООО ТехноИмпорт",       contactName: "Сергей Волков",   email: "s.volkov@technoimport.ru",    phone: "+7 (495) 321-77-88",                                            country: "Россия",   city: "Москва",          paymentTerms: "100% предоплата",  leadTimeDays: 10, minOrderQty: 20,  currency: "RUB", rating: 4.6, notes: "Реселлер сертифицированной электроники",                   createdAt: "2025-04-01" },
  { id: "sup-006", name: "ЗдравКосметика ООО",    contactName: "Наталья Орлова",  email: "natalya@zdravkosmetika.ru",   phone: "+7 (812) 456-88-99",                                            country: "Россия",   city: "Санкт-Петербург", paymentTerms: "Отсрочка 21 день", leadTimeDays: 5,  minOrderQty: 50,  currency: "RUB", rating: 4.7, notes: "Натуральная косметика, сертификаты ISO, Честный Знак",     createdAt: "2025-05-15" },
];

// ── Products ────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // 1 — Органайзер (active, variants, multi-location, in transit)
  {
    id: "prod-001", name: "Органайзер для путешествий", category: "Аксессуары", productType: "product", status: "active",
    description: "Компактный органайзер из водоотталкивающего нейлона с несколькими отделениями для документов, зарядных устройств и мелочей",
    imageUrl: "https://picsum.photos/seed/org1/120/120",
    sku: "ORG-001", barcode: "4680001234567", internalBarcode: "INT-ORG-001",
    hasVariants: true,
    variants: [
      { id: "var-001-1", name: "Чёрный / S", sku: "ORG-001-BLK-S", barcode: "4680001234568", price: 2950, costPrice: 820, stock: { "loc-warehouse": 45, "loc-store": 12, "loc-online": 10 }, weight: 0.18 },
      { id: "var-001-2", name: "Чёрный / M", sku: "ORG-001-BLK-M", barcode: "4680001234569", price: 2950, costPrice: 820, stock: { "loc-warehouse": 30, "loc-store":  8, "loc-online":  5 }, weight: 0.22 },
      { id: "var-001-3", name: "Синий / S",  sku: "ORG-001-BLU-S", barcode: "4680001234570", price: 2950, costPrice: 820, stock: { "loc-warehouse": 20, "loc-store":  5 }, weight: 0.18 },
      { id: "var-001-4", name: "Синий / M",  sku: "ORG-001-BLU-M", barcode: "4680001234571", price: 2950, costPrice: 820, stock: { "loc-warehouse": 15, "loc-store":  3 }, weight: 0.22 },
    ],
    price: 2950, costPrice: 820, packagingCost: 80, deliveryCost: 120, channelCommission: 15, margin: 32.5,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "website"],
    tags: ["travel", "organizer", "bestseller", "нейлон"],
    requiresLabeling: false, weight: 0.20, dimensions: { length: 22, width: 15, height: 4 },
    createdAt: "2025-01-10", updatedAt: "2026-05-20",
    stockByLocation: { "loc-warehouse": 110, "loc-store": 28, "loc-online": 15 },
    reservedUnits: 15, damagedUnits: 2, inTransitUnits: 50, totalPhysical: 153,
  },

  // 2 — Футболка (active, Честный Знак, dataMatrix, gtin, variants)
  {
    id: "prod-002", name: "Футболка оверсайз хлопок", category: "Одежда", productType: "product", status: "active",
    description: "100% хлопок, плотность 200 г/м², оверсайз крой. Произведено в России. Требует маркировки Честный Знак",
    imageUrl: "https://picsum.photos/seed/tshirt2/120/120",
    sku: "TSH-002", barcode: "4680002345678", internalBarcode: "INT-TSH-002",
    hasVariants: true,
    variants: [
      { id: "var-002-1", name: "Белый / XS", sku: "TSH-002-WHT-XS", barcode: "4680002345679", price: 1490, costPrice: 350, stock: { "loc-warehouse":  80, "loc-store": 10 }, weight: 0.25 },
      { id: "var-002-2", name: "Белый / S",  sku: "TSH-002-WHT-S",  barcode: "4680002345680", price: 1490, costPrice: 350, stock: { "loc-warehouse": 120, "loc-store": 20 }, weight: 0.27 },
      { id: "var-002-3", name: "Белый / M",  sku: "TSH-002-WHT-M",  barcode: "4680002345681", price: 1490, costPrice: 350, stock: { "loc-warehouse":  95, "loc-store": 15 }, weight: 0.30 },
      { id: "var-002-4", name: "Белый / L",  sku: "TSH-002-WHT-L",  barcode: "4680002345682", price: 1490, costPrice: 350, stock: { "loc-warehouse":  60, "loc-store": 10 }, weight: 0.33 },
      { id: "var-002-5", name: "Чёрный / S", sku: "TSH-002-BLK-S",  barcode: "4680002345683", price: 1490, costPrice: 350, stock: { "loc-warehouse":   4 }, weight: 0.27 },
      { id: "var-002-6", name: "Чёрный / M", sku: "TSH-002-BLK-M",  barcode: "4680002345684", price: 1490, costPrice: 350, stock: { "loc-warehouse":   2 }, weight: 0.30 },
    ],
    price: 1490, costPrice: 350, packagingCost: 30, deliveryCost: 45, channelCommission: 20, margin: 42.8,
    supplierId: "sup-001", channels: ["wildberries", "ozon", "pos", "website"],
    tags: ["clothing", "cotton", "oversized", "хлопок"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "010460600738482521pJ&tNKnEMEsC", gtin: "04606007384825",
    weight: 0.28, dimensions: { length: 30, width: 22, height: 2 },
    createdAt: "2025-02-01", updatedAt: "2026-05-19",
    stockByLocation: { "loc-warehouse": 361, "loc-store": 55 },
    reservedUnits: 30, damagedUnits: 5, inTransitUnits: 0, totalPhysical: 416,
  },

  // 3 — Кофе (ingredient, expiryDate, batchNumber, low stock)
  {
    id: "prod-003", name: "Кофе Ethiopia Yirgacheffe", category: "Кофе", productType: "ingredient", status: "active",
    description: "Обжарка light, цветочные ноты жасмина и бергамота, кислотность высокая. Specialty SCA 87+. Поставка 250г пакеты",
    imageUrl: "https://picsum.photos/seed/coffee3/120/120",
    sku: "COF-ETH-001", barcode: "4680003456789", internalBarcode: "INT-COF-001",
    hasVariants: false, variants: [],
    price: 1800, costPrice: 620, packagingCost: 25, deliveryCost: 60, channelCommission: 0, margin: 65.6,
    supplierId: "sup-004", channels: ["pos", "website", "delivery", "telegram"],
    tags: ["coffee", "ethiopia", "specialty", "light-roast"],
    requiresLabeling: false, batchNumber: "ETH-2026-03-001", expiryDate: "2027-03-15",
    weight: 0.25, dimensions: { length: 18, width: 12, height: 4 },
    createdAt: "2025-03-15", updatedAt: "2026-05-22",
    stockByLocation: { "loc-warehouse": 8, "loc-store": 3 },
    reservedUnits: 0, damagedUnits: 0, inTransitUnits: 25, totalPhysical: 11,
  },

  // 4 — Крафт-пакет (packaging, overstock)
  {
    id: "prod-004", name: "Крафт-пакет с ручками 30×40", category: "Упаковка", productType: "packaging", status: "active",
    description: "Бумажный крафт-пакет коричневый, грузоподъёмность 5 кг, ламинированные ручки, 80 г/м²",
    imageUrl: "https://picsum.photos/seed/bag4/120/120",
    sku: "PKG-KRAFT-001", barcode: "4680004567890", internalBarcode: "INT-PKG-001",
    hasVariants: false, variants: [],
    price: 45, costPrice: 12, packagingCost: 0, deliveryCost: 5, channelCommission: 0, margin: 73.3,
    supplierId: "sup-003", channels: ["pos", "website"],
    tags: ["packaging", "kraft", "eco", "упаковка"],
    requiresLabeling: false, weight: 0.06, dimensions: { length: 31, width: 41, height: 1 },
    createdAt: "2025-01-05", updatedAt: "2026-05-18",
    stockByLocation: { "loc-warehouse": 2800, "loc-store": 400 },
    reservedUnits: 0, damagedUnits: 50, inTransitUnits: 0, totalPhysical: 3200,
  },

  // 5 — Bundle (active)
  {
    id: "prod-005", name: "Набор для путешественника Premium", category: "Аксессуары", productType: "bundle", status: "active",
    description: "Комплект: Органайзер ORG-001 + Футболка TSH-002 + Крафт-пакет PKG-KRAFT-001 ×2. Подарочная упаковка",
    imageUrl: "https://picsum.photos/seed/bundle5/120/120",
    sku: "BND-001", barcode: "4680005678901", internalBarcode: "INT-BND-001",
    hasVariants: false, variants: [],
    price: 4990, costPrice: 1290, packagingCost: 150, deliveryCost: 160, channelCommission: 15, margin: 27.2,
    channels: ["website", "telegram", "wildberries"],
    tags: ["bundle", "gift", "travel", "комплект"],
    requiresLabeling: false, weight: 0.55, dimensions: { length: 35, width: 25, height: 8 },
    createdAt: "2026-04-01", updatedAt: "2026-05-10",
    stockByLocation: { "loc-warehouse": 22 },
    reservedUnits: 3, damagedUnits: 0, inTransitUnits: 0, totalPhysical: 22,
  },

  // 6 — Кепка (active, out-of-stock scenario)
  {
    id: "prod-006", name: "Кепка с логотипом", category: "Одежда", productType: "product", status: "active",
    description: "Бейсболка промо 100% хлопок, нанесение вышивкой, регулируемый ремешок — OUT OF STOCK сценарий",
    imageUrl: "https://picsum.photos/seed/cap6/120/120",
    sku: "CAP-001", barcode: "4680006789012", internalBarcode: "INT-CAP-001",
    hasVariants: false, variants: [],
    price: 890, costPrice: 280, packagingCost: 15, deliveryCost: 35, channelCommission: 20, margin: 68.5,
    supplierId: "sup-001", channels: ["pos", "website", "wildberries"],
    tags: ["headwear", "promo", "кепка"],
    requiresLabeling: false, weight: 0.12, dimensions: { length: 26, width: 22, height: 12 },
    createdAt: "2025-04-10", updatedAt: "2026-05-21",
    stockByLocation: { "loc-warehouse": 0, "loc-store": 0 },
    reservedUnits: 0, damagedUnits: 1, inTransitUnits: 0, totalPhysical: 0,
  },

  // 7 — Ежедневник (active, showroom, variants)
  {
    id: "prod-007", name: "Ежедневник A5 кожаный", category: "Канцтовары", productType: "product", status: "active",
    description: "Натуральная кожа, 192 листа в линейку, ляссе, тиснение, эластичная застёжка-резинка",
    imageUrl: "https://picsum.photos/seed/diary7/120/120",
    sku: "DRY-A5-001", barcode: "4680007890123", internalBarcode: "INT-DRY-001",
    hasVariants: true,
    variants: [
      { id: "var-007-1", name: "Коричневый", sku: "DRY-A5-BRN", barcode: "4680007890124", price: 3200, costPrice: 950, stock: { "loc-warehouse": 18, "loc-store": 4, "loc-showroom": 2 }, weight: 0.55 },
      { id: "var-007-2", name: "Чёрный",     sku: "DRY-A5-BLK", barcode: "4680007890125", price: 3200, costPrice: 950, stock: { "loc-warehouse": 12, "loc-store": 3, "loc-showroom": 1 }, weight: 0.55 },
    ],
    price: 3200, costPrice: 950, packagingCost: 120, deliveryCost: 90, channelCommission: 15, margin: 39.4,
    supplierId: "sup-001", channels: ["pos", "website", "ozon"],
    tags: ["stationery", "leather", "gift", "ежедневник"],
    requiresLabeling: false, weight: 0.55, dimensions: { length: 21, width: 15, height: 2 },
    createdAt: "2025-05-01", updatedAt: "2026-05-20",
    stockByLocation: { "loc-warehouse": 30, "loc-store": 7, "loc-showroom": 3 },
    reservedUnits: 4, damagedUnits: 1, inTransitUnits: 0, totalPhysical: 40,
  },

  // 8 — Bluetooth наушники (active, Честный Знак, GTIN, dataMatrix, variants, in-transit)
  {
    id: "prod-008", name: "Bluetooth наушники TW-Pro 500", category: "Электроника", productType: "product", status: "active",
    description: "True Wireless, BT 5.3, ANC, 30ч работы с кейсом, IPX5, AAC/aptX. Честный Знак обязателен",
    imageUrl: "https://picsum.photos/seed/earbuds8/120/120",
    sku: "TWS-500", barcode: "4607890123456", internalBarcode: "INT-TWS-500",
    hasVariants: true,
    variants: [
      { id: "var-008-1", name: "Чёрный", sku: "TWS-500-BLK", barcode: "4607890123457", price: 4990, costPrice: 1850, stock: { "loc-warehouse": 45, "loc-store": 8 }, weight: 0.065 },
      { id: "var-008-2", name: "Белый",  sku: "TWS-500-WHT", barcode: "4607890123458", price: 4990, costPrice: 1850, stock: { "loc-warehouse": 28, "loc-store": 5 }, weight: 0.065 },
      { id: "var-008-3", name: "Синий",  sku: "TWS-500-BLU", barcode: "4607890123459", price: 4990, costPrice: 1850, stock: { "loc-warehouse": 12, "loc-store": 2 }, weight: 0.065 },
    ],
    price: 4990, costPrice: 1850, packagingCost: 90, deliveryCost: 80, channelCommission: 15, margin: 44.3,
    supplierId: "sup-005", channels: ["wildberries", "ozon", "yandex_market", "website"],
    tags: ["electronics", "audio", "wireless", "anc", "bluetooth"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "010460789012345621abcXYZ123456", gtin: "04607890123456",
    weight: 0.065, dimensions: { length: 7, width: 5, height: 3 },
    createdAt: "2025-06-01", updatedAt: "2026-05-24",
    stockByLocation: { "loc-warehouse": 85, "loc-store": 15 },
    reservedUnits: 20, damagedUnits: 2, inTransitUnits: 50, totalPhysical: 100,
  },

  // 9 — Протеиновый батончик (active, food, expiryDate, batchNumber)
  {
    id: "prod-009", name: "Протеиновый батончик «Заряд» 60г", category: "Спортивное питание", productType: "product", status: "active",
    description: "Шоколад-карамель, 20г белка/батончик. Без сахара, без ГМО. Изолят сывороточного белка, орехи, какао",
    imageUrl: "https://picsum.photos/seed/bar9/120/120",
    sku: "BAR-ZAR-001", barcode: "4680009012345", internalBarcode: "INT-BAR-001",
    hasVariants: false, variants: [],
    price: 180, costPrice: 65, packagingCost: 5, deliveryCost: 8, channelCommission: 25, margin: 56.7,
    supplierId: "sup-006", channels: ["pos", "website", "delivery", "wildberries", "ozon"],
    tags: ["food", "protein", "sport", "батончик", "без-сахара"],
    requiresLabeling: false, batchNumber: "ZR-2026-04-001", expiryDate: "2026-11-30",
    weight: 0.07, dimensions: { length: 14, width: 4, height: 2 },
    createdAt: "2026-01-15", updatedAt: "2026-05-23",
    stockByLocation: { "loc-warehouse": 450, "loc-store": 80 },
    reservedUnits: 30, damagedUnits: 20, inTransitUnits: 0, totalPhysical: 530,
  },

  // 10 — Шампунь (active, Честный Знак, dataMatrix, expiryDate, batchNumber)
  {
    id: "prod-010", name: "Натуральный шампунь с алоэ 300мл", category: "Косметика", productType: "product", status: "active",
    description: "SLS/SLES Free, pH 5.5, экстракт алоэ 10%, биотин, кератин. Все типы волос",
    imageUrl: "https://picsum.photos/seed/shampoo10/120/120",
    sku: "SHP-ALO-300", barcode: "4680010123456", internalBarcode: "INT-SHP-001",
    hasVariants: false, variants: [],
    price: 490, costPrice: 145, packagingCost: 20, deliveryCost: 40, channelCommission: 20, margin: 56.1,
    supplierId: "sup-006", channels: ["wildberries", "ozon", "website", "delivery"],
    tags: ["cosmetics", "shampoo", "natural", "aloe", "шампунь"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "01046008901234562109876543210A", gtin: "04600890123456",
    batchNumber: "SHP-2025-12-A", expiryDate: "2027-06-01",
    weight: 0.35, dimensions: { length: 6, width: 4, height: 18 },
    createdAt: "2025-09-01", updatedAt: "2026-05-22",
    stockByLocation: { "loc-warehouse": 180, "loc-store": 25, "loc-online": 50 },
    reservedUnits: 15, damagedUnits: 5, inTransitUnits: 100, totalPhysical: 255,
  },

  // 11 — Термос (active, variants 4 colors)
  {
    id: "prod-011", name: "Термос нержавеющий 500мл", category: "Посуда и кухня", productType: "product", status: "active",
    description: "Двойные стенки из стали 304, тепло 12ч / холод 24ч, крышка-стакан, BPA free",
    imageUrl: "https://picsum.photos/seed/thermos11/120/120",
    sku: "TRM-500", barcode: "4680011234567", internalBarcode: "INT-TRM-500",
    hasVariants: true,
    variants: [
      { id: "var-011-1", name: "Чёрный",     sku: "TRM-500-BLK", barcode: "4680011234568", price: 1290, costPrice: 420, stock: { "loc-warehouse": 28, "loc-store": 5 }, weight: 0.32 },
      { id: "var-011-2", name: "Белый",       sku: "TRM-500-WHT", barcode: "4680011234569", price: 1290, costPrice: 420, stock: { "loc-warehouse": 18, "loc-store": 3 }, weight: 0.32 },
      { id: "var-011-3", name: "Серебристый", sku: "TRM-500-SLV", barcode: "4680011234570", price: 1290, costPrice: 420, stock: { "loc-warehouse": 12, "loc-store": 2 }, weight: 0.32 },
      { id: "var-011-4", name: "Красный",     sku: "TRM-500-RED", barcode: "4680011234571", price: 1290, costPrice: 420, stock: { "loc-warehouse":  7, "loc-store": 0 }, weight: 0.32 },
    ],
    price: 1290, costPrice: 420, packagingCost: 35, deliveryCost: 60, channelCommission: 15, margin: 52.1,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "website", "pos"],
    tags: ["household", "thermos", "travel", "термос"],
    requiresLabeling: false, weight: 0.32, dimensions: { length: 8, width: 8, height: 24 },
    createdAt: "2025-07-01", updatedAt: "2026-05-21",
    stockByLocation: { "loc-warehouse": 65, "loc-store": 10 },
    reservedUnits: 8, damagedUnits: 2, inTransitUnits: 0, totalPhysical: 75,
  },

  // 12 — Коврик для йоги (active, no variants, all channels)
  {
    id: "prod-012", name: "Коврик для йоги Premium 6мм", category: "Спорт", productType: "product", status: "active",
    description: "TPE двуслойный, нескользящая рельефная поверхность, 61×183 см, вес 1.1 кг, ремень в комплекте",
    imageUrl: "https://picsum.photos/seed/yogamat12/120/120",
    sku: "YOG-MAT-6", barcode: "4680012345678", internalBarcode: "INT-YOG-001",
    hasVariants: false, variants: [],
    price: 2190, costPrice: 780, packagingCost: 45, deliveryCost: 150, channelCommission: 15, margin: 52.1,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "yandex_market", "website"],
    tags: ["sport", "yoga", "fitness", "йога", "коврик"],
    requiresLabeling: false, weight: 1.1, dimensions: { length: 183, width: 61, height: 0.6 },
    createdAt: "2025-08-01", updatedAt: "2026-05-20",
    stockByLocation: { "loc-warehouse": 42, "loc-store": 5, "loc-online": 20 },
    reservedUnits: 10, damagedUnits: 0, inTransitUnits: 0, totalPhysical: 67,
  },

  // 13 — Детский конструктор (active, variants by theme)
  {
    id: "prod-013", name: "Детский конструктор 120 деталей", category: "Игрушки", productType: "product", status: "active",
    description: "Совместим с LEGO Classic. ABS пластик, прецизионные отверстия, без заусенцев. Возраст 6+",
    imageUrl: "https://picsum.photos/seed/lego13/120/120",
    sku: "TOY-CON-120", barcode: "4680013456789", internalBarcode: "INT-TOY-001",
    hasVariants: true,
    variants: [
      { id: "var-013-1", name: "Тема «Город»",   sku: "TOY-CON-120-CITY",  barcode: "4680013456790", price: 1490, costPrice: 520, stock: { "loc-warehouse": 35, "loc-store": 8 }, weight: 0.38 },
      { id: "var-013-2", name: "Тема «Космос»",  sku: "TOY-CON-120-SPACE", barcode: "4680013456791", price: 1490, costPrice: 520, stock: { "loc-warehouse": 28, "loc-store": 4 }, weight: 0.38 },
      { id: "var-013-3", name: "Тема «Природа»", sku: "TOY-CON-120-NAT",   barcode: "4680013456792", price: 1490, costPrice: 520, stock: { "loc-warehouse": 15, "loc-store": 0 }, weight: 0.38 },
    ],
    price: 1490, costPrice: 520, packagingCost: 50, deliveryCost: 70, channelCommission: 20, margin: 55.0,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "yandex_market", "website"],
    tags: ["toys", "kids", "lego", "конструктор", "6+"],
    requiresLabeling: false, weight: 0.38, dimensions: { length: 25, width: 20, height: 8 },
    createdAt: "2025-10-01", updatedAt: "2026-05-24",
    stockByLocation: { "loc-warehouse": 78, "loc-store": 12 },
    reservedUnits: 25, damagedUnits: 3, inTransitUnits: 0, totalPhysical: 90,
  },

  // 14 — Свитер (active, low stock, Честный Знак, GTIN, variants)
  {
    id: "prod-014", name: "Свитер шерстяной оверсайз", category: "Одежда", productType: "product", status: "active",
    description: "Мериносовая шерсть 80%/полиамид 20%, мягкая вязка, высокий ворот. Честный Знак обязателен",
    imageUrl: "https://picsum.photos/seed/sweater14/120/120",
    sku: "SWT-WOL-001", barcode: "4680014567890", internalBarcode: "INT-SWT-001",
    hasVariants: true,
    variants: [
      { id: "var-014-1", name: "Кремовый / S", sku: "SWT-WOL-CRM-S", barcode: "4680014567891", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 3 }, weight: 0.45 },
      { id: "var-014-2", name: "Кремовый / M", sku: "SWT-WOL-CRM-M", barcode: "4680014567892", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 2 }, weight: 0.48 },
      { id: "var-014-3", name: "Чёрный / S",   sku: "SWT-WOL-BLK-S", barcode: "4680014567893", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 1, "loc-store": 1 }, weight: 0.45 },
      { id: "var-014-4", name: "Чёрный / M",   sku: "SWT-WOL-BLK-M", barcode: "4680014567894", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 2 }, weight: 0.48 },
      { id: "var-014-5", name: "Серый / M",    sku: "SWT-WOL-GRY-M",  barcode: "4680014567895", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 0 }, weight: 0.48 },
      { id: "var-014-6", name: "Серый / L",    sku: "SWT-WOL-GRY-L",  barcode: "4680014567896", price: 3490, costPrice: 1100, stock: { "loc-warehouse": 0 }, weight: 0.52 },
    ],
    price: 3490, costPrice: 1100, packagingCost: 80, deliveryCost: 100, channelCommission: 20, margin: 58.2,
    supplierId: "sup-001", channels: ["wildberries", "website"],
    tags: ["clothing", "wool", "sweater", "свитер", "мериносовая-шерсть"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "010468001456789021sWt3rMno0998", gtin: "04680014567890",
    weight: 0.47, dimensions: { length: 35, width: 28, height: 4 },
    createdAt: "2025-11-01", updatedAt: "2026-05-23",
    stockByLocation: { "loc-warehouse": 8, "loc-store": 1 },
    reservedUnits: 2, damagedUnits: 1, inTransitUnits: 0, totalPhysical: 9,
  },

  // 15 — Кофемолка (DRAFT, no stock, variants by wattage, Честный Знак pending)
  {
    id: "prod-015", name: "Кофемолка электрическая EspressoX", category: "Электроника", productType: "product", status: "draft",
    description: "Конические жернова 38мм, 18 режимов помола, бункер 250г. Статус: черновик — ожидает сертификации",
    imageUrl: "https://picsum.photos/seed/grinder15/120/120",
    sku: "GRD-EX-150", barcode: "4680015678901", internalBarcode: "INT-GRD-001",
    hasVariants: true,
    variants: [
      { id: "var-015-1", name: "150Вт / Чёрный", sku: "GRD-EX-150-BLK", barcode: "4680015678902", price: 2990, costPrice:  980, stock: {}, weight: 1.2 },
      { id: "var-015-2", name: "250Вт / Чёрный", sku: "GRD-EX-250-BLK", barcode: "4680015678903", price: 3990, costPrice: 1280, stock: {}, weight: 1.4 },
    ],
    price: 2990, costPrice: 980, packagingCost: 120, deliveryCost: 180, channelCommission: 15, margin: 52.5,
    supplierId: "sup-005", channels: ["wildberries", "ozon", "website"],
    tags: ["electronics", "coffee", "grinder", "кофемолка"],
    requiresLabeling: true, labelingType: "chestny_znak", gtin: "04680015678901",
    weight: 1.2, dimensions: { length: 16, width: 12, height: 30 },
    createdAt: "2026-04-15", updatedAt: "2026-05-25",
    stockByLocation: {},
    reservedUnits: 0, damagedUnits: 0, inTransitUnits: 0, totalPhysical: 0,
  },

  // 16 — Крем для рук (active, OUT OF STOCK, expiryDate near, in-transit)
  {
    id: "prod-016", name: "Крем для рук питательный 75мл", category: "Косметика", productType: "product", status: "active",
    description: "Масло ши 15%, гиалуроновая кислота, пантенол. Без парабенов. Срок годности — сентябрь 2026",
    imageUrl: "https://picsum.photos/seed/cream16/120/120",
    sku: "HCR-75-NAT", barcode: "4680016789012", internalBarcode: "INT-HCR-001",
    hasVariants: false, variants: [],
    price: 290, costPrice: 85, packagingCost: 10, deliveryCost: 25, channelCommission: 20, margin: 60.3,
    supplierId: "sup-006", channels: ["wildberries", "ozon", "website"],
    tags: ["cosmetics", "hand-cream", "natural", "крем"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "010460016789012321hcr75nat0001", gtin: "04600016789012",
    batchNumber: "HCR-2025-09-B", expiryDate: "2026-09-01",
    weight: 0.10, dimensions: { length: 4, width: 3, height: 10 },
    createdAt: "2025-09-01", updatedAt: "2026-05-25",
    stockByLocation: { "loc-warehouse": 0, "loc-store": 0 },
    reservedUnits: 0, damagedUnits: 3, inTransitUnits: 200, totalPhysical: 0,
  },

  // 17 — Бутылка Eco (active, OVERSTOCK)
  {
    id: "prod-017", name: "Бутылка для воды Eco 750мл", category: "Посуда и кухня", productType: "product", status: "active",
    description: "Тритан BPA Free, крышка-петля, широкое горлышко, шкала отметок, термостойкость 80°С",
    imageUrl: "https://picsum.photos/seed/bottle17/120/120",
    sku: "BTL-ECO-750", barcode: "4680017890123", internalBarcode: "INT-BTL-001",
    hasVariants: false, variants: [],
    price: 890, costPrice: 245, packagingCost: 25, deliveryCost: 55, channelCommission: 15, margin: 63.5,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "yandex_market", "website", "pos"],
    tags: ["household", "eco", "bottle", "sport", "бутылка"],
    requiresLabeling: false, weight: 0.22, dimensions: { length: 8, width: 8, height: 26 },
    createdAt: "2025-06-15", updatedAt: "2026-05-18",
    stockByLocation: { "loc-warehouse": 850, "loc-store": 120, "loc-online": 80 },
    reservedUnits: 50, damagedUnits: 10, inTransitUnits: 0, totalPhysical: 1050,
  },

  // 18 — Рюкзак Commuter (active, variants, in-transit)
  {
    id: "prod-018", name: "Рюкзак городской Commuter 25L", category: "Аксессуары", productType: "product", status: "active",
    description: "Полиэстер 600D с тефлоном, отдел ноутбук 15.6\", USB-порт, антикражный карман, пояс, 25L",
    imageUrl: "https://picsum.photos/seed/backpack18/120/120",
    sku: "BAG-CMT-25", barcode: "4680018901234", internalBarcode: "INT-BAG-001",
    hasVariants: true,
    variants: [
      { id: "var-018-1", name: "Чёрный", sku: "BAG-CMT-25-BLK", barcode: "4680018901235", price: 5490, costPrice: 1650, stock: { "loc-warehouse": 18, "loc-store": 3 }, weight: 0.68 },
      { id: "var-018-2", name: "Серый",  sku: "BAG-CMT-25-GRY", barcode: "4680018901236", price: 5490, costPrice: 1650, stock: { "loc-warehouse": 10, "loc-store": 1 }, weight: 0.68 },
    ],
    price: 5490, costPrice: 1650, packagingCost: 95, deliveryCost: 130, channelCommission: 15, margin: 60.8,
    supplierId: "sup-002", channels: ["wildberries", "ozon", "website"],
    tags: ["accessories", "backpack", "travel", "laptop", "рюкзак"],
    requiresLabeling: false, weight: 0.68, dimensions: { length: 32, width: 18, height: 48 },
    createdAt: "2025-12-01", updatedAt: "2026-05-22",
    stockByLocation: { "loc-warehouse": 28, "loc-store": 4 },
    reservedUnits: 3, damagedUnits: 1, inTransitUnits: 20, totalPhysical: 32,
  },

  // 19 — Зарядник GaN 65W (active, Честный Знак, GTIN, dataMatrix, variants)
  {
    id: "prod-019", name: "Зарядное устройство USB-C 65W", category: "Электроника", productType: "product", status: "active",
    description: "GaN технология, PD 3.0 + QC 4.0, 2×USB-C + 1×USB-A, умное распределение мощности. Сертификаты CE/FCC/ГОСТ",
    imageUrl: "https://picsum.photos/seed/charger19/120/120",
    sku: "CHR-GAN-65", barcode: "4607891234567", internalBarcode: "INT-CHR-001",
    hasVariants: true,
    variants: [
      { id: "var-019-1", name: "Белый",  sku: "CHR-GAN-65-WHT", barcode: "4607891234568", price: 1890, costPrice: 480, stock: { "loc-warehouse": 65, "loc-store": 10 }, weight: 0.09 },
      { id: "var-019-2", name: "Чёрный", sku: "CHR-GAN-65-BLK", barcode: "4607891234569", price: 1890, costPrice: 480, stock: { "loc-warehouse": 55, "loc-store":  8 }, weight: 0.09 },
    ],
    price: 1890, costPrice: 480, packagingCost: 40, deliveryCost: 50, channelCommission: 15, margin: 70.0,
    supplierId: "sup-005", channels: ["wildberries", "ozon", "yandex_market", "website"],
    tags: ["electronics", "charger", "gan", "usb-c", "зарядник"],
    requiresLabeling: true, labelingType: "chestny_znak",
    dataMatrixCode: "010460789123456721gan65w00001a", gtin: "04607891234567",
    weight: 0.09, dimensions: { length: 7, width: 5, height: 3 },
    createdAt: "2026-01-01", updatedAt: "2026-05-24",
    stockByLocation: { "loc-warehouse": 120, "loc-store": 18 },
    reservedUnits: 35, damagedUnits: 3, inTransitUnits: 0, totalPhysical: 138,
  },

  // 20 — Лосьон (ARCHIVED)
  {
    id: "prod-020", name: "Лосьон для тела «Арктика» 250мл", category: "Косметика", productType: "product", status: "archived",
    description: "Увлажняющий лосьон 250мл, без парабенов, арктический комплекс + масло авокадо. Снят с производства",
    imageUrl: "https://picsum.photos/seed/lotion20/120/120",
    sku: "CSM-LOS-001", barcode: "4680008901234", internalBarcode: "INT-LOS-001",
    hasVariants: false, variants: [],
    price: 650, costPrice: 180, packagingCost: 20, deliveryCost: 30, channelCommission: 20, margin: 72.3,
    channels: ["website"], tags: ["cosmetics", "body", "archived", "лосьон"],
    requiresLabeling: false, batchNumber: "LOS-2025-06-A", expiryDate: "2027-06-01",
    weight: 0.30, dimensions: { length: 6, width: 4, height: 16 },
    createdAt: "2024-11-01", updatedAt: "2026-01-15",
    stockByLocation: { "loc-warehouse": 35 },
    reservedUnits: 0, damagedUnits: 3, inTransitUnits: 0, totalPhysical: 35,
  },
];

// ── Purchase Orders ─────────────────────────────────────────────────────────
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "po-001", supplierId: "sup-002", supplierName: "ShenzhenGoods Co.",  status: "in_transit",          items: [{ productId: "prod-001", productName: "Органайзер для путешествий",         sku: "ORG-001",      qty: 200, receivedQty:   0, unitCost: 820,  totalCost: 164000 }, { productId: "prod-008", productName: "Bluetooth наушники TW-Pro 500", sku: "TWS-500",      qty:  50, receivedQty:   0, unitCost: 1850, totalCost:  92500 }], totalAmount: 256500, currency: "RUB", createdAt: "2026-05-01", updatedAt: "2026-05-10", expectedArrival: "2026-06-01", trackingNumber: "SZ2024051001", paymentStatus: "partial",   locationId: "loc-warehouse", note: "Морской контейнер. Наушники — первая партия" },
  { id: "po-002", supplierId: "sup-001", supplierName: "ТД Текстиль Юг",      status: "partially_received",  items: [{ productId: "prod-002", productName: "Футболка оверсайз хлопок",            sku: "TSH-002",      qty: 500, receivedQty: 300, unitCost: 350,  totalCost: 175000 }, { productId: "prod-006", productName: "Кепка с логотипом",                  sku: "CAP-001",      qty: 100, receivedQty: 100, unitCost: 280,  totalCost:  28000 }, { productId: "prod-014", productName: "Свитер шерстяной оверсайз",         sku: "SWT-WOL-001",  qty:  60, receivedQty:   0, unitCost: 1100, totalCost:  66000 }], totalAmount: 269000, currency: "RUB", createdAt: "2026-04-15", updatedAt: "2026-05-05", expectedArrival: "2026-04-25", receivedAt: "2026-04-28",  paymentStatus: "paid",      locationId: "loc-warehouse", note: "200 шт футболок + свитера ещё в пути" },
  { id: "po-003", supplierId: "sup-004", supplierName: "EuroCoffee Imports",   status: "confirmed",           items: [{ productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe",          sku: "COF-ETH-001",  qty:  50, receivedQty:   0, unitCost: 620,  totalCost:  31000 }], totalAmount:  31000, currency: "RUB", createdAt: "2026-05-15", updatedAt: "2026-05-16", expectedArrival: "2026-05-29",                            paymentStatus: "unpaid",    locationId: "loc-warehouse" },
  { id: "po-004", supplierId: "sup-003", supplierName: "ООО ПластУпак",         status: "closed",              items: [{ productId: "prod-004", productName: "Крафт-пакет с ручками 30×40",      sku: "PKG-KRAFT-001",qty: 3000,receivedQty:3000, unitCost:  12,  totalCost:  36000 }], totalAmount:  36000, currency: "RUB", createdAt: "2026-03-10", updatedAt: "2026-03-18", expectedArrival: "2026-03-15", receivedAt: "2026-03-17",  paymentStatus: "paid",      locationId: "loc-warehouse" },
  { id: "po-005", supplierId: "sup-001", supplierName: "ТД Текстиль Юг",        status: "draft",               items: [{ productId: "prod-007", productName: "Ежедневник A5 кожаный",             sku: "DRY-A5-001",   qty:  80, receivedQty:   0, unitCost: 950,  totalCost:  76000 }], totalAmount:  76000, currency: "RUB", createdAt: "2026-05-22", updatedAt: "2026-05-22",                                                                    paymentStatus: "unpaid",    locationId: "loc-warehouse" },
  { id: "po-006", supplierId: "sup-006", supplierName: "ЗдравКосметика ООО",    status: "sent",                items: [{ productId: "prod-010", productName: "Натуральный шампунь с алоэ 300мл", sku: "SHP-ALO-300",  qty: 200, receivedQty:   0, unitCost: 145,  totalCost:  29000 }, { productId: "prod-016", productName: "Крем для рук питательный 75мл",     sku: "HCR-75-NAT",   qty: 200, receivedQty:   0, unitCost:  85,  totalCost:  17000 }], totalAmount:  46000, currency: "RUB", createdAt: "2026-05-20", updatedAt: "2026-05-21", expectedArrival: "2026-05-30",                            paymentStatus: "partial",   locationId: "loc-warehouse", note: "Срочный заказ — крем на критическом минимуме" },
];

// ── Transfers ───────────────────────────────────────────────────────────────
export const TRANSFERS: Transfer[] = [
  { id: "tr-001", fromLocationId: "loc-warehouse", toLocationId: "loc-store",    status: "received",  items: [{ productId: "prod-001", productName: "Органайзер для путешествий",    sku: "ORG-001",     qty: 20, receivedQty: 20 }, { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qty: 50, receivedQty: 50 }], createdAt: "2026-05-10", receivedAt: "2026-05-11", note: "Плановое пополнение магазина на май" },
  { id: "tr-002", fromLocationId: "loc-warehouse", toLocationId: "loc-showroom", status: "in_transit", items: [{ productId: "prod-007", productName: "Ежедневник A5 кожаный",         sku: "DRY-A5-001",  qty:  5, receivedQty:  0 }, { productId: "prod-018", productName: "Рюкзак Commuter 25L",      sku: "BAG-CMT-25",  qty:  2, receivedQty:  0 }], createdAt: "2026-05-23", expectedArrival: "2026-05-24", note: "Для выставочного зала" },
  { id: "tr-003", fromLocationId: "loc-store",     toLocationId: "loc-returns",  status: "received",  items: [{ productId: "prod-002", productName: "Футболка оверсайз хлопок",       sku: "TSH-002",     qty:  3, receivedQty:  3 }], createdAt: "2026-05-20", receivedAt: "2026-05-20", note: "Возврат — неподходящий размер, хорошее состояние" },
];

// ── Stocktakes ──────────────────────────────────────────────────────────────
export const STOCKTAKES: Stocktake[] = [
  { id: "stk-001", locationId: "loc-warehouse", status: "completed", items: [{ productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", systemQty: 115, countedQty: 110, variance: -5, reason: "Недостача при приёмке" }, { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", systemQty: 365, countedQty: 361, variance: -4, reason: "Погрешность учёта" }, { productId: "prod-004", productName: "Крафт-пакет", sku: "PKG-KRAFT-001", systemQty: 2802, countedQty: 2800, variance: -2, reason: "Брак" }], createdAt: "2026-05-15", completedAt: "2026-05-15", approvedBy: "Мария Иванова", note: "Плановая ежемесячная инвентаризация" },
  { id: "stk-002", locationId: "loc-store",     status: "in_progress", items: [{ productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", systemQty: 28, countedQty: 27, variance: -1 }, { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", systemQty: 55, countedQty: null, variance: null }, { productId: "prod-006", productName: "Кепка с логотипом", sku: "CAP-001", systemQty: 0, countedQty: null, variance: null }, { productId: "prod-011", productName: "Термос нержавеющий 500мл", sku: "TRM-500", systemQty: 10, countedQty: null, variance: null }], createdAt: "2026-05-24", note: "Внеплановая проверка по запросу" },
];

// ── Movements ───────────────────────────────────────────────────────────────
export const MOVEMENTS: StockMovement[] = [
  { id: "mv-001", type: "receipt",    productId: "prod-002", productName: "Футболка оверсайз хлопок",      sku: "TSH-002",      qtyBefore: 211, qtyAfter: 416, qtyDelta:  205, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-04-28T10:30:00Z", referenceId: "po-002", referenceType: "purchase_order", reason: "Приёмка по ЗП-002" },
  { id: "mv-002", type: "transfer",   productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",      qtyBefore: 130, qtyAfter: 110, qtyDelta:  -20, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-05-10T14:00:00Z", referenceId: "tr-001", referenceType: "transfer",        reason: "Перемещение в магазин на Арбате" },
  { id: "mv-003", type: "sale",       productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",      qtyBefore:  30, qtyAfter:  28, qtyDelta:   -2, locationId: "loc-store",     userId: "u-2", userName: "ПОС Арбат",      createdAt: "2026-05-22T15:22:00Z",                                                           reason: "Продажа через кассу" },
  { id: "mv-004", type: "return",     productId: "prod-002", productName: "Футболка оверсайз хлопок",      sku: "TSH-002",      qtyBefore:  45, qtyAfter:  48, qtyDelta:    3, locationId: "loc-store",     userId: "u-2", userName: "ПОС Арбат",      createdAt: "2026-05-20T11:10:00Z", referenceId: "tr-003", referenceType: "return",          reason: "Возврат — неподходящий размер" },
  { id: "mv-005", type: "adjustment", productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",      qtyBefore: 115, qtyAfter: 110, qtyDelta:   -5, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-05-15T16:00:00Z", referenceId: "stk-001", referenceType: "stocktake",       reason: "Корректировка по итогам инвентаризации" },
  { id: "mv-006", type: "write_off",  productId: "prod-004", productName: "Крафт-пакет с ручками 30×40", sku: "PKG-KRAFT-001",qtyBefore:2852, qtyAfter:2800, qtyDelta:  -52, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-05-15T16:30:00Z",                                                           reason: "Списание брака и мятых пакетов" },
  { id: "mv-007", type: "receipt",    productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe",    sku: "COF-ETH-001",  qtyBefore:   0, qtyAfter:   8, qtyDelta:    8, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-05-01T09:00:00Z",                                                           reason: "Приёмка первой партии" },
  { id: "mv-008", type: "reserve",    productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",      qtyBefore: 110, qtyAfter: 110, qtyDelta:    0, locationId: "loc-warehouse", userId: "u-3", userName: "WB-Integration", createdAt: "2026-05-24T08:00:00Z",                                                           reason: "Резерв под заказ WB #45892" },
  { id: "mv-009", type: "receipt",    productId: "prod-008", productName: "Bluetooth наушники TW-Pro 500",sku: "TWS-500",      qtyBefore:   0, qtyAfter:  50, qtyDelta:   50, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова",  createdAt: "2026-05-05T11:00:00Z",                                                           reason: "Первая партия наушников" },
  { id: "mv-010", type: "sale",       productId: "prod-009", productName: "Протеиновый батончик «Заряд»", sku: "BAR-ZAR-001", qtyBefore: 542, qtyAfter: 530, qtyDelta:  -12, locationId: "loc-warehouse", userId: "u-3", userName: "WB-Integration", createdAt: "2026-05-24T09:15:00Z",                                                           reason: "Продажи через WB — 12 штук" },
];

// ── Reservations ──────────────────────────────────────────────────────────────
export const RESERVATIONS: Reservation[] = [
  { id: "res-001", productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",     locationId: "loc-warehouse", qty: 10, source: "wildberries",   orderRef: "WB-88234501", customerName: "Иван Петров",     status: "active", createdAt: "2026-05-23", expiresAt: "2026-05-27" },
  { id: "res-002", productId: "prod-001", productName: "Органайзер для путешествий",   sku: "ORG-001",     locationId: "loc-warehouse", qty: 5,  source: "website",       orderRef: "WEB-10042",   customerName: "Анна Козлова",    status: "active", createdAt: "2026-05-25", expiresAt: "2026-05-26" },
  { id: "res-003", productId: "prod-002", productName: "Футболка оверсайз хлопок",      sku: "TSH-OV-002",  locationId: "loc-warehouse", qty: 30, source: "ozon",          orderRef: "OZN-4491827", customerName: "Мария Сидорова",  status: "active", createdAt: "2026-05-24", expiresAt: "2026-05-29" },
  { id: "res-004", productId: "prod-008", productName: "Bluetooth наушники TW-Pro 500", sku: "TWS-500",     locationId: "loc-warehouse", qty: 20, source: "yandex_market", orderRef: "YM-990123",   status: "active", createdAt: "2026-05-22", expiresAt: "2026-05-28" },
  { id: "res-005", productId: "prod-009", productName: "Протеиновый батончик «Заряд» 60г", sku: "BAR-ZAR-001", locationId: "loc-warehouse", qty: 30, source: "wildberries", orderRef: "WB-88210000", status: "active", createdAt: "2026-05-24", expiresAt: "2026-05-25" },
  { id: "res-006", productId: "prod-013", productName: "Детский конструктор 120 деталей", sku: "TOY-013",   locationId: "loc-warehouse", qty: 25, source: "manual",       customerName: "ООО Детский Мир", status: "active", createdAt: "2026-05-21", expiresAt: "2026-05-30", note: "Ожидают самовывоза" },
  { id: "res-007", productId: "prod-017", productName: "Бутылка для воды Eco 750мл",    sku: "BTL-ECO-017", locationId: "loc-warehouse", qty: 50, source: "ozon",          orderRef: "OZN-4488000", status: "active", createdAt: "2026-05-20", expiresAt: "2026-05-27" },
  { id: "res-008", productId: "prod-019", productName: "Зарядное устройство USB-C 65W", sku: "CHG-USB-019", locationId: "loc-warehouse", qty: 35, source: "wildberries",   orderRef: "WB-88299100", customerName: "Петр Волков",     status: "active", createdAt: "2026-05-23", expiresAt: "2026-05-28" },
  { id: "res-009", productId: "prod-011", productName: "Термос нержавеющий 500мл",      sku: "THRM-011",    locationId: "loc-store",     qty: 8,  source: "pos",           orderRef: "POS-0091",    status: "fulfilled", createdAt: "2026-05-18", expiresAt: "2026-05-22", fulfilledAt: "2026-05-21" },
  { id: "res-010", productId: "prod-007", productName: "Ежедневник A5 кожаный",         sku: "DRY-A5-007",  locationId: "loc-warehouse", qty: 4,  source: "manual",        customerName: "Корпоративный заказ", status: "active", createdAt: "2026-05-19", expiresAt: "2026-05-31" },
];

// ── Returns ──────────────────────────────────────────────────────────────────
export type ReturnStatus = "pending" | "inspected" | "restocked" | "written_off" | "refunded";
export type ReturnReason = "wrong_item" | "defective" | "not_as_described" | "changed_mind" | "damaged_shipping" | "other";
export type ReturnItemCondition = "new" | "good" | "damaged" | "unsellable";
export type ReturnItemAction = "restock" | "write_off" | "quarantine";

export interface ReturnItem {
  productId: string; productName: string; sku: string;
  qty: number;
  condition: ReturnItemCondition;
  action: ReturnItemAction;
}

export interface ProductReturn {
  id: string;
  status: ReturnStatus;
  channel: SalesChannel | "manual";
  orderRef: string;
  customerName: string;
  items: ReturnItem[];
  totalValue: number;
  reason: ReturnReason;
  createdAt: string;
  processedAt?: string;
  locationId: string;
  note?: string;
}

export const RETURNS: ProductReturn[] = [];

// ── Bundles ───────────────────────────────────────────────────────────────────
export interface BundleComponent {
  productId: string; productName: string; sku: string;
  qty: number;
  costContribution: number;
}

export interface Bundle {
  id: string;
  name: string;
  sku: string;
  status: "active" | "draft" | "archived";
  components: BundleComponent[];
  sellingPrice: number;
  totalCost: number;
  margin: number;
  createdAt: string;
  channels: SalesChannel[];
}

export const BUNDLES: Bundle[] = [];

// ── Replenishment Rules ───────────────────────────────────────────────────────
export type TriggerType = "min_stock" | "days_of_stock" | "reorder_point";

export interface ReplenishmentRule {
  id: string;
  productId: string; productName: string; sku: string;
  supplierId?: string; supplierName?: string;
  triggerType: TriggerType;
  minStock?: number;
  daysOfStock?: number;
  reorderQty: number;
  isActive: boolean;
  lastTriggered?: string;
  nextCheck: string;
}

export const REPLENISHMENT_RULES: ReplenishmentRule[] = [];

// ── Inventory Batches ─────────────────────────────────────────────────────────
export type BatchStatus = "ok" | "expiring_soon" | "expired" | "quarantine";

export interface InventoryBatch {
  id: string;
  productId: string; productName: string; sku: string;
  batchNumber: string;
  qty: number;
  remainingQty: number;
  manufactureDate?: string;
  expiryDate: string;
  locationId: string;
  status: BatchStatus;
  receivedAt: string;
  supplierId?: string;
  costPrice: number;
}

// Today: 2026-05-25
// Products with expiryDate + batchNumber:
//   prod-003  COF-ETH-001  expiry 2027-03-15  batch ETH-2026-03-001  warehouse stock 8   costPrice 620  → ok (>30 days)
//   prod-009  BAR-ZAR-001  expiry 2026-11-30  batch ZR-2026-04-001   warehouse stock 450 costPrice 65   → ok (>30 days)
//   prod-010  SHP-ALO-300  expiry 2027-06-01  batch SHP-2025-12-A    warehouse stock 180 costPrice 145  → ok (>30 days)
//   prod-016  HCR-75-NAT   expiry 2026-09-01  batch HCR-2025-09-B    warehouse stock 0   costPrice 85   → expiring_soon (within 30 days? 2026-09-01 is ~99 days away → ok)
//   prod-020  CSM-LOS-001  expiry 2027-06-01  batch LOS-2025-06-A    warehouse stock 35  costPrice 180  → ok
// Note: 2026-09-01 is ~99 days from 2026-05-25, so HCR is "ok".
// None are expired or within 30 days from today (2026-05-25). All are "ok".
export const BATCHES: InventoryBatch[] = [
  {
    id: "bat-001",
    productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe", sku: "COF-ETH-001",
    batchNumber: "ETH-2026-03-001",
    qty: 8, remainingQty: 8,
    expiryDate: "2027-03-15",
    locationId: "loc-warehouse",
    status: "ok",
    receivedAt: "2026-05-01",
    supplierId: "sup-004",
    costPrice: 620,
  },
  {
    id: "bat-002",
    productId: "prod-009", productName: "Протеиновый батончик «Заряд» 60г", sku: "BAR-ZAR-001",
    batchNumber: "ZR-2026-04-001",
    qty: 450, remainingQty: 450,
    expiryDate: "2026-11-30",
    locationId: "loc-warehouse",
    status: "ok",
    receivedAt: "2026-04-15",
    supplierId: "sup-006",
    costPrice: 65,
  },
  {
    id: "bat-003",
    productId: "prod-010", productName: "Натуральный шампунь с алоэ 300мл", sku: "SHP-ALO-300",
    batchNumber: "SHP-2025-12-A",
    qty: 180, remainingQty: 180,
    expiryDate: "2027-06-01",
    locationId: "loc-warehouse",
    status: "ok",
    receivedAt: "2025-12-10",
    supplierId: "sup-006",
    costPrice: 145,
  },
  {
    id: "bat-004",
    productId: "prod-016", productName: "Крем для рук питательный 75мл", sku: "HCR-75-NAT",
    batchNumber: "HCR-2025-09-B",
    qty: 0, remainingQty: 0,
    expiryDate: "2026-09-01",
    locationId: "loc-warehouse",
    status: "ok",
    receivedAt: "2025-09-15",
    supplierId: "sup-006",
    costPrice: 85,
  },
  {
    id: "bat-005",
    productId: "prod-020", productName: "Лосьон для тела «Арктика» 250мл", sku: "CSM-LOS-001",
    batchNumber: "LOS-2025-06-A",
    qty: 35, remainingQty: 35,
    expiryDate: "2027-06-01",
    locationId: "loc-warehouse",
    status: "ok",
    receivedAt: "2025-06-20",
    costPrice: 180,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getAvailableStock(product: Product): number {
  return Math.max(0, product.totalPhysical - product.reservedUnits - product.damagedUnits - product.inTransitUnits);
}

export function getStockStatus(product: Product): StockStatus {
  const available = getAvailableStock(product);
  if (available === 0) return "out_of_stock";
  if (available < 10) return "low_stock";
  if (product.totalPhysical > 500) return "overstock";
  return "in_stock";
}

export function getLocationName(locationId: string): string {
  return LOCATIONS.find((l) => l.id === locationId)?.name ?? locationId;
}

export function getSupplierName(supplierId: string | undefined): string {
  if (!supplierId) return "—";
  return SUPPLIERS.find((s) => s.id === supplierId)?.name ?? supplierId;
}

export function getTotalInventoryValue(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.totalPhysical * p.costPrice, 0);
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => getStockStatus(p) === "low_stock" || getStockStatus(p) === "out_of_stock");
}

export function getInventoryStats(products: Product[]) {
  const active = products.filter((p) => p.status === "active");
  const totalValue = getTotalInventoryValue(active);
  const lowStock = getLowStockProducts(active);
  const outOfStock = active.filter((p) => getStockStatus(p) === "out_of_stock");
  const totalUnits = active.reduce((sum, p) => sum + getAvailableStock(p), 0);
  return {
    totalProducts: active.length,
    totalUnits,
    totalValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    avgMargin: active.reduce((sum, p) => sum + (p.margin ?? 0), 0) / (active.length || 1),
  };
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Черновик", sent: "Отправлен", confirmed: "Подтверждён",
  in_transit: "В пути", partially_received: "Частично принят", closed: "Закрыт", issue: "Проблема",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: "Поступление", sale: "Продажа", reserve: "Резерв", return: "Возврат",
  write_off: "Списание", transfer: "Перемещение", adjustment: "Корректировка",
  stocktake: "Инвентаризация", labeling: "Маркировка", cost_change: "Изменение цены",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  product: "Товар", ingredient: "Ингредиент", bundle: "Комплект",
  recipe: "Рецепт", consumable: "Расходник", packaging: "Упаковка",
};

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  pos: "POS / Касса", website: "Сайт", telegram: "Telegram", delivery: "Доставка",
  wildberries: "Wildberries", ozon: "Ozon", yandex_market: "Яндекс Маркет",
};
