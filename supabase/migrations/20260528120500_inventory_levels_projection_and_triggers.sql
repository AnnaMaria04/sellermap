-- B5: Build inventory_levels as a maintained projection of stock_movements
-- (on_hand), reservations (reserved) and open transfers (in_transit), and
-- expose available_to_sell() from the database.

create or replace function public.refresh_inventory_level(p_variant uuid, p_location uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_on_hand int;
  v_reserved int;
  v_in_transit int;
begin
  if p_variant is null or p_location is null then
    return;
  end if;

  select org_id into v_org from public.product_variants where id = p_variant;
  if v_org is null then
    return;
  end if;

  select coalesce(sum(qty_delta), 0) into v_on_hand
  from public.stock_movements
  where variant_id = p_variant and location_id = p_location;

  select coalesce(sum(qty), 0) into v_reserved
  from public.reservations
  where variant_id = p_variant and location_id = p_location
    and status in ('active', 'pending');

  select coalesce(sum(greatest(ti.qty - ti.received_qty, 0)), 0) into v_in_transit
  from public.transfer_items ti
  join public.transfers t on t.id = ti.transfer_id
  where ti.variant_id = p_variant
    and t.to_location_id = p_location
    and t.status in ('draft', 'sent', 'in_transit', 'partially_received');

  insert into public.inventory_levels
    (id, org_id, variant_id, location_id, on_hand, reserved, damaged, in_transit, updated_at)
  values
    (gen_random_uuid(), v_org, p_variant, p_location, v_on_hand, v_reserved, 0, v_in_transit, now())
  on conflict (variant_id, location_id) do update
    set on_hand = excluded.on_hand,
        reserved = excluded.reserved,
        in_transit = excluded.in_transit,
        updated_at = now();
end;
$$;

-- available_to_sell = on_hand - reserved - damaged - in_transit (clamped >= 0)
create or replace function public.available_to_sell(p_variant uuid, p_location uuid)
returns int
language sql
stable
set search_path = public
as $$
  select greatest(0, coalesce(
    (select on_hand - reserved - damaged - in_transit
     from public.inventory_levels
     where variant_id = p_variant and location_id = p_location), 0));
$$;

-- Product-level helper: sum available across the product's variants,
-- optionally scoped to a location.
create or replace function public.product_available_to_sell(p_product uuid, p_location uuid default null)
returns int
language sql
stable
set search_path = public
as $$
  select greatest(0, coalesce(sum(il.on_hand - il.reserved - il.damaged - il.in_transit), 0))::int
  from public.inventory_levels il
  join public.product_variants v on v.id = il.variant_id
  where v.product_id = p_product
    and (p_location is null or il.location_id = p_location);
$$;

-- Trigger glue: refresh the affected (variant, location) cells.
create or replace function public.tg_refresh_inventory_from_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_inventory_level(new.variant_id, new.location_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE')
     and (old.variant_id is distinct from new.variant_id
          or old.location_id is distinct from new.location_id) then
    perform public.refresh_inventory_level(old.variant_id, old.location_id);
  end if;
  return null;
end;
$$;

create or replace function public.tg_refresh_inventory_from_reservation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_inventory_level(new.variant_id, new.location_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_inventory_level(old.variant_id, old.location_id);
  end if;
  return null;
end;
$$;

create or replace function public.tg_refresh_inventory_from_transfer_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare to_loc uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select to_location_id into to_loc from public.transfers where id = new.transfer_id;
    perform public.refresh_inventory_level(new.variant_id, to_loc);
  end if;
  if tg_op = 'DELETE' then
    select to_location_id into to_loc from public.transfers where id = old.transfer_id;
    perform public.refresh_inventory_level(old.variant_id, to_loc);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_inv_from_movement on public.stock_movements;
create trigger trg_inv_from_movement
  after insert or update or delete on public.stock_movements
  for each row execute function public.tg_refresh_inventory_from_movement();

drop trigger if exists trg_inv_from_reservation on public.reservations;
create trigger trg_inv_from_reservation
  after insert or update or delete on public.reservations
  for each row execute function public.tg_refresh_inventory_from_reservation();

drop trigger if exists trg_inv_from_transfer_item on public.transfer_items;
create trigger trg_inv_from_transfer_item
  after insert or update or delete on public.transfer_items
  for each row execute function public.tg_refresh_inventory_from_transfer_item();

-- One-time backfill across every (variant, location) pair that has activity.
do $$
declare r record;
begin
  for r in
    select distinct variant_id, location_id from public.stock_movements
      where variant_id is not null and location_id is not null
    union
    select distinct variant_id, location_id from public.reservations
      where variant_id is not null and location_id is not null
    union
    select distinct ti.variant_id, t.to_location_id
      from public.transfer_items ti join public.transfers t on t.id = ti.transfer_id
      where ti.variant_id is not null and t.to_location_id is not null
  loop
    perform public.refresh_inventory_level(r.variant_id, r.location_id);
  end loop;
end;
$$;
