-- Applied 2026-05-27 to project xvgzpryzqxwcihhptfpw.
-- Hybrid persistence: each shop-scoped table also carries the full app object
-- (data jsonb) keyed by the app's string id (app_id), scoped to the shop
-- (org_id). The app reads/writes `data`; relational columns are normalised
-- feature-by-feature later. NOT NULLs without a default are relaxed so the
-- store can write {org_id, app_id, data} uniformly during the transition.
do $$ declare t text; begin
  foreach t in array array[
    'products','suppliers','locations','purchase_orders','transfers','stocktakes',
    'stock_movements','reservations','returns','bundles','replenishment_rules',
    'inventory_batches','orders','customers','staff_members'
  ] loop
    execute format('alter table public.%I add column if not exists app_id text;', t);
    execute format('alter table public.%I add column if not exists data jsonb;', t);
    execute format('create unique index if not exists %s_org_app_uniq on public.%I (org_id, app_id);', t, t);
  end loop;
end $$;

alter table public.products       alter column name drop not null;
alter table public.suppliers      alter column name drop not null;
alter table public.locations      alter column name drop not null;
alter table public.customers      alter column name drop not null;
alter table public.bundles        alter column name drop not null;
alter table public.staff_members  alter column name drop not null;
alter table public.promotions     alter column name drop not null;
alter table public.orders         alter column order_number drop not null;
alter table public.stock_movements alter column type drop not null;
