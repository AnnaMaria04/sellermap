# Major Update — Data Integrity + Platform Build

This change set closes the gaps flagged in the audit (sections **B through G**).
It combines database work (idempotent SQL migrations under
[`supabase/migrations/`](../supabase/migrations), applied + verified against the
live Supabase project `xvgzpryzqxwcihhptfpw`) with application features in the
Next.js app. Verification baseline: `tsc --noEmit` clean, **87 unit tests pass**
(`vitest`), and `next build` green (59 routes).

## The core idea

Most gaps had the same shape: the app builds entities in memory and stores them
in `*.data` jsonb, while the relational tables sit empty (0 rows). The fix is
two-sided:

1. **One-time backfills** materialise the relational tables from the jsonb that
   already exists.
2. **Mirror-forward database triggers** keep those relational tables in sync on
   every hybrid upsert the app's store performs — so the relational schema
   becomes the durable source of truth without rewriting the front-end.

The linchpin is `product_variants` (C7): every variant-keyed FK
(`order_items`, `inventory_levels`, `stock_movements`, `transfer_items`,
`reservations`, …) references it, so it is backfilled first and maintained by a
trigger on `products`.

## B — Data integrity

| Item | Result |
|------|--------|
| **B4** order_items | Backfilled 0 → **108** from `orders.data.items[]`; `unit_cost` from product cost; `orders.cost` recomputed. Trigger rebuilds items + recomputes cost on every order upsert. |
| **B5** inventory_levels | Live projection (0 → 8 cells): `on_hand` from `stock_movements`, `reserved` from `reservations`, `in_transit` from open transfers. Triggers keep it fresh; `available_to_sell()` / `product_available_to_sell()` exposed from the DB. |
| **B6** suppliers | Backfilled 0 → **3**; all **8** orphan `supplier_products` linked via a new `supplier_id` FK. |

## C — Tables with no writes (now mirrored)

| Item | Result |
|------|--------|
| **C7** product_variants | One default variant per product (0 → 11) + `products` trigger keeps it/price/cost in sync. |
| **C8** reservations | Backfill mechanism + BEFORE trigger resolves variant/location from data so reservations feed `inventory_levels.reserved`. |
| **C9** return_items | Trigger rebuilds from `returns.data.items[]`. |
| **C10** stocktake_items | Trigger rebuilds from `stocktakes.data.items[]` + resolves location. |
| **C11** transfer_items | Backfilled + trigger; transfer location FKs resolved from data. |
| **C12** inventory_batches | BEFORE trigger resolves variant/location + batch fields from data. |

## D — Replenishment & purchasing

| Item | Result |
|------|--------|
| **D13** replenishment | New engine `src/lib/replenishment/engine.ts` (min_stock / reorder_point / days_of_stock vs. sales velocity → ranked suggestions → draft POs). `ReplenishmentEnginePanel` on the planning tab creates the POs. Relational `replenishment_rules` columns resolved by trigger. 9 tests. |
| **D14** purchase_order_items | Trigger rebuilds items + `total_amount` + supplier/location FKs from `purchase_orders.data`. |

## E — Merchandising

| Item | Result |
|------|--------|
| **E15** bundle_components | Trigger rebuilds from `bundles.data.components[]`. |
| **E16** promotions | New pricing engine `src/lib/promotions/engine.ts` applied to the **POS cart** (was never applied anywhere). `promotions` promoted to a hybrid collection (store + context + create/update/delete actions); `PromotionsPanel` reads the shared store; usage counted on sale. 23 tests. |

## F — Live data & enrichment

| Item | Result |
|------|--------|
| **F17** enrichment worker | `enrichment_jobs` queue table + `enrich-product` Supabase Edge Function (deployed, ACTIVE) that drains the queue; `src/lib/inventory/enrichment-queue.ts` enqueues a check's plan and triggers the worker. /check can now return a draft and enrich asynchronously. |
| **F18** sync-health | `SyncHealthPanel` + `/inventory/sync-health` page consolidate every channel's freshness/status/cadence (was only a badge in IntegrationHub). |

## G — Platform & polish

| Item | Result |
|------|--------|
| **G19** onboarding profile | `src/lib/inventory/seller-profile.ts` maps the collected profile to the typed `SellerOnboardingProfile` and derives modules via `buildSellerModuleTabs` (both were unused); the wizard shows the enabled modules. |
| **G20** expense categories | `useFinance` loads/creates/deletes `expense_categories` and links each expense to its `category_id` (table was never written). |
| **G21** alert history | `alert_history` table + `src/lib/inventory/alert-history.ts`; `useDismissedAlerts` mirrors dismissals to the DB best-effort. |
| **G22** billing | `src/lib/billing/plans.ts` (catalogue + usage-vs-limit) and a real billing page with live usage bars and a 3-tier comparison, replacing the placeholder. |

## Security & verification

* All `SECURITY DEFINER` trigger/resolver functions have `EXECUTE` revoked from
  `anon`/`authenticated`; the read-only `available_to_sell` helpers are granted
  to `authenticated` only. New tables (`enrichment_jobs`, `alert_history`) have
  RLS scoped to the owning org.
* Trigger recursion was eliminated by splitting parent-column resolution into
  BEFORE triggers (compute totals/FKs onto `NEW`) and child rebuilds into AFTER
  triggers. Verified end-to-end via SQL (e.g. an app-style data-only order
  populates `order_items`; a movement updates `inventory_levels` 8→11→8).

All migrations are idempotent (`if not exists` / `on conflict` / `not exists`),
so they are safe to re-run.
