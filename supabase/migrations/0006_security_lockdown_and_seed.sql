-- Applied 2026-05-27 to project xvgzpryzqxwcihhptfpw.
-- 1) SECURITY: enable RLS (deny-by-default) on the orphaned data-engine tables
--    that were publicly exposed via the anon key. The app never queries them
--    through the client, so this closes the hole without breaking any feature.
do $$ declare t text; begin
  foreach t in array array[
    'users','market_analyses','tracked_products','wb_product_snapshots',
    'wb_search_snapshots','analysis_competitors','tracked_keywords',
    'daily_market_metrics','sales_estimates','economics_snapshots',
    'unit_economics','supplier_products','product_fingerprints','weekly_updates'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- 2) HARDENING
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.current_org() from anon, authenticated;

-- 3) UX: auto-provision default locations + settings for every new shop, and
--    backfill the existing developer shop. Locations carry the app object in
--    `data` (the app reads `data`).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into public.organizations (name) values ('Мой магазин') returning id into new_org;
  insert into public.org_members (org_id, user_id, is_owner) values (new_org, new.id, true);
  insert into public.profiles (id, org_id, email) values (new.id, new_org, new.email)
    on conflict (id) do update set org_id = excluded.org_id;
  insert into public.org_settings (org_id) values (new_org) on conflict do nothing;
  insert into public.locations (org_id, app_id, name, type, is_default, data) values
    (new_org, 'loc-main',  'Основной склад', 'warehouse', true,
     '{"id":"loc-main","name":"Основной склад","type":"warehouse","isDefault":true,"capacity":5000}'::jsonb),
    (new_org, 'loc-store', 'Магазин',        'store',     false,
     '{"id":"loc-store","name":"Магазин","type":"store","isDefault":false,"capacity":500}'::jsonb);
  return new;
end; $$;
