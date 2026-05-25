# SellerMap

SellerMap keeps two parallel product tracks in one codebase:

1. **Marketplace Intelligence**: the existing seller analysis flow.
2. **Inventory for Small Business**: a foundation layer for product, stock, supplier, and daily operations management.

## Inventory Foundation Scope

- Typed onboarding profile for business type, sales channels, and locations.
- Product card primitives for variants, accounting type, multi-channel placement, suppliers, labels, barcodes, and marking data.
- Inventory snapshot model with explicit stock status map.
- Safe available-to-sell calculation with warnings when raw availability goes negative.
- Import/export job contracts for CSV, Excel, Shopify, 1C, MoySklad, POS, supplier catalogs, and accountant reports.
- Purchase order drafts, receiving lines, transfers, stocktake, write-off, return, and audit movement records.
- Demand snapshots, recommendation actions, and notification event contracts.
- Draft-first async enrichment plan for the `/check` pipeline.
- Inventory flow checklist that mirrors onboarding through daily operations.

Core formula:

```txt
available_to_sell = physical - reserved - damaged - expired - in_transit
```

## Flow Coverage

1. Onboarding and sales-channel setup.
2. Product creation/import with variants.
3. Barcodes, labels, and Честный Знак/Data Matrix marking hooks.
4. Stock statuses and location-aware quantities.
5. Supplier catalog and purchase-order base contracts.
6. Receiving, transfers, stocktake, write-offs, and returns.
7. Movement history and audit trail records.
8. Analytics, forecasting, recommendations, and alerts.

## Next Steps

1. Wire a real `/inventory` route and product tab switcher.
2. Persist entities in Supabase: products, variants, suppliers, purchase orders, and stock movements.
3. Move `/check` to draft response plus async worker update.
4. Add import/export and stocktake workflows.
5. Add Russian-market adapters for Честный Знак, Data Matrix, Telegram notifications, 1C, and MoySklad templates.
