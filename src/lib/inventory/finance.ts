import {
  type Order,
  type OrderChannel,
  type Product,
  CHANNEL_LABELS,
  type SalesChannel,
} from "@/mock/inventory";

/**
 * Marketplace economics. Revenue and profit are recognised for orders that are
 * not cancelled. Returned orders count revenue as reversed (net zero) but the
 * logistics cost is still incurred.
 */

export interface OrderEconomics {
  order: Order;
  revenue: number;
  cogs: number;
  commission: number;
  logistics: number;
  netProfit: number;
  marginPct: number;
  realized: boolean; // counts toward P&L (delivered/shipped, not cancelled)
}

export interface PnL {
  revenue: number;
  cogs: number;
  commission: number;
  logistics: number;
  grossProfit: number;     // revenue - cogs
  netProfit: number;       // revenue - cogs - commission - logistics
  netMarginPct: number;
  orderCount: number;
  unitsSold: number;
  avgOrderValue: number;
  returnRate: number;      // returned / (delivered + shipped + returned)
}

export interface ChannelPnL extends PnL {
  channel: OrderChannel;
  label: string;
}

export interface ProductProfit {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  netProfit: number;
  marginPct: number;
}

// Default commission rates by channel when an order doesn't carry its own.
export const DEFAULT_COMMISSION: Record<OrderChannel, number> = {
  wildberries: 0.17,
  ozon: 0.15,
  yandex_market: 0.13,
  website: 0,
  pos: 0,
  telegram: 0,
};

function isRealized(o: Order): boolean {
  return o.status === "shipped" || o.status === "delivered";
}

/** Resolves a product's purchase cost when the order line carries none (e.g.
 *  marketplace imports, where WB never sends cost). */
export type CostLookup = (productId: string) => number | undefined;

function lineCost(item: Order["items"][number], costFor?: CostLookup): number {
  const unit = item.unitCost > 0 ? item.unitCost : (costFor?.(item.productId) ?? 0);
  return unit * item.qty;
}

/** Build a cost lookup from the product catalog (id → costPrice). */
export function costLookupFromProducts(products: Product[]): CostLookup {
  const byId = new Map(products.map((p) => [p.id, p.costPrice] as const));
  return (productId) => byId.get(productId);
}

export function orderEconomics(order: Order, costFor?: CostLookup): OrderEconomics {
  const revenue = order.revenue;
  const cogs = order.items.reduce((s, i) => s + lineCost(i, costFor), 0);
  const commission = revenue * (order.commissionRate ?? DEFAULT_COMMISSION[order.channel] ?? 0);
  const logistics = order.logisticsCost ?? 0;
  const netProfit = revenue - cogs - commission - logistics;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return {
    order,
    revenue,
    cogs,
    commission,
    logistics,
    netProfit,
    marginPct,
    realized: isRealized(order),
  };
}

function emptyPnL(): PnL {
  return {
    revenue: 0, cogs: 0, commission: 0, logistics: 0,
    grossProfit: 0, netProfit: 0, netMarginPct: 0,
    orderCount: 0, unitsSold: 0, avgOrderValue: 0, returnRate: 0,
  };
}

export function computePnL(orders: Order[], costFor?: CostLookup): PnL {
  const acc = emptyPnL();
  let returned = 0;
  let shippedOrDelivered = 0;
  for (const o of orders) {
    if (o.status === "returned") returned++;
    if (isRealized(o)) shippedOrDelivered++;
    if (o.status === "cancelled" || o.status === "new" || o.status === "confirmed" || o.status === "packed") {
      // Not yet realized revenue; skip from P&L but cancelled never counts.
      continue;
    }
    const e = orderEconomics(o, costFor);
    // Returned orders: revenue reversed, but logistics + commission lost.
    if (o.status === "returned") {
      acc.logistics += e.logistics;
      acc.commission += e.commission;
      acc.netProfit -= e.logistics + e.commission;
      continue;
    }
    acc.revenue += e.revenue;
    acc.cogs += e.cogs;
    acc.commission += e.commission;
    acc.logistics += e.logistics;
    acc.netProfit += e.netProfit;
    acc.orderCount += 1;
    acc.unitsSold += o.items.reduce((s, i) => s + i.qty, 0);
  }
  acc.grossProfit = acc.revenue - acc.cogs;
  acc.netMarginPct = acc.revenue > 0 ? (acc.netProfit / acc.revenue) * 100 : 0;
  acc.avgOrderValue = acc.orderCount > 0 ? acc.revenue / acc.orderCount : 0;
  acc.returnRate = shippedOrDelivered + returned > 0 ? returned / (shippedOrDelivered + returned) : 0;
  return acc;
}

export function computeChannelPnL(orders: Order[], costFor?: CostLookup): ChannelPnL[] {
  const channels = [...new Set(orders.map((o) => o.channel))];
  return channels
    .map((ch) => {
      const pnl = computePnL(orders.filter((o) => o.channel === ch), costFor);
      return {
        ...pnl,
        channel: ch,
        label: CHANNEL_LABELS[ch as SalesChannel] ?? ch,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function computeProductProfit(orders: Order[], costFor?: CostLookup): ProductProfit[] {
  const map = new Map<string, ProductProfit>();
  for (const o of orders) {
    if (o.status === "cancelled" || !isRealized(o)) continue;
    const commissionPerRevenue = o.commissionRate ?? DEFAULT_COMMISSION[o.channel] ?? 0;
    for (const item of o.items) {
      const lineRevenue = item.unitPrice * item.qty;
      const lineCogs = lineCost(item, costFor);
      const lineCommission = lineRevenue * commissionPerRevenue;
      // Distribute order logistics across line items by revenue share.
      const logisticsShare = o.revenue > 0 ? (lineRevenue / o.revenue) * o.logisticsCost : 0;
      const lineProfit = lineRevenue - lineCogs - lineCommission - logisticsShare;
      const existing = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        unitsSold: 0,
        revenue: 0,
        netProfit: 0,
        marginPct: 0,
      };
      existing.unitsSold += item.qty;
      existing.revenue += lineRevenue;
      existing.netProfit += lineProfit;
      map.set(item.productId, existing);
    }
  }
  const list = [...map.values()];
  list.forEach((p) => {
    p.marginPct = p.revenue > 0 ? (p.netProfit / p.revenue) * 100 : 0;
  });
  return list.sort((a, b) => b.netProfit - a.netProfit);
}

/** Unit economics for a single product at a hypothetical price/cost/channel. */
export interface UnitEconomicsInput {
  sellingPrice: number;
  costPrice: number;
  packagingCost: number;
  logisticsCost: number;
  commissionRate: number; // fraction
  adsCostPerUnit: number;
  taxRate: number;        // fraction of revenue
}

export interface UnitEconomicsResult {
  revenue: number;
  totalCost: number;
  commission: number;
  tax: number;
  netProfit: number;
  marginPct: number;
  breakEvenPrice: number;
  roi: number; // profit / cost base
}

export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const revenue = input.sellingPrice;
  const commission = revenue * input.commissionRate;
  const tax = revenue * input.taxRate;
  const variableCosts =
    input.costPrice + input.packagingCost + input.logisticsCost + input.adsCostPerUnit;
  const totalCost = variableCosts + commission + tax;
  const netProfit = revenue - totalCost;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  // Break-even: price where netProfit = 0, given commission+tax scale with price.
  const fixedPerUnit = variableCosts;
  const rateSum = input.commissionRate + input.taxRate;
  const breakEvenPrice = rateSum < 1 ? fixedPerUnit / (1 - rateSum) : Infinity;
  const costBase = input.costPrice + input.packagingCost;
  const roi = costBase > 0 ? (netProfit / costBase) * 100 : 0;
  return { revenue, totalCost, commission, tax, netProfit, marginPct, breakEvenPrice, roi };
}

export function buildProductFromContext(p: Product): UnitEconomicsInput {
  return {
    sellingPrice: p.price,
    costPrice: p.costPrice,
    packagingCost: p.packagingCost ?? 0,
    logisticsCost: p.deliveryCost ?? 0,
    commissionRate: (p.channelCommission ?? 15) / 100,
    adsCostPerUnit: 0,
    taxRate: 0.06,
  };
}
