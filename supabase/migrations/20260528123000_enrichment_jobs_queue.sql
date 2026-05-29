-- F17: async enrichment worker queue. createEnrichmentPlan() ran synchronously
-- from /check with no queue or Edge Function. This table is the durable job
-- queue the `enrich-product` Edge Function drains, so /check can return a draft
-- immediately and enrichment completes in the background.

create table if not exists public.enrichment_jobs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations(id),
  check_id     text not null,
  source       text not null,            -- 'supplier' | 'wildberries'
  priority     text not null default 'normal',
  dedupe_key   text not null,
  status       text not null default 'queued',  -- queued|processing|done|error
  payload      jsonb not null default '{}'::jsonb,
  result       jsonb,
  error        text,
  attempts     int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One live job per (check, dedupe_key) so /check can be retried idempotently.
create unique index if not exists enrichment_jobs_dedupe
  on public.enrichment_jobs (check_id, dedupe_key);

create index if not exists enrichment_jobs_status_idx
  on public.enrichment_jobs (status, priority, created_at);

alter table public.enrichment_jobs enable row level security;

-- Owners can see/enqueue their org's jobs (service role bypasses RLS in the worker).
drop policy if exists enrichment_jobs_rw on public.enrichment_jobs;
create policy enrichment_jobs_rw on public.enrichment_jobs
  for all to authenticated
  using (org_id is null or public.user_in_org(org_id))
  with check (org_id is null or public.user_in_org(org_id));

create or replace function public.tg_enrichment_jobs_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_enrichment_jobs_touch on public.enrichment_jobs;
create trigger trg_enrichment_jobs_touch before update on public.enrichment_jobs
  for each row execute function public.tg_enrichment_jobs_touch();
