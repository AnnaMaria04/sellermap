-- C11: The one existing transfer keeps its items in transfers.data.items[]
-- and never wrote the relational transfer_items rows. Materialise them.
insert into public.transfer_items
  (id, org_id, transfer_id, variant_id, qty, received_qty)
select
  gen_random_uuid(),
  t.org_id,
  t.id,
  v.id,
  coalesce(nullif((it->>'qty'), '')::numeric, 0)::int,
  coalesce(nullif((it->>'receivedQty'), '')::numeric, 0)::int
from public.transfers t
cross join lateral jsonb_array_elements(t.data->'items') as it
join public.products p
  on p.data->>'id' = it->>'productId'
  or p.data->>'sku' = it->>'sku'
join lateral (
  select pv.id from public.product_variants pv
  where pv.product_id = p.id order by pv.created_at, pv.id limit 1
) v on true
where not exists (
  select 1 from public.transfer_items ti where ti.transfer_id = t.id
);
