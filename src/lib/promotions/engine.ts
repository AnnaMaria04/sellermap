import type {
  Promotion,
  PromotionChannel,
  PromotionStatus,
} from "@/mock/inventory";

/**
 * Promotion pricing engine.
 *
 * The app stored promotions but never applied them to order/cart pricing
 * anywhere (audit E16). This module is the single, framework-agnostic place
 * that decides which promotions apply to a cart and how much they discount it,
 * so POS, order import and the storefront can all price consistently.
 */

export interface CartLine {
  /** Stable id for the cart line (used to key per-line discounts). */
  id: string;
  productId: string;
  /** Product category — used by `categoryFilter` promotions. */
  category?: string;
  qty: number;
  unitPrice: number;
}

export interface PriceContext {
  channel: PromotionChannel;
  /** Promo code typed at checkout, if any. */
  promoCode?: string;
  /** Evaluation time (defaults to now) — gates active windows. */
  now?: Date;
  /**
   * Stack every eligible promotion instead of applying only the single
   * best-value one. Defaults to false (retail-typical: no stacking).
   */
  stack?: boolean;
}

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  type: Promotion["type"];
  /** Rouble discount this promotion contributes to the cart. */
  discount: number;
  /** True for free_shipping promotions (no line discount). */
  freeShipping: boolean;
}

export interface PriceResult {
  subtotal: number;
  discount: number;
  total: number;
  freeShipping: boolean;
  applied: AppliedPromotion[];
  /** Discount attributed to each cart line id (for receipts / line display). */
  lineDiscounts: Record<string, number>;
}

const ELIGIBLE_STATUSES: PromotionStatus[] = ["active"];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function lineSubtotal(line: CartLine): number {
  return Math.max(0, line.qty) * Math.max(0, line.unitPrice);
}

/** Lines a promotion targets (productIds + categoryFilter narrow the set). */
function targetedLines(promo: Promotion, lines: CartLine[]): CartLine[] {
  return lines.filter((line) => {
    if (promo.productIds.length > 0 && !promo.productIds.includes(line.productId)) {
      return false;
    }
    if (promo.categoryFilter && line.category !== promo.categoryFilter) {
      return false;
    }
    return true;
  });
}

/** Whether a promotion is eligible to apply to this cart at all. */
export function isPromotionEligible(
  promo: Promotion,
  lines: CartLine[],
  ctx: PriceContext,
): boolean {
  const now = ctx.now ?? new Date();

  if (!ELIGIBLE_STATUSES.includes(promo.status)) return false;

  // Active window.
  if (promo.startsAt && now < new Date(promo.startsAt)) return false;
  if (promo.endsAt) {
    // endsAt is inclusive of the whole day.
    const end = new Date(promo.endsAt);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  // Channel targeting.
  if (!promo.channels.includes("all") && !promo.channels.includes(ctx.channel)) {
    return false;
  }

  // Usage limit.
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) return false;

  // Code-gated promotions only apply when the matching code is supplied.
  if (promo.promoCode) {
    if (!ctx.promoCode) return false;
    if (promo.promoCode.toUpperCase() !== ctx.promoCode.trim().toUpperCase()) return false;
  }

  // Must target at least one line.
  const targeted = targetedLines(promo, lines);
  if (targeted.length === 0) return false;

  // Minimum order amount is checked against the targeted subtotal.
  const targetedSubtotal = targeted.reduce((s, l) => s + lineSubtotal(l), 0);
  if (promo.minOrderAmount != null && targetedSubtotal < promo.minOrderAmount) return false;

  return true;
}

/**
 * Raw discount (₽) a single promotion produces, plus its per-line attribution.
 * Assumes the promotion is already eligible.
 */
export function promotionDiscount(
  promo: Promotion,
  lines: CartLine[],
): { discount: number; freeShipping: boolean; lineDiscounts: Record<string, number> } {
  const targeted = targetedLines(promo, lines);
  const lineDiscounts: Record<string, number> = {};
  let discount = 0;
  let freeShipping = false;

  switch (promo.type) {
    case "percentage": {
      const rate = Math.min(100, Math.max(0, promo.discountValue)) / 100;
      for (const line of targeted) {
        const d = round2(lineSubtotal(line) * rate);
        lineDiscounts[line.id] = d;
        discount += d;
      }
      break;
    }
    case "fixed": {
      // Flat ₽ off the targeted subtotal, distributed across lines pro-rata
      // and capped so it never exceeds the targeted subtotal.
      const targetedSubtotal = targeted.reduce((s, l) => s + lineSubtotal(l), 0);
      const cap = Math.min(Math.max(0, promo.discountValue), targetedSubtotal);
      for (const line of targeted) {
        const share = targetedSubtotal > 0 ? lineSubtotal(line) / targetedSubtotal : 0;
        const d = round2(cap * share);
        lineDiscounts[line.id] = d;
        discount += d;
      }
      break;
    }
    case "bogo": {
      // Buy-one-get-one: every 2nd unit is discounted by discountValue%
      // (default 100% — fully free).
      const freeRate = (promo.discountValue > 0 ? Math.min(100, promo.discountValue) : 100) / 100;
      for (const line of targeted) {
        const freeUnits = Math.floor(Math.max(0, line.qty) / 2);
        const d = round2(freeUnits * Math.max(0, line.unitPrice) * freeRate);
        lineDiscounts[line.id] = d;
        discount += d;
      }
      break;
    }
    case "bundle_price": {
      // discountValue is the fixed price for the whole targeted set; the
      // discount is the saving versus the regular targeted subtotal.
      const targetedSubtotal = targeted.reduce((s, l) => s + lineSubtotal(l), 0);
      const saving = Math.max(0, targetedSubtotal - Math.max(0, promo.discountValue));
      for (const line of targeted) {
        const share = targetedSubtotal > 0 ? lineSubtotal(line) / targetedSubtotal : 0;
        const d = round2(saving * share);
        lineDiscounts[line.id] = d;
        discount += d;
      }
      break;
    }
    case "free_shipping": {
      freeShipping = true;
      break;
    }
  }

  return { discount: round2(discount), freeShipping, lineDiscounts };
}

function mergeLineDiscounts(
  into: Record<string, number>,
  from: Record<string, number>,
): void {
  for (const [k, v] of Object.entries(from)) {
    into[k] = round2((into[k] ?? 0) + v);
  }
}

/**
 * Price a cart against a set of promotions.
 *
 * By default applies the single best-value eligible promotion (plus any
 * eligible free_shipping). Set `ctx.stack` to combine all eligible promotions.
 * A discount never pushes a line below zero.
 */
export function priceCart(
  lines: CartLine[],
  promotions: Promotion[],
  ctx: PriceContext,
): PriceResult {
  const subtotal = round2(lines.reduce((s, l) => s + lineSubtotal(l), 0));
  const eligible = promotions.filter((p) => isPromotionEligible(p, lines, ctx));

  // free_shipping is orthogonal to value discounts — always honour eligible ones.
  const shipping = eligible.filter((p) => p.type === "free_shipping");
  const valuePromos = eligible.filter((p) => p.type !== "free_shipping");

  const applied: AppliedPromotion[] = [];
  const lineDiscounts: Record<string, number> = {};
  let discount = 0;

  const computed = valuePromos.map((p) => ({ promo: p, ...promotionDiscount(p, lines) }));

  if (ctx.stack) {
    for (const c of computed) {
      if (c.discount <= 0) continue;
      applied.push({ promotionId: c.promo.id, name: c.promo.name, type: c.promo.type, discount: c.discount, freeShipping: false });
      mergeLineDiscounts(lineDiscounts, c.lineDiscounts);
      discount += c.discount;
    }
  } else {
    const best = computed.filter((c) => c.discount > 0).sort((a, b) => b.discount - a.discount)[0];
    if (best) {
      applied.push({ promotionId: best.promo.id, name: best.promo.name, type: best.promo.type, discount: best.discount, freeShipping: false });
      mergeLineDiscounts(lineDiscounts, best.lineDiscounts);
      discount += best.discount;
    }
  }

  const freeShipping = shipping.length > 0;
  for (const s of shipping) {
    applied.push({ promotionId: s.id, name: s.name, type: s.type, discount: 0, freeShipping: true });
  }

  discount = round2(Math.min(discount, subtotal));
  return {
    subtotal,
    discount,
    total: round2(Math.max(0, subtotal - discount)),
    freeShipping,
    applied,
    lineDiscounts,
  };
}
