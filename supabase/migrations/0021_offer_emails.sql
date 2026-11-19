-- Who asked for our offer emails: the unticked box "Email me Ethos offers" on the screen a gift is
-- sent from (src/components/editor/offer-emails-box.tsx). Additive: one new table; nothing the live
-- site reads already is changed. Until it exists, ticking the box answers "couldn't save" and
-- nothing else breaks (src/app/api/offer/emails/route.ts).
--
-- offer_emails: one row per account that said yes, removed when they say no again, unsubscribe, or
-- delete their account. It keeps what they agreed to, word for word, and when and where:
--   wording     the box's sentence, in the language it was shown in.
--   source      where the box was: send (the screen a gift goes out from).
--   locale      the language of the emails they get.
-- The address itself stays in profiles; nothing here names a gift.
--
-- The server's alone: no policies, and nothing for anon or authenticated.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.offer_emails (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  wording     text not null check (char_length(wording) between 1 and 300),
  source      text not null check (source in ('send')),
  locale      text not null default 'en' check (locale in ('en', 'es'))
);

alter table public.offer_emails enable row level security;
revoke all on public.offer_emails from anon, authenticated;
