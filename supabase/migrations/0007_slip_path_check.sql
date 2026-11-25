-- 0007 · A transfer payment must point at a slip the student really uploaded.
-- Students can insert payments straight through the Supabase API (the anon key is public), so
-- the app's checks are not enough: without this, a payment could name another student's slip
-- file, or a path that does not exist, and the committee would review the wrong image.
-- Runs after payments_before_insert (triggers fire in name order), so `source` is already final.

create or replace function public.payments_slip_check()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.source <> 'transfer' or auth.uid() is null then
    return new; -- cash rows carry no slip; service role is trusted
  end if;

  if new.slip_path is null
     or split_part(new.slip_path, '/', 1) <> new.student_id::text
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'slips' and o.name = new.slip_path
     ) then
    raise exception 'bad_slip' using errcode = '42501';
  end if;

  -- The same image may not back another live payment (other uploads, other students).
  if exists (
    select 1 from public.payments p
    where p.slip_sha256 = new.slip_sha256
      and p.status in ('pending', 'approved')
      and p.slip_path is distinct from new.slip_path
  ) then
    raise exception 'slip_reused' using errcode = '23P01';
  end if;

  return new;
end
$$;

revoke all on function public.payments_slip_check() from public, anon, authenticated;

drop trigger if exists payments_slip_check on public.payments;
create trigger payments_slip_check before insert on public.payments
  for each row execute function public.payments_slip_check();
