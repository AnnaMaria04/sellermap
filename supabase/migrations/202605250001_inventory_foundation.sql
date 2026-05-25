create extension if not exists pgcrypto;

create table if not exists public.seller_inventory_workspaces (
  seller_id text primary key,
  seller_name text not null,
  workspace jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_products (
  id text primary key,
  seller_id text not null references public.seller_inventory_workspaces(seller_id) on delete cascade,
  name text not null,
  sku text not null,
  barcode text,
  accounting_type text not null,
  product_type text not null,
  supplier_id text,
  sale_price numeric(12, 2),
  purchase_price numeric(12, 2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_suppliers (
  id text primary key,
  seller_id text not null references public.seller_inventory_workspaces(seller_id) on delete cascade,
  name text not null,
  lead_time_days integer,
  minimum_order_quantity numeric(12, 2),
  current_purchase_price numeric(12, 2),
  previous_purchase_price numeric(12, 2),
  catalog_connected boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null references public.seller_inventory_workspaces(seller_id) on delete cascade,
  product_id text not null references public.inventory_products(id) on delete cascade,
  variant_id text,
  location_id text,
  physical numeric(12, 2) not null default 0,
  reserved numeric(12, 2) not null default 0,
  damaged numeric(12, 2) not null default 0,
  expired numeric(12, 2) not null default 0,
  in_transit numeric(12, 2) not null default 0,
  warehouse numeric(12, 2) not null default 0,
  showroom numeric(12, 2) not null default 0,
  store numeric(12, 2) not null default 0,
  returns numeric(12, 2) not null default 0,
  marketplace_allocated numeric(12, 2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id text primary key,
  seller_id text not null references public.seller_inventory_workspaces(seller_id) on delete cascade,
  product_id text not null references public.inventory_products(id) on delete cascade,
  movement_type text not null,
  quantity_delta numeric(12, 2) not null,
  before_quantity numeric(12, 2) not null,
  after_quantity numeric(12, 2) not null,
  from_location_id text,
  to_location_id text,
  reason text,
  actor_id text,
  related_document_id text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.inventory_purchase_orders (
  id text primary key,
  seller_id text not null references public.seller_inventory_workspaces(seller_id) on delete cascade,
  supplier_id text not null references public.inventory_suppliers(id) on delete cascade,
  status text not null,
  expected_arrival_date date,
  lines jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_inventory_workspaces enable row level security;
alter table public.inventory_products enable row level security;
alter table public.inventory_suppliers enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_purchase_orders enable row level security;

create policy "demo workspace can be read"
  on public.seller_inventory_workspaces for select
  using (seller_id = 'demo-seller');

create policy "demo workspace can be written"
  on public.seller_inventory_workspaces for insert
  with check (seller_id = 'demo-seller');

create policy "demo workspace can be updated"
  on public.seller_inventory_workspaces for update
  using (seller_id = 'demo-seller')
  with check (seller_id = 'demo-seller');

create policy "demo products are readable"
  on public.inventory_products for select
  using (seller_id = 'demo-seller');

create policy "demo suppliers are readable"
  on public.inventory_suppliers for select
  using (seller_id = 'demo-seller');

create policy "demo snapshots are readable"
  on public.inventory_snapshots for select
  using (seller_id = 'demo-seller');

create policy "demo movements are readable"
  on public.inventory_movements for select
  using (seller_id = 'demo-seller');

create policy "demo purchase orders are readable"
  on public.inventory_purchase_orders for select
  using (seller_id = 'demo-seller');
