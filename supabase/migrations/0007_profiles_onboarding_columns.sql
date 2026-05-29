-- Applied 2026-05-27 to project xvgzpryzqxwcihhptfpw.
-- useSellerProfile reads/writes these columns; without them the onboarding flag
-- never persisted and the wizard reappeared on every reload.
alter table public.profiles
  add column if not exists company text,
  add column if not exists business_type text,
  add column if not exists channels text[] not null default '{}',
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
