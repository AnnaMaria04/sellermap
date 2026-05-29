import { NextRequest, NextResponse } from "next/server";

// Ozon Seller API — orders (postings). Pulls FBO + FBS postings and maps them
// to the app's Order shape so the "По каналам" P&L compares WB vs Ozon on real
// data. Server-side only. Auth: Client-Id + Api-Key headers.
const BASE = "https://api-seller.ozon.ru";

interface OzonProduct { offer_id?: string; name?: string; sku?: number; quantity?: number; price?: string | number }
interface OzonPosting {
  posting_number?: string;
  status?: string;
  in_process_at?: string;
  shipment_date?: string;
  products?: OzonProduct[];
  analytics_data?: { region?: string; city?: string };
}

// Ozon posting status → app order status (only realized/cancelled matter for P&L).
function mapStatus(s?: string): "delivered" | "cancelled" | "returned" | "new" {
  if (!s) return "new";
  if (s === "cancelled") return "cancelled";
  if (s === "returned" || s === "arbitration") return "returned";
  if (s === "delivered" || s === "delivering" || s === "shipped") return "delivered";
  return "new";
}

type MappedOrder = {
  id: string; orderNumber: string; externalNumber: string; channel: "ozon"; fulfillment: "FBO" | "FBS";
  status: "delivered" | "cancelled" | "returned" | "new"; locationId: string;
  items: { productId: string; productName: string; sku: string; qty: number; unitPrice: number; unitCost: number }[];
  revenue: number; commissionRate: number; logisticsCost: number;
  createdAt: string; shippedAt?: string; deliveredAt?: string; region?: string;
};

function day(s?: string): string {
  return (s ?? new Date().toISOString()).slice(0, 10);
}

function shortNumber(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `OZ-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

function toOrder(p: OzonPosting, fulfillment: "FBO" | "FBS"): MappedOrder | null {
  const num = p.posting_number;
  if (!num) return null;
  const items = (p.products ?? []).map((pr) => {
    const qty = pr.quantity ?? 1;
    const unitPrice = Number(pr.price ?? 0) || 0;
    return {
      productId: `imp-ozon-${pr.offer_id ?? pr.sku ?? num}`,
      productName: pr.name ?? pr.offer_id ?? String(pr.sku ?? ""),
      sku: pr.offer_id ?? String(pr.sku ?? ""),
      qty,
      unitPrice,
      unitCost: 0,
    };
  });
  const revenue = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
  const status = mapStatus(p.status);
  return {
    id: `ozon-${num}`,
    orderNumber: shortNumber(num),
    externalNumber: num,
    channel: "ozon",
    fulfillment,
    status,
    locationId: "loc-main",
    items,
    revenue,
    commissionRate: 0,
    logisticsCost: 0,
    createdAt: day(p.in_process_at),
    shippedAt: p.shipment_date ? day(p.shipment_date) : undefined,
    deliveredAt: status === "delivered" ? day(p.shipment_date ?? p.in_process_at) : undefined,
    region: p.analytics_data?.city ?? p.analytics_data?.region,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { clientId?: string; apiKey?: string; days?: number };
  const clientId = body.clientId?.trim();
  const apiKey = body.apiKey?.trim();
  if (!clientId || !apiKey) {
    return NextResponse.json({ ok: false, message: "Введите Client-Id и Api-Key" }, { status: 400 });
  }

  const days = Math.min(Math.max(body.days ?? 90, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const to = new Date().toISOString();
  const headers = { "Client-Id": clientId, "Api-Key": apiKey, "Content-Type": "application/json" };
  const post = (path: string, payload: unknown) =>
    fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(30000) });

  const orders: MappedOrder[] = [];

  try {
    // FBO postings (paginated by offset).
    for (let offset = 0; offset < 10000; offset += 1000) {
      const r = await post("/v2/posting/fbo/list", {
        dir: "DESC", filter: { since, to }, limit: 1000, offset,
        with: { analytics_data: true },
      });
      if (r.status === 401 || r.status === 403) {
        return NextResponse.json({ ok: false, message: "Неверный Client-Id или Api-Key" }, { status: 200 });
      }
      if (!r.ok) { console.error(`[ozon/fbo] ${r.status}`); break; }
      const d = (await r.json()) as { result?: OzonPosting[] };
      const batch = d.result ?? [];
      for (const p of batch) { const o = toOrder(p, "FBO"); if (o) orders.push(o); }
      if (batch.length < 1000) break;
    }

    // FBS postings (paginated by offset; result is nested under .postings).
    for (let offset = 0; offset < 10000; offset += 1000) {
      const r = await post("/v3/posting/fbs/list", {
        dir: "DESC", filter: { since, to }, limit: 1000, offset,
        with: { analytics_data: true },
      });
      if (!r.ok) { console.error(`[ozon/fbs] ${r.status}`); break; }
      const d = (await r.json()) as { result?: { postings?: OzonPosting[] } };
      const batch = d.result?.postings ?? [];
      for (const p of batch) { const o = toOrder(p, "FBS"); if (o) orders.push(o); }
      if (batch.length < 1000) break;
    }

    return NextResponse.json({ ok: true, count: orders.length, orders: orders.slice(0, 2000) });
  } catch (e) {
    console.error("[ozon/orders] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось связаться с Ozon API" }, { status: 200 });
  }
}
