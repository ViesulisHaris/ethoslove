-- Two privacy fixes. Both are backward compatible with the live site: it never reads
-- place_reviews, and it reads purchases only by user_id or id through the service role or the
-- owner's own session, which still works.
--
-- 1. place_reviews no longer shows who wrote what. 0008 let anyone select the table, user_id
--    included, so every review could be tied to the same account's other reviews through the public
--    API. Reviews are still public, but only through the server (which returns a first name and a
--    `mine` flag, never an id) and place_rating_summary (aggregates only). A signed-in person can
--    still read their own rows: the review upsert, "delete my review" and the data export need that.
--
-- 2. purchases outlive the account they were made from. Accounting and VAT law make us keep a
--    record of every sale for years; until now deleting an account deleted its purchases with it.
--    user_id becomes nullable and is cleared instead. The owner-read policy is unchanged (a null
--    user_id matches nobody), and template_unlocks still cascade with the profile, so a deleted
--    account keeps no unlocks. A pass it bought still ends for the partner as well: its
--    couple_passes row cascades with the owner's profile, and 0009's couple_passes_deleted trigger
--    takes the partner's rows with it, since the purchase they point at is no longer deleted.
--
-- Needs 0008 (place_reviews) applied first; apply the migrations in order.
--
-- Safe to run again.

set local lock_timeout = '5s';

-- 1 ---------------------------------------------------------------------------------------------

drop policy if exists "place_reviews: public read" on public.place_reviews;
drop policy if exists "place_reviews: own read" on public.place_reviews;
create policy "place_reviews: own read" on public.place_reviews
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.place_reviews from anon;
grant select, insert, update, delete on public.place_reviews to authenticated;

-- 2 ---------------------------------------------------------------------------------------------

alter table public.purchases alter column user_id drop not null;

-- 0001 declared the key inline, so Postgres named it purchases_user_id_fkey. Drop whatever foreign
-- key sits on purchases.user_id → profiles, whatever it is called, and put it back under that name.
do $$
declare
  fk record;
begin
  for fk in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = 'public.purchases'::regclass
      and c.confrelid = 'public.profiles'::regclass
      and a.attname = 'user_id'
  loop
    execute format('alter table public.purchases drop constraint %I', fk.conname);
  end loop;
end $$;

-- NOT VALID then VALIDATE: every existing row already points at a profile. Inside this one
-- migration the table stays locked until the end either way; it is small, and lock_timeout above
-- makes the migration give up, rather than hold up every sale while it waits behind a slow query.
alter table public.purchases
  add constraint purchases_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null not valid;
alter table public.purchases validate constraint purchases_user_id_fkey;
