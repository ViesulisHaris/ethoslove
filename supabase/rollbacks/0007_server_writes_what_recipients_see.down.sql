-- Rollback for migrations/0007_server_writes_what_recipients_see.sql: back to the state after 0006.
-- Kept outside migrations/ so supabase db push never runs it.
--
-- Run it the way 0007 was run: as postgres in the Supabase SQL editor, as ONE execution, so that it
-- applies all or nothing. (With psql, wrap it in begin/commit.)
-- Dropping the trigger on auth.users needs owner rights on auth.users. Hosted Supabase gives postgres
-- that through supautils.drop_trigger_grants; on a plain PostgreSQL without supautils it has to run as
-- the owner of auth.users or a superuser.
-- It cannot undo 0007's one-time resync of profiles.email to the sign-in email, and should not: that
-- resync removed addresses users had planted through the hole 0007 closes.

set local lock_timeout = '5s';

-- 1. The email-follow trigger and its function.
drop trigger if exists on_auth_user_email_changed on auth.users;
drop function if exists public.handle_user_email_change();

-- 2. The four gifts policies from 0007, and the original owner-all policy back (verbatim from 0001).
drop policy if exists "gifts: owner read" on public.gifts;
drop policy if exists "gifts: owner creates drafts" on public.gifts;
drop policy if exists "gifts: owner edits drafts" on public.gifts;
drop policy if exists "gifts: owner deletes" on public.gifts;
drop policy if exists "gifts: owner all" on public.gifts;
create policy "gifts: owner all" on public.gifts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Table-level INSERT and UPDATE for anon and authenticated, as Supabase's default grants had them.
--    The column-level grants from 0007 are removed first, otherwise they would linger next to the
--    table-level grants.
revoke insert (short_id, user_id, template_slug, data, locale) on public.gifts from authenticated;
revoke update (data, locale) on public.gifts from authenticated;
grant insert, update on public.gifts to anon, authenticated;

revoke update (name, locale) on public.profiles from authenticated;
grant update on public.profiles to anon, authenticated;

-- 4. set_gift_password as defined in 0002 (verbatim). create or replace keeps its EXECUTE grants.
create or replace function public.set_gift_password(p_gift_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.gifts
  set password_hash = case
    when p_password is null or length(trim(p_password)) = 0 then null
    else extensions.crypt(p_password, extensions.gen_salt('bf', 10))
  end
  where id = p_gift_id and user_id = auth.uid();
  if not found then
    raise exception 'gift not found or not owned' using errcode = '42501';
  end if;
end $$;
