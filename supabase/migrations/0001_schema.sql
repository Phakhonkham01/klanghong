-- 0001 · Core schema for KlangHong (class-fund tracker).
-- Idempotent: safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  student_code text not null unique check (student_code ~ '^[A-Z0-9]{3,20}$'),
  full_name text not null check (char_length(full_name) between 1 and 80),
  role text not null default 'student' check (role in ('student', 'committee')),
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  phone text null check (phone is null or char_length(phone) <= 20),
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  weekly_amount bigint not null default 10000 check (weekly_amount > 0),
  start_date date not null,
  bank_name text null,
  account_name text null,
  account_no text null,
  qr_path text null,
  note text null check (note is null or char_length(note) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles (id) on delete set null
);

-- Single settings row; the date is changeable on the settings page.
insert into public.settings (id, weekly_amount, start_date)
values (1, 10000, date '2026-11-23')
on conflict (id) do nothing;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete restrict,
  week_start date not null check (extract(isodow from week_start) = 1),
  amount bigint not null check (amount > 0),
  source text not null default 'transfer' check (source in ('transfer', 'cash')),
  slip_path text null,
  slip_sha256 text null check (slip_sha256 is null or slip_sha256 ~ '^[0-9a-f]{64}$'),
  transfer_ref text null check (transfer_ref is null or char_length(transfer_ref) <= 64),
  note text null check (note is null or char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text null,
  reviewed_by uuid null references public.profiles (id) on delete set null,
  reviewed_at timestamptz null,
  self_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  -- A transfer always carries its slip; only cash payments may have none.
  constraint payments_slip_required check (
    source = 'cash' or (slip_path is not null and slip_sha256 is not null)
  ),
  -- Cash is recorded by the committee as already approved.
  constraint payments_cash_approved check (source = 'transfer' or status = 'approved'),
  constraint payments_reject_reason check (
    status <> 'rejected' or (reject_reason is not null and char_length(btrim(reject_reason)) >= 5)
  )
);

-- No duplicates: one live (pending/approved) payment per student per week.
create unique index if not exists payments_one_live_per_week
  on public.payments (student_id, week_start)
  where status in ('pending', 'approved');
create index if not exists payments_status_created on public.payments (status, created_at);
create index if not exists payments_week on public.payments (week_start);
-- Slip reuse lookups (not unique: one slip may cover several weeks of one student).
create index if not exists payments_slip_hash on public.payments (slip_sha256)
  where status in ('pending', 'approved');

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  amount bigint not null check (amount > 0),
  spent_at date not null,
  note text null check (note is null or char_length(note) <= 200),
  receipt_path text null,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_at on public.expenses (spent_at);

create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid null,
  action text not null,
  entity text not null,
  entity_id text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created on public.audit_log (created_at desc);
