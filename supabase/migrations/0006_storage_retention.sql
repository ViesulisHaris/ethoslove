-- Storage retention. Uploads start the moment a photo is added, so abandoned drafts and
-- edits leave files behind that no gift points at. Two rules, both run by the daily cron:
--   1. drafts nobody has touched for 7 days are deleted (their files then fall under 2);
--   2. files in the gifts bucket that no gift references and that are older than 24 hours
--      are deleted. Live gifts keep everything they reference, for as long as they live.

-- Every storage path mentioned anywhere in a gift's JSON, whichever template field holds it.
create or replace function public.gift_storage_refs()
returns table (path text) language sql stable security definer set search_path = public as $$
  select distinct (v #>> '{}') as path
  from public.gifts g, jsonb_path_query(g.data, 'strict $.**') as v
  where jsonb_typeof(v) = 'string' and (v #>> '{}') like 'gifts/%';
$$;

create or replace function public.storage_orphans(p_limit int default 500)
returns table (name text, bytes bigint) language sql security definer set search_path = public, storage as $$
  select o.name, coalesce((o.metadata->>'size')::bigint, 0)
  from storage.objects o
  where o.bucket_id = 'gifts'
    and o.created_at < now() - interval '24 hours'
    and ('gifts/' || o.name) not in (select path from public.gift_storage_refs())
  order by o.created_at
  limit greatest(1, least(p_limit, 2000));
$$;

create or replace function public.purge_stale_drafts(p_days int default 7)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with gone as (
    delete from public.gifts
    where status = 'draft' and updated_at < now() - make_interval(days => greatest(1, p_days))
    returning id
  )
  select count(*) into v_count from gone;
  return v_count;
end $$;

revoke all on function public.gift_storage_refs() from public, anon, authenticated;
revoke all on function public.storage_orphans(int) from public, anon, authenticated;
revoke all on function public.purge_stale_drafts(int) from public, anon, authenticated;
grant execute on function public.gift_storage_refs() to service_role;
grant execute on function public.storage_orphans(int) to service_role;
grant execute on function public.purge_stale_drafts(int) to service_role;
