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
