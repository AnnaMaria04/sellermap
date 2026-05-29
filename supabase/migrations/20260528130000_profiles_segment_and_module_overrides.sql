-- Segment-based module gating: store the seller's chosen primary segment and
-- their explicit per-module on/off overrides (the "add-ons" / Settings → Модули
-- catalog). Both are optional and additive — the app falls back to localStorage
-- and to a full-superset module set when these are absent, so existing users
-- see no change until they pick a segment.
alter table public.profiles
  add column if not exists segment text,
  add column if not exists module_overrides jsonb not null default '{}'::jsonb;
