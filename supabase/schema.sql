create table if not exists public.users (
  id uuid references auth.users primary key,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  supplier_url text,
  supplier_platform text,
  supplier_name text,
  product_title text,
  moq integer,
  unit_cost_usd numeric,
  currency text,
  weight_kg numeric,
  dimensions text,
  shipping_estimate_usd numeric,
  images text[],
  price_tiers jsonb,
  specs jsonb,
  wb_keyword text,
  wb_nm_id text,
  wb_products jsonb,
  wb_analytics jsonb,
  selling_price_rub numeric,
  fx_rate numeric,
  commission_pct numeric,
  logistics_rub numeric,
  packaging_rub numeric,
  delivery_rub numeric,
  ad_reserve_pct numeric,
  tax_pct numeric,
  returns_pct numeric,
  other_costs_rub numeric,
  profit_per_unit numeric,
  margin_pct numeric,
  break_even_rub numeric,
  verdict_text text,
  verdict_score text
);

alter table public.lookups enable row level security;

drop policy if exists "Users can only see own lookups" on public.lookups;
create policy "Users can only see own lookups"
  on public.lookups for all
  using (auth.uid() = user_id);

create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lookup_id uuid references public.lookups(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);

alter table public.saved_products enable row level security;

drop policy if exists "Users can only see own saved products" on public.saved_products;
create policy "Users can only see own saved products"
  on public.saved_products for all
  using (auth.uid() = user_id);

create table if not exists public.wb_search_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  query text,
  provider text not null,
  result_count integer,
  products jsonb not null default '[]'::jsonb,
  market_stats jsonb,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create index if not exists wb_search_snapshots_keyword_created_at_idx
  on public.wb_search_snapshots (keyword, created_at desc);

alter table public.wb_search_snapshots add column if not exists query text;
alter table public.wb_search_snapshots add column if not exists result_count integer;
alter table public.wb_search_snapshots add column if not exists raw_payload jsonb;

create table if not exists public.wb_product_snapshots (
  id uuid primary key default gen_random_uuid(),
  nm_id text not null,
  query text,
  provider text not null,
  title text,
  brand text,
  seller_name text,
  seller_id text,
  price_rub numeric,
  original_price_rub numeric,
  rating numeric,
  review_count integer,
  image_url text,
  product_url text,
  category text,
  subject text,
  search_position integer,
  stock_signal numeric,
  estimated_monthly_sales numeric,
  product jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create index if not exists wb_product_snapshots_nm_id_created_at_idx
  on public.wb_product_snapshots (nm_id, created_at desc);

alter table public.wb_product_snapshots add column if not exists query text;
alter table public.wb_product_snapshots add column if not exists title text;
alter table public.wb_product_snapshots add column if not exists brand text;
alter table public.wb_product_snapshots add column if not exists seller_name text;
alter table public.wb_product_snapshots add column if not exists seller_id text;
alter table public.wb_product_snapshots add column if not exists price_rub numeric;
alter table public.wb_product_snapshots add column if not exists original_price_rub numeric;
alter table public.wb_product_snapshots add column if not exists rating numeric;
alter table public.wb_product_snapshots add column if not exists review_count integer;
alter table public.wb_product_snapshots add column if not exists image_url text;
alter table public.wb_product_snapshots add column if not exists product_url text;
alter table public.wb_product_snapshots add column if not exists category text;
alter table public.wb_product_snapshots add column if not exists subject text;
alter table public.wb_product_snapshots add column if not exists search_position integer;
alter table public.wb_product_snapshots add column if not exists stock_signal numeric;
alter table public.wb_product_snapshots add column if not exists estimated_monthly_sales numeric;
alter table public.wb_product_snapshots add column if not exists raw_payload jsonb;

create index if not exists wb_product_snapshots_query_idx
  on public.wb_product_snapshots (query);

create index if not exists wb_product_snapshots_created_at_idx
  on public.wb_product_snapshots (created_at desc);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  supplier_url text not null,
  platform text,
  title text,
  original_title text,
  images jsonb,
  price_min numeric,
  price_max numeric,
  currency text,
  moq integer,
  specs jsonb,
  package_size jsonb,
  gross_weight_kg numeric,
  supplier_name text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.product_fingerprints (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid references public.supplier_products(id) on delete cascade,
  product_type text,
  target_customer text,
  use_case text,
  key_features jsonb,
  ru_keywords jsonb,
  category_guess text,
  differentiation_angles jsonb,
  irrelevant_terms jsonb,
  created_at timestamptz default now()
);

alter table public.product_fingerprints add column if not exists irrelevant_terms jsonb;

create table if not exists public.market_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  supplier_product_id uuid references public.supplier_products(id) on delete cascade,
  fingerprint_id uuid references public.product_fingerprints(id) on delete set null,
  analysis_json jsonb not null,
  opportunity_score numeric,
  verdict text,
  confidence_level text,
  created_at timestamptz default now()
);

alter table public.market_analyses add column if not exists fingerprint_id uuid references public.product_fingerprints(id) on delete set null;

create index if not exists market_analyses_created_at_idx
  on public.market_analyses (created_at desc);

create table if not exists public.unit_economics (
  id uuid primary key default gen_random_uuid(),
  market_analysis_id uuid references public.market_analyses(id) on delete cascade,
  supplier_unit_cost numeric,
  currency text,
  fx_rate numeric,
  landed_cost_rub numeric,
  packaging_cost_rub numeric,
  wb_commission_percent numeric,
  wb_logistics_rub numeric,
  return_buffer_percent numeric,
  ad_spend_percent numeric,
  tax_percent numeric,
  target_price_rub numeric,
  break_even_price_rub numeric,
  estimated_profit_rub numeric,
  estimated_margin_percent numeric,
  result_json jsonb,
  created_at timestamptz default now()
);

create table if not exists public.tracked_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  nm_id text not null,
  title text,
  image_url text,
  product_url text,
  seller_name text,
  keywords jsonb,
  source_analysis_id uuid references public.market_analyses(id) on delete set null,
  tracking_status text default 'active',
  priority integer default 5,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists tracked_products_user_status_idx
  on public.tracked_products (user_id, tracking_status);

alter table public.tracked_products add column if not exists product_url text;
alter table public.tracked_products add column if not exists seller_name text;
alter table public.tracked_products add column if not exists source_analysis_id uuid references public.market_analyses(id) on delete set null;
alter table public.tracked_products add column if not exists priority integer default 5;
alter table public.tracked_products add column if not exists last_checked_at timestamptz;

create index if not exists tracked_products_status_priority_idx
  on public.tracked_products (tracking_status, priority, last_checked_at);

create unique index if not exists tracked_products_nm_id_unique_idx
  on public.tracked_products (nm_id);

alter table public.wb_search_snapshots add column if not exists normalized_count integer;
alter table public.wb_product_snapshots add column if not exists ad_visibility boolean;

create table if not exists public.analysis_competitors (
  id uuid primary key default gen_random_uuid(),
  market_analysis_id uuid references public.market_analyses(id) on delete cascade,
  nm_id text not null,
  query text,
  title text,
  seller_name text,
  price_rub numeric,
  review_count integer,
  rating numeric,
  search_position integer,
  image_url text,
  source text,
  created_at timestamptz default now()
);

create index if not exists analysis_competitors_analysis_idx
  on public.analysis_competitors (market_analysis_id);

create table if not exists public.tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  category_guess text,
  priority integer default 5,
  last_checked_at timestamptz,
  tracking_status text default 'active',
  created_at timestamptz default now()
);

create unique index if not exists tracked_keywords_keyword_unique_idx
  on public.tracked_keywords (keyword);

create index if not exists tracked_keywords_status_priority_idx
  on public.tracked_keywords (tracking_status, priority, last_checked_at);

create table if not exists public.daily_market_metrics (
  id uuid primary key default gen_random_uuid(),
  keyword text,
  category_guess text,
  date date,
  product_count integer,
  median_price numeric,
  average_price numeric,
  p25_price numeric,
  p75_price numeric,
  median_reviews numeric,
  top10_median_reviews numeric,
  seller_count integer,
  top3_seller_share numeric,
  concentration_level text,
  raw_metrics jsonb,
  created_at timestamptz default now()
);

create index if not exists daily_market_metrics_keyword_date_idx
  on public.daily_market_metrics (keyword, date desc);

create table if not exists public.sales_estimates (
  id uuid primary key default gen_random_uuid(),
  nm_id text not null,
  estimate_date date,
  method text,
  estimated_sales_low numeric,
  estimated_sales_mid numeric,
  estimated_sales_high numeric,
  estimated_revenue_low numeric,
  estimated_revenue_high numeric,
  confidence_level text,
  features_json jsonb,
  created_at timestamptz default now()
);

create index if not exists sales_estimates_nm_id_date_idx
  on public.sales_estimates (nm_id, estimate_date desc);
