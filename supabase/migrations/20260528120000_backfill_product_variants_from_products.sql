-- C7: Materialise product_variants from the products table.
-- Every product gets exactly one default variant when it has none, so that
-- variant-keyed tables (order_items, inventory_levels, stock_movements,
-- transfer_items, reservations) can reference a real row instead of jsonb.
insert into public.product_variants
  (id, org_id, product_id, name, sku, barcode, price, cost_price, weight, created_at, updated_at)
select
  gen_random_uuid(),
  p.org_id,
  p.id,
  coalesce(nullif(p.name, ''), p.data->>'name', 'Default'),
  coalesce(
    nullif(p.sku, ''),
    nullif(p.data->>'sku', ''),
    'SKU-' || left(replace(p.id::text, '-', ''), 10)
  ),
  coalesce(nullif(p.barcode, ''), nullif(p.data->>'barcode', '')),
  coalesce(nullif(p.price, 0), nullif((p.data->>'price')::numeric, 0), 0),
  coalesce(nullif(p.cost_price, 0), nullif((p.data->>'costPrice')::numeric, 0), 0),
  nullif(p.weight, 0),
  now(),
  now()
from public.products p
where not exists (
  select 1 from public.product_variants v where v.product_id = p.id
);
