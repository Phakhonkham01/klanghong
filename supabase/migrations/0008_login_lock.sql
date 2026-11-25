-- 0008 · Lock password sign-in after 5 wrong passwords.
-- Sign-ins reach Supabase from the app server's IP, so Supabase's own per-IP limit cannot tell
-- users apart. The app counts failures per account (phone or committee code) and per client IP:
--   5 wrong passwords within 2 hours → that account is locked for 2 hours,
--   or until the committee unlocks it (or the owner resets the password by OTP).
-- Server-only tables: RLS on, no policies, no grants (the app uses the service role).

create table if not exists public.login_failures (
  id bigint generated always as identity primary key,
  account text not null check (char_length(account) between 3 and 40),
  ip text null check (ip is null or char_length(ip) <= 64),
  created_at timestamptz not null default now()
);
create index if not exists login_failures_account_created
  on public.login_failures (account, created_at desc);
create index if not exists login_failures_ip_created
  on public.login_failures (ip, created_at desc);

create table if not exists public.login_locks (
  account text primary key check (char_length(account) between 3 and 40),
  locked_until timestamptz not null
);

alter table public.login_failures enable row level security;
alter table public.login_locks enable row level security;
revoke all on public.login_failures, public.login_locks from anon, authenticated;
