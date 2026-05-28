# Data Integrity Backfill — Major Update

This change set closes the data-integrity gaps flagged in the audit document.
All work is delivered as idempotent SQL migrations under
[`supabase/migrations/`](../supabase/migrations) and has been **applied and
verified against the live Supabase project** (`xvgzpryzqxwcihhptfpw`,
org `SellerMap Demo`).

## Why these are database migrations

The audited gaps in **Section B** (and the data side of C/D) are fundamentally
*persistence* problems: entities that the running app builds in memory and
stores in `*.data` jsonb, while the relational tables sit empty (0 rows). The
fix is to materialise the relational tables from the jsonb that already exists,
and to keep the derived projection fresh with database triggers so the app's
reads become correct regardless of which code path wrote the data.

A key discovery during implementation: the relational `variant_id` foreign keys
on `order_items`, `inventory_levels`, `stock_movements`, `transfer_items` and
`reservations` **all reference `product_variants`**, which was empty. So
`product_variants` (item **C7**) is the linchpin and had to be backfilled first.
Likewise `stock_movements.variant_id` / `location_id` and
`transfers.from/to_location_id` were `NULL` (their keys lived in jsonb) and had
to be resolved before any projection could group on them.

## What was done

| Item | Table(s) | Before | After | Migration |
|------|----------|--------|-------|-----------|
| **C7** | `product_variants` | 0 | **11** (one default variant per product) | `..120000_backfill_product_variants_from_products.sql` |
| **B6** | `suppliers` + `supplier_products` | 0 / 8 orphans | **3 suppliers, 8/8 linked** (added `supplier_products.supplier_id` FK) | `..120100_backfill_suppliers_and_link_supplier_products.sql` |
| **B4** | `order_items` + `orders.cost` | 0 (108 orders) | **108 items**, `unit_cost` from product cost, `orders.cost` recomputed from relational read | `..120200_backfill_order_items_from_orders_data.sql` |
| **C11** | `transfer_items` | 0 (1 transfer) | **1 item** materialised from `transfers.data.items[]` | `..120300_backfill_transfer_items_from_transfers_data.sql` |
| integrity / **C8** | `stock_movements` keys, `reservations` | 124 rows w/ NULL FKs | **126 rows fully keyed**; reservations mechanism + backfill (0 rows — no product carried `reservedUnits`) | `..120400_backfill_stock_movements_keys_and_reservations.sql` |
| **B5** | `inventory_levels` + functions/triggers | 0 | **8 cells**, live projection + `available_to_sell()` / `product_available_to_sell()` | `..120500_inventory_levels_projection_and_triggers.sql` |
| integrity | `transfers` location FKs, opening balances | NULL FKs, on_hand=0 | reconciled to `products.data.stockByLocation` (8 + 4 on hand, 7 in transit) | `..120600_reconcile_opening_balances_and_transfer_locations.sql` |
| security | new `SECURITY DEFINER` functions | RPC-exposed | EXECUTE revoked from `anon`/`authenticated` | `..120700_lock_down_inventory_definer_functions.sql` |

### Mirror going forward (database triggers)

The app persists through a hybrid store (`src/lib/supabase/inventory-store.ts`)
that only writes the `data` jsonb. To keep the relational children populated
without rewriting the front-end, triggers parse `data` on every upsert
(`supabase/migrations/...121000_mirror_forward_relational_triggers.sql`):

* `products` → ensures a default `product_variant` and syncs its price/cost (**C7**).
* `orders` → rebuilds `order_items` from `data.items[]` and recomputes `orders.cost` (**B4**).
* `transfers` → resolves location FKs and rebuilds `transfer_items` (**C11**).
* `stock_movements` → resolves `variant_id`/`location_id` from `data` **before insert**, so the `inventory_levels` projection updates for app-created movements (**B5** live).

Verified end-to-end against the live DB: an app-style data-only movement
decremented `inventory_levels`, and a data-only order created `order_items`.

### Read side (app helper)

`src/lib/supabase/inventory-availability.ts` exposes the DB as the source of
truth for sellable stock: `availableToSell()`, `productAvailableToSell()` (RPC
wrappers) and `loadInventoryLevels()` (relational read), replacing the in-memory
`Product.reservedUnits`/`totalPhysical` math.

### B5 — `inventory_levels` as a maintained projection

`inventory_levels(variant_id, location_id)` is now derived, not authored:

* `on_hand`   = `Σ stock_movements.qty_delta`
* `reserved`  = `Σ reservations.qty` where status ∈ (`active`,`pending`)
* `in_transit`= `Σ (transfer_items.qty - received_qty)` for open transfers landing at the location
* `damaged`   = `0` (no per-location damaged source today; write-offs reduce `on_hand` via movements)

Triggers on `stock_movements`, `reservations` and `transfer_items` call
`refresh_inventory_level(variant, location)` after every change, so the cell
stays correct going forward. Verified end-to-end: inserting a `+3` receipt moved
`on_hand` 8 → 11, deleting it returned it to 8.

The audit's requested API is exposed from the DB:

```sql
select public.available_to_sell(variant_id, location_id);      -- per variant+location
select public.product_available_to_sell(product_id);           -- per product, all locations
select public.product_available_to_sell(product_id, location_id);
```

formula: `available_to_sell = max(0, on_hand - reserved - damaged - in_transit)`.

## Items NOT addressed here, and why

These remain open because they require **net-new feature wiring** in the
front-end (engines, pricing hooks, persistence of brand-new entities) or because
there is **no source data to backfill**. The relational schema and triggers are
in place, so each becomes a focused front-end task:

* **C9 returns / return_items**, **C10 stocktakes / stocktake_items**,
  **C12 inventory_batches** — 0 rows and *no source data exists* in jsonb
  (`products` carry no batch/expiry, no order is marked returned). Tables and
  the projection are ready; rows will appear when a UI path creates them.
* **D13 replenishment_rules**, **D14 purchase_orders**, **E15 bundles**,
  **E16 promotions** — these live in front-end context/seed state, not in the
  DB, and need the application store wiring (and, for D13/E16, an engine /
  pricing hook) that is not in this repo.
* **F17 enrichment worker**, **F18 sync-health**, **G19–G22** (onboarding
  profile wiring, expense categories, alert history, roles/billing) — all
  front-end / Edge Function work that depends on the missing app codebase.

When the application repository is available, the relational schema is now ready
to be the single source of truth for the catalog, orders COGS, and
available-to-sell, exactly as the audit prescribes.

## Re-running

Every migration is idempotent (`not exists` / `on conflict` / `add column if
not exists`), so re-applying them is safe and will not duplicate rows.
