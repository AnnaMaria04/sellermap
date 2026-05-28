-- Integrity: transfers kept location ids in data jsonb; resolve to FKs so the
-- in_transit projection and transfer flows work relationally.
update public.transfers t
set from_location_id = lf.id
from public.locations lf
where t.from_location_id is null and lf.app_id = t.data->>'fromLocationId';

update public.transfers t
set to_location_id = lt.id
from public.locations lt
where t.to_location_id is null and lt.app_id = t.data->>'toLocationId';

-- Seed opening-balance adjustment movements so that the stock_movements
-- projection nets to the known physical stock (products.data.stockByLocation).
-- Sales-only history left on_hand at 0; this records the missing receipts.
insert into public.stock_movements
  (id, org_id, type, variant_id, location_id, qty_before, qty_after, qty_delta,
   user_name, reason, reference_type, created_at)
select
  gen_random_uuid(),
  p.org_id,
  'adjustment',
  v.id,
  loc.id,
  cur.net,
  desired.qty,
  desired.qty - cur.net,
  'system',
  'Opening balance reconciliation (backfill)',
  'backfill',
  now()
from public.products p
join product_variants v on v.product_id = p.id
cross join lateral jsonb_each_text(coalesce(p.data->'stockByLocation', '{}'::jsonb)) as sbl(loc_app, qty_txt)
join public.locations loc on loc.app_id = sbl.loc_app and loc.org_id = p.org_id
join lateral (select coalesce(sbl.qty_txt::numeric, 0)::int as qty) desired on true
join lateral (
  select coalesce(sum(qty_delta), 0)::int as net
  from public.stock_movements sm
  where sm.variant_id = v.id and sm.location_id = loc.id
) cur on true
where desired.qty <> cur.net
  and not exists (
    select 1 from public.stock_movements sm
    where sm.variant_id = v.id and sm.location_id = loc.id
      and sm.reason = 'Opening balance reconciliation (backfill)'
  );

-- Refresh every activity cell (covers transfers whose to_location was just set).
do $$
declare r record;
begin
  for r in
    select distinct variant_id, location_id from public.stock_movements
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
