/**
 * Segment-based module registry.
 *
 * SellerMap serves five seller segments from one app; showing every feature to
 * everyone is overwhelming. This registry defines the toggleable modules, which
 * segment each is relevant to, and which routes each owns — the single source
 * of truth the nav, onboarding, settings catalog and route guards read from.
 *
 * Gating here is about RELEVANCE, not billing.
 */

export type BusinessSegment =
  | "ecommerce"
  | "small_retail"
  | "producer"
  | "enterprise"
  | "marketplace";

export interface SegmentDef {
  id: BusinessSegment;
  label: string;
  description: string;
}

export const SEGMENTS: SegmentDef[] = [
  { id: "ecommerce", label: "Интернет-магазин", description: "Свой сайт, онлайн-продажи и маркетинг" },
  { id: "small_retail", label: "Розница и склад", description: "Касса, остатки и продажи в точке" },
  { id: "producer", label: "Производство и опт", description: "Партии, рецептуры, B2B и прайс-листы" },
  { id: "enterprise", label: "Крупная компания (1С)", description: "Склады, обмен с 1С, регламент" },
  { id: "marketplace", label: "Маркетплейсы", description: "Wildberries, Ozon, Я.Маркет" },
];

export type ModuleId =
  // Core — always on, cannot be disabled
  | "products" | "orders" | "customers" | "analytics" | "finance" | "settings"
  // Gated
  | "pos" | "marketplaces" | "warehousing" | "b2b" | "recipes" | "labeling"
  | "marketing" | "storefront" | "erp1c";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  description: string;
  /** Always on; not shown in the catalog as toggleable. */
  core?: boolean;
  /** Segments where this module is enabled by default. */
  defaultFor: BusinessSegment[];
  /** `/inventory` route prefixes this module owns (for nav filter + guards). */
  routes: string[];
  /** Selecting one of these channels auto-suggests turning the module on. */
  suggestedByChannels?: string[];
}

export const MODULES: ModuleDef[] = [
  // ── Core ──────────────────────────────────────────────────────────────────
  { id: "products", label: "Товары", description: "Каталог, остатки, коллекции", core: true,
    defaultFor: [], routes: ["/inventory/products", "/inventory/inventory"] },
  { id: "orders", label: "Заказы", description: "Заказы, черновики, доставка", core: true,
    defaultFor: [], routes: ["/inventory/orders"] },
  { id: "customers", label: "Клиенты", description: "База клиентов и сегменты", core: true,
    defaultFor: [], routes: ["/inventory/customers"] },
  { id: "analytics", label: "Аналитика", description: "Отчёты и метрики продаж", core: true,
    defaultFor: [], routes: ["/inventory/analytics"] },
  { id: "finance", label: "Финансы и налоги", description: "P&L, налоги, КУДиР", core: true,
    defaultFor: [], routes: ["/inventory/finance", "/inventory/tax", "/inventory/reports", "/inventory/sync-health"] },
  { id: "settings", label: "Настройки", description: "Настройки магазина", core: true,
    defaultFor: [], routes: ["/inventory/settings"] },

  // ── Gated ─────────────────────────────────────────────────────────────────
  { id: "pos", label: "Касса (POS)", description: "Офлайн-продажи, смены, чеки",
    defaultFor: ["small_retail", "ecommerce"], routes: ["/inventory/settings/pos", "/pos"], suggestedByChannels: ["pos"] },
  { id: "marketplaces", label: "Маркетплейсы", description: "Wildberries, Ozon, Я.Маркет, отзывы",
    defaultFor: ["marketplace"], routes: ["/inventory/integrations", "/inventory/settings/integrations", "/inventory/feedbacks"],
    suggestedByChannels: ["wildberries", "ozon", "yandex_market"] },
  { id: "warehousing", label: "Склады и логистика", description: "Несколько складов, перемещения, инвентаризация",
    defaultFor: ["producer", "enterprise"], routes: ["/inventory/locations", "/inventory/transfers", "/inventory/stocktake", "/inventory/suppliers", "/inventory/reservations"] },
  { id: "b2b", label: "Опт и B2B", description: "Компании, прайс-листы, заказы поставщикам",
    defaultFor: ["producer", "enterprise"], routes: ["/inventory/customers/companies", "/inventory/purchase-orders"] },
  { id: "recipes", label: "Производство и рецептуры", description: "Комплекты, рецептуры, выпуск",
    defaultFor: ["producer"], routes: ["/inventory/bundles"] },
  { id: "labeling", label: "Маркировка (Честный знак)", description: "Партии, сроки годности, маркировка",
    defaultFor: ["producer", "enterprise"], routes: ["/inventory/labeling"] },
  { id: "marketing", label: "Маркетинг и скидки", description: "Кампании, атрибуция, акции",
    defaultFor: ["ecommerce"], routes: ["/inventory/marketing", "/inventory/promotions"] },
  { id: "storefront", label: "Свой сайт (витрина)", description: "Онлайн-магазин и оформление заказов",
    defaultFor: ["ecommerce"], routes: ["/inventory/storefront"] },
  { id: "erp1c", label: "Обмен с 1С", description: "Синхронизация товаров, остатков и заказов с 1С",
    defaultFor: ["enterprise"], routes: ["/inventory/erp1c"] },
];

export const MODULE_BY_ID: Record<ModuleId, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleDef>;

export const CORE_MODULES: ModuleId[] = MODULES.filter((m) => m.core).map((m) => m.id);
export const GATED_MODULES: ModuleDef[] = MODULES.filter((m) => !m.core);

/** Resolve a route path to the module that owns it (longest-prefix wins). */
export function moduleForRoute(pathname: string): ModuleId | null {
  let best: ModuleId | null = null;
  let bestLen = -1;
  for (const m of MODULES) {
    for (const r of m.routes) {
      if ((pathname === r || pathname.startsWith(r + "/")) && r.length > bestLen) {
        best = m.id;
        bestLen = r.length;
      }
    }
  }
  return best;
}
