-- What recipients see, and what costs money, is written by the server only.
--
-- "gifts: owner all" let a signed-in owner write any column of their own gifts straight from the
-- browser with the publishable key: flip a draft to live, drop the watermark, switch a published
-- free gift to a premium template, set a schedule, or edit a live gift's content past the paywall,
-- all without paying. Owners now create and edit drafts only, and only a draft's content. Publishing
-- and edits to live gifts go through the server actions, which check the entitlement first and then
-- write with the service role (src/app/actions/gift.ts).

drop policy if exists "gifts: owner all" on public.gifts;

create policy "gifts: owner read" on public.gifts
  for select to authenticated
  using (auth.uid() = user_id);

create policy "gifts: owner creates drafts" on public.gifts
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'draft'
    and watermark
    and not is_premium
    and password_hash is null
    and unlock_at is null
    and published_at is null
  );

create policy "gifts: owner edits drafts" on public.gifts
  for update to authenticated
  using (auth.uid() = user_id and status = 'draft')
  with check (auth.uid() = user_id and status = 'draft');

create policy "gifts: owner deletes" on public.gifts
  for delete to authenticated
  using (auth.uid() = user_id);

-- Column privileges back the policies up: a draft's content is all an owner can write.
revoke insert, update on public.gifts from anon, authenticated;
grant insert (short_id, user_id, template_slug, data, locale) on public.gifts to authenticated;
grant update (data, locale) on public.gifts to authenticated;

-- A password is a paid feature. The server action checks that, but the function can be called on
-- its own with a signed-in session, so it checks too. Clearing a password is always allowed.
create or replace function public.set_gift_password(p_gift_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_slug  text;
  v_clear boolean := p_password is null or length(trim(p_password)) = 0;
begin
  select template_slug into v_slug from public.gifts where id = p_gift_id and user_id = auth.uid();
  if not found then
    raise exception 'gift not found or not owned' using errcode = '42501';
  end if;
  if not v_clear and not exists (
    select 1 from public.template_unlocks
    where user_id = auth.uid() and (template_slug = v_slug or template_slug = '*')
  ) then
    raise exception 'payment required' using errcode = '42501';
  end if;
  update public.gifts
  set password_hash = case
    when v_clear then null
    else extensions.crypt(p_password, extensions.gen_salt('bf', 10))
  end
  where id = p_gift_id and user_id = auth.uid();
end $$;

-- Guest checkout finds a buyer's account by profiles.email. An owner who could rewrite that column
-- would collect a stranger's purchase, so only name and locale stay editable...
revoke update on public.profiles from anon, authenticated;
grant update (name, locale) on public.profiles to authenticated;

-- ...and the email follows the sign-in email when a user changes it (Supabase confirms it first).
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
