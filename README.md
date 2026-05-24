# SellerMap

## Current direction

This repository keeps the existing marketplace intelligence logic and now adds an **Inventory foundation** so SellerMap can support both:
- Marketplace product checks (existing functionality)
- Small business inventory operations (new tab/foundation)

## What was added in this iteration

- Inventory domain scaffold in `src/lib/inventory/foundation.ts`
- Types for onboarding profile, channels, stock locations, movement records, and purchase-order statuses
- Shared formula for available-to-sell stock:

```txt
available_to_sell = physical - reserved - damaged - expired - in_transit
```

- Starter helper for UI tab composition to keep marketplace and inventory side-by-side
- Starter async enrichment plan primitive for cache-first `/check` flow

## Next implementation steps

1. Create dedicated `/inventory` route and top-level tab switcher.
2. Persist inventory entities in Supabase (products, variants, locations, movements, suppliers, purchase_orders).
3. Switch `/check` to draft-first response + background enrichment worker updates.
4. Add stock movement event store and analytics projections.
5. Add import/export pipeline (CSV/Excel first).
