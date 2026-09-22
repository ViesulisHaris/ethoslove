-- Couples rate the places on the Dates map, and leave a line for the next couple. Additive:
-- two new tables and one read-only function; nothing the gifts product uses is touched.
--
-- place_reviews: one review per signed-in person per place. Anyone may read them, which is the
-- point; only the author may write theirs. The place is remembered by its OpenStreetMap id and by
-- the name and position it had when reviewed, so a list of somebody's reviews can be shown
-- without asking the map again.
--
-- waitlist: email addresses for "Ethos for Two", written and read by the server only.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null check (place_id ~ '^(node|way|relation)/[0-9]{1,15}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  -- What it cost for two, on the ideas' scale: 0 free, 1 pocket change, 2 dinner money, 3 a treat.
  cost smallint check (cost between 0 and 3),
  went_as text check (went_as in ('first', 'date', 'anniversary', 'birthday', 'friends')),
  body text check (char_length(body) <= 400),
  place_name text check (char_length(place_name) <= 120),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  locale text check (locale in ('en', 'es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index if not exists place_reviews_place_idx on public.place_reviews (place_id, created_at desc);
create index if not exists place_reviews_user_idx on public.place_reviews (user_id, created_at desc);

alter table public.place_reviews enable row level security;

drop policy if exists "place_reviews: public read" on public.place_reviews;
create policy "place_reviews: public read" on public.place_reviews
  for select using (true);

drop policy if exists "place_reviews: own insert" on public.place_reviews;
create policy "place_reviews: own insert" on public.place_reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "place_reviews: own update" on public.place_reviews;
create policy "place_reviews: own update" on public.place_reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "place_reviews: own delete" on public.place_reviews;
create policy "place_reviews: own delete" on public.place_reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.place_reviews to anon, authenticated;
grant insert, update, delete on public.place_reviews to authenticated;

-- Stars, count and the typical cost for a list of places, in one round trip for a whole list.
create or replace function public.place_rating_summary(ids text[])
returns table (place_id text, stars numeric, reviews integer, cost smallint)
language sql stable security definer set search_path = public as $$
  select
    r.place_id,
    round(avg(r.stars)::numeric, 1) as stars,
    count(*)::int as reviews,
    (select mode() within group (order by c.cost) from public.place_reviews c where c.place_id = r.place_id and c.cost is not null)::smallint as cost
  from public.place_reviews r
  where r.place_id = any (ids)
  group by r.place_id
$$;
grant execute on function public.place_rating_summary(text[]) to anon, authenticated;

create table if not exists public.waitlist (
  email text primary key check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 254),
  product text not null default 'for-two' check (product in ('for-two')),
  locale text check (locale in ('en', 'es')),
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
-- No policies on purpose: only the service role reads or writes it.
