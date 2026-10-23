-- Undoes 0017_keep_and_proof.sql: kept gifts and their reminders go (and every email they bring),
-- reactions lose the columns that let one be shown on the site, and the proof numbers function goes.
-- Reactions themselves, and everything else, stay.

set local lock_timeout = '5s';

drop function if exists public.proof_numbers();
drop index if exists public.reactions_shown_idx;
alter table public.reactions drop column if exists locale;
alter table public.reactions drop column if exists approved_at;
alter table public.reactions drop column if exists sender_withheld_at;
alter table public.reactions drop column if exists share_consent_at;
alter table public.reactions drop column if exists share_consent;
drop table if exists public.keep_reminders;
drop table if exists public.gift_keeps;
