-- B4: Expand orders.data.items[] (in-memory MappedOrder) into relational
-- order_items. Link each line to its product's default variant via the
-- app-level productId/sku, and compute unit_cost from the variant cost
-- (product.costPrice) at insert time, falling back to the stored unitCost.
insert into public.order_items
  (id, org_id, order_id, variant_id, qty, unit_price, unit_cost)
select
  gen_random_uuid(),
  o.org_id,
  o.id,
  v.id,
  coalesce(nullif((it->>'qty'), '')::numeric, 1)::int,
  coalesce(nullif((it->>'unitPrice'), '')::numeric, 0),
  coalesce(
    nullif(v.cost_price, 0),
    nullif((it->>'unitCost'), '')::numeric,
    0
  )
from public.orders o
cross join lateral jsonb_array_elements(o.data->'items') as it
join public.products p
  on p.data->>'id' = it->>'productId'
  or p.data->>'sku' = it->>'sku'
join lateral (
  select pv.id, pv.cost_price
  from public.product_variants pv
  where pv.product_id = p.id
  order by pv.created_at, pv.id
  limit 1
) v on true
where not exists (
  select 1 from public.order_items oi where oi.order_id = o.id
);

-- Recompute P&L cost from the relational order_items read.
update public.orders o
set cost = agg.total_cost,
    updated_at = now()
from (
  select order_id, sum(qty * unit_cost) as total_cost
  from public.order_items
  group by order_id
) agg
where agg.order_id = o.id;
