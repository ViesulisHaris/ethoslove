-- Gifts ready: what "two more gifts" (the product "pair", src/lib/pricing/products.ts) puts on a
-- buyer's account. The buyer pays once, on the share screen right after a gift, and gets two gifts
-- to make later, on any template, whenever they like. Each row is one of those gifts. It is used
-- when the buyer publishes a gift on a template they do not hold yet: the row is marked used with
-- that template, and the ordinary unlock row is written for it, pointing at the purchase that paid,
-- so the template is theirs for good like any other unlock, and a refund of that purchase takes it
-- back the way it takes back any unlock (src/lib/commerce/revoke.ts).
--
-- A gift ready never expires. revoked_at is set when the money went back (a refund, a dispute); a
-- won dispute clears it again. The site reads this table only through src/lib/commerce/gift-credits.ts,
-- and works without it: until this file is applied, nothing is offered and checkout refuses "pair".
--
-- Additive: one new table and one new function; nothing the live site reads is touched. Safe to run
-- again.

set local lock_timeout = '5s';

create table if not exists public.gift_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  -- Which of the purchase's gifts this is (1 or 2): fulfilment runs twice for most payments (the
  -- webhook and the success page), and (purchase_id, n) keeps it to one row each.
  n smallint not null check (n between 1 and 3),
  spent_slug text,
  spent_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint gift_credits_spent_whole check ((spent_slug is null) = (spent_at is null)),
  unique (purchase_id, n)
);
create index if not exists gift_credits_ready_idx on public.gift_credits (user_id) where spent_slug is null and revoked_at is null;

alter table public.gift_credits enable row level security;
drop policy if exists "gift_credits: owner read" on public.gift_credits;
create policy "gift_credits: owner read" on public.gift_credits for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.gift_credits from anon, authenticated;
grant select on public.gift_credits to authenticated;
grant all on public.gift_credits to service_role;

-- Uses one gift ready on a template the account does not hold: marks it used and writes the unlock
-- row, pointing at the purchase that paid for the gift, in one transaction. Returns the gift's id, or
-- null when nothing was used (the template is already unlocked, or no gift is ready).
--
-- One account's calls run one at a time (the advisory lock), so two publishes at once can never use
-- two gifts on one template; and if the unlock row turns out to exist after all, the gift is put back.
create or replace function public.spend_gift_credit(p_user uuid, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c record;
  written uuid;
begin
  perform pg_advisory_xact_lock(hashtext('gift_credits:' || p_user::text));
  if public.has_template_unlock(p_user, p_slug) then return null; end if;
  select id, purchase_id into c from public.gift_credits
    where user_id = p_user and spent_slug is null and revoked_at is null
    order by created_at, n limit 1 for update;
  if not found then return null; end if;
  update public.gift_credits set spent_slug = p_slug, spent_at = now() where id = c.id;
  insert into public.template_unlocks (user_id, template_slug, purchase_id) values (p_user, p_slug, c.purchase_id)
    on conflict (user_id, template_slug) do nothing
    returning id into written;
  if written is null then
    update public.gift_credits set spent_slug = null, spent_at = null where id = c.id;
    return null;
  end if;
  return c.id;
end $$;
revoke all on function public.spend_gift_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.spend_gift_credit(uuid, text) to service_role;
