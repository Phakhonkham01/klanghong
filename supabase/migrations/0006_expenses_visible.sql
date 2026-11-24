-- 0006 · Transparency: every active, approved member can read the class expenses.
-- Writing stays committee-only (expenses_all). Receipt images stay committee-only.

-- SECURITY DEFINER so the check doesn't depend on policies on profiles.
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and approval = 'approved'
  )
$$;

drop policy if exists expenses_select_members on public.expenses;
create policy expenses_select_members on public.expenses for select to authenticated
  using (public.is_member());
