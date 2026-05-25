-- SellerMap initial schema
-- Run this in Supabase → SQL Editor. Safe to re-run (idempotent where practical).

-- ─────────────────────────────────────────────────────────────────────────
-- Profiles: one row per authenticated seller. id == auth.users.id
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  company     text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Core tables. Nested/flexible structures live in JSONB to mirror the TS shapes.
-- Every table carries owner_id for tenant isolation via RLS.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.suppliers (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.products (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.purchase_orders (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.transfers (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.stocktakes (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.reservations (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.movements (
  id          text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  primary key (owner_id, id)
);

-- Channel integrations (WB/Ozon/etc). Credentials encrypted at rest by Postgres;
-- only ever read server-side via the service role for sync jobs.
create table if not exists public.integrations (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  kind         text not null,
  status       text not null default 'disconnected',
  credentials  jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (owner_id, kind)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security: each seller can touch only their own rows.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.locations       enable row level security;
alter table public.suppliers       enable row level security;
alter table public.products        enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.transfers       enable row level security;
alter table public.stocktakes      enable row level security;
alter table public.reservations    enable row level security;
alter table public.movements       enable row level security;
alter table public.integrations    enable row level security;

-- profiles: a user sees/edits only their own profile
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Generic owner_id policies for the rest.
do $$
declare t text;
begin
  foreach t in array array[
    'locations','suppliers','products','purchase_orders',
    'transfers','stocktakes','reservations','movements','integrations'
  ] loop
    execute format('drop policy if exists "owner rows" on public.%I', t);
    execute format(
      'create policy "owner rows" on public.%I for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id)',
      t
    );
  end loop;
end $$;
