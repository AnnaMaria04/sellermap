import { NextRequest, NextResponse } from "next/server";

// Wildberries Statistics API — orders + sales. Maps them to the app's Order
// shape so the dashboard P&L/revenue reflect real WB data. Server-side only.
const SALES_URL = "https://statistics-api.wildberries.ru/api/v1/supplier/sales";

interface WbSale {
  date?: string; supplierArticle?: string; nmId?: number;
  finishedPrice?: number; priceWithDisc?: number; forPay?: number;
  srid?: string; saleID?: string; regionName?: string;
}

// Minimal subset of the app's Order shape we populate from WB.
type MappedOrder = {
  id: string; orderNumber: string; externalNumber: string; channel: "wildberries"; fulfillment: "FBO";
  status: "delivered" | "new" | "returned"; locationId: string;
  items: { productId: string; productName: string; sku: string; qty: number; unitPrice: number; unitCost: number }[];
  revenue: number; commissionRate: number; logisticsCost: number;
  createdAt: string; shippedAt?: string; deliveredAt?: string; region?: string;
};

function day(s?: string): string {
  return (s ?? new Date().toISOString()).slice(0, 10);
}

/** Short, stable, human-friendly internal number derived from the WB srid.
 *  Lists show this; the full WB id is kept in externalNumber for details. */
function shortNumber(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `WB-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

async function wbGet(url: string, token: string, dateFrom: string) {
  return fetch(`${url}?dateFrom=${dateFrom}&flag=0`, {
    headers: { Authorization: token },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
}

const FINANCE_URL = "https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod";

interface WbReportRow {
  srid?: string; doc_type_name?: string;
  retail_amount?: number; ppvz_for_pay?: number; delivery_rub?: number;
}
type FinanceAgg = { retail: number; forPay: number; delivery: number; returned: boolean };

/** Aggregate the realization report per srid → exact commission/logistics +
 *  whether the row is a return. Best-effort: returns an empty map on failure. */
async function fetchFinance(token: string, dateFrom: string, dateTo: string): Promise<Map<string, FinanceAgg>> {
  const map = new Map<string, FinanceAgg>();
  try {
    const r = await fetch(
      `${FINANCE_URL}?dateFrom=${dateFrom}&dateTo=${dateTo}&rrdid=0&limit=100000`,
      { headers: { Authorization: token }, cache: "no-store", signal: AbortSignal.timeout(30000) },
    );
    if (!r.ok) { console.error(`[wb/finance] ${r.status}`); return map; }
    const rows = (await r.json()) as WbReportRow[];
    for (const row of Array.isArray(rows) ? rows : []) {
      const srid = row.srid;
      if (!srid) continue;
      const agg = map.get(srid) ?? { retail: 0, forPay: 0, delivery: 0, returned: false };
      agg.retail += row.retail_amount ?? 0;
      agg.forPay += row.ppvz_for_pay ?? 0;
      agg.delivery += row.delivery_rub ?? 0;
      if (row.doc_type_name === "Возврат") agg.returned = true;
      map.set(srid, agg);
    }
  } catch (e) {
    console.error("[wb/finance] failed:", e instanceof Error ? e.message : String(e));
  }
  return map;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; days?: number };
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ ok: false, message: "Не передан токен" }, { status: 400 });

  const days = Math.min(Math.max(body.days ?? 60, 1), 365);
  const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const dateTo = new Date().toISOString().slice(0, 10);

  const orders: MappedOrder[] = [];

  // Exact commission/logistics/returns from the realization report, keyed by srid.
  const finance = await fetchFinance(token, dateFrom, dateTo);

  // ── Sales (realized → delivered, drive revenue/P&L) ───────────────────────
  try {
    const r = await wbGet(SALES_URL, token, dateFrom);
    if (r.ok) {
      const rows = (await r.json()) as WbSale[];
      for (const s of Array.isArray(rows) ? rows : []) {
        const key = s.srid || s.saleID || `${s.nmId}-${s.date}`;
        // Prefer exact figures from the realization report; fall back to the
        // sales estimate (forPay) when the report has no matching row.
        const fin = finance.get(key);
        const gross = fin?.retail || s.finishedPrice || s.priceWithDisc || 0;
        const net = fin ? fin.forPay : (s.forPay ?? gross);
        const commissionRate = gross > 0 ? Math.max(0, Math.min(0.9, (gross - net) / gross)) : 0;
        const logisticsCost = fin?.delivery ?? 0;
        const status: MappedOrder["status"] = fin?.returned ? "returned" : "delivered";
        orders.push({
          id: `wb-sale-${key}`,
          orderNumber: shortNumber(key),
          externalNumber: key,
          channel: "wildberries",
          fulfillment: "FBO",
          status,
          locationId: "loc-main",
          items: [{
            productId: `imp-wildberries-${s.nmId}`,
            productName: s.supplierArticle ?? String(s.nmId ?? ""),
            sku: s.supplierArticle ?? String(s.nmId ?? ""),
            qty: 1, unitPrice: gross, unitCost: 0,
          }],
          revenue: gross,
          commissionRate,
          logisticsCost,
          createdAt: day(s.date),
          // WB sales feed gives a single sale date; treat it as shipped+delivered.
          shippedAt: day(s.date),
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

  // NOTE: we intentionally do NOT import the statistics /orders feed as "new"
  // orders — that endpoint is a full historical orders log, so unsold rows were
  // being mislabelled "new" and didn't match WB Partners. Genuine new/assembly
  // orders should come from the FBS postings API (a future addition). For now
  // the order feed is realized sales only — the money-true data.

  // Cap to keep the payload + client state reasonable.
  return NextResponse.json({ ok: true, count: orders.length, orders: orders.slice(0, 2000) });
}
