-- Three e-mails before each reminded day, not one: seven days before, two days before and the day
-- before (src/lib/lifecycle/reminders.ts, STAGE_DAYS). A reminder now remembers which of the three
-- went last for the year in last_sent_year: last_stage 0 is none, 1 to 3 is that e-mail. "Done for
-- the year" is last_sent_year = that year and last_stage = 3: the third e-mail went, the gift was
-- made for that person (src/lib/lifecycle/reminder-done.ts), or the reader tapped "Not this year".
--
-- currency is the currency the page was in when the reminder was saved ('usd', 'eur', 'gbp'), so an
-- e-mail can say a price in it; null for every reminder saved before this, and then the e-mail says
-- a price only when the account's newest paid purchase tells the currency.
--
-- The site works without this file: the daily job reads PostgreSQL's 42703 for the missing column
-- and sends exactly what it sent before (one e-mail, nine days before), and the API stops saving the
-- currency. The old code ignores both columns, so this may be applied before the code is live.
--
-- Additive: two columns with defaults; nothing the live site reads is changed. Safe to run again.

set local lock_timeout = '5s';

alter table public.reminders add column if not exists last_stage smallint not null default 0 check (last_stage between 0 and 3);
alter table public.reminders add column if not exists currency text check (currency in ('usd', 'eur', 'gbp'));

-- Every reminder that has a year recorded either got that year's one e-mail or was made with the gift
-- for that day: both are done for that year.
update public.reminders set last_stage = 3 where last_sent_year is not null and last_stage = 0;
