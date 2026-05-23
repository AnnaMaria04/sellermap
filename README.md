# SellerMap

Alibaba / 1688 / AliExpress to Wildberries product validation engine.

SellerMap imports a supplier product, creates a product fingerprint, finds comparable Wildberries products, estimates market pressure and unit economics, and returns a launch decision.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
npm test
```

## Market Data Provider Ladder

SellerMap does not rely on direct WB public search from Vercel in production. The market layer uses:

1. Supabase cache/snapshots.
2. Own WB collector worker (`own-wb`).
3. Apify WB provider, only when `ENABLE_APIFY_FALLBACK=true`.
4. MPStats later.
5. Manual/demo fallback where explicitly enabled.

Direct WB public search remains disabled by default because serverless IPs are unstable for marketplace collection.

## Own WB Collector

The worker lives in `/worker` and is deployed separately to Railway, Render, Fly.io, a VPS, or Docker. Connect it to the Vercel app with:

```bash
OWN_WB_COLLECTOR_BASE_URL=
OWN_WB_COLLECTOR_API_KEY=
ENABLE_OWN_WB_COLLECTOR=true
MARKET_DATA_PROVIDER=auto
```

See `/worker/README.md` for deployment instructions.

## Data Honesty

Competitor sales are not shown as exact facts unless a provider returns them. Without MPStats or historical snapshots, SellerMap shows demand proxy and confidence based on public signals: prices, review depth, rating, visible search position, seller concentration, and comparable product count.

As `wb_product_snapshots` accumulate over time, SellerMap can estimate demand from review growth and price movement.
