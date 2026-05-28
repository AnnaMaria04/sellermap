-- B6: Remove the 8 orphan supplier_products rows by creating real parent
-- suppliers and linking them. supplier_products had no supplier_id column,
-- so add one (nullable FK) and populate from distinct supplier identity.
alter table public.supplier_products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

-- Distinct supplier identity = explicit name, else the platform label.
with org as (
  select id as org_id from public.organizations order by created_at limit 1
),
keys as (
  select distinct
    coalesce(nullif(trim(sp.supplier_name), ''), initcap(coalesce(sp.platform, 'unknown'))) as sup_name,
    coalesce(sp.platform, 'manual') as platform,
    coalesce((array_agg(sp.currency) filter (where sp.currency is not null) over (
       partition by coalesce(nullif(trim(sp.supplier_name), ''), initcap(coalesce(sp.platform, 'unknown')))
    ))[1], 'RUB') as currency
  from public.supplier_products sp
)
insert into public.suppliers
  (id, org_id, name, country, currency, lead_time_days, rating, notes, created_at, updated_at)
select
  gen_random_uuid(),
  org.org_id,
  k.sup_name,
  case when k.platform = 'alibaba' then 'CN' else 'RU' end,
  k.currency,
  case when k.platform = 'alibaba' then 30 else 7 end,
  0,
  'Backfilled from supplier_products (' || k.platform || ')',
  now(), now()
from (select distinct sup_name, platform, currency from keys) k
cross join org
where not exists (
  select 1 from public.suppliers s where s.name = k.sup_name
);

-- Link the orphan rows to their new parent supplier.
update public.supplier_products sp
set supplier_id = s.id
from public.suppliers s
where s.name = coalesce(nullif(trim(sp.supplier_name), ''), initcap(coalesce(sp.platform, 'unknown')))
  and sp.supplier_id is null;
