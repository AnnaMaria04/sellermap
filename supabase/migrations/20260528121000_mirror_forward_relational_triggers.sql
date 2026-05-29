-- Mirror going forward: keep the relational child tables in sync with the
-- hybrid `data` jsonb that the app writes via saveWorkspace(). This closes the
-- "table but no writes" gaps (C7 product_variants, C11 transfer_items,
-- B4 order_items) and makes the B5 inventory_levels projection live for the
-- running app, which inserts stock_movements with only the data column.
--
-- All resolvers/triggers are SECURITY DEFINER so they can maintain child rows
-- under RLS; org scoping is always taken from the parent row.

-- Resolve an app-level product id (or sku) to its default variant uuid,
-- creating the default variant on demand so ordering between collection syncs
-- never drops a child row.
create or replace function public.app_resolve_variant(
  p_org uuid, p_app_product_id text, p_sku text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_product uuid;
  v_variant uuid;
begin
  if p_org is null then return null; end if;

  select p.id into v_product
  from public.products p
  where p.org_id = p_org
    and (p.data->>'id' = p_app_product_id or (p_sku is not null and p.data->>'sku' = p_sku))
  limit 1;

  if v_product is null then return null; end if;

  select v.id into v_variant
  from public.product_variants v
  where v.product_id = v_product
  order by v.created_at, v.id
  limit 1;

  if v_variant is null then
    insert into public.product_variants
      (id, org_id, product_id, name, sku, barcode, price, cost_price, created_at, updated_at)
    select
      gen_random_uuid(), p.org_id, p.id,
      coalesce(nullif(p.name, ''), p.data->>'name', 'Default'),
      coalesce(nullif(p.sku, ''), nullif(p.data->>'sku', ''), 'SKU-' || left(replace(p.id::text, '-', ''), 10)),
      coalesce(nullif(p.barcode, ''), nullif(p.data->>'barcode', '')),
      coalesce(nullif(p.price, 0), nullif((p.data->>'price')::numeric, 0), 0),
      coalesce(nullif(p.cost_price, 0), nullif((p.data->>'costPrice')::numeric, 0), 0),
      now(), now()
    from public.products p where p.id = v_product
    returning id into v_variant;
  end if;

  return v_variant;
end;
$$;

create or replace function public.app_resolve_location(p_org uuid, p_app_location_id text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.locations
  where org_id = p_org and app_id = p_app_location_id
  limit 1;
$$;

-- C7: every product keeps a default variant (and its price/cost in sync).
create or replace function public.tg_products_mirror_variant()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_variant uuid;
begin
  v_variant := public.app_resolve_variant(new.org_id, new.data->>'id', new.data->>'sku');
  if v_variant is not null then
    update public.product_variants v
    set price = coalesce(nullif((new.data->>'price')::numeric, 0), v.price),
        cost_price = coalesce(nullif((new.data->>'costPrice')::numeric, 0), v.cost_price),
        updated_at = now()
    where v.id = v_variant;
  end if;
  return null;
end;
$$;

-- B4: rebuild order_items from data.items[] and recompute the order cost.
create or replace function public.tg_orders_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cost numeric := 0;
begin
  delete from public.order_items where order_id = new.id;

  insert into public.order_items (id, org_id, order_id, variant_id, qty, unit_price, unit_cost)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty', '')::numeric, 1)::int,
    coalesce(nullif(it->>'unitPrice', '')::numeric, 0),
    coalesce(
      nullif((select cost_price from public.product_variants
              where id = public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku')), 0),
      nullif(it->>'unitCost', '')::numeric, 0)
  from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;

  select coalesce(sum(qty * unit_cost), 0) into v_cost
  from public.order_items where order_id = new.id;

  update public.orders set cost = v_cost where id = new.id and cost is distinct from v_cost;
  return null;
end;
$$;

-- C11: resolve transfer location FKs and rebuild transfer_items from data.
create or replace function public.tg_transfers_mirror()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.transfers t set
    from_location_id = coalesce(t.from_location_id, public.app_resolve_location(new.org_id, new.data->>'fromLocationId')),
    to_location_id   = coalesce(t.to_location_id, public.app_resolve_location(new.org_id, new.data->>'toLocationId'))
  where t.id = new.id;

  delete from public.transfer_items where transfer_id = new.id;
  insert into public.transfer_items (id, org_id, transfer_id, variant_id, qty, received_qty)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty', '')::numeric, 0)::int,
    coalesce(nullif(it->>'receivedQty', '')::numeric, 0)::int
  from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;
  return null;
end;
$$;

-- Resolve stock_movement keys from data on write so the inventory_levels
-- projection (and its AFTER trigger) work for app-created movements.
create or replace function public.tg_movements_resolve_keys()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.variant_id is null then
    new.variant_id := public.app_resolve_variant(new.org_id, new.data->>'productId', new.data->>'sku');
  end if;
  if new.location_id is null then
    new.location_id := public.app_resolve_location(new.org_id, new.data->>'locationId');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_mirror_variant on public.products;
create trigger trg_products_mirror_variant
  after insert or update on public.products
  for each row when (new.data is not null)
  execute function public.tg_products_mirror_variant();

drop trigger if exists trg_orders_mirror_items on public.orders;
create trigger trg_orders_mirror_items
  after insert or update on public.orders
  for each row when (new.data is not null)
  execute function public.tg_orders_mirror_items();

drop trigger if exists trg_transfers_mirror on public.transfers;
create trigger trg_transfers_mirror
  after insert or update on public.transfers
  for each row when (new.data is not null)
  execute function public.tg_transfers_mirror();

drop trigger if exists trg_movements_resolve_keys on public.stock_movements;
create trigger trg_movements_resolve_keys
  before insert or update on public.stock_movements
  for each row execute function public.tg_movements_resolve_keys();

-- Lock down the new SECURITY DEFINER plumbing from REST clients.
revoke execute on function public.app_resolve_variant(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.app_resolve_location(uuid, text) from public, anon, authenticated;
revoke execute on function public.tg_products_mirror_variant() from public, anon, authenticated;
revoke execute on function public.tg_orders_mirror_items() from public, anon, authenticated;
revoke execute on function public.tg_transfers_mirror() from public, anon, authenticated;
revoke execute on function public.tg_movements_resolve_keys() from public, anon, authenticated;
