-- 0009 · Pay ahead, and a bank QR per amount.
--  * Students may pay up to 6 weeks ahead of the current week (the app allows 7 weeks per slip).
--  * settings.qr_by_weeks: storage paths of bank QR codes with a fixed amount, keyed by the
--    number of weeks they cover ("1" … "7"); the pay page shows the one for the weeks chosen.

alter table public.settings
  add column if not exists qr_by_weeks jsonb not null default '{}'::jsonb;
alter table public.settings drop constraint if exists settings_qr_by_weeks_object;
alter table public.settings
  add constraint settings_qr_by_weeks_object check (jsonb_typeof(qr_by_weeks) = 'object');

-- Committee updates it through the normal settings policy (RLS: committee only).
grant update (qr_by_weeks) on public.settings to authenticated;

create or replace function public.payments_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  s public.settings;
  caller uuid := auth.uid();
begin
  select * into s from public.settings where id = 1;

  -- Pay ahead: this week plus up to 6 upcoming weeks (7 weeks in one go at most).
  if new.week_start > public.week_monday(public.vientiane_today()) + 42 then
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
