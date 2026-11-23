-- 0002 · Helpers, integrity triggers, audit triggers, RLS and grants.
-- Idempotent: functions use create or replace, policies are dropped first.

------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------

-- "Today" in Asia/Vientiane (the server runs in UTC).
create or replace function public.vientiane_today()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Vientiane')::date $$;

-- Monday of the week containing d.
create or replace function public.week_monday(d date)
returns date language sql immutable set search_path = ''
as $$ select d - (extract(isodow from d)::int - 1) $$;

-- SECURITY DEFINER so policies on profiles don't recurse.
create or replace function public.is_committee()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'committee' and is_active
  )
$$;

-- Totals only: lets students see the fund without reading other rows.
create or replace function public.get_fund_summary()
returns table (total_approved bigint, total_expenses bigint, balance bigint, pending_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'service_role') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return query
  with a as (select coalesce(sum(amount), 0)::bigint s from public.payments where status = 'approved'),
       e as (select coalesce(sum(amount), 0)::bigint s from public.expenses),
       p as (select count(*)::bigint c from public.payments where status = 'pending')
  select a.s, e.s, a.s - e.s, p.c from a, e, p;
end
$$;

------------------------------------------------------------------------
-- Payments integrity
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

  -- Service role (caller is null) is trusted: seeding and admin scripts.
  if caller is null then
    return new;
  end if;

  if not exists (select 1 from public.profiles where id = caller and is_active) then
    raise exception 'inactive_user' using errcode = '42501';
  end if;

  -- Amount always comes from settings, never from the client.
  new.amount := s.weekly_amount;
  new.created_at := now();

  if public.is_committee() and new.source = 'cash' then
    -- Committee records cash received: approved immediately.
    new.status := 'approved';
    new.slip_path := null;
    new.slip_sha256 := null;
    new.reject_reason := null;
    new.reviewed_by := caller;
    new.reviewed_at := now();
    new.self_reviewed := (new.student_id = caller);
  else
    -- Everyone else (and committee paying for themselves) submits for review.
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

drop trigger if exists payments_before_insert on public.payments;
create trigger payments_before_insert before insert on public.payments
for each row execute function public.payments_before_insert();

create or replace function public.payments_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return new; -- service role
  end if;
  if not public.is_committee() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if old.status <> 'pending' then
    raise exception 'already_reviewed' using errcode = 'P0001';
  end if;
  if new.status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if (new.student_id, new.week_start, new.amount, new.source, new.slip_path, new.slip_sha256,
      new.transfer_ref, new.note, new.created_at)
     is distinct from
     (old.student_id, old.week_start, old.amount, old.source, old.slip_path, old.slip_sha256,
      old.transfer_ref, old.note, old.created_at) then
    raise exception 'immutable_fields' using errcode = '42501';
  end if;

  new.reviewed_by := caller;
  new.reviewed_at := now();
  if new.status = 'approved' then
    new.reject_reason := null;
  end if;

  -- Nobody reviews their own slip, unless they are the only committee member.
  if old.student_id = caller then
    if (select count(*) from public.profiles where role = 'committee' and is_active) > 1 then
      raise exception 'self_review' using errcode = '42501';
    end if;
    new.self_reviewed := true;
  else
    new.self_reviewed := false;
  end if;
  return new;
end
$$;

drop trigger if exists payments_before_update on public.payments;
create trigger payments_before_update before update on public.payments
for each row execute function public.payments_before_update();

------------------------------------------------------------------------
-- Settings / expenses housekeeping
------------------------------------------------------------------------

create or replace function public.settings_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.id := 1;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end
$$;

drop trigger if exists settings_before_update on public.settings;
create trigger settings_before_update before update on public.settings
for each row execute function public.settings_before_update();

alter table public.expenses alter column created_by set default auth.uid();

------------------------------------------------------------------------
-- Audit log (written by triggers only)
------------------------------------------------------------------------

create or replace function public.audit_payments()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.source = 'cash' then
    insert into public.audit_log (actor_id, action, entity, entity_id, meta)
    values (auth.uid(), 'cash_payment', 'payment', new.id::text,
            jsonb_build_object('student_id', new.student_id, 'week_start', new.week_start, 'amount', new.amount));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, meta)
    values (auth.uid(), case new.status when 'approved' then 'approve' else 'reject' end,
            'payment', new.id::text,
            jsonb_build_object('student_id', new.student_id, 'week_start', new.week_start,
                               'reason', new.reject_reason, 'self_reviewed', new.self_reviewed));
  end if;
  return null;
end
$$;

drop trigger if exists audit_payments on public.payments;
create trigger audit_payments after insert or update on public.payments
for each row execute function public.audit_payments();

create or replace function public.audit_settings()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), 'settings_update', 'settings', '1',
          jsonb_build_object(
            'weekly_amount', jsonb_build_array(old.weekly_amount, new.weekly_amount),
            'start_date', jsonb_build_array(old.start_date, new.start_date)));
  return null;
end
$$;

drop trigger if exists audit_settings on public.settings;
create trigger audit_settings after update on public.settings
for each row execute function public.audit_settings();

create or replace function public.audit_expenses()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, action, entity, entity_id, meta)
    values (auth.uid(), 'expense_delete', 'expense', old.id::text,
            jsonb_build_object('title', old.title, 'amount', old.amount));
  else
    insert into public.audit_log (actor_id, action, entity, entity_id, meta)
    values (auth.uid(), case tg_op when 'INSERT' then 'expense_create' else 'expense_update' end,
            'expense', new.id::text, jsonb_build_object('title', new.title, 'amount', new.amount));
  end if;
  return null;
end
$$;

drop trigger if exists audit_expenses on public.expenses;
create trigger audit_expenses after insert or update or delete on public.expenses
for each row execute function public.audit_expenses();

------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_committee());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_committee()) with check (public.is_committee());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (true);
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings for update to authenticated
  using (public.is_committee()) with check (public.is_committee());

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (student_id = auth.uid() or public.is_committee());
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (student_id = auth.uid() or public.is_committee());
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
  using (public.is_committee()) with check (public.is_committee());

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (public.is_committee()) with check (public.is_committee());

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (public.is_committee());

------------------------------------------------------------------------
-- Grants: least privilege on top of RLS
------------------------------------------------------------------------

revoke all on public.profiles, public.settings, public.payments, public.expenses, public.audit_log
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, is_active, must_change_password) on public.profiles to authenticated;

grant select on public.settings to authenticated;
grant update (weekly_amount, start_date, bank_name, account_name, account_no, qr_path, note)
  on public.settings to authenticated;

grant select, insert on public.payments to authenticated;
grant update (status, reject_reason) on public.payments to authenticated;

grant select, insert, update, delete on public.expenses to authenticated;
grant select on public.audit_log to authenticated;

revoke all on function public.get_fund_summary() from public, anon;
grant execute on function public.get_fund_summary() to authenticated, service_role;
revoke all on function public.is_committee() from public, anon;
grant execute on function public.is_committee() to authenticated, service_role;
