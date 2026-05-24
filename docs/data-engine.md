# SellerMap Data Engine

SellerMap should turn every product check into reusable marketplace intelligence.

## What Is Collected

- Supplier product data: URL, platform, title, images, MOQ, price, package size, gross weight, supplier name, and raw payload.
- Product fingerprint: product type, target customer, use case, key features, Russian WB keywords, category guess, differentiation angles, and noisy terms to ignore.
- WB search snapshots: keyword, provider, result count, normalized products, market metrics, and raw provider payload.
- WB product snapshots: nmId, title, brand, seller, price, rating, reviews, image, product URL, search position, stock signal if available, and timestamp.
- Market analyses: opportunity score, verdict, confidence level, economics, decision logic, and warnings.
- Analysis competitors: the competitor rows attached to the exact analysis that produced a report.
- Tracking targets: top competitors and generated keywords that should be refreshed daily.
- Daily keyword metrics: price quartiles, review barrier, seller concentration, product count, and trend-ready raw metrics.
- Sales estimates: only when there is seller API data, licensed provider data, or enough history for review velocity estimates.

## Exact vs Estimated

Exact data:
- Authorized seller API data for the connected seller’s own products.
- Supplier fields returned by Apify or entered manually.
- Public WB fields visible in current snapshots such as price, rating, review count, and position.

Estimated data:
- Competitor sales and revenue unless sourced from an authorized or licensed analytics provider.
- Demand level when only public search/review/rank signals are available.
- Review-velocity sales ranges after enough history exists.

Unavailable:
- Exact competitor sales from public WB pages.
- Private seller analytics without seller authorization.

## Sales Estimate Methods

Priority order:

1. `seller_api_exact`: exact own-seller data from authorized WB seller API.
2. `provider_estimate`: licensed provider such as MPStats.
3. `review_velocity_estimate`: uses 30-day review growth multiplied by conservative ranges.
4. `stock_delta_estimate`: future method if stock history is reliable.
5. `proxy_only`: no sales numbers. SellerMap shows demand proxy only.

Review velocity formula:

```text
reviewGrowth30d = currentReviews - reviews30dAgo
low = reviewGrowth30d * 5
mid = reviewGrowth30d * 10
high = reviewGrowth30d * 20
```

This is always displayed as an estimate, not official WB seller data.

## Confidence

Confidence increases with:
- more days of history
- more snapshots
- review growth history
- rank history
- stock signal
- stronger provider source
- larger competitor sample

Confidence decreases with:
- missing supplier fields
- missing WB market data
- no history
- manual-only data

Levels:
- `low`: 0-30
- `medium`: 31-70
- `high`: 71-100

## Provider Ladder

Market data order:

1. Supabase cache
2. Own WB collector worker
3. Apify fallback only when `ENABLE_APIFY_FALLBACK=true`
4. MPStats when configured
5. Manual fallback

Direct WB public search from Vercel must stay disabled in production.

## Daily Jobs

`POST /api/tracking/snapshot`

- Refreshes active `tracked_products`.
- Uses own WB collector product detail route.
- Saves product snapshots.
- Updates `last_checked_at`.
- Writes a sales estimate record, usually `proxy_only` until enough history exists.

`POST /api/tracking/keywords`

- Refreshes active `tracked_keywords`.
- Uses provider ladder with cache first.
- Saves search/product snapshots.
- Writes daily keyword market metrics.

Both routes are protected by `CRON_SECRET`.

## Admin View

`/admin/data-engine`

Shows table counts, tracked keywords, and tracked products. Set `ADMIN_DATA_ENGINE_PASSWORD` and open:

```text
/admin/data-engine?key=YOUR_PASSWORD
```

## Cost Control

Default limits:

- `FREE_USER_MAX_KEYWORDS=3`
- `FREE_USER_MAX_RESULTS_PER_KEYWORD=20`
- `DETAIL_ENRICHMENT_LIMIT=10`
- `DAILY_TRACKING_LIMIT=100`
- `DAILY_KEYWORD_LIMIT=20`
- `ENABLE_APIFY_FALLBACK=false`
- `ENABLE_APIFY_IN_TRACKING=false`

SellerMap should use Apify only as an explicit fallback, not the default data source.
