import { NextRequest, NextResponse } from "next/server";

// Wildberries Statistics API — orders + sales. Maps them to the app's Order
// shape so the dashboard P&L/revenue reflect real WB data. Server-side only.
const SALES_URL = "https://statistics-api.wildberries.ru/api/v1/supplier/sales";
const ORDERS_URL = "https://statistics-api.wildberries.ru/api/v1/supplier/orders";

interface WbSale {
  date?: string; supplierArticle?: string; nmId?: number;
  finishedPrice?: number; priceWithDisc?: number; forPay?: number;
  srid?: string; saleID?: string; regionName?: string;
}
interface WbOrder {
  date?: string; supplierArticle?: string; nmId?: number;
  priceWithDisc?: number; totalPrice?: number; isCancel?: boolean;
  srid?: string; regionName?: string;
}

// Minimal subset of the app's Order shape we populate from WB.
type MappedOrder = {
  id: string; orderNumber: string; channel: "wildberries"; fulfillment: "FBO";
  status: "delivered" | "new"; locationId: string;
  items: { productId: string; productName: string; sku: string; qty: number; unitPrice: number; unitCost: number }[];
  revenue: number; commissionRate: number; logisticsCost: number;
  createdAt: string; deliveredAt?: string; region?: string;
};

function day(s?: string): string {
  return (s ?? new Date().toISOString()).slice(0, 10);
}

async function wbGet(url: string, token: string, dateFrom: string) {
  return fetch(`${url}?dateFrom=${dateFrom}&flag=0`, {
    headers: { Authorization: token },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; days?: number };
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ ok: false, message: "Не передан токен" }, { status: 400 });

  const days = Math.min(Math.max(body.days ?? 60, 1), 365);
  const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const orders: MappedOrder[] = [];
  const saleSrids = new Set<string>();

  // ── Sales (realized → delivered, drive revenue/P&L) ───────────────────────
  try {
    const r = await wbGet(SALES_URL, token, dateFrom);
    if (r.ok) {
      const rows = (await r.json()) as WbSale[];
      for (const s of Array.isArray(rows) ? rows : []) {
        const key = s.srid || s.saleID || `${s.nmId}-${s.date}`;
        saleSrids.add(key);
        const gross = s.finishedPrice ?? s.priceWithDisc ?? 0;
        const net = s.forPay ?? gross;
        const commissionRate = gross > 0 ? Math.max(0, Math.min(0.9, (gross - net) / gross)) : 0;
        orders.push({
          id: `wb-sale-${key}`,
          orderNumber: `wb-${key}`,
          channel: "wildberries",
          fulfillment: "FBO",
          status: "delivered",
          locationId: "loc-main",
          items: [{
            productId: `imp-wildberries-${s.nmId}`,
            productName: s.supplierArticle ?? String(s.nmId ?? ""),
            sku: s.supplierArticle ?? String(s.nmId ?? ""),
            qty: 1, unitPrice: gross, unitCost: 0,
          }],
          revenue: gross,
          commissionRate,
          logisticsCost: 0,
          createdAt: day(s.date),
          deliveredAt: day(s.date),
          region: s.regionName,
        });
      }
    } else {
      console.error(`[wb/orders] sales ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/orders] sales failed:", e instanceof Error ? e.message : String(e));
  }

  // ── Orders not yet realized (→ "new" = in progress) ───────────────────────
  try {
    const r = await wbGet(ORDERS_URL, token, dateFrom);
    if (r.ok) {
      const rows = (await r.json()) as WbOrder[];
      for (const o of Array.isArray(rows) ? rows : []) {
        const key = o.srid || `${o.nmId}-${o.date}`;
        if (o.isCancel || saleSrids.has(key)) continue;
        const price = o.priceWithDisc ?? o.totalPrice ?? 0;
        orders.push({
          id: `wb-order-${key}`,
          orderNumber: `wb-${key}`,
          channel: "wildberries",
          fulfillment: "FBO",
          status: "new",
          locationId: "loc-main",
          items: [{
            productId: `imp-wildberries-${o.nmId}`,
            productName: o.supplierArticle ?? String(o.nmId ?? ""),
            sku: o.supplierArticle ?? String(o.nmId ?? ""),
            qty: 1, unitPrice: price, unitCost: 0,
          }],
          revenue: price,
          commissionRate: 0,
          logisticsCost: 0,
          createdAt: day(o.date),
          region: o.regionName,
        });
      }
    } else {
      console.error(`[wb/orders] orders ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/orders] orders failed:", e instanceof Error ? e.message : String(e));
  }

  // Cap to keep the payload + client state reasonable.
  return NextResponse.json({ ok: true, count: orders.length, orders: orders.slice(0, 2000) });
}
