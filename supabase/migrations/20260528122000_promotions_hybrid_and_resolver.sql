-- E16: make promotions a hybrid collection (like the other inventory tables)
-- so the app can persist/share them through the same store, and apply them to
-- pricing. Add the app_id + data jsonb columns and a resolver trigger that
-- mirrors the relational columns from the data object on write.

alter table public.promotions add column if not exists app_id text;
alter table public.promotions add column if not exists data jsonb;

create unique index if not exists promotions_org_app_id_key
  on public.promotions (org_id, app_id);

create or replace function public.tg_promotions_resolve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.data is null then return new; end if;
  new.name        := coalesce(new.data->>'name', new.name);
  new.type        := coalesce(new.data->>'type', new.type, 'percentage');
  new.status      := coalesce(new.data->>'status', new.status, 'draft');
  new.value       := coalesce(nullif(new.data->>'discountValue','')::numeric, new.value, 0);
  new.promo_code  := coalesce(new.data->>'promoCode', new.promo_code);
  new.usage_count := coalesce(nullif(new.data->>'usageCount','')::numeric::int, new.usage_count, 0);
  new.usage_limit := coalesce(nullif(new.data->>'usageLimit','')::numeric::int, new.usage_limit);
  new.starts_at   := coalesce(nullif(new.data->>'startsAt','')::timestamptz, new.starts_at);
  new.ends_at     := coalesce(nullif(new.data->>'endsAt','')::timestamptz, new.ends_at);
  if new.data ? 'channels' then
    new.channels := array(select jsonb_array_elements_text(new.data->'channels'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_promotions_resolve on public.promotions;
create trigger trg_promotions_resolve before insert or update on public.promotions
  for each row execute function public.tg_promotions_resolve();

revoke execute on function public.tg_promotions_resolve() from public, anon, authenticated;
