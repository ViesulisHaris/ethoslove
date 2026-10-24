-- Undoes 0016_monthsaries.sql: the monthly anniversaries go, and with them every monthly email.
-- The yearly reminders (0010) are untouched.

set local lock_timeout = '5s';

drop table if exists public.monthsaries;
