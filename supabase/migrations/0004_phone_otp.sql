-- 0004 · Phone + OTP sign-in for students, self-registration with committee approval.
-- Idempotent: safe to re-run.

------------------------------------------------------------------------
-- Profiles: phone identity, approval, first-login name
------------------------------------------------------------------------

-- Phone-registered students may not have a student code.
alter table public.profiles alter column student_code drop not null;

alter table public.profiles
  add column if not exists approval text not null default 'approved';
alter table public.profiles drop constraint if exists profiles_approval_check;
alter table public.profiles
  add constraint profiles_approval_check check (approval in ('pending', 'approved', 'rejected'));

alter table public.profiles
  add column if not exists must_set_name boolean not null default false;

-- Name is empty until the student sets it on first sign-in.
alter table public.profiles drop constraint if exists profiles_full_name_check;
alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles
  add constraint profiles_full_name_len check (char_length(full_name) <= 80);

-- Lao mobile numbers stored as 10 digits: 20XXXXXXXX.
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles drop constraint if exists profiles_phone_format;
alter table public.profiles
  add constraint profiles_phone_format check (phone is null or phone ~ '^20[0-9]{8}$');
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

------------------------------------------------------------------------
-- OTP storage (server-only: RLS on, no policies, no grants)
------------------------------------------------------------------------

create table if not exists public.otp_requests (
  id bigserial primary key,
  phone text not null check (phone ~ '^20[0-9]{8}$'),
  code_hash text not null,
  ip text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz null
);
create index if not exists otp_requests_phone_created on public.otp_requests (phone, created_at desc);
create index if not exists otp_requests_ip_created on public.otp_requests (ip, created_at desc);
create index if not exists otp_requests_created on public.otp_requests (created_at desc);

-- Committee "reset" of a number's monthly OTP count.
create table if not exists public.otp_quota_resets (
  phone text primary key check (phone ~ '^20[0-9]{8}$'),
  reset_at timestamptz not null default now(),
  reset_by uuid null references public.profiles (id) on delete set null
);

alter table public.otp_requests enable row level security;
alter table public.otp_quota_resets enable row level security;
revoke all on public.otp_requests, public.otp_quota_resets from anon, authenticated;
revoke all on sequence public.otp_requests_id_seq from anon, authenticated;

------------------------------------------------------------------------
-- Payments: only approved, active members may submit
------------------------------------------------------------------------

create or replace function public.payments_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  s public.settings;
  caller uuid := auth.uid();
begin
  select * into s from public.settings where id = 1;

  if new.week_start > public.week_monday(public.vientiane_today()) then
    raise exception 'future_week' using errcode = 'P0001';
  end if;
  if new.week_start < public.week_monday(s.start_date) then
    raise exception 'before_start' using errcode = 'P0001';
  end if;

  if caller is null then
    return new; -- service role
  end if;

  if not exists (
    select 1 from public.profiles where id = caller and is_active and approval = 'approved'
  ) then
    raise exception 'inactive_user' using errcode = '42501';
  end if;

  -- Cash is recorded for an approved, active member only.
  if not exists (
    select 1 from public.profiles where id = new.student_id and is_active and approval = 'approved'
  ) then
    raise exception 'inactive_user' using errcode = '42501';
  end if;

  new.amount := s.weekly_amount;
  new.created_at := now();

  if public.is_committee() and new.source = 'cash' then
    new.status := 'approved';
    new.slip_path := null;
    new.slip_sha256 := null;
    new.reject_reason := null;
    new.reviewed_by := caller;
    new.reviewed_at := now();
    new.self_reviewed := (new.student_id = caller);
  else
    if new.student_id <> caller then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    new.source := 'transfer';
    new.status := 'pending';
    new.reject_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.self_reviewed := false;
  end if;
  return new;
end
$$;

-- Committee status requires approval too.
create or replace function public.is_committee()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'committee' and is_active and approval = 'approved'
  )
$$;
