-- Fix: the AFTER mirror triggers updated their own parent row to resolve FK
-- columns / totals, which re-fired the AFTER trigger -> infinite recursion
-- (stack depth exceeded). Split responsibilities:
--   * BEFORE trigger resolves parent columns and computes totals from the
--     jsonb directly onto NEW (no write -> no recursion).
--   * AFTER trigger only rebuilds the child rows.

-- ORDERS ---------------------------------------------------------------------
create or replace function public.tg_orders_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.cost := coalesce((
    select sum(
      coalesce(nullif(it->>'qty','')::numeric,1) *
      coalesce(
        nullif((select cost_price from public.product_variants
                where id = public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku')),0),
        nullif(it->>'unitCost','')::numeric, 0)
    )
    from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  ), new.cost, 0);
  return new;
end;
$$;

create or replace function public.tg_orders_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.order_items where order_id = new.id;
  insert into public.order_items (id, org_id, order_id, variant_id, qty, unit_price, unit_cost)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty','')::numeric,1)::int,
    coalesce(nullif(it->>'unitPrice','')::numeric,0),
    coalesce(
      nullif((select cost_price from public.product_variants
              where id = public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku')),0),
      nullif(it->>'unitCost','')::numeric, 0)
  from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;
  return null;
end;
$$;

drop trigger if exists trg_orders_resolve on public.orders;
create trigger trg_orders_resolve before insert or update on public.orders
  for each row when (new.data is not null) execute function public.tg_orders_resolve();
-- (trg_orders_mirror_items AFTER trigger from ...121000 stays in place)

-- TRANSFERS ------------------------------------------------------------------
create or replace function public.tg_transfers_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.from_location_id := coalesce(new.from_location_id, public.app_resolve_location(new.org_id, new.data->>'fromLocationId'));
  new.to_location_id   := coalesce(new.to_location_id, public.app_resolve_location(new.org_id, new.data->>'toLocationId'));
  return new;
end;
$$;

create or replace function public.tg_transfers_mirror()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.transfer_items where transfer_id = new.id;
  insert into public.transfer_items (id, org_id, transfer_id, variant_id, qty, received_qty)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty','')::numeric,0)::int,
    coalesce(nullif(it->>'receivedQty','')::numeric,0)::int
  from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;
  return null;
end;
$$;

drop trigger if exists trg_transfers_resolve on public.transfers;
create trigger trg_transfers_resolve before insert or update on public.transfers
  for each row when (new.data is not null) execute function public.tg_transfers_resolve();

-- PURCHASE ORDERS ------------------------------------------------------------
create or replace function public.tg_po_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.supplier_id := coalesce(new.supplier_id,
    (select id from public.suppliers s where s.org_id = new.org_id and s.name = new.data->>'supplierName' limit 1));
  new.location_id := coalesce(new.location_id, public.app_resolve_location(new.org_id, new.data->>'locationId'));
  new.total_amount := coalesce((
    select sum(coalesce(nullif(it->>'qty','')::numeric,0) * coalesce(nullif(it->>'unitCost','')::numeric,0))
    from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  ), new.total_amount, 0);
  return new;
end;
$$;

create or replace function public.tg_po_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.purchase_order_items where po_id = new.id;
  insert into public.purchase_order_items (id, org_id, po_id, variant_id, qty, received_qty, unit_cost, note)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty','')::numeric,0)::int,
    coalesce(nullif(it->>'receivedQty','')::numeric,0)::int,
    coalesce(nullif(it->>'unitCost','')::numeric,0),
    nullif(it->>'note','')
  from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it;
  return null;
end;
$$;

drop trigger if exists trg_po_resolve on public.purchase_orders;
create trigger trg_po_resolve before insert or update on public.purchase_orders
  for each row when (new.data is not null) execute function public.tg_po_resolve();

-- STOCKTAKES -----------------------------------------------------------------
create or replace function public.tg_stocktakes_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.location_id := coalesce(new.location_id, public.app_resolve_location(new.org_id, new.data->>'locationId'));
  return new;
end;
$$;

create or replace function public.tg_stocktakes_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.stocktake_items where stocktake_id = new.id;
  insert into public.stocktake_items (id, org_id, stocktake_id, variant_id, system_qty, counted_qty, reason, photo)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'systemQty','')::numeric,0)::int,
    nullif(it->>'countedQty','')::numeric::int,
    nullif(it->>'reason',''),
    nullif(it->>'photo','')
  from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;
  return null;
end;
$$;

drop trigger if exists trg_stocktakes_resolve on public.stocktakes;
create trigger trg_stocktakes_resolve before insert or update on public.stocktakes
  for each row when (new.data is not null) execute function public.tg_stocktakes_resolve();

revoke execute on function public.tg_orders_resolve() from public, anon, authenticated;
revoke execute on function public.tg_transfers_resolve() from public, anon, authenticated;
revoke execute on function public.tg_po_resolve() from public, anon, authenticated;
revoke execute on function public.tg_stocktakes_resolve() from public, anon, authenticated;
