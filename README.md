# SellerMap

SellerMap now keeps two parallel product tracks in one codebase:

1. **Marketplace Intelligence** (existing analysis flow)
2. **Inventory for Small Business** (new foundation layer)

## Inventory foundation scope added

- Typed onboarding profile for business type, channels, and locations.
- Inventory snapshot/availability model with explicit status map.
- Product card primitives for variants, accounting type, and multi-channel placement.
- Import/export job contracts for CSV/Excel/Shopify/1C/МойСклад/POS/supplier sources.
- Purchase order drafts, receiving lines, and movement/audit records.
- Demand snapshot, recommendation actions, and notification event contracts.
- Safe available-to-sell calculation with warning support for negative raw availability.
- Draft-first background enrichment plan contract for `/check` async pipeline.
- Inventory flow checklist that mirrors onboarding -> daily operations lifecycle.

Core formula:

```txt
available_to_sell = physical - reserved - damaged - expired - in_transit
```

## Flow coverage in this foundation

1. Onboarding and sales channels.
2. Product creation/import with variants.
3. Barcodes/labels and data model hooks for marking workflows.
4. Stock statuses and location-aware quantities.
5. Supplier/Purchase order base contracts.
6. Receiving, transfers, stocktake, write-off primitives.
7. Movement history / audit trail records.
8. Analytics/recommendations/alerts data contracts.

## Next steps

1. Wire a real `/inventory` route and tab switcher in UI.
2. Persist entities in Supabase (products, variants, suppliers, purchase orders, stock movements).
3. Move `/check` to draft response + async worker update.
4. Add import/export and stocktake workflows.
5. Add Russian-market adapters (Честный Знак/Data Matrix, Telegram notifications, 1C/МойСклад import templates).
