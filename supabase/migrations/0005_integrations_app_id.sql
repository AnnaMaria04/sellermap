-- Applied 2026-05-27 to project xvgzpryzqxwcihhptfpw.
-- The app keys integrations by its own string id (e.g. "int-wildberries-123"),
-- which can't be inserted into the uuid PK (the insert silently failed, so
-- connections never persisted). Store the app id in app_id; the uuid PK is
-- DB-generated. Upserts/updates/deletes key on (owner_id, app_id).
alter table public.integrations add column if not exists app_id text;
create unique index if not exists integrations_owner_app_uniq on public.integrations (owner_id, app_id);
