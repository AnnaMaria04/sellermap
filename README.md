# SellerMap

SellerMap now keeps two parallel product tracks in one codebase:

1. **Marketplace Intelligence** (existing analysis flow)
2. **Inventory for Small Business** (new foundation layer)

## Inventory foundation scope added

- Typed onboarding profile for business type, channels, and locations.
- Inventory snapshot/availability model with explicit status map.
- Safe available-to-sell calculation with warning support for negative raw availability.
- Purchase-order and movement status enums for future event storage.
- Draft-first background enrichment plan contract for `/check` async pipeline.

Core formula:

```txt
available_to_sell = physical - reserved - damaged - expired - in_transit
```

## Next steps

1. Wire a real `/inventory` route and tab switcher in UI.
2. Persist entities in Supabase (products, variants, suppliers, purchase orders, stock movements).
3. Move `/check` to draft response + async worker update.
4. Add import/export and stocktake workflows.
