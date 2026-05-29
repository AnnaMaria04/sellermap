import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem, Product, Location, Customer } from "@/mock/inventory";

/**
 * Public storefront checkout.
 *
 * The public `/store` page is unauthenticated, so anon RLS can't insert into
 * `orders`. This endpoint uses the service-role client to persist a checkout
 * into the seller's back office, scoped to the `orgId` snapshotted into the
 * published storefront. Prices, SKUs and costs are re-resolved server-side from
 * the seller's own catalog — the client only sends product ids + quantities —
 * so a tampered cart can't dictate pricing.
 */

interface CheckoutBody {
  orgId?: string;
  customer?: { name?: string; phone?: string; address?: string };
  items?: { id?: string; qty?: number }[];
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Reads a hybrid table's `data` jsonb objects for one org. */
async function loadData<T>(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  orgId: string,
): Promise<T[]> {
  const { data } = await admin.from(table).select("data").eq("org_id", orgId);
  return (data ?? [])
    .map((r) => (r as { data: unknown }).data)
    .filter((d): d is T => d != null);
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  const items = (body.items ?? []).filter((i) => i?.id && (i.qty ?? 0) > 0);
  const customer = body.customer ?? {};
  if (!orgId) return NextResponse.json({ ok: false, error: "missing_org" }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });
  if (!customer.name?.trim() || !customer.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_customer" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "backend_unconfigured" }, { status: 503 });
  }

  const admin = createAdminClient();

  // Re-resolve the cart against the seller's live catalog.
  const products = await loadData<Product>(admin, "products", orgId);
  const byId = new Map(products.map((p) => [p.id, p]));
  const orderItems: OrderItem[] = [];
  for (const line of items) {
    const p = byId.get(line.id!);
    if (!p || p.status !== "active") continue;
    orderItems.push({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      qty: Math.floor(line.qty!),
      unitPrice: p.price,
      unitCost: p.costPrice,
    });
  }
  if (orderItems.length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_items" }, { status: 422 });
  }

  const revenue = orderItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const cost = orderItems.reduce((sum, i) => sum + i.unitCost * i.qty, 0);

  // Default fulfillment location.
  const locations = await loadData<Location>(admin, "locations", orgId);
  const locationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "";

  // Link or create a customer (best-effort — never blocks the order).
  const existing = await loadData<Customer>(admin, "customers", orgId);
  const phone = customer.phone!.trim();
  let cust = existing.find((c) => c.phone && c.phone === phone);
  const now = new Date().toISOString();
  if (!cust) {
    cust = {
      id: uid("cust"),
      name: customer.name!.trim(),
      phone,
      tier: "new",
      loyaltyPoints: 0,
      totalOrders: 1,
      totalSpent: revenue,
      firstOrderAt: now,
      lastOrderAt: now,
      tags: ["витрина"],
      note: customer.address?.trim() ? `Адрес: ${customer.address.trim()}` : undefined,
      createdAt: now,
    };
  } else {
    cust = {
      ...cust,
      totalOrders: cust.totalOrders + 1,
      totalSpent: cust.totalSpent + revenue,
      lastOrderAt: now,
    };
  }
  await admin
    .from("customers")
    .upsert(
      [{ org_id: orgId, app_id: cust.id, data: cust, name: cust.name, phone: cust.phone, tier: cust.tier }] as never,
      { onConflict: "org_id,app_id" },
    );

  const orderNumber = `WEB-${Date.now().toString().slice(-6)}`;
  const order: Order = {
    id: uid("ord"),
    orderNumber,
    channel: "website",
    fulfillment: "self",
    status: "new",
    items: orderItems,
    locationId,
    customerId: cust.id,
    customerName: cust.name,
    revenue,
    commissionRate: 0,
    logisticsCost: 0,
    createdAt: now,
    note: customer.address?.trim() ? `Доставка: ${customer.address.trim()}` : "Заказ с витрины",
  };

  const { error } = await admin.from("orders").upsert(
    [
      {
        org_id: orgId,
        app_id: order.id,
        data: order,
        order_number: orderNumber,
        channel: "website",
        status: "new",
        revenue,
        cost,
      },
    ] as never,
    { onConflict: "org_id,app_id" },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: "persist_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderNumber });
}
