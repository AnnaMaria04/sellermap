-- 0001_init.sql
-- SellerMap initial schema: 15 inventory tables, saved_reports, profiles,
-- integrations + Row Level Security. Idempotent — safe to re-run.

------------------------------------------------------------------------------
-- 15 inventory tables: uniform { id, owner_id, data } shape.
-- PRIMARY KEY (owner_id, id) matches the upsert onConflict "owner_id,id".
------------------------------------------------------------------------------
do $$
declare
  t text;
  inventory_tables text[] := array[
    'products',
    'suppliers',
    'locations',
    'purchase_orders',
    'transfers',
    'stocktakes',
    'movements',
    'reservations',
    'returns',
    'bundles',
    'replenishment_rules',
    'batches',
    'orders',
    'customers',
    'staff'
  ];
begin
  foreach t in array inventory_tables loop
    execute format($f$
      create table if not exists public.%I (
        id          text        not null,
        owner_id    uuid        not null references auth.users on delete cascade,
        data        jsonb       not null,
        updated_at  timestamptz not null default now(),
        primary key (owner_id, id)
      );
    $f$, t);

    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists owner_all on public.%I;', t);
    execute format($p$
      create policy owner_all on public.%I
        for all
        using (auth.uid() = owner_id)
        with check (auth.uid() = owner_id);
    $p$, t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- saved_reports
------------------------------------------------------------------------------
create table if not exists public.saved_reports (
  id              text        primary key,
  owner_id        uuid        references auth.users on delete cascade,
  created_at      timestamptz default now(),
  product_name    text,
  sell_price      numeric,
  buy_price       numeric,
  profit_per_unit numeric,
  margin_pct      numeric,
  input_data      jsonb
);

alter table public.saved_reports enable row level security;

drop policy if exists owner_all on public.saved_reports;
create policy owner_all on public.saved_reports
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

------------------------------------------------------------------------------
-- profiles (matched by id = auth.uid(), not owner_id).
-- Columns mirror useSellerProfile.ts: full_name, company, business_type,
-- channels (text[]), onboarding_complete, updated_at.
------------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid        primary key references auth.users on delete cascade,
  full_name            text,
  company              text,
  business_type        text,
  channels             text[],
  onboarding_complete  boolean     default false,
  updated_at           timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists owner_all on public.profiles;
create policy owner_all on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

------------------------------------------------------------------------------
-- integrations.
-- Columns mirror integrations-store.ts; PK (owner_id, id) matches
-- the upsert onConflict "owner_id,id".
------------------------------------------------------------------------------
create table if not exists public.integrations (
  id            text        not null,
  owner_id      uuid        not null references auth.users on delete cascade,
  kind          text,
  status        text,
  credentials   jsonb,
  last_sync_at  timestamptz,
  created_at    timestamptz default now(),
  primary key (owner_id, id)
);

alter table public.integrations enable row level security;

drop policy if exists owner_all on public.integrations;
create policy owner_all on public.integrations
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
