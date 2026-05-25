"use client";

export type ProductStatus = "active" | "draft" | "archived";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "overstock";
export type ProductType = "product" | "ingredient" | "bundle" | "recipe" | "consumable" | "packaging";
export type MovementType =
  | "receipt"
  | "sale"
  | "reserve"
  | "return"
  | "write_off"
  | "transfer"
  | "adjustment"
  | "stocktake"
  | "labeling"
  | "cost_change";
export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "in_transit"
  | "partially_received"
  | "closed"
  | "issue";
export type TransferStatus = "draft" | "in_transit" | "received" | "partial";
export type StocktakeStatus = "draft" | "in_progress" | "completed" | "cancelled";
export type SalesChannel =
  | "pos"
  | "website"
  | "telegram"
  | "delivery"
  | "wildberries"
  | "ozon"
  | "yandex_market";

export interface ProductVariant {
  id: string;
  name: string; // "Красный / XL"
  sku: string;
  barcode?: string;
  price: number;
  costPrice: number;
  stock: Record<string, number>; // locationId -> quantity
  weight?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  productType: ProductType;
  status: ProductStatus;
  sku: string;
  barcode?: string;
  internalBarcode?: string;
  hasVariants: boolean;
  variants: ProductVariant[];
  price: number;
  costPrice: number;
  packagingCost?: number;
  deliveryCost?: number;
  channelCommission?: number;
  margin?: number;
  supplierId?: string;
  channels: SalesChannel[];
  tags: string[];
  requiresLabeling: boolean;
  labelingType?: "chestny_znak" | "egais" | "mercury";
  dataMatrixCode?: string;
  gtin?: string;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  stockByLocation: Record<string, number>; // locationId -> qty
  reservedUnits: number;
  damagedUnits: number;
  inTransitUnits: number;
  totalPhysical: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  country: string;
  city?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  minOrderQty?: number;
  currency: "RUB" | "USD" | "EUR" | "CNY";
  rating: number;
  notes?: string;
  createdAt: string;
  catalogUrl?: string;
  priceListUrl?: string;
  telegramHandle?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  receivedQty: number;
  unitCost: number;
  totalCost: number;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  currency: "RUB" | "USD" | "EUR" | "CNY";
  createdAt: string;
  updatedAt: string;
  expectedArrival?: string;
  receivedAt?: string;
  note?: string;
  trackingNumber?: string;
  paymentStatus?: "unpaid" | "partial" | "paid";
  locationId: string;
}

export interface Transfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  items: { productId: string; productName: string; sku: string; qty: number; receivedQty: number }[];
  createdAt: string;
  expectedArrival?: string;
  receivedAt?: string;
  note?: string;
}

export interface StocktakeItem {
  productId: string;
  productName: string;
  sku: string;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
  reason?: string;
  photo?: string;
}

export interface Stocktake {
  id: string;
  locationId: string;
  status: StocktakeStatus;
  items: StocktakeItem[];
  createdAt: string;
  completedAt?: string;
  approvedBy?: string;
  note?: string;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  productId: string;
  productName: string;
  sku: string;
  qtyBefore: number;
  qtyAfter: number;
  qtyDelta: number;
  locationId: string;
  userId: string;
  userName: string;
  createdAt: string;
  reason?: string;
  referenceId?: string; // PO ID, transfer ID, etc.
  referenceType?: "purchase_order" | "transfer" | "stocktake" | "sale" | "return";
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  type: "warehouse" | "store" | "showroom" | "backroom" | "online_reserve" | "returns" | "damaged" | "in_transit";
  address?: string;
  isDefault: boolean;
}

// ── Mock Locations ─────────────────────────────────────────────────────────
export const LOCATIONS: Location[] = [
  { id: "loc-warehouse", name: "Основной склад", type: "warehouse", address: "Москва, ул. Складская, 1", isDefault: true },
  { id: "loc-store", name: "Магазин на Арбате", type: "store", address: "Москва, ул. Арбат, 12", isDefault: false },
  { id: "loc-showroom", name: "Шоурум", type: "showroom", address: "Москва, ул. Тверская, 5", isDefault: false },
  { id: "loc-online", name: "Онлайн-резерв", type: "online_reserve", isDefault: false },
  { id: "loc-returns", name: "Возвраты", type: "returns", isDefault: false },
  { id: "loc-damaged", name: "Брак", type: "damaged", isDefault: false },
];

// ── Mock Suppliers ─────────────────────────────────────────────────────────
export const SUPPLIERS: Supplier[] = [
  {
    id: "sup-001",
    name: "ТД Текстиль Юг",
    contactName: "Иван Петров",
    email: "ivan@textile-yug.ru",
    phone: "+7 (861) 123-45-67",
    website: "https://textile-yug.ru",
    country: "Россия",
    city: "Краснодар",
    paymentTerms: "Оплата по факту",
    leadTimeDays: 7,
    minOrderQty: 50,
    currency: "RUB",
    rating: 4.8,
    notes: "Надёжный поставщик хлопковых изделий",
    createdAt: "2025-01-15",
    telegramHandle: "@textile_yug",
  },
  {
    id: "sup-002",
    name: "ShenzhenGoods Co.",
    contactName: "Wang Wei",
    email: "wangwei@szgoods.cn",
    phone: "+86 755 8888 9999",
    website: "https://szgoods.cn",
    country: "Китай",
    city: "Шэньчжэнь",
    paymentTerms: "50% предоплата",
    leadTimeDays: 25,
    minOrderQty: 100,
    currency: "CNY",
    rating: 4.2,
    notes: "Аксессуары для путешествий, хорошее качество",
    createdAt: "2025-02-01",
    catalogUrl: "https://1688.com/example",
  },
  {
    id: "sup-003",
    name: "ООО ПластУпак",
    contactName: "Анна Смирнова",
    email: "anna@plastupak.ru",
    phone: "+7 (495) 555-12-34",
    country: "Россия",
    city: "Москва",
    paymentTerms: "Отсрочка 14 дней",
    leadTimeDays: 3,
    minOrderQty: 200,
    currency: "RUB",
    rating: 4.5,
    notes: "Упаковка, пакеты, коробки",
    createdAt: "2025-01-20",
  },
  {
    id: "sup-004",
    name: "EuroCoffee Imports",
    contactName: "Markus Braun",
    email: "markus@eurocoffee.de",
    phone: "+49 30 1234567",
    country: "Германия",
    city: "Берлин",
    paymentTerms: "Net 30",
    leadTimeDays: 14,
    minOrderQty: 25,
    currency: "EUR",
    rating: 4.9,
    notes: "Зерновой кофе premium сегмента",
    createdAt: "2025-03-10",
  },
];

// ── Mock Products ──────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Органайзер для путешествий",
    description: "Компактный органайзер из водоотталкивающего нейлона с несколькими отделениями",
    imageUrl: "https://picsum.photos/seed/org1/120/120",
    category: "Аксессуары",
    productType: "product",
    status: "active",
    sku: "ORG-001",
    barcode: "4680001234567",
    hasVariants: true,
    variants: [
      { id: "var-001-1", name: "Чёрный / S", sku: "ORG-001-BLK-S", barcode: "4680001234568", price: 2950, costPrice: 820, stock: { "loc-warehouse": 45, "loc-store": 12 }, weight: 0.18 },
      { id: "var-001-2", name: "Чёрный / M", sku: "ORG-001-BLK-M", barcode: "4680001234569", price: 2950, costPrice: 820, stock: { "loc-warehouse": 30, "loc-store": 8 }, weight: 0.22 },
      { id: "var-001-3", name: "Синий / S", sku: "ORG-001-BLU-S", barcode: "4680001234570", price: 2950, costPrice: 820, stock: { "loc-warehouse": 20, "loc-store": 5 }, weight: 0.18 },
      { id: "var-001-4", name: "Синий / M", sku: "ORG-001-BLU-M", barcode: "4680001234571", price: 2950, costPrice: 820, stock: { "loc-warehouse": 15, "loc-store": 3 }, weight: 0.22 },
    ],
    price: 2950,
    costPrice: 820,
    packagingCost: 80,
    deliveryCost: 120,
    channelCommission: 15,
    margin: 32.5,
    supplierId: "sup-002",
    channels: ["wildberries", "ozon", "website"],
    tags: ["travel", "organizer", "bestseller"],
    requiresLabeling: false,
    createdAt: "2025-01-10",
    updatedAt: "2026-05-20",
    stockByLocation: { "loc-warehouse": 110, "loc-store": 28 },
    reservedUnits: 15,
    damagedUnits: 2,
    inTransitUnits: 50,
    totalPhysical: 138,
  },
  {
    id: "prod-002",
    name: "Футболка оверсайз хлопок",
    description: "100% хлопок, плотность 200 г/м², оверсайз крой",
    imageUrl: "https://picsum.photos/seed/tshirt2/120/120",
    category: "Одежда",
    productType: "product",
    status: "active",
    sku: "TSH-002",
    barcode: "4680002345678",
    hasVariants: true,
    variants: [
      { id: "var-002-1", name: "Белый / XS", sku: "TSH-002-WHT-XS", price: 1490, costPrice: 350, stock: { "loc-warehouse": 80 }, weight: 0.25 },
      { id: "var-002-2", name: "Белый / S", sku: "TSH-002-WHT-S", price: 1490, costPrice: 350, stock: { "loc-warehouse": 120, "loc-store": 20 }, weight: 0.27 },
      { id: "var-002-3", name: "Белый / M", sku: "TSH-002-WHT-M", price: 1490, costPrice: 350, stock: { "loc-warehouse": 95, "loc-store": 15 }, weight: 0.30 },
      { id: "var-002-4", name: "Белый / L", sku: "TSH-002-WHT-L", price: 1490, costPrice: 350, stock: { "loc-warehouse": 60, "loc-store": 10 }, weight: 0.33 },
      { id: "var-002-5", name: "Чёрный / S", sku: "TSH-002-BLK-S", price: 1490, costPrice: 350, stock: { "loc-warehouse": 4 }, weight: 0.27 },
      { id: "var-002-6", name: "Чёрный / M", sku: "TSH-002-BLK-M", price: 1490, costPrice: 350, stock: { "loc-warehouse": 2 }, weight: 0.30 },
    ],
    price: 1490,
    costPrice: 350,
    packagingCost: 30,
    margin: 42.8,
    supplierId: "sup-001",
    channels: ["wildberries", "ozon", "pos", "website"],
    tags: ["clothing", "cotton", "oversized"],
    requiresLabeling: true,
    labelingType: "chestny_znak",
    createdAt: "2025-02-01",
    updatedAt: "2026-05-19",
    stockByLocation: { "loc-warehouse": 361, "loc-store": 45 },
    reservedUnits: 30,
    damagedUnits: 5,
    inTransitUnits: 0,
    totalPhysical: 406,
  },
  {
    id: "prod-003",
    name: "Кофе Ethiopia Yirgacheffe",
    description: "Обжарка light, цветочные ноты, кислотность высокая",
    imageUrl: "https://picsum.photos/seed/coffee3/120/120",
    category: "Кофе",
    productType: "ingredient",
    status: "active",
    sku: "COF-ETH-001",
    barcode: "4680003456789",
    hasVariants: false,
    variants: [],
    price: 1800,
    costPrice: 620,
    channelCommission: 0,
    margin: 65.6,
    supplierId: "sup-004",
    channels: ["pos", "website", "delivery"],
    tags: ["coffee", "ethiopia", "specialty"],
    requiresLabeling: false,
    createdAt: "2025-03-15",
    updatedAt: "2026-05-22",
    stockByLocation: { "loc-warehouse": 8 },
    reservedUnits: 0,
    damagedUnits: 0,
    inTransitUnits: 25,
    totalPhysical: 8,
  },
  {
    id: "prod-004",
    name: "Крафт-пакет с ручками 30x40",
    description: "Бумажный крафт-пакет, грузоподъёмность 5 кг",
    imageUrl: "https://picsum.photos/seed/bag4/120/120",
    category: "Упаковка",
    productType: "packaging",
    status: "active",
    sku: "PKG-KRAFT-001",
    barcode: "4680004567890",
    hasVariants: false,
    variants: [],
    price: 45,
    costPrice: 12,
    margin: 73.3,
    supplierId: "sup-003",
    channels: ["pos"],
    tags: ["packaging", "kraft", "eco"],
    requiresLabeling: false,
    createdAt: "2025-01-05",
    updatedAt: "2026-05-18",
    stockByLocation: { "loc-warehouse": 2800, "loc-store": 400 },
    reservedUnits: 0,
    damagedUnits: 50,
    inTransitUnits: 0,
    totalPhysical: 3200,
  },
  {
    id: "prod-005",
    name: "Набор для путешественника",
    description: "Комплект: органайзер + футболка + крафт-пакет",
    imageUrl: "https://picsum.photos/seed/bundle5/120/120",
    category: "Аксессуары",
    productType: "bundle",
    status: "draft",
    sku: "BND-001",
    hasVariants: false,
    variants: [],
    price: 4290,
    costPrice: 1200,
    margin: 28.0,
    channels: ["website", "telegram"],
    tags: ["bundle", "gift"],
    requiresLabeling: false,
    createdAt: "2026-04-01",
    updatedAt: "2026-05-10",
    stockByLocation: {},
    reservedUnits: 0,
    damagedUnits: 0,
    inTransitUnits: 0,
    totalPhysical: 0,
  },
  {
    id: "prod-006",
    name: "Кепка с логотипом",
    description: "Бейсболка, 100% хлопок, регулируемый ремешок",
    imageUrl: "https://picsum.photos/seed/cap6/120/120",
    category: "Одежда",
    productType: "product",
    status: "active",
    sku: "CAP-001",
    barcode: "4680006789012",
    hasVariants: false,
    variants: [],
    price: 890,
    costPrice: 280,
    margin: 68.5,
    supplierId: "sup-001",
    channels: ["pos", "website", "wildberries"],
    tags: ["headwear", "promo"],
    requiresLabeling: false,
    createdAt: "2025-04-10",
    updatedAt: "2026-05-21",
    stockByLocation: { "loc-warehouse": 0, "loc-store": 0 },
    reservedUnits: 0,
    damagedUnits: 1,
    inTransitUnits: 0,
    totalPhysical: 0,
  },
  {
    id: "prod-007",
    name: "Ежедневник A5 кожаный",
    description: "Натуральная кожа, 192 листа, ляссе",
    imageUrl: "https://picsum.photos/seed/diary7/120/120",
    category: "Канцтовары",
    productType: "product",
    status: "active",
    sku: "DRY-A5-001",
    barcode: "4680007890123",
    hasVariants: true,
    variants: [
      { id: "var-007-1", name: "Коричневый", sku: "DRY-A5-BRN", price: 3200, costPrice: 950, stock: { "loc-warehouse": 18, "loc-store": 4 }, weight: 0.55 },
      { id: "var-007-2", name: "Чёрный", sku: "DRY-A5-BLK", price: 3200, costPrice: 950, stock: { "loc-warehouse": 12, "loc-store": 3 }, weight: 0.55 },
    ],
    price: 3200,
    costPrice: 950,
    packagingCost: 120,
    margin: 39.4,
    supplierId: "sup-001",
    channels: ["pos", "website", "ozon"],
    tags: ["stationery", "leather", "gift"],
    requiresLabeling: false,
    createdAt: "2025-05-01",
    updatedAt: "2026-05-20",
    stockByLocation: { "loc-warehouse": 30, "loc-store": 7 },
    reservedUnits: 4,
    damagedUnits: 1,
    inTransitUnits: 0,
    totalPhysical: 37,
  },
  {
    id: "prod-008",
    name: "Лосьон для тела «Арктика»",
    description: "Увлажняющий лосьон, 250 мл, без парабенов",
    imageUrl: "https://picsum.photos/seed/lotion8/120/120",
    category: "Косметика",
    productType: "product",
    status: "archived",
    sku: "CSM-LOS-001",
    barcode: "4680008901234",
    hasVariants: false,
    variants: [],
    price: 650,
    costPrice: 180,
    margin: 72.3,
    channels: ["website"],
    tags: ["cosmetics", "body"],
    requiresLabeling: false,
    createdAt: "2024-11-01",
    updatedAt: "2026-01-15",
    stockByLocation: { "loc-warehouse": 35 },
    reservedUnits: 0,
    damagedUnits: 3,
    inTransitUnits: 0,
    totalPhysical: 35,
  },
];

// ── Mock Purchase Orders ───────────────────────────────────────────────────
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-001",
    supplierId: "sup-002",
    supplierName: "ShenzhenGoods Co.",
    status: "in_transit",
    items: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 200, receivedQty: 0, unitCost: 820, totalCost: 164000 },
    ],
    totalAmount: 164000,
    currency: "RUB",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-10",
    expectedArrival: "2026-06-01",
    trackingNumber: "SZ2024051001",
    paymentStatus: "partial",
    locationId: "loc-warehouse",
    note: "Стандартная поставка, морской контейнер",
  },
  {
    id: "po-002",
    supplierId: "sup-001",
    supplierName: "ТД Текстиль Юг",
    status: "partially_received",
    items: [
      { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qty: 500, receivedQty: 300, unitCost: 350, totalCost: 175000 },
      { productId: "prod-006", productName: "Кепка с логотипом", sku: "CAP-001", qty: 100, receivedQty: 100, unitCost: 280, totalCost: 28000 },
    ],
    totalAmount: 203000,
    currency: "RUB",
    createdAt: "2026-04-15",
    updatedAt: "2026-05-05",
    expectedArrival: "2026-04-25",
    receivedAt: "2026-04-28",
    paymentStatus: "paid",
    locationId: "loc-warehouse",
    note: "200 шт футболок ещё в пути, вторая партия",
  },
  {
    id: "po-003",
    supplierId: "sup-004",
    supplierName: "EuroCoffee Imports",
    status: "confirmed",
    items: [
      { productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe", sku: "COF-ETH-001", qty: 50, receivedQty: 0, unitCost: 620, totalCost: 31000 },
    ],
    totalAmount: 31000,
    currency: "RUB",
    createdAt: "2026-05-15",
    updatedAt: "2026-05-16",
    expectedArrival: "2026-05-29",
    paymentStatus: "unpaid",
    locationId: "loc-warehouse",
  },
  {
    id: "po-004",
    supplierId: "sup-003",
    supplierName: "ООО ПластУпак",
    status: "closed",
    items: [
      { productId: "prod-004", productName: "Крафт-пакет с ручками 30x40", sku: "PKG-KRAFT-001", qty: 3000, receivedQty: 3000, unitCost: 12, totalCost: 36000 },
    ],
    totalAmount: 36000,
    currency: "RUB",
    createdAt: "2026-03-10",
    updatedAt: "2026-03-18",
    expectedArrival: "2026-03-15",
    receivedAt: "2026-03-17",
    paymentStatus: "paid",
    locationId: "loc-warehouse",
  },
  {
    id: "po-005",
    supplierId: "sup-001",
    supplierName: "ТД Текстиль Юг",
    status: "draft",
    items: [
      { productId: "prod-007", productName: "Ежедневник A5 кожаный", sku: "DRY-A5-001", qty: 80, receivedQty: 0, unitCost: 950, totalCost: 76000 },
    ],
    totalAmount: 76000,
    currency: "RUB",
    createdAt: "2026-05-22",
    updatedAt: "2026-05-22",
    paymentStatus: "unpaid",
    locationId: "loc-warehouse",
  },
];

// ── Mock Transfers ─────────────────────────────────────────────────────────
export const TRANSFERS: Transfer[] = [
  {
    id: "tr-001",
    fromLocationId: "loc-warehouse",
    toLocationId: "loc-store",
    status: "received",
    items: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 20, receivedQty: 20 },
      { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qty: 50, receivedQty: 50 },
    ],
    createdAt: "2026-05-10",
    receivedAt: "2026-05-11",
    note: "Плановое пополнение магазина",
  },
  {
    id: "tr-002",
    fromLocationId: "loc-warehouse",
    toLocationId: "loc-showroom",
    status: "in_transit",
    items: [
      { productId: "prod-007", productName: "Ежедневник A5 кожаный", sku: "DRY-A5-001", qty: 5, receivedQty: 0 },
    ],
    createdAt: "2026-05-23",
    expectedArrival: "2026-05-24",
    note: "Для выставочного зала",
  },
  {
    id: "tr-003",
    fromLocationId: "loc-store",
    toLocationId: "loc-returns",
    status: "received",
    items: [
      { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qty: 3, receivedQty: 3 },
    ],
    createdAt: "2026-05-20",
    receivedAt: "2026-05-20",
    note: "Возврат от покупателей, причина — неподходящий размер",
  },
];

// ── Mock Stocktakes ────────────────────────────────────────────────────────
export const STOCKTAKES: Stocktake[] = [
  {
    id: "stk-001",
    locationId: "loc-warehouse",
    status: "completed",
    items: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", systemQty: 115, countedQty: 110, variance: -5, reason: "Недостача при прошлой приёмке" },
      { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", systemQty: 365, countedQty: 361, variance: -4, reason: "Погрешность учёта" },
      { productId: "prod-004", productName: "Крафт-пакет", sku: "PKG-KRAFT-001", systemQty: 2802, countedQty: 2800, variance: -2, reason: "Брак" },
    ],
    createdAt: "2026-05-15",
    completedAt: "2026-05-15",
    approvedBy: "Мария Иванова",
    note: "Плановая ежемесячная инвентаризация",
  },
  {
    id: "stk-002",
    locationId: "loc-store",
    status: "in_progress",
    items: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", systemQty: 28, countedQty: 27, variance: -1 },
      { productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", systemQty: 45, countedQty: null, variance: null },
      { productId: "prod-006", productName: "Кепка с логотипом", sku: "CAP-001", systemQty: 0, countedQty: null, variance: null },
    ],
    createdAt: "2026-05-24",
    note: "Внеплановая проверка по запросу",
  },
];

// ── Mock Movements ─────────────────────────────────────────────────────────
export const MOVEMENTS: StockMovement[] = [
  { id: "mv-001", type: "receipt", productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qtyBefore: 211, qtyAfter: 406, qtyDelta: 195, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова", createdAt: "2026-04-28T10:30:00Z", referenceId: "po-002", referenceType: "purchase_order", reason: "Приёмка товара", note: "Частичная приёмка, 200 шт ожидаем" },
  { id: "mv-002", type: "transfer", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qtyBefore: 130, qtyAfter: 110, qtyDelta: -20, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова", createdAt: "2026-05-10T14:00:00Z", referenceId: "tr-001", referenceType: "transfer", reason: "Перемещение в магазин" },
  { id: "mv-003", type: "sale", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qtyBefore: 30, qtyAfter: 28, qtyDelta: -2, locationId: "loc-store", userId: "u-2", userName: "ПОС Арбат", createdAt: "2026-05-22T15:22:00Z", reason: "Продажа через кассу" },
  { id: "mv-004", type: "return", productId: "prod-002", productName: "Футболка оверсайз хлопок", sku: "TSH-002", qtyBefore: 45, qtyAfter: 48, qtyDelta: 3, locationId: "loc-store", userId: "u-2", userName: "ПОС Арбат", createdAt: "2026-05-20T11:10:00Z", referenceId: "tr-003", referenceType: "return", reason: "Возврат покупателя, неподходящий размер" },
  { id: "mv-005", type: "adjustment", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qtyBefore: 115, qtyAfter: 110, qtyDelta: -5, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова", createdAt: "2026-05-15T16:00:00Z", referenceId: "stk-001", referenceType: "stocktake", reason: "Корректировка по итогам инвентаризации" },
  { id: "mv-006", type: "write_off", productId: "prod-004", productName: "Крафт-пакет", sku: "PKG-KRAFT-001", qtyBefore: 2852, qtyAfter: 2800, qtyDelta: -52, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова", createdAt: "2026-05-15T16:30:00Z", reason: "Списание брака и просрочки" },
  { id: "mv-007", type: "receipt", productId: "prod-003", productName: "Кофе Ethiopia Yirgacheffe", sku: "COF-ETH-001", qtyBefore: 0, qtyAfter: 8, qtyDelta: 8, locationId: "loc-warehouse", userId: "u-1", userName: "Мария Иванова", createdAt: "2026-05-01T09:00:00Z", reason: "Приёмка первой партии" },
  { id: "mv-008", type: "reserve", productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qtyBefore: 110, qtyAfter: 110, qtyDelta: 0, locationId: "loc-warehouse", userId: "u-3", userName: "WB-Integration", createdAt: "2026-05-24T08:00:00Z", reason: "Резерв под заказ Wildberries #45892" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getAvailableStock(product: Product): number {
  const physical = product.totalPhysical;
  const reserved = product.reservedUnits;
  const damaged = product.damagedUnits;
  const inTransit = product.inTransitUnits;
  return Math.max(0, physical - reserved - damaged - inTransit);
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
  const activeProducts = products.filter((p) => p.status === "active");
  const totalValue = getTotalInventoryValue(activeProducts);
  const lowStock = getLowStockProducts(activeProducts);
  const outOfStock = activeProducts.filter((p) => getStockStatus(p) === "out_of_stock");
  const totalUnits = activeProducts.reduce((sum, p) => sum + getAvailableStock(p), 0);

  return {
    totalProducts: activeProducts.length,
    totalUnits,
    totalValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    avgMargin: activeProducts.reduce((sum, p) => sum + (p.margin ?? 0), 0) / activeProducts.length,
  };
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Черновик",
  sent: "Отправлен",
  confirmed: "Подтверждён",
  in_transit: "В пути",
  partially_received: "Частично принят",
  closed: "Закрыт",
  issue: "Проблема",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: "Поступление",
  sale: "Продажа",
  reserve: "Резерв",
  return: "Возврат",
  write_off: "Списание",
  transfer: "Перемещение",
  adjustment: "Корректировка",
  stocktake: "Инвентаризация",
  labeling: "Маркировка",
  cost_change: "Изменение цены",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  product: "Товар",
  ingredient: "Ингредиент",
  bundle: "Комплект",
  recipe: "Рецепт",
  consumable: "Расходник",
  packaging: "Упаковка",
};

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  pos: "POS / Касса",
  website: "Сайт",
  telegram: "Telegram",
  delivery: "Доставка",
  wildberries: "Wildberries",
  ozon: "Ozon",
  yandex_market: "Яндекс Маркет",
};
