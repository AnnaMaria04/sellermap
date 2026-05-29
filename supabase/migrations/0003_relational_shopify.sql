-- ============================================================================
-- SellerMap — relational schema v1 (Shopify-shaped, multi-tenant by shop)
-- ----------------------------------------------------------------------------
-- Supersedes the JSON-blob model (legacy 0001) and the unused 0002 draft.
-- Tenancy: an `organization` (= a Shop) owns all data. Users belong to a shop
-- via `org_members`. RLS scopes every row to the caller's shop(s).
-- Shopify-style inventory: products -> variants -> inventory_levels
-- (one row per variant x location).
-- REVIEW ONLY — not yet applied to any database.
-- ----------------------------------------------------------------------------
-- APPLIED 2026-05-27 to project xvgzpryzqxwcihhptfpw as two migrations:
--   1) drop_legacy_blob_inventory_tables  (dropped the empty JSON-blob tables:
--      products, locations, suppliers, purchase_orders, transfers, stocktakes,
--      reservations, movements, profiles — 0 external FKs, all empty)
--   2) relational_shopify_v1               (the schema below)
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── updated_at helper ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================================
-- Tenancy: organizations (shops) + membership
-- ============================================================================
create table public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Мой магазин',
  business_type text not null default 'retail',   -- retail|hybrid|cafe|small_production
  currency     text not null default 'RUB',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- NOTE: app currently has a single "developer" access mode; staff roles are a
  -- display concern (staff_members table), not an access role here.
  is_owner   boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.org_members (user_id);

-- Membership lookup used by every RLS policy. SECURITY DEFINER avoids recursive
-- RLS evaluation on org_members.
create or replace function public.user_in_org(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = o and m.user_id = auth.uid()
  );
$$;

-- One default org per row's caller, for inserts that omit org_id.
create or replace function public.current_org()
returns uuid language sql stable security definer set search_path = public as $$
  select m.org_id from public.org_members m
  where m.user_id = auth.uid()
  order by m.created_at limit 1;
$$;

-- ── Auto-provision a shop on signup ──────────────────────────────────────────
-- Every new auth user gets a fresh organization + owner membership + profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into public.organizations (name) values ('Мой магазин')
    returning id into new_org;
  insert into public.org_members (org_id, user_id, is_owner)
    values (new_org, new.id, true);
  insert into public.profiles (id, org_id, email)
    values (new.id, new_org, new.email)
    on conflict (id) do update set org_id = excluded.org_id;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Profiles (1:1 with auth user) ─────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid references public.organizations(id) on delete set null,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Catalog: products -> variants ; locations ; inventory_levels
-- ============================================================================
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  type        text not null default 'warehouse',  -- warehouse|store|showroom|backroom|online_reserve|returns|damaged|in_transit
  address     text,
  is_default  boolean not null default false,
  capacity    integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.locations (org_id);

create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  contact_name  text, email text, phone text, website text,
  country       text not null default 'Россия', city text,
  payment_terms text, lead_time_days integer not null default 7, min_order_qty integer,
  currency      text not null default 'RUB',     -- RUB|USD|EUR|CNY
  rating        numeric(2,1) not null default 5.0,
  notes         text, catalog_url text, price_list_url text, telegram_handle text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.suppliers (org_id);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text, image_url text,
  category        text not null default '',
  product_type    text not null default 'product',  -- product|ingredient|bundle|recipe|consumable|packaging
  status          text not null default 'active',   -- active|draft|archived
  sku             text not null default '',
  barcode         text, internal_barcode text,
  has_variants    boolean not null default false,
  -- default price/cost (single-variant products); variants override
  price           numeric(12,2) not null default 0,
  cost_price      numeric(12,2) not null default 0,
  packaging_cost  numeric(12,2), delivery_cost numeric(12,2),
  channel_commission numeric(6,3),
  supplier_id     uuid references public.suppliers(id) on delete set null,
  channels        text[] not null default '{}',
  tags            text[] not null default '{}',
  channel_allocation jsonb not null default '{}'::jsonb,
  requires_labeling boolean not null default false,
  labeling_type   text,                              -- chestny_znak|egais|mercury
  data_matrix_code text, gtin text, batch_number text, expiry_date date,
  weight          numeric(10,3),
  dimensions      jsonb,                             -- {length,width,height}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.products (org_id);
create index on public.products (org_id, sku);

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  name        text not null,
  sku         text not null default '',
  barcode     text,
  price       numeric(12,2) not null default 0,
  cost_price  numeric(12,2) not null default 0,
  weight      numeric(10,3),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.product_variants (product_id);
create index on public.product_variants (org_id);

-- Shopify InventoryLevel: stock for a (variant, location). Products without
-- explicit variants get one implicit "default" variant.
create table public.inventory_levels (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  on_hand     integer not null default 0,   -- physical units present
  reserved    integer not null default 0,   -- committed to orders
  damaged     integer not null default 0,
  in_transit  integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (variant_id, location_id)
);
create index on public.inventory_levels (org_id);
create index on public.inventory_levels (location_id);

-- ============================================================================
-- Procurement: purchase_orders + items
-- ============================================================================
create table public.purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  supplier_id    uuid references public.suppliers(id) on delete set null,
  location_id    uuid references public.locations(id) on delete set null,
  status         text not null default 'draft',   -- draft|sent|confirmed|in_transit|partial|received|closed|cancelled
  currency       text not null default 'RUB',
  total_amount   numeric(14,2) not null default 0,
  payment_status text default 'unpaid',           -- unpaid|partial|paid
  tracking_number text, note text,
  expected_arrival date, received_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.purchase_orders (org_id);

create table public.purchase_order_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  po_id        uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  qty          integer not null default 0,
  received_qty integer not null default 0,
  unit_cost    numeric(12,2) not null default 0,
  note         text
);
create index on public.purchase_order_items (po_id);

-- ============================================================================
-- Transfers between locations + items
-- ============================================================================
create table public.transfers (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  from_location_id uuid references public.locations(id) on delete set null,
  to_location_id   uuid references public.locations(id) on delete set null,
  status           text not null default 'draft',  -- draft|in_transit|received|partial
  note             text, expected_arrival date, received_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.transfers (org_id);

create table public.transfer_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  transfer_id  uuid not null references public.transfers(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  qty          integer not null default 0,
  received_qty integer not null default 0
);
create index on public.transfer_items (transfer_id);

-- ============================================================================
-- Stocktakes + items
-- ============================================================================
create table public.stocktakes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  location_id  uuid references public.locations(id) on delete set null,
  status       text not null default 'draft',   -- draft|in_progress|completed|cancelled
  approved_by  text, note text, completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.stocktakes (org_id);

create table public.stocktake_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  stocktake_id uuid not null references public.stocktakes(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  system_qty   integer not null default 0,
  counted_qty  integer,
  reason       text, photo text
);
create index on public.stocktake_items (stocktake_id);

-- ============================================================================
-- Stock movement ledger (append-only)
-- ============================================================================
create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  type           text not null,                 -- receipt|sale|transfer|adjustment|writeoff|return|stocktake...
  variant_id     uuid references public.product_variants(id) on delete set null,
  location_id    uuid references public.locations(id) on delete set null,
  qty_before     integer not null default 0,
  qty_after      integer not null default 0,
  qty_delta      integer not null default 0,
  user_id        uuid references auth.users(id) on delete set null,
  user_name      text,
  reason         text, note text,
  reference_id   uuid, reference_type text,     -- purchase_order|transfer|stocktake|sale|return
  created_at     timestamptz not null default now()
);
create index on public.stock_movements (org_id, created_at desc);

-- ============================================================================
-- Reservations
-- ============================================================================
create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  location_id  uuid references public.locations(id) on delete set null,
  qty          integer not null default 0,
  source       text not null default 'manual',  -- manual|wildberries|ozon|yandex_market|website|pos
  status       text not null default 'active',  -- active|fulfilled|cancelled|expired
  order_ref    text, customer_name text, note text,
  expires_at   timestamptz, fulfilled_at timestamptz,
  created_at   timestamptz not null default now()
);
create index on public.reservations (org_id);

-- ============================================================================
-- Customers
-- ============================================================================
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  phone         text, email text, city text,
  tier          text not null default 'new',   -- new|regular|vip|wholesale
  loyalty_points integer not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.customers (org_id);

-- ============================================================================
-- Sales orders (marketplace + POS) + line items
-- ============================================================================
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  order_number     text not null,
  channel          text not null default 'pos', -- wildberries|ozon|yandex_market|website|pos|telegram
  fulfillment_model text,                        -- FBO|FBS|DBS|self
  status           text not null default 'new',
  customer_id      uuid references public.customers(id) on delete set null,
  location_id      uuid references public.locations(id) on delete set null,
  region           text,
  revenue          numeric(14,2) not null default 0,
  cost             numeric(14,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.orders (org_id, created_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  qty         integer not null default 1,
  unit_price  numeric(12,2) not null default 0,
  unit_cost   numeric(12,2) not null default 0
);
create index on public.order_items (order_id);

-- ============================================================================
-- Returns + items
-- ============================================================================
create table public.returns (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete set null,
  customer_id  uuid references public.customers(id) on delete set null,
  channel      text, reason text,
  status       text not null default 'pending', -- pending|inspected|restocked|written_off|refunded
  amount       numeric(14,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.returns (org_id);

create table public.return_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  return_id   uuid not null references public.returns(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  qty         integer not null default 1,
  condition   text not null default 'new',      -- new|good|damaged|unsellable
  action      text not null default 'restock'   -- restock|write_off|quarantine
);
create index on public.return_items (return_id);

-- ============================================================================
-- Bundles (kits) — components reference variants
-- ============================================================================
create table public.bundles (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table public.bundle_components (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  bundle_id   uuid not null references public.bundles(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  qty         integer not null default 1
);
create index on public.bundle_components (bundle_id);

-- ============================================================================
-- Replenishment rules ; inventory batches (expiry tracking)
-- ============================================================================
create table public.replenishment_rules (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  variant_id    uuid references public.product_variants(id) on delete cascade,
  location_id   uuid references public.locations(id) on delete set null,
  trigger_type  text not null default 'min_stock', -- min_stock|days_of_stock|reorder_point
  threshold     integer not null default 0,
  reorder_qty   integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.replenishment_rules (org_id);

create table public.inventory_batches (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete cascade,
  location_id  uuid references public.locations(id) on delete set null,
  batch_number text, qty integer not null default 0,
  status       text not null default 'ok',        -- ok|expiring_soon|expired|quarantine
  expiry_date  date, received_at timestamptz,
  created_at   timestamptz not null default now()
);
create index on public.inventory_batches (org_id);

-- ============================================================================
-- Staff (directory; display roles only — not access control)
-- ============================================================================
create table public.staff_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null, email text, phone text,
  role        text not null default 'viewer',   -- owner|admin|manager|warehouse|cashier|viewer (display)
  status      text not null default 'active',   -- active|invited|suspended
  location_access uuid[] not null default '{}',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.staff_members (org_id);

-- ============================================================================
-- Promotions
-- ============================================================================
create table public.promotions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  type          text not null default 'percentage', -- percentage|fixed|bogo|bundle_price|free_shipping
  status        text not null default 'draft',      -- draft|active|scheduled|expired|paused
  channels      text[] not null default '{}',
  value         numeric(12,2) not null default 0,
  promo_code    text,
  usage_count   integer not null default 0,
  usage_limit   integer,
  starts_at     timestamptz, ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.promotions (org_id);

-- ============================================================================
-- Finance: expenses + categories ; tax settings (per shop)
-- ============================================================================
create table public.expense_categories (
  id     uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name   text not null
);
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  category_id  uuid references public.expense_categories(id) on delete set null,
  title        text not null,
  amount       numeric(14,2) not null default 0,
  incurred_on  date not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);
create index on public.expenses (org_id, incurred_on desc);

create table public.org_settings (
  org_id            uuid primary key references public.organizations(id) on delete cascade,
  tax_regime        text default 'usn_income',  -- usn_income|usn_profit|psn|npd|osno
  tax_rate          numeric(5,2),
  manager_pin_hash  text,
  discount_pin_threshold numeric(5,2),
  receipt_print_default boolean default true,
  updated_at        timestamptz not null default now()
);

-- ============================================================================
-- Saved WB analyses / reports (org-scoped)
-- ============================================================================
create table public.saved_reports (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete set null,
  title        text not null,
  inputs       jsonb, outputs jsonb,
  score        integer, verdict text,
  created_at   timestamptz not null default now()
);
create index on public.saved_reports (org_id, created_at desc);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','locations','suppliers','products','product_variants',
    'inventory_levels','purchase_orders','transfers','stocktakes','customers',
    'orders','returns','bundles','replenishment_rules','staff_members',
    'promotions','org_settings'
  ] loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- Row Level Security: every shop-scoped table is gated on org membership
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','org_members','profiles','locations','suppliers','products',
    'product_variants','inventory_levels','purchase_orders','purchase_order_items',
    'transfers','transfer_items','stocktakes','stocktake_items','stock_movements',
    'reservations','customers','orders','order_items','returns','return_items',
    'bundles','bundle_components','replenishment_rules','inventory_batches',
    'staff_members','promotions','expense_categories','expenses','org_settings',
    'saved_reports'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- organizations: members can see/update their shop
create policy org_select on public.organizations for select using (public.user_in_org(id));
create policy org_update on public.organizations for update using (public.user_in_org(id));

-- org_members: a user sees their own membership rows
create policy member_select on public.org_members for select using (user_id = auth.uid());

-- profiles: a user sees their own profile (or same-org profiles)
create policy profile_self on public.profiles for select using (id = auth.uid() or public.user_in_org(org_id));
create policy profile_upsert on public.profiles for insert with check (id = auth.uid());
create policy profile_update on public.profiles for update using (id = auth.uid());

-- All shop-scoped tables: full CRUD for members of the row's org.
do $$
declare t text;
begin
  foreach t in array array[
    'locations','suppliers','products','product_variants','inventory_levels',
    'purchase_orders','purchase_order_items','transfers','transfer_items',
    'stocktakes','stocktake_items','stock_movements','reservations','customers',
    'orders','order_items','returns','return_items','bundles','bundle_components',
    'replenishment_rules','inventory_batches','staff_members','promotions',
    'expense_categories','expenses','org_settings','saved_reports'
  ] loop
    execute format($f$
      create policy %1$s_rw on public.%1$I
        using (public.user_in_org(org_id))
        with check (public.user_in_org(org_id));
    $f$, t);
  end loop;
end $$;
