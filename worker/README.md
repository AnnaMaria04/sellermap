# SellerMap Own WB Collector

Separate Node.js worker for slow, public Wildberries market collection. It is intentionally not a Vercel Function: the main SellerMap app calls this service through the `own-wb` provider.

## Local Run

```bash
cd worker
npm install
WORKER_API_KEY=dev-secret npm run dev
```

Health check:

```bash
curl http://localhost:8787/health
```

Search:

```bash
curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret" \
  -d '{"query":"акриловый маркер","limit":20}'
```

Product:

```bash
curl -X POST http://localhost:8787/product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret" \
  -d '{"nmId":"123456789"}'
```

## Environment

```bash
PORT=8787
WORKER_API_KEY=
NODE_ENV=development
WB_COLLECTOR_MAX_CONCURRENCY=1
WB_COLLECTOR_DELAY_MS=3000
WB_COLLECTOR_TIMEOUT_MS=25000
WB_COLLECTOR_MAX_RESULTS=30
WB_COLLECTOR_USER_AGENT="SellerMapBot/0.1 contact: support@sellermap.local"
WB_COLLECTOR_PROXY_URL=
```

`WORKER_API_KEY` is required in production. All routes except `/health` require `Authorization: Bearer WORKER_API_KEY`.

`WB_COLLECTOR_PROXY_URL` is optional but recommended on Railway/Render/VPS if WB blocks datacenter IPs. Use an HTTP proxy URL such as:

```bash
WB_COLLECTOR_PROXY_URL=http://username:password@host:port
```

The worker does not bypass CAPTCHA or private endpoints; the proxy only changes the public network route for Playwright browser collection.

## Safety Model

- Public WB pages/data only.
- No CAPTCHA bypass.
- No authenticated seller data.
- No private competitor scraping.
- One request at a time by default.
- Delay between collection jobs.
- Partial results are returned instead of blank failures.
- Exact competitor sales are not fabricated.

## Deploy To Railway

1. Create a new Railway service from the GitHub repo.
2. Set root directory to `worker`.
3. Add environment variables, especially `WORKER_API_KEY`.
4. Use start command `npm start`; Railway will run `npm install` and `npm run build` if configured as a Node service.
5. Copy the public service URL.

## Deploy To Render

1. Create a Web Service from the GitHub repo.
2. Set root directory to `worker`.
3. Build command: `npm install && npm run build`.
4. Start command: `npm start`.
5. Add `WORKER_API_KEY` and the collector env vars.

## Deploy With Docker

```bash
cd worker
docker build -t sellermap-own-wb-collector .
docker run -p 8787:8787 -e WORKER_API_KEY=dev-secret sellermap-own-wb-collector
```

## Connect To Vercel App

Set these variables in the main SellerMap Vercel project:

```bash
OWN_WB_COLLECTOR_BASE_URL=https://your-worker.example.com
OWN_WB_COLLECTOR_API_KEY=the-same-secret
ENABLE_OWN_WB_COLLECTOR=true
ENABLE_APIFY_FALLBACK=false
MARKET_DATA_PROVIDER=auto
```

Apify can remain as an explicit fallback, but keep it disabled by default for cost control. The app tries cache first, then this worker, then Apify only when `ENABLE_APIFY_FALLBACK=true`.

For historical collection, also set:

```bash
DAILY_TRACKING_LIMIT=100
DAILY_KEYWORD_LIMIT=20
ENABLE_APIFY_IN_TRACKING=false
CRON_SECRET=
```

## Commands

```bash
npm run build
npm test
```
