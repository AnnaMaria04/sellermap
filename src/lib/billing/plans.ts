/**
 * G22: billing plan catalogue + usage limits. Replaces the static
 * "Free plan — coming soon" placeholder with a real plan model the billing
 * page can render and measure current workspace usage against.
 */

export type PlanId = "free" | "business" | "scale";

export interface PlanLimits {
  products: number; // -1 = unlimited
  ordersPerMonth: number;
  staff: number;
  locations: number;
  integrations: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number; // ₽/mo
  tagline: string;
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Бесплатный",
    priceMonthly: 0,
    tagline: "Для старта и небольших магазинов",
    features: [
      "До 100 товаров",
      "1 склад",
      "Интеграции Wildberries и Ozon",
      "P&L, налоги и КУДиР",
    ],
    limits: { products: 100, ordersPerMonth: 500, staff: 2, locations: 1, integrations: 2 },
  },
  {
    id: "business",
    name: "Бизнес",
    priceMonthly: 1490,
    tagline: "Для растущих продавцов с командой",
    features: [
      "Неограниченные товары",
      "До 5 складов",
      "Командный доступ и роли",
      "Движок пополнения и акции",
      "Приоритетная поддержка",
    ],
    limits: { products: -1, ordersPerMonth: 10000, staff: 10, locations: 5, integrations: 6 },
  },
  {
    id: "scale",
    name: "Масштаб",
    priceMonthly: 3990,
    tagline: "Для оптовиков и сетей",
    features: [
      "Всё из тарифа Бизнес",
      "Неограниченные склады и команда",
      "API и вебхуки",
      "Выделенный менеджер",
    ],
    limits: { products: -1, ordersPerMonth: -1, staff: -1, locations: -1, integrations: -1 },
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export interface UsageMetric {
  key: keyof PlanLimits;
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  /** 0..1 fraction of the limit consumed (0 when unlimited). */
  ratio: number;
  overLimit: boolean;
}

export interface UsageInput {
  products: number;
  ordersPerMonth: number;
  staff: number;
  locations: number;
  integrations: number;
}

const METRIC_LABELS: Record<keyof PlanLimits, string> = {
  products: "Товары",
  ordersPerMonth: "Заказы / мес",
  staff: "Сотрудники",
  locations: "Склады",
  integrations: "Интеграции",
};

/** Compute usage metrics for a workspace against a plan's limits. */
export function computeUsage(plan: Plan, usage: UsageInput): UsageMetric[] {
  return (Object.keys(plan.limits) as (keyof PlanLimits)[]).map((key) => {
    const limit = plan.limits[key];
    const used = usage[key as keyof UsageInput] ?? 0;
    const unlimited = limit < 0;
    const ratio = unlimited || limit === 0 ? 0 : Math.min(1, used / limit);
    return {
      key,
      label: METRIC_LABELS[key],
      used,
      limit,
      ratio,
      overLimit: !unlimited && used > limit,
    };
  });
}
