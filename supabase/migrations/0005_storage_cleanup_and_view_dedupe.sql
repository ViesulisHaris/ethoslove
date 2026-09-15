-- Reduce write/storage churn on high-traffic gifts.

alter table public.gifts
  add column if not exists storage_pruned_at timestamptz;

create index if not exists gift_views_viewer_recent_idx
  on public.gift_views (gift_id, viewer_hash, opened_at desc);

-- Recipient opened the gift. Returns view metadata so the API route can avoid extra
-- database reads for first-open emails and post-open storage pruning.
-- The return type changes (uuid -> jsonb), which `create or replace` cannot do.
drop function if exists public.record_gift_view(text, text, text);
create function public.record_gift_view(p_short_id text, p_viewer_hash text, p_device text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gift_id   uuid;
  v_view_id   uuid;
  v_existing  uuid;
  v_had_views boolean;
  v_hash      text := left(coalesce(p_viewer_hash, ''), 64);
  v_device    text := nullif(left(coalesce(p_device, ''), 32), '');
begin
  select id into v_gift_id from public.gifts
  where short_id = p_short_id and status = 'live' and (unlock_at is null or unlock_at <= now())
  for update;
  if v_gift_id is null then
    return null;
  end if;

  select exists(select 1 from public.gift_views where gift_id = v_gift_id)
    into v_had_views;

  select id into v_existing from public.gift_views
  where gift_id = v_gift_id
    and viewer_hash = v_hash
    and opened_at > now() - interval '24 hours'
  order by opened_at desc
  limit 1;

  if v_existing is not null then
    update public.gift_views
    set device = coalesce(v_device, device)
    where id = v_existing;

    return jsonb_build_object(
      'viewId', v_existing,
      'giftId', v_gift_id,
      'isNewView', false,
      'isFirstOpen', false
    );
  end if;

  insert into public.gift_views (gift_id, viewer_hash, device)
  values (v_gift_id, v_hash, v_device)
  returning id into v_view_id;

  return jsonb_build_object(
    'viewId', v_view_id,
    'giftId', v_gift_id,
    'isNewView', true,
    'isFirstOpen', not v_had_views
  );
end $$;

revoke all on function public.record_gift_view(text, text, text) from public, anon, authenticated;
grant execute on function public.record_gift_view(text, text, text) to service_role;
