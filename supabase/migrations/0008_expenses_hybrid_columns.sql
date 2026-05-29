-- Applied 2026-05-27 to project xvgzpryzqxwcihhptfpw.
-- Hybrid persistence for expenses (useFinance), org-scoped. The app object lives
-- in data jsonb keyed by app_id; amount/title/incurred_on mirrored for queries.
alter table public.expenses add column if not exists app_id text;
alter table public.expenses add column if not exists data jsonb;
alter table public.expenses alter column title drop not null;
create unique index if not exists expenses_org_app_uniq on public.expenses (org_id, app_id);
