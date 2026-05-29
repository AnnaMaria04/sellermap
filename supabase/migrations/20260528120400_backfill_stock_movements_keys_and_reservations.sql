-- Integrity: the 124 stock_movements rows had NULL variant_id/location_id;
-- the real keys lived in data jsonb. Resolve them to relational FKs so the
-- inventory_levels projection can group on them.
update public.stock_movements sm
set variant_id = v.id
from public.products p
join lateral (
  select pv.id from public.product_variants pv
  where pv.product_id = p.id order by pv.created_at, pv.id limit 1
) v on true
where sm.variant_id is null
  and (p.data->>'id' = sm.data->>'productId' or p.data->>'sku' = sm.data->>'sku');

update public.stock_movements sm
set location_id = l.id
from public.locations l
where sm.location_id is null
  and l.app_id = sm.data->>'locationId';

-- C8: Seed reservations from products carrying reservedUnits so that
-- available-to-sell reflects real holds instead of an in-memory field.
insert into public.reservations
  (id, org_id, variant_id, location_id, qty, source, status, note, created_at)
select
  gen_random_uuid(),
  p.org_id,
  v.id,
  loc.id,
  (p.data->>'reservedUnits')::numeric::int,
  'legacy_import',
  'active',
  'Backfilled from products.data.reservedUnits',
  now()
from public.products p
join lateral (
  select pv.id from public.product_variants pv
  where pv.product_id = p.id order by pv.created_at, pv.id limit 1
) v on true
join lateral (
  select id from public.locations where org_id = p.org_id
  order by is_default desc, created_at limit 1
) loc on true
where coalesce((p.data->>'reservedUnits')::numeric, 0) > 0
  and not exists (
    select 1 from public.reservations r
    where r.variant_id = v.id and r.source = 'legacy_import'
  );
