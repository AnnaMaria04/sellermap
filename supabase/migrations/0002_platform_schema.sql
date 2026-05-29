-- 0002_platform_schema.sql
-- SellerMap full relational platform schema.
--
-- Multi-tenant (organization-scoped) inventory, POS, procurement, finance and
-- notification platform. Every table carries an org_id (except `organizations`
-- itself, which IS the tenant) and is protected by Row Level Security using the
-- caller's JWT `org_id` claim.
--
-- Idempotent — safe to re-run (CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS
-- before each CREATE POLICY).
--
-- Does NOT touch 0001_init.sql tables. Note: this file redefines `products`,
-- `suppliers`, `locations`, `purchase_orders`, `transfers`, `stocktakes`,
-- `orders`, `customers` and `saved_reports` with a richer relational shape. On a
-- fresh database run 0002 standalone; if 0001's simple shapes already exist,
-- drop them first (out of scope for this idempotent migration).

------------------------------------------------------------------------------
-- 1. organizations  (the tenant root — no org_id column)
------------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text,
  legal_name  text,
  inn         varchar(12),
  ogrn        text,
  address     text,
  logo_url    text,
  timezone    text        default 'Europe/Moscow',
  currency    text        default 'RUB',
  plan        text        default 'free',
  created_at  timestamptz default now()
);

------------------------------------------------------------------------------
-- 2. locations
------------------------------------------------------------------------------
create table if not exists public.locations (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null,
  name        text,
  type        text,
  address     text,
  is_active   boolean     default true,
  is_default  boolean     default false,
  created_at  timestamptz default now()
);

------------------------------------------------------------------------------
-- 3. user_profiles
------------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        unique references auth.users on delete cascade,
  org_id        uuid,
  role          text,
  full_name     text,
  phone         text,
  pin_hash      text,
  is_active     boolean     default true,
  last_login_at timestamptz
);

------------------------------------------------------------------------------
-- 4. staff_invites
------------------------------------------------------------------------------
create table if not exists public.staff_invites (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid,
  email       text,
  role        text,
  token       uuid        default gen_random_uuid(),
  invited_by  uuid,
  expires_at  timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz
);

------------------------------------------------------------------------------
-- 5. product_categories
------------------------------------------------------------------------------
create table if not exists public.product_categories (
  id         uuid    primary key default gen_random_uuid(),
  org_id     uuid,
  name       text,
  parent_id  uuid,
  is_active  boolean default true
);

------------------------------------------------------------------------------
-- 6. products
------------------------------------------------------------------------------
create table if not exists public.products (
  id                      uuid        primary key default gen_random_uuid(),
  org_id                  uuid,
  name                    text,
  sku                     text,
  barcode                 text,
  type                    text,
  category_id             uuid,
  description             text,
  images                  jsonb       default '[]',
  is_active               boolean     default true,
  is_archived             boolean     default false,
  tags                    text[]      default '{}',
  chestny_znak_required   boolean     default false,
  chestny_znak_gtin       text,
  created_by              uuid,
  updated_at              timestamptz default now()
);

------------------------------------------------------------------------------
-- 7. product_variants
------------------------------------------------------------------------------
create table if not exists public.product_variants (
  id              uuid    primary key default gen_random_uuid(),
  product_id      uuid,
  org_id          uuid,
  name            text,
  sku             text,
  barcode         text,
  attributes      jsonb   default '{}',
  price_sell      numeric not null,
  price_buy       numeric default 0,
  price_packaging numeric default 0,
  weight_g        int,
  is_active       boolean default true
);

------------------------------------------------------------------------------
-- 8. product_components
------------------------------------------------------------------------------
create table if not exists public.product_components (
  id                   uuid    primary key default gen_random_uuid(),
  parent_product_id    uuid,
  component_variant_id uuid,
  org_id               uuid,
  quantity_required    numeric
);

------------------------------------------------------------------------------
-- 9. stock_levels
------------------------------------------------------------------------------
create table if not exists public.stock_levels (
  id                    uuid    primary key default gen_random_uuid(),
  variant_id            uuid,
  location_id           uuid,
  org_id                uuid,
  quantity_on_hand      numeric default 0,
  quantity_reserved     numeric default 0,
  quantity_defective    numeric default 0,
  quantity_in_transit   numeric default 0,
  reorder_point         numeric default 0,
  reorder_quantity      numeric default 0,
  unique (variant_id, location_id)
);

------------------------------------------------------------------------------
-- 10. stock_movements
------------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id             uuid        primary key default gen_random_uuid(),
  org_id         uuid,
  variant_id     uuid,
  location_id    uuid,
  type           text,
  quantity       numeric,
  reference_type text,
  reference_id   uuid,
  note           text,
  performed_by   uuid,
  created_at     timestamptz default now()
);

------------------------------------------------------------------------------
-- 11. suppliers
------------------------------------------------------------------------------
create table if not exists public.suppliers (
  id               uuid    primary key default gen_random_uuid(),
  org_id           uuid,
  name             text,
  country          text,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  lead_time_days   int     default 14,
  min_order_qty    numeric,
  min_order_amount numeric,
  payment_terms    text,
  notes            text,
  is_active        boolean default true
);

------------------------------------------------------------------------------
-- 12. purchase_orders
------------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id             uuid        primary key default gen_random_uuid(),
  org_id         uuid,
  number         text,
  supplier_id    uuid,
  location_id    uuid,
  status         text,
  expected_at    timestamptz,
  shipped_at     timestamptz,
  received_at    timestamptz,
  total_amount   numeric     default 0,
  amount_paid    numeric     default 0,
  payment_status text,
  notes          text,
  created_by     uuid,
  updated_at     timestamptz default now()
);

------------------------------------------------------------------------------
-- 13. purchase_order_items
------------------------------------------------------------------------------
create table if not exists public.purchase_order_items (
  id                 uuid    primary key default gen_random_uuid(),
  purchase_order_id  uuid,
  variant_id         uuid,
  org_id             uuid,
  quantity_ordered   int,
  quantity_received  int     default 0,
  price_unit         numeric,
  total              numeric generated always as (quantity_ordered * price_unit) stored
);

------------------------------------------------------------------------------
-- 14. purchase_order_payments
------------------------------------------------------------------------------
create table if not exists public.purchase_order_payments (
  id                uuid        primary key default gen_random_uuid(),
  purchase_order_id uuid,
  org_id            uuid,
  amount            numeric,
  paid_at           timestamptz,
  method            text,
  note              text,
  recorded_by       uuid
);

------------------------------------------------------------------------------
-- 15. transfers
------------------------------------------------------------------------------
create table if not exists public.transfers (
  id               uuid        primary key default gen_random_uuid(),
  org_id           uuid,
  number           text,
  from_location_id uuid,
  to_location_id   uuid,
  status           text,
  expected_at      timestamptz,
  dispatched_at    timestamptz,
  received_at      timestamptz,
  notes            text,
  created_by       uuid
);

------------------------------------------------------------------------------
-- 16. transfer_items
------------------------------------------------------------------------------
create table if not exists public.transfer_items (
  id                 uuid    primary key default gen_random_uuid(),
  transfer_id        uuid,
  variant_id         uuid,
  org_id             uuid,
  quantity_requested int,
  quantity_sent      int     default 0,
  quantity_received  int     default 0
);

------------------------------------------------------------------------------
-- 17. stocktakes
------------------------------------------------------------------------------
create table if not exists public.stocktakes (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid,
  location_id  uuid,
  status       text,
  started_at   timestamptz,
  completed_at timestamptz,
  approved_at  timestamptz,
  assigned_to  uuid,
  approved_by  uuid,
  notes        text
);

------------------------------------------------------------------------------
-- 18. stocktake_items
------------------------------------------------------------------------------
create table if not exists public.stocktake_items (
  id                uuid    primary key default gen_random_uuid(),
  stocktake_id      uuid,
  variant_id        uuid,
  org_id            uuid,
  quantity_expected numeric,
  quantity_counted  numeric,
  discrepancy       numeric generated always as (quantity_counted - quantity_expected) stored
);

------------------------------------------------------------------------------
-- 19. orders
------------------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid,
  number          text,
  channel         text,
  status          text,
  location_id     uuid,
  customer_id     uuid,
  session_id      uuid,
  total_amount    numeric,
  discount_amount numeric     default 0,
  payment_status  text,
  payment_method  text,
  external_id     text,
  external_status text,
  fulfilled_at    timestamptz,
  cancelled_at    timestamptz,
  notes           text,
  created_by      uuid
);

------------------------------------------------------------------------------
-- 20. order_items
------------------------------------------------------------------------------
create table if not exists public.order_items (
  id          uuid    primary key default gen_random_uuid(),
  order_id    uuid,
  variant_id  uuid,
  org_id      uuid,
  quantity    int,
  price_unit  numeric,
  discount    numeric default 0,
  total       numeric
);

------------------------------------------------------------------------------
-- 21. customers
------------------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid    primary key default gen_random_uuid(),
  org_id         uuid,
  name           text,
  phone          text,
  email          text,
  birthday       date,
  loyalty_points int     default 0,
  total_orders   int     default 0,
  total_spent    numeric default 0,
  notes          text,
  tags           text[]  default '{}',
  is_active      boolean default true,
  unique (org_id, phone)
);

------------------------------------------------------------------------------
-- 22. pos_sessions
------------------------------------------------------------------------------
create table if not exists public.pos_sessions (
  id                 uuid        primary key default gen_random_uuid(),
  org_id             uuid,
  location_id        uuid,
  opened_by          uuid,
  closed_by          uuid,
  opened_at          timestamptz,
  closed_at          timestamptz,
  opening_cash       numeric,
  closing_cash       numeric,
  expected_cash      numeric,
  cash_discrepancy   numeric,
  status             text,
  total_sales        numeric     default 0,
  total_transactions int         default 0
);

------------------------------------------------------------------------------
-- 23. pos_receipts
------------------------------------------------------------------------------
create table if not exists public.pos_receipts (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid,
  session_id  uuid,
  order_id    uuid,
  number      text,
  printed_at  timestamptz,
  voided_at   timestamptz,
  void_reason text
);

------------------------------------------------------------------------------
-- 24. channels
------------------------------------------------------------------------------
create table if not exists public.channels (
  id                    uuid        primary key default gen_random_uuid(),
  org_id                uuid,
  type                  text,
  name                  text,
  is_active             boolean     default false,
  api_key_hash          text,
  api_key_last_four     text,
  credentials_encrypted jsonb,
  last_sync_at          timestamptz,
  sync_status           text        default 'disconnected',
  sync_error            text
);

------------------------------------------------------------------------------
-- 25. sync_log
------------------------------------------------------------------------------
create table if not exists public.sync_log (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid,
  channel_type    text,
  status          text,
  orders_received int,
  stock_pushed    int,
  duration_ms     int,
  error_message   text,
  created_at      timestamptz default now()
);

------------------------------------------------------------------------------
-- 26. tax_settings
------------------------------------------------------------------------------
create table if not exists public.tax_settings (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        unique,
  regime        text,
  usn_rate      numeric     default 6,
  has_employees boolean     default false,
  region_code   text,
  patent_pvgd   numeric,
  patent_months int         default 12,
  vat_payer     boolean     default false,
  updated_at    timestamptz default now()
);

------------------------------------------------------------------------------
-- 27. insurance_contributions
------------------------------------------------------------------------------
create table if not exists public.insurance_contributions (
  id                   uuid    primary key default gen_random_uuid(),
  org_id               uuid,
  year                 int,
  fixed_amount         numeric,
  additional_rate      numeric default 0.01,
  additional_threshold numeric default 300000,
  paid_fixed           numeric default 0,
  paid_additional      numeric default 0,
  deadline_fixed       date,
  deadline_additional  date,
  unique (org_id, year)
);

------------------------------------------------------------------------------
-- 28. expense_categories  (created before expenses, which references it)
------------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id             uuid    primary key default gen_random_uuid(),
  org_id         uuid,
  name           text,
  deductible_for text[],
  is_system      boolean default false,
  is_active      boolean default true
);

------------------------------------------------------------------------------
-- 29. expenses
------------------------------------------------------------------------------
create table if not exists public.expenses (
  id                   uuid    primary key default gen_random_uuid(),
  org_id               uuid,
  category_id          uuid,
  date                 date,
  amount               numeric,
  description          text,
  vendor               text,
  location_id          uuid,
  is_personal_purchase boolean default false,
  exclude_from_tax     boolean default false,
  tax_deductible       boolean,
  has_document         boolean default false,
  document_url         text,
  document_number      text,
  created_by           uuid
);

------------------------------------------------------------------------------
-- 30. notifications
------------------------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  org_id         uuid,
  user_id        uuid,
  type           text,
  title          text,
  body           text,
  reference_type text,
  reference_id   uuid,
  is_read        boolean     default false,
  read_at        timestamptz,
  created_at     timestamptz default now()
);

------------------------------------------------------------------------------
-- 31. notification_rules
------------------------------------------------------------------------------
create table if not exists public.notification_rules (
  id                uuid    primary key default gen_random_uuid(),
  org_id            uuid,
  type              text,
  is_enabled        boolean default true,
  threshold_value   numeric,
  delivery_in_app   boolean default true,
  delivery_telegram boolean default false
);

------------------------------------------------------------------------------
-- 32. saved_reports  (org-scoped platform variant)
------------------------------------------------------------------------------
create table if not exists public.saved_reports (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid,
  user_id      uuid,
  product_name text,
  category     text,
  inputs       jsonb,
  outputs      jsonb,
  verdict      text,
  score        int,
  created_at   timestamptz default now()
);

------------------------------------------------------------------------------
-- 33. org_settings
------------------------------------------------------------------------------
create table if not exists public.org_settings (
  id                     uuid        primary key default gen_random_uuid(),
  org_id                 uuid        unique,
  pos_discount_threshold numeric     default 10,
  pos_loyalty_rate       numeric     default 1,
  pos_receipt_header     text,
  pos_receipt_footer     text,
  pos_enable_sbp         boolean     default true,
  pos_enable_card        boolean     default true,
  manager_pin_hash       text,
  telegram_webhook_url   text,
  updated_at             timestamptz default now()
);

------------------------------------------------------------------------------
-- org_sequences  (helper for next_org_sequence)
------------------------------------------------------------------------------
create table if not exists public.org_sequences (
  org_id        uuid,
  prefix        text,
  current_value int,
  primary key (org_id, prefix)
);

------------------------------------------------------------------------------
-- next_org_sequence(p_org_id, p_prefix) -> 'PO-001'
-- Atomically increments a per-(org, prefix) counter and returns the formatted
-- document number.
------------------------------------------------------------------------------
create or replace function public.next_org_sequence(p_org_id uuid, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_value int;
begin
  insert into public.org_sequences (org_id, prefix, current_value)
  values (p_org_id, p_prefix, 1)
  on conflict (org_id, prefix)
  do update set current_value = public.org_sequences.current_value + 1
  returning current_value into v_value;

  return p_prefix || '-' || lpad(v_value::text, 3, '0');
end;
$$;

------------------------------------------------------------------------------
-- Row Level Security: enable on every table and apply org-isolation policies.
------------------------------------------------------------------------------

-- Uniform org_id-scoped tables.
do $$
declare
  t text;
  org_tables text[] := array[
    'locations',
    'staff_invites',
    'product_categories',
    'products',
    'product_variants',
    'product_components',
    'stock_levels',
    'stock_movements',
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'purchase_order_payments',
    'transfers',
    'transfer_items',
    'stocktakes',
    'stocktake_items',
    'orders',
    'order_items',
    'customers',
    'pos_sessions',
    'pos_receipts',
    'channels',
    'sync_log',
    'tax_settings',
    'insurance_contributions',
    'expense_categories',
    'expenses',
    'notifications',
    'notification_rules',
    'saved_reports',
    'org_settings',
    'org_sequences'
  ];
begin
  foreach t in array org_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "org_isolation" on public.%I;', t);
    execute format($p$
      create policy "org_isolation" on public.%I
        using (org_id = (auth.jwt() ->> 'org_id')::uuid);
    $p$, t);
  end loop;
end $$;

-- organizations: tenant root, matched by id.
alter table public.organizations enable row level security;
drop policy if exists "org_isolation" on public.organizations;
create policy "org_isolation" on public.organizations
  using (id = (auth.jwt() ->> 'org_id')::uuid);

-- user_profiles: self OR same-org visibility.
alter table public.user_profiles enable row level security;
drop policy if exists "org_isolation" on public.user_profiles;
create policy "org_isolation" on public.user_profiles
  using (user_id = auth.uid() or org_id = (auth.jwt() ->> 'org_id')::uuid);
