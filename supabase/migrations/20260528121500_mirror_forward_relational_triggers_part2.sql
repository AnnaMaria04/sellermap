-- Mirror going forward, part 2: extend relational mirroring to the remaining
-- hybrid collections so their child / detail tables stay populated from the
-- app's `data` jsonb writes. Closes the data side of:
--   D14 purchase_order_items, C9 return_items, C10 stocktake_items,
--   E15 bundle_components, C12 inventory_batches, D13 replenishment_rules,
--   C8 reservations (key resolution feeds the inventory_levels projection).
--
-- All resolvers from ...121000 (app_resolve_variant / app_resolve_location)
-- are reused. SECURITY DEFINER so children can be maintained under RLS.

-- D14: rebuild purchase_order_items + total from data.items[].
create or replace function public.tg_po_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_total numeric := 0;
begin
  update public.purchase_orders p set
    supplier_id = coalesce(p.supplier_id, (select id from public.suppliers s
      where s.org_id = new.org_id and s.name = new.data->>'supplierName' limit 1)),
    location_id = coalesce(p.location_id, public.app_resolve_location(new.org_id, new.data->>'locationId'))
  where p.id = new.id;

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

  select coalesce(sum(qty*unit_cost),0) into v_total from public.purchase_order_items where po_id = new.id;
  update public.purchase_orders set total_amount = v_total where id = new.id and total_amount is distinct from v_total;
  return null;
end;
$$;

-- C9: rebuild return_items from data.items[].
create or replace function public.tg_returns_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.return_items where return_id = new.id;
  insert into public.return_items (id, org_id, return_id, variant_id, qty, condition, action)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku'),
    coalesce(nullif(it->>'qty','')::numeric,0)::int,
    coalesce(nullif(it->>'condition',''),'good'),
    coalesce(nullif(it->>'action',''),'restock')
  from jsonb_array_elements(coalesce(new.data->'items','[]'::jsonb)) it
  where public.app_resolve_variant(new.org_id, it->>'productId', it->>'sku') is not null;
  return null;
end;
$$;

-- C10: rebuild stocktake_items from data.items[].
create or replace function public.tg_stocktakes_mirror_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.stocktakes s
    set location_id = coalesce(s.location_id, public.app_resolve_location(new.org_id, new.data->>'locationId'))
  where s.id = new.id;

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

-- E15: rebuild bundle_components from data.components[].
create or replace function public.tg_bundles_mirror_components()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.bundle_components where bundle_id = new.id;
  insert into public.bundle_components (id, org_id, bundle_id, variant_id, qty)
  select
    gen_random_uuid(), new.org_id, new.id,
    public.app_resolve_variant(new.org_id, c->>'productId', c->>'sku'),
    coalesce(nullif(c->>'qty','')::numeric,1)::int
  from jsonb_array_elements(coalesce(new.data->'components','[]'::jsonb)) c
  where public.app_resolve_variant(new.org_id, c->>'productId', c->>'sku') is not null;
  return null;
end;
$$;

-- C12 / C8 / D13: resolve relational columns from data on write (BEFORE).
create or replace function public.tg_batches_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.variant_id is null then new.variant_id := public.app_resolve_variant(new.org_id, new.data->>'productId', new.data->>'sku'); end if;
  if new.location_id is null then new.location_id := public.app_resolve_location(new.org_id, new.data->>'locationId'); end if;
  new.batch_number := coalesce(new.batch_number, new.data->>'batchNumber');
  new.qty := coalesce(new.qty, nullif(new.data->>'remainingQty','')::numeric::int, nullif(new.data->>'qty','')::numeric::int, 0);
  new.status := coalesce(new.status, new.data->>'status', 'ok');
  new.expiry_date := coalesce(new.expiry_date, nullif(new.data->>'expiryDate','')::date);
  new.received_at := coalesce(new.received_at, nullif(new.data->>'receivedAt','')::timestamptz);
  return new;
end;
$$;

create or replace function public.tg_reservations_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.variant_id is null then new.variant_id := public.app_resolve_variant(new.org_id, new.data->>'productId', new.data->>'sku'); end if;
  if new.location_id is null then new.location_id := public.app_resolve_location(new.org_id, new.data->>'locationId'); end if;
  new.qty := coalesce(nullif(new.qty,0), nullif(new.data->>'qty','')::numeric::int, 0);
  new.source := coalesce(new.source, new.data->>'source', 'manual');
  new.status := coalesce(new.status, new.data->>'status', 'active');
  new.order_ref := coalesce(new.order_ref, new.data->>'orderRef');
  new.customer_name := coalesce(new.customer_name, new.data->>'customerName');
  return new;
end;
$$;

create or replace function public.tg_replenishment_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.variant_id is null then new.variant_id := public.app_resolve_variant(new.org_id, new.data->>'productId', new.data->>'sku'); end if;
  if new.location_id is null then new.location_id := public.app_resolve_location(new.org_id, new.data->>'locationId'); end if;
  new.trigger_type := coalesce(new.trigger_type, new.data->>'triggerType', 'min_stock');
  new.threshold := coalesce(nullif(new.threshold,0),
    nullif(new.data->>'minStock','')::numeric::int,
    nullif(new.data->>'reorderPoint','')::numeric::int,
    nullif(new.data->>'daysOfStock','')::numeric::int, 0);
  new.reorder_qty := coalesce(nullif(new.reorder_qty,0), nullif(new.data->>'reorderQty','')::numeric::int, 0);
  new.is_active := coalesce(new.is_active, (new.data->>'isActive')::boolean, true);
  return new;
end;
$$;

drop trigger if exists trg_po_mirror_items on public.purchase_orders;
create trigger trg_po_mirror_items after insert or update on public.purchase_orders
  for each row when (new.data is not null) execute function public.tg_po_mirror_items();

drop trigger if exists trg_returns_mirror_items on public.returns;
create trigger trg_returns_mirror_items after insert or update on public.returns
  for each row when (new.data is not null) execute function public.tg_returns_mirror_items();

drop trigger if exists trg_stocktakes_mirror_items on public.stocktakes;
create trigger trg_stocktakes_mirror_items after insert or update on public.stocktakes
  for each row when (new.data is not null) execute function public.tg_stocktakes_mirror_items();

drop trigger if exists trg_bundles_mirror_components on public.bundles;
create trigger trg_bundles_mirror_components after insert or update on public.bundles
  for each row when (new.data is not null) execute function public.tg_bundles_mirror_components();

drop trigger if exists trg_batches_resolve on public.inventory_batches;
create trigger trg_batches_resolve before insert or update on public.inventory_batches
  for each row execute function public.tg_batches_resolve();

drop trigger if exists trg_reservations_resolve on public.reservations;
create trigger trg_reservations_resolve before insert or update on public.reservations
  for each row execute function public.tg_reservations_resolve();

drop trigger if exists trg_replenishment_resolve on public.replenishment_rules;
create trigger trg_replenishment_resolve before insert or update on public.replenishment_rules
  for each row execute function public.tg_replenishment_resolve();

revoke execute on function public.tg_po_mirror_items() from public, anon, authenticated;
revoke execute on function public.tg_returns_mirror_items() from public, anon, authenticated;
revoke execute on function public.tg_stocktakes_mirror_items() from public, anon, authenticated;
revoke execute on function public.tg_bundles_mirror_components() from public, anon, authenticated;
revoke execute on function public.tg_batches_resolve() from public, anon, authenticated;
revoke execute on function public.tg_reservations_resolve() from public, anon, authenticated;
revoke execute on function public.tg_replenishment_resolve() from public, anon, authenticated;
