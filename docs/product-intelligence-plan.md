# SellerMap V2 Product Intelligence Plan

Updated: 2026-05-24

## Current State

SellerMap now has the core data-engine shape:

- `/check` can submit a supplier URL, WB URL, nmId, or Russian keyword into `/api/check/analyze`.
- `/api/check/analyze` builds a supplier product, fingerprint, WB market lookup, economics, decision, and saves the flywheel data when Supabase is configured.
- The provider ladder is cache -> own WB collector -> Apify fallback if enabled -> MPStats placeholder -> manual/demo only when explicit.
- Railway worker is the own WB collector service. It uses a slow public-data collector and returns normalized WB products.
- Supabase schema has the marketplace intelligence tables: supplier products, fingerprints, WB snapshots, market analyses, competitors, economics, tracked products, tracked keywords, daily metrics, sales estimates, and weekly updates.
- `/dashboard`, `/reports`, `/updates`, and `/result/{analysisId}` read saved analyses where available.

## Competitive Benchmarks

US Amazon tools set the product expectation:

- Jungle Scout emphasizes product databases, demand/competition filters, competitor intelligence, opportunity scoring, and a profit calculator.
- Keepa wins on historical price/rank tracking and visual trend history.
- Helium 10-style workflows center on keyword research, competitor tracking, listing optimization, and profitability.
- DataHawk-style tools consolidate marketplace data into dashboards, alerts, and AI-guided recommendations.

For Russian WB sellers, SellerMap should translate these patterns into:

- supplier import before stock purchase;
- WB competitor comparison by keyword/category;
- honest demand proxy when exact sales are unavailable;
- unit economics for WB/Ozon realities;
- packaging, logistics, returns, and commission risk;
- action plan before ordering inventory;
- tracking that improves confidence over 7/14/30 days.

## Differentiation

SellerMap should not compete as “another MPStats clone.” The stronger positioning is:

> Paste a supplier link before buying inventory. SellerMap tells you whether the product is worth testing on WB/Ozon, what price can work, what risks to verify, and starts tracking the niche.

Differentiators:

- Alibaba/1688/AliExpress supplier-first workflow.
- Packaging and logistics risk before purchase.
- “Wrong data is worse than no data” source honesty.
- Persistent data flywheel that becomes proprietary over time.
- Beginner-friendly verdicts rather than analyst dashboards.
- WB + Ozon expansion with provider adapters instead of hardcoded APIs.

## UX Principles

- One main action at a time: paste product -> see market -> edit assumptions -> decision.
- Never show JSON to normal users. JSON belongs in API diagnostics, logs, admin pages, or debug tools.
- Always show data source badges: cache, own collector, Apify, MPStats, manual, demo, estimated.
- Never display exact competitor sales unless from a licensed provider or authorized seller API.
- Use short cards and gauges; avoid dense tables on mobile.
- Make missing fields actionable, not scary.
- Show how confidence can improve: “track this niche for 7 days.”

## Major Product Gaps To Close Next

1. Full supplier extraction reliability
   - Add per-platform Apify actor configs and a rendered Alibaba packaging extractor.
   - Store raw payload excerpts safely, not huge HTML.
   - Parse packaging size and gross weight as first-class fields.

2. Check page production flow
   - Show provider progress for supplier import, fingerprinting, WB collection, economics, saving.
   - Add manual fallback only after extraction failure or user choice.
   - Add explicit demo mode buttons with demo badges.

3. Result page intelligence depth
   - Add review barrier gauge.
   - Add seller concentration card.
   - Add price cluster card.
   - Add data history panel: days tracked, snapshots, sales estimate method.
   - Add live assumption recalculation that can save a new economics snapshot.

4. Tracking and scheduled collection
   - Configure Vercel cron or external scheduler for `/api/tracking/keywords` and `/api/tracking/snapshot`.
   - Build weekly update generation from snapshot deltas.
   - Add admin health for failed collections and provider usage.

5. Dashboard/report lifecycle
   - Add statuses: idea, supplier requested, needs data, ready for test, rejected.
   - Add filters/search/sort.
   - Add “recalculate with fresh market data.”

6. Ozon expansion
   - Add Ozon public/partner provider abstraction.
   - Mirror normalized product/competitor shape.
   - Keep Ozon economics assumptions separate from WB.

7. Machine learning path
   - Start with feature engineering, not model training.
   - Collect snapshots: price, reviews, rank/search position, seller recurrence, stock signals if available.
   - Use deterministic scoring until 30+ days of history exists.
   - Later train or fit lightweight ranking models for opportunity scoring and sales range calibration.

## Immediate Implementation Completed In This Update

- `/check` now calls `/api/check/analyze` for supplier URLs, WB URLs, nmIds, and Russian keywords.
- `/check` now opens `/result/{analysisId}` when persistence succeeds, instead of query-string report URLs.
- `/check` now says “draft report” when persistence is unavailable.
- `/result/{analysisId}` passes its analysis id to the client.
- `/result` hero now has a visible “Отслеживать 7 дней” action.
- Added `/api/tracking/analysis` to explicitly upsert tracked keywords and top competitors from a saved analysis.
- Result insights now include the data-source confidence panel.

## Next Major Update Recommendation

Build “Assumption Studio + Tracking History”:

- Editable economics assumptions on `/result/{analysisId}` with save-to-Supabase.
- Snapshot history and confidence card on result.
- Review velocity and price-change panels once tracking has at least 2 snapshots.
- Scheduler setup for daily keyword/product refresh.
- Admin data-engine error queue and provider usage counts.

This is the next best step because it converts SellerMap from “analysis created once” into “analysis improves over time.”
