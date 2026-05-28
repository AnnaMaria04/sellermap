-- The projection-maintenance functions are SECURITY DEFINER (they must bypass
-- RLS to write inventory_levels from triggers). They are internal plumbing and
-- must not be invocable as REST RPCs by clients. Revoke EXECUTE.
revoke execute on function public.refresh_inventory_level(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.tg_refresh_inventory_from_movement() from public, anon, authenticated;
revoke execute on function public.tg_refresh_inventory_from_reservation() from public, anon, authenticated;
revoke execute on function public.tg_refresh_inventory_from_transfer_item() from public, anon, authenticated;

-- The read-only availability helpers stay callable by signed-in users (they are
-- SECURITY INVOKER and respect RLS); make the grant explicit and exclude anon.
revoke execute on function public.available_to_sell(uuid, uuid) from public, anon;
revoke execute on function public.product_available_to_sell(uuid, uuid) from public, anon;
grant execute on function public.available_to_sell(uuid, uuid) to authenticated;
grant execute on function public.product_available_to_sell(uuid, uuid) to authenticated;
