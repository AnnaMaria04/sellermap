-- G21: durable alert history. Alert dismiss/seen state lived only in
-- localStorage (useDismissedAlerts / useSeenAlerts) with no DB record. This
-- table records the alert lifecycle so dismissals survive across devices and
-- can be reported on.

create table if not exists public.alert_history (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizations(id),
  alert_id    text not null,            -- the computed alert id
  title       text,
  severity    text,                     -- critical | warning | info
  category    text,                     -- stock | expiry | performance | system
  product_id  text,
  event       text not null default 'dismissed', -- raised | seen | dismissed
  created_at  timestamptz not null default now()
);

-- One row per (org, alert, event) so repeated dismissals are idempotent.
create unique index if not exists alert_history_unique
  on public.alert_history (org_id, alert_id, event);

create index if not exists alert_history_org_idx
  on public.alert_history (org_id, created_at desc);

alter table public.alert_history enable row level security;

drop policy if exists alert_history_rw on public.alert_history;
create policy alert_history_rw on public.alert_history
  for all to authenticated
  using (org_id is null or public.user_in_org(org_id))
  with check (org_id is null or public.user_in_org(org_id));
