import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toProduct } from "@/lib/integrations/mapping";
import type { RawExternalProduct } from "@/lib/integrations/types";
import type { Product } from "@/mock/inventory";

// Scheduled sync — Vercel Cron hits this once a day (see vercel.json). It pulls
// fresh products and orders from every connected WB/Ozon integration and
// upserts them into each seller's workspace via the admin client (bypassing
// RLS, the only safe way to do a multi-tenant batch). Vercel sends an
// `Authorization: Bearer ${CRON_SECRET}` header automatically — manual triggers
// must include the same secret.

type Json = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

interface IntegrationRow {
  app_id: string;
  owner_id: string;
  kind: string;
  credentials: Json | null;
}

interface SyncResult {
  kind: string;
  owner: string;
  org?: string;
  status: "ok" | "skipped" | "error";
  products?: number;
  orders?: number;
  reason?: string;
  error?: string;
}

function originFromReq(req: NextRequest): string {
  return req.nextUrl.origin || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}

/** Upsert products, MERGING into existing rows so manual fields (cost, tags,
 *  description, etc.) aren't overwritten by a fresh marketplace pull. */
async function upsertProductsMerging(admin: AdminClient, orgId: string, fresh: Product[]): Promise<number> {
  if (fresh.length === 0) return 0;
  const { data } = await admin.from("products").select("data").eq("org_id", orgId);
  const byId = new Map<string, Product>(
    (data ?? []).map((r) => [(r as { data: Product }).data.id, (r as { data: Product }).data]),
  );
  const today = new Date().toISOString().slice(0, 10);
  const rows = fresh.map((p) => {
    const ex = byId.get(p.id);
    const merged: Product = ex ? {
      ...ex,
      price: p.price > 0 ? p.price : ex.price,
      imageUrl: p.imageUrl ?? ex.imageUrl,
      images: p.images ?? ex.images,
      // Keep seller-edited category if it's no longer the default.
      category: ex.category && ex.category !== "Без категории" && ex.category !== "Импорт" ? ex.category : p.category,
      stockByLocation: { ...ex.stockByLocation, ...p.stockByLocation },
      totalPhysical: p.totalPhysical,
      updatedAt: today,
    } : p;
    return { org_id: orgId, app_id: p.id, name: merged.name, data: merged };
  });
  const { error } = await admin.from("products").upsert(rows as never, { onConflict: "org_id,app_id" });
  if (error) throw error;
  return rows.length;
}

/** Upsert orders APPEND-only: never delete, only insert ones the org doesn't
 *  have yet (by externalNumber/orderNumber). */
async function upsertOrdersAppending(admin: AdminClient, orgId: string, newOrders: Json[]): Promise<number> {
  if (newOrders.length === 0) return 0;
  const { data } = await admin.from("orders").select("data").eq("org_id", orgId);
  const keys = new Set<string>(
    (data ?? [])
      .map((r) => (r as { data: { externalNumber?: string; orderNumber?: string } }).data)
      .map((o) => o?.externalNumber ?? o?.orderNumber)
      .filter((x): x is string => !!x),
  );
  const toInsert = newOrders.filter((o) => {
    const k = (o.externalNumber ?? o.orderNumber) as string | undefined;
    return k != null && !keys.has(k);
  });
  if (toInsert.length === 0) return 0;
  const rows = toInsert.map((o) => ({
    org_id: orgId,
    app_id: o.id as string,
    order_number: o.orderNumber as string | undefined,
    data: o,
  }));
  const { error } = await admin.from("orders").upsert(rows as never, { onConflict: "org_id,app_id" });
  if (error) throw error;
  return rows.length;
}

async function callInternal<T>(origin: string, path: string, body: Json): Promise<T> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });
  return (await res.json()) as T;
}

async function syncWildberries(admin: AdminClient, origin: string, orgId: string, creds: Json): Promise<{ products: number; orders: number }> {
  const token = (creds.token as string | undefined)?.trim();
  if (!token) throw new Error("missing token");

  const cards = await callInternal<{ ok: boolean; message?: string; products?: RawExternalProduct[] }>(
    origin, "/api/integrations/wb/cards", { token },
  );
  if (!cards.ok) throw new Error(cards.message ?? "WB cards failed");

  const orders = await callInternal<{ ok: boolean; message?: string; orders?: Json[] }>(
    origin, "/api/integrations/wb/orders", { token, days: 30 },
  );
  if (!orders.ok) throw new Error(orders.message ?? "WB orders failed");

  const productsCount = await upsertProductsMerging(admin, orgId, (cards.products ?? []).map((r) => toProduct(r, "wildberries")));
  const ordersCount = await upsertOrdersAppending(admin, orgId, orders.orders ?? []);
  return { products: productsCount, orders: ordersCount };
}

async function syncOzon(admin: AdminClient, origin: string, orgId: string, creds: Json): Promise<{ products: number; orders: number }> {
  const clientId = (creds.clientId as string | undefined)?.trim();
  const apiKey = (creds.apiKey as string | undefined)?.trim();
  if (!clientId || !apiKey) throw new Error("missing clientId/apiKey");

  const products = await callInternal<{ ok: boolean; message?: string; products?: RawExternalProduct[] }>(
    origin, "/api/integrations/ozon/products", { clientId, apiKey },
  );
  if (!products.ok) throw new Error(products.message ?? "Ozon products failed");

  const orders = await callInternal<{ ok: boolean; message?: string; orders?: Json[] }>(
    origin, "/api/integrations/ozon/orders", { clientId, apiKey, days: 30 },
  );
  if (!orders.ok) throw new Error(orders.message ?? "Ozon orders failed");

  const productsCount = await upsertProductsMerging(admin, orgId, (products.products ?? []).map((r) => toProduct(r, "ozon")));
  const ordersCount = await upsertOrdersAppending(admin, orgId, orders.orders ?? []);
  return { products: productsCount, orders: ordersCount };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();

  const { data: integrations, error } = await admin
    .from("integrations")
    .select("app_id, owner_id, kind, credentials")
    .in("kind", ["wildberries", "ozon"]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const origin = originFromReq(req);
  const results: SyncResult[] = [];

  for (const intg of (integrations as IntegrationRow[] | null) ?? []) {
    const creds = (intg.credentials ?? {}) as Json;
    // `_meta_auto_sync` is persisted as a string ("true"/"false") by
    // integrations-store, but defensively support a real boolean too.
    const autoSyncFlag = creds._meta_auto_sync;
    const autoSync = autoSyncFlag !== false && autoSyncFlag !== "false";
    if (!autoSync) {
      results.push({ kind: intg.kind, owner: intg.owner_id, status: "skipped", reason: "auto-sync off" });
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("user_id", intg.owner_id)
      .maybeSingle();
    const orgId = (profile?.org_id as string | undefined) ?? null;
    if (!orgId) {
      results.push({ kind: intg.kind, owner: intg.owner_id, status: "skipped", reason: "no org" });
      continue;
    }

    try {
      const summary = intg.kind === "wildberries"
        ? await syncWildberries(admin, origin, orgId, creds)
        : await syncOzon(admin, origin, orgId, creds);
      results.push({ kind: intg.kind, owner: intg.owner_id, org: orgId, status: "ok", ...summary });

      await admin.from("integrations")
        .update({ last_sync_at: new Date().toISOString(), status: "active" })
        .eq("app_id", intg.app_id)
        .eq("owner_id", intg.owner_id);
    } catch (e) {
      results.push({
        kind: intg.kind, owner: intg.owner_id, org: orgId, status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
